import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { extrairClaimsAutoridade, resolverAutoridadePersistidaTx } from "./auth";
import { construirIdentidade, registrarOperacaoConcluidaTx, resolverOperacaoTx } from "./idempotencia";
import { validatePayload } from "./utils/validation";
import { GerenciarAlmoxarifado, GerenciarAlmoxarifadoSchema } from "./schemas/almoxarifados.schema";

function junctionId(idGestor: string, idAlmoxarifado: string): string {
  return `${idGestor}_${idAlmoxarifado}`;
}

/**
 * Valida que cada id é um Gestor_Almoxarifado ativo e consistente
 * (`id_usuario == id`), como exige M9. Retorna o conjunto único.
 */
async function validarGestoresTx(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  ids: string[]
): Promise<string[]> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return [];
  const usuarioRefs = unicos.map((id) => db.collection("Usuarios").doc(id));
  const papelRefs = unicos.map((id) => db.collection("Gestor_Almoxarifado").doc(id));
  const snaps = await tx.getAll(...usuarioRefs, ...papelRefs);
  const n = unicos.length;
  for (let i = 0; i < n; i++) {
    const usuario = snaps[i];
    const papel = snaps[n + i];
    if (
      !usuario.exists ||
      usuario.data()?.ativo !== true ||
      !papel.exists ||
      papel.data()?.id_usuario !== unicos[i]
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Gestor informado inexistente, inativo ou inconsistente."
      );
    }
  }
  return unicos;
}

async function gestoresVinculadosTx(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  idAlmoxarifado: string
): Promise<string[]> {
  const snap = await tx.get(
    db.collection("Gestor_Almoxarifado_x_Almoxarifado").where("id_almoxarifado", "==", idAlmoxarifado)
  );
  return snap.docs.map((d) => d.data().id_gestor_almoxarifado as string);
}

// UI-03: criação/edição server-owned de Almoxarifado com Local verificado,
// vínculo de gestores ativos, contador derivado e ativação condicionada a
// vínculo válido. M9 (Chefe_Geral persistido) e M7.
export const gerenciarAlmoxarifado = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados: GerenciarAlmoxarifado = validatePayload(GerenciarAlmoxarifadoSchema, request.data);
  const db = admin.firestore();
  const colecaoJunction = db.collection("Gestor_Almoxarifado_x_Almoxarifado");

  return db.runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Chefe_Geral"]);
    // Vínculos são um conjunto: normaliza (dedup + ordem determinística) antes
    // do hash e do efeito, para que a MESMA intenção não dependa da ordem.
    if (dados.acao === "CRIAR") {
      const nome = dados.nome;
      const descricao = dados.descricao;
      const gestoresOrdenados: string[] | undefined = dados.gestores ? [...new Set(dados.gestores)].sort() : undefined;
      const ativoEfetivo = dados.ativo === true;
      const identidade = construirIdentidade(claims.uid, "CRIAR_ALMOXARIFADO", {
        idLocal: dados.idLocal,
        nome,
        descricao,
        gestores: gestoresOrdenados ?? [],
        ativo: ativoEfetivo,
      });
      const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
      if (decisao.estado === "REPLAY") return decisao.resultado as { id: string };
      if (decisao.estado !== "NOVA") {
        throw new HttpsError("failed-precondition", "Operação de criação de almoxarifado não concluída.");
      }

      const local = await tx.get(db.collection("Local").doc(dados.idLocal));
      if (!local.exists) throw new HttpsError("failed-precondition", "Local inexistente.");
      const gestores = await validarGestoresTx(tx, db, gestoresOrdenados ?? []);
      if (ativoEfetivo && gestores.length === 0) {
        throw new HttpsError("failed-precondition", "Ativação exige ao menos um gestor ativo.");
      }

      const almoxRef = db.collection("Almoxarifado").doc();
      tx.set(almoxRef, {
        id_local: dados.idLocal,
        nome,
        descricao,
        ativo: ativoEfetivo,
        qtd_gestores_ativos: gestores.length,
      });
      for (const gestor of gestores) {
        tx.set(colecaoJunction.doc(junctionId(gestor, almoxRef.id)), {
          id_gestor_almoxarifado: gestor,
          id_almoxarifado: almoxRef.id,
        });
      }
      const resultado = { id: almoxRef.id };
      registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
      return resultado;
    }

    if (!dados.idAlmoxarifado) {
      throw new HttpsError("invalid-argument", "idAlmoxarifado é obrigatório.");
    }
    const almoxRef = db.collection("Almoxarifado").doc(dados.idAlmoxarifado);

    if (dados.acao === "EDITAR") {
      const nome = dados.nome;
      const descricao = dados.descricao;
      const gestoresOrdenados: string[] | undefined = dados.gestores ? [...new Set(dados.gestores)].sort() : undefined;
      const identidade = construirIdentidade(claims.uid, "EDITAR_ALMOXARIFADO", {
        idAlmoxarifado: dados.idAlmoxarifado,
        idLocal: dados.idLocal,
        nome,
        descricao,
        gestores: gestoresOrdenados ?? null,
      });
      const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
      if (decisao.estado === "REPLAY") return decisao.resultado as { id: string };
      if (decisao.estado !== "NOVA") {
        throw new HttpsError("failed-precondition", "Operação de edição de almoxarifado não concluída.");
      }
      const almoxSnap = await tx.get(almoxRef);
      if (!almoxSnap.exists) throw new HttpsError("not-found", "Almoxarifado não encontrado.");
      const almox = almoxSnap.data()!;
      const local = await tx.get(db.collection("Local").doc(dados.idLocal));
      if (!local.exists) throw new HttpsError("failed-precondition", "Local inexistente.");

      let qtd: number | null = null;
      if (gestoresOrdenados) {
        const gestores = await validarGestoresTx(tx, db, gestoresOrdenados);
        if (almox.ativo === true && gestores.length === 0) {
          throw new HttpsError("failed-precondition", "Almoxarifado ativo exige ao menos um gestor ativo.");
        }
        const atuais = await gestoresVinculadosTx(tx, db, dados.idAlmoxarifado);
        const removidos = atuais.filter((g) => !gestores.includes(g));
        const adicionados = gestores.filter((g) => !atuais.includes(g));
        for (const gestor of removidos) {
          tx.delete(colecaoJunction.doc(junctionId(gestor, dados.idAlmoxarifado)));
        }
        for (const gestor of adicionados) {
          tx.set(colecaoJunction.doc(junctionId(gestor, dados.idAlmoxarifado)), {
            id_gestor_almoxarifado: gestor,
            id_almoxarifado: dados.idAlmoxarifado,
          });
        }
        qtd = gestores.length;
      }

      tx.update(almoxRef, {
        id_local: dados.idLocal,
        nome,
        descricao,
        ...(qtd === null ? {} : { qtd_gestores_ativos: qtd }),
      });
      const resultado = { id: dados.idAlmoxarifado };
      registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
      return resultado;
    }

    // ATIVAR / DESATIVAR
    const identidade = construirIdentidade(
      claims.uid,
      dados.acao === "ATIVAR" ? "ATIVAR_ALMOXARIFADO" : "DESATIVAR_ALMOXARIFADO",
      { idAlmoxarifado: dados.idAlmoxarifado }
    );
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { id: string };
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de status de almoxarifado não concluída.");
    }
    const almoxSnap = await tx.get(almoxRef);
    if (!almoxSnap.exists) throw new HttpsError("not-found", "Almoxarifado não encontrado.");

    if (dados.acao === "ATIVAR") {
      const vinculados = await gestoresVinculadosTx(tx, db, dados.idAlmoxarifado);
      const validos = await validarGestoresTx(tx, db, vinculados);
      if (validos.length === 0) {
        throw new HttpsError("failed-precondition", "Ativação exige ao menos um gestor ativo.");
      }
      tx.update(almoxRef, { ativo: true, qtd_gestores_ativos: validos.length });
    } else {
      tx.update(almoxRef, { ativo: false });
    }
    const resultado = { id: dados.idAlmoxarifado };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

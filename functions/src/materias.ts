import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { validatePayload } from "./utils/validation";
import { GerenciarMateriaSchema, GerenciarMateria } from "./schemas/materias.schema";
import { extrairClaimsAutoridade, resolverAutoridadePersistidaTx } from "./auth";

/** N(s) = s.trim().toUpperCase(): canonicalização única do código de matéria. */
function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

function chaveMateria(codigoNormalizado: string) {
  return admin.firestore().collection("Chaves_Unicas").doc(`Materia__${codigoNormalizado}`);
}

/**
 * Cadastra (CRIAR) ou edita (EDITAR) uma Matéria.
 *
 * Contrato UI-03/MAT-01: nome (100) e código (10) não vazios; código com
 * canonicalização única e unicidade transacional em `Chaves_Unicas/Materia__N`;
 * edição mantém o ID e atualiza a projeção `Turma.nome_materia` (turmas não são
 * recriadas); autorização M9 persistida (Professor ou Chefe).
 */
export const gerenciarMateria = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados: GerenciarMateria = validatePayload(GerenciarMateriaSchema, request.data);

  const db = admin.firestore();
  const codigoNormalizado = normalizarCodigo(dados.codigoMateria);
  const nome = dados.nome.trim();
  const chaveRef = chaveMateria(codigoNormalizado);

  return db.runTransaction(async (tx) => {
    // M9: autoridade persistida relida na transação do efeito.
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor", "Chefe_Geral"]);

    if (dados.acao === "CRIAR") {
      const chave = await tx.get(chaveRef);
      if (chave.exists) {
        throw new HttpsError("already-exists", "Código de matéria já cadastrado.");
      }
      const materiaRef = db.collection("Materia").doc();
      tx.set(materiaRef, {
        nome,
        codigo_materia: codigoNormalizado,
        criado_em: FieldValue.serverTimestamp(),
        criado_por: claims.uid,
      });
      tx.set(chaveRef, {
        tipo: "Materia",
        id_recurso: materiaRef.id,
        criado_em: FieldValue.serverTimestamp(),
      });
      return { id: materiaRef.id, nome, codigoMateria: codigoNormalizado };
    }

    // EDITAR: mantém o ID e não recria turmas; apenas atualiza projeção.
    const materiaRef = db.collection("Materia").doc(dados.idMateria);
    const materiaSnap = await tx.get(materiaRef);
    if (!materiaSnap.exists) {
      throw new HttpsError("not-found", "Matéria não encontrada.");
    }
    const codigoAtual = materiaSnap.data()!.codigo_materia as string | undefined;
    if (!codigoAtual) {
      throw new HttpsError("failed-precondition", "Matéria persistida sem código (fail-closed).");
    }
    // Todas as leituras antes de qualquer escrita (exigência da transação).
    const turmas = await tx.get(db.collection("Turma").where("id_materia", "==", dados.idMateria));
    const trocaCodigo = codigoNormalizado !== codigoAtual;
    if (trocaCodigo) {
      const novaChave = await tx.get(chaveRef);
      if (novaChave.exists) {
        throw new HttpsError("already-exists", "Código de matéria já cadastrado.");
      }
    }
    // Escritas
    if (trocaCodigo) {
      tx.delete(chaveMateria(codigoAtual));
      tx.set(chaveRef, {
        tipo: "Materia",
        id_recurso: dados.idMateria,
        criado_em: FieldValue.serverTimestamp(),
      });
    }
    tx.update(materiaRef, {
      nome,
      codigo_materia: codigoNormalizado,
      atualizado_em: FieldValue.serverTimestamp(),
    });
    // Projeção de leitura: nome denormalizado nas turmas vinculadas por ID.
    for (const turma of turmas.docs) {
      tx.update(turma.ref, { nome_materia: nome });
    }
    return { id: dados.idMateria, nome, codigoMateria: codigoNormalizado };
  });
});

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { createHash, randomUUID } from "crypto";
import {
  ClaimsAutoridade,
  PAPEIS_CONHECIDOS,
  extrairClaimsAutoridade,
  resolverAutoridadePersistidaTx,
  validarAutoridadePersistidaComClaims,
  validarMatrizPapeis,
} from "./auth";
import { validatePayload } from "./utils/validation";
import { ConvidarUsuarioSchema, RevogarUsuarioPapelSchema } from "./schemas/usuarios.schema";

const PAPEIS: string[] = [...PAPEIS_CONHECIDOS];

type Mutacao = {
  ator: string; uid: string; papel: string; conceder: boolean; motivo: string;
  idOperacao: string; perfil?: Record<string, unknown>; identidade?: { nome: string; email: string };
  materias?: string[];
};

/** Auth é externo à transação. Repetição reconcilia a versão corrente, sem repetir a mutação. */
export async function reconciliarClaimsUsuario(uid: string): Promise<void> {
  const db = admin.firestore();
  const ref = db.collection("Usuarios").doc(uid);
  try {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const estado = await db.runTransaction(async tx => {
        const usuario = await tx.get(ref);
        const perfis = await tx.getAll(...PAPEIS.map(p => db.collection(p).doc(uid)));
        if (!usuario.exists) throw new HttpsError("not-found", "Identidade não encontrada.");
        const roles = PAPEIS.filter((_, i) => perfis[i].exists);
        validarMatrizPapeis(roles);
        return { roles: usuario.data()!.ativo === true ? roles : [], versao: usuario.data()!.versao_permissoes ?? 0 };
      });
      const authUser = await admin.auth().getUser(uid);
      await admin.auth().setCustomUserClaims(uid, {
        ...authUser.customClaims, roles: estado.roles, versao_permissoes: estado.versao,
      });
      const atual = await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (snap.data()?.versao_permissoes !== estado.versao) return false;
        tx.update(ref, { claims_pendentes: false });
        return true;
      });
      if (atual) return;
    }
    throw new Error("Permissões alteradas durante reconciliação.");
  } catch {
    await ref.update({ claims_pendentes: true });
    throw new HttpsError("unavailable", "Papéis persistidos; sincronização Auth pendente. Repetir a mesma operação para reconciliar.");
  }
}

/** Todas as concessões/revogações compartilham o singleton, inclusive o bootstrap de contagens. */
async function alterarPapel(dados: Mutacao, claims: ClaimsAutoridade): Promise<{ uid: string; ativo: boolean }> {
  const db = admin.firestore();
  const controleRef = db.collection("Controle_Papeis").doc("singleton");
  const usuarioRef = db.collection("Usuarios").doc(dados.uid);
  const chave = createHash("sha256").update(JSON.stringify([dados.ator, dados.idOperacao])).digest("hex");
  const operacaoRef = db.collection("Operacoes").doc(chave);
  const entrada = createHash("sha256").update(JSON.stringify(dados)).digest("hex");
  const auditRef = db.collection("Registro_de_Auditoria").doc(`papel_${chave}`);
  try {
    return await db.runTransaction(async tx => {
      const controle = await tx.get(controleRef);
      const operacao = await tx.get(operacaoRef);
      if (operacao.exists) {
        if (operacao.data()!.hash_entrada !== entrada)
          throw new HttpsError("already-exists", "Identificador de operação reutilizado com outros dados.");
        return operacao.data()!.resultado as { uid: string; ativo: boolean };
      }
      // M9: autoridade persistida relida na MESMA transação do efeito (fecha TOCTOU).
      await resolverAutoridadePersistidaTx(tx, claims, ["Chefe_Geral"]);
      const usuario = await tx.get(usuarioRef);
      const perfis = await tx.getAll(...PAPEIS.map(p => db.collection(p).doc(dados.uid)));
      const atuais = PAPEIS.filter((_, i) => perfis[i].exists);
      if (!dados.conceder && dados.papel === "Chefe_Geral" && dados.ator !== dados.uid)
        throw new HttpsError("permission-denied", "Não é permitido revogar outro Chefe Geral.");
      if (!usuario.exists && !dados.conceder)
        throw new HttpsError("not-found", "Identidade não encontrada.");
      const posteriores = dados.conceder ? [...new Set([...atuais, dados.papel])] : atuais.filter(p => p !== dados.papel);
      validarMatrizPapeis(posteriores);
      const ativo = posteriores.length > 0;
      // Recontagem transacional evita confiar em contador legado ausente/desatualizado.
      const chefes = await tx.get(db.collection("Chefe_Geral"));
      const gestores = await tx.get(db.collection("Gestor_Bens_Patrimoniais"));
      const ids = [...new Set([...chefes.docs, ...gestores.docs].map(d => d.id))];
      const identidades = ids.length ? await tx.getAll(...ids.map(id => db.collection("Usuarios").doc(id))) : [];
      const ativos = new Set(identidades.filter(d => d.data()?.ativo === true).map(d => d.id));
      const contar = (lista: FirebaseFirestore.QuerySnapshot, papel: string) =>
        lista.docs.filter(d => d.id !== dados.uid && ativos.has(d.id)).length + (ativo && posteriores.includes(papel) ? 1 : 0);
      const chefesDepois = contar(chefes, "Chefe_Geral");
      const gestoresDepois = contar(gestores, "Gestor_Bens_Patrimoniais");
      if (chefesDepois < 1) throw new HttpsError("failed-precondition", "O sistema deve conservar outro Chefe Geral ativo.");
      if (!dados.conceder && dados.papel === "Gestor_Bens_Patrimoniais" && atuais.includes(dados.papel) && gestoresDepois < 1)
        throw new HttpsError("failed-precondition", "Não revogar o último gestor patrimonial ativo.");
      const vinculos = !dados.conceder && dados.papel === "Gestor_Almoxarifado"
        ? await tx.get(db.collection("Gestor_Almoxarifado_x_Almoxarifado").where("id_gestor_almoxarifado", "==", dados.uid)) : null;
      if (vinculos) {
        for (const v of vinculos.docs) {
          const almId = v.data().id_almoxarifado;
          const alm = await tx.get(db.collection("Almoxarifado").doc(almId));
          if (alm.data()?.ativo === false) continue;
          const outros = await tx.get(db.collection("Gestor_Almoxarifado_x_Almoxarifado").where("id_almoxarifado", "==", almId));
          const candidatos = [...new Set(outros.docs.map(d => d.data().id_gestor_almoxarifado as string))].filter(id => id !== dados.uid);
          let outroAtivo = false;
          for (const id of candidatos) {
            const [u, p] = await tx.getAll(db.collection("Usuarios").doc(id), db.collection("Gestor_Almoxarifado").doc(id));
            if (u.data()?.ativo === true && p.exists) outroAtivo = true;
          }
          if (!outroAtivo) throw new HttpsError("failed-precondition", "Almoxarifado deve conservar gestor ativo.");
        }
      }
      // A partir daqui, somente escritas. Callbacks não executam Auth, e-mail ou PDF.
      const mudou = atuais.includes(dados.papel) !== dados.conceder || usuario.data()?.ativo !== ativo;
      const versao = (usuario.data()?.versao_permissoes ?? 0) + (mudou ? 1 : 0);
      tx.set(usuarioRef, {
        ...(!usuario.exists ? dados.identidade : {}), ativo, versao_permissoes: versao,
        claims_pendentes: true, atualizado_em: FieldValue.serverTimestamp(),
      }, { merge: true });
      if (dados.conceder && !atuais.includes(dados.papel)) {
        tx.create(db.collection(dados.papel).doc(dados.uid), {
          ...dados.perfil, id_usuario: dados.uid, ativo: true, createdAt: FieldValue.serverTimestamp(),
        });
        if (dados.papel === "Professor") for (const materia of new Set(dados.materias ?? [])) {
          const id = createHash("sha256").update(JSON.stringify([dados.uid, materia])).digest("hex");
          tx.set(db.collection("Professor_x_Materia").doc(id), { id_usuario: dados.uid, id_professor: dados.uid, id_materia: materia });
        }
      } else if (!dados.conceder && atuais.includes(dados.papel)) {
        tx.delete(db.collection(dados.papel).doc(dados.uid));
        vinculos?.docs.forEach(v => tx.delete(v.ref));
      }
      tx.set(controleRef, { chefes_ativos: chefesDepois, gestores_patrimoniais_ativos: gestoresDepois,
        versao: (controle.data()?.versao ?? 0) + 1 }, { merge: true });
      const resultado = { uid: dados.uid, ativo };
      tx.create(operacaoRef, { uid: dados.ator, acao: dados.conceder ? "CONCEDER_PAPEL" : "REVOGAR_PAPEL",
        recurso: dados.uid, hash_entrada: entrada, status: "CONCLUIDA", resultado,
        criado_em: FieldValue.serverTimestamp() });
      tx.set(auditRef, { id_usuario: dados.ator, acao: dados.conceder ? "CONCEDER_PAPEL" : "REVOGAR_PAPEL",
        tipo_entidade_sofre_acao: "USUARIO", id_do_objeto_da_entidade: dados.uid,
        acao_feita_em: FieldValue.serverTimestamp(), metadata: { papel: dados.papel, motivo: dados.motivo,
          resultado: mudou ? "APLICADO" : "SEM_ALTERACAO", situacao_conta: ativo ? "ATIVA" : "DESATIVADA" } });
      return resultado;
    });
  } catch (error) {
    // Fora do callback: registrar rejeição sem desfazer a tentativa já concluída.
    if (error instanceof HttpsError) await db.collection("Registro_de_Auditoria").doc(`rejeicao_${chave}_${entrada}`).set({
      id_usuario: dados.ator, acao: "ALTERACAO_PAPEL_REJEITADA", tipo_entidade_sofre_acao: "USUARIO",
      id_do_objeto_da_entidade: dados.uid, acao_feita_em: FieldValue.serverTimestamp(),
      metadata: { papel: dados.papel, motivo: dados.motivo, resultado: error.code },
    });
    throw error;
  }
}

export const convidarUsuario = onCall(async request => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(ConvidarUsuarioSchema, request.data);
  // Pré-checagem M9 antes de criar identidade Auth (efeito externo). A decisão
  // autoritativa é refeita por `alterarPapel` dentro da transação do efeito.
  await validarAutoridadePersistidaComClaims(claims, ["Chefe_Geral"]);
  let user;
  try { user = await admin.auth().getUserByEmail(dados.email); }
  catch (error: any) {
    if (error.code !== "auth/user-not-found") throw error;
    try { user = await admin.auth().createUser({ email: dados.email, displayName: dados.nome }); }
    catch (creation: any) {
      if (creation.code !== "auth/email-already-exists") throw creation;
      user = await admin.auth().getUserByEmail(dados.email);
    }
  }
  const perfil: Record<string, unknown> = { nome: dados.nome, email: dados.email };
  if (dados.papel === "Aluno") perfil.letra_inicial = dados.nome.charAt(0).toUpperCase();
  if (dados.papel === "Professor") { perfil.centro = dados.centro ?? "N/A"; perfil.laboratorio = dados.laboratorio ?? "N/A"; }
  const resultado = await alterarPapel({ ator: claims.uid, uid: user.uid, papel: dados.papel,
    conceder: true, motivo: dados.motivo ?? "Concessão solicitada pela chefia", idOperacao: dados.idOperacao ?? randomUUID(),
    perfil, identidade: { nome: dados.nome, email: dados.email }, materias: dados.materias ?? [] }, claims);
  await reconciliarClaimsUsuario(user.uid);
  const resetLink = await admin.auth().generatePasswordResetLink(dados.email);
  return { ...resultado, resetLink };
});

export const revogarUsuarioPapel = onCall(async request => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(RevogarUsuarioPapelSchema, request.data);
  let user;
  try { user = await admin.auth().getUserByEmail(dados.email); }
  catch { throw new HttpsError("not-found", "Usuário não encontrado."); }
  // A decisão autoritativa é tomada dentro da transação de `alterarPapel`.
  const resultado = await alterarPapel({ ator: claims.uid, uid: user.uid, papel: dados.papel,
    conceder: false, motivo: dados.motivo, idOperacao: dados.idOperacao ?? randomUUID() }, claims);
  await reconciliarClaimsUsuario(user.uid);
  return resultado;
});

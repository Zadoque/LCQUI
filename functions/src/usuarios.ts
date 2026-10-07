import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { createHash, randomUUID } from "crypto";
import {
  ClaimsAutoridade,
  PAPEIS_CONHECIDOS,
  extrairClaimsAutoridade,
  resolverAutoridadePersistidaTx,
  validarAutoridadePersistida,
  validarAutoridadePersistidaComClaims,
  validarMatrizPapeis,
} from "./auth";
import {
  construirIdentidade,
  registrarOperacaoConcluidaTx,
  registrarOperacaoPendenteTx,
  concluirOperacaoPendenteTx,
  resolverOperacaoTx,
} from "./idempotencia";
import { validatePayload } from "./utils/validation";
import { ConvidarUsuarioSchema, RevogarUsuarioPapelSchema, BuscarAlunosSchema, BuscarProfessoresSchema, BuscarGestoresAlmoxarifadoSchema, BuscarUsuariosPapelSchema, AtualizarPerfilSchema } from "./schemas/usuarios.schema";

const PAPEIS: string[] = [...PAPEIS_CONHECIDOS];

type Mutacao = {
  ator: string; uid: string; papel: string; conceder: boolean; motivo: string;
  idOperacao: string; perfil?: Record<string, unknown>; identidade?: { nome: string; email: string };
  materias?: string[];
  etapaAuthPendente?: boolean;
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
        return { roles: usuario.data()!.ativo === true ? roles : [], versao: usuario.data()!.versao_permissoes ?? 0, ativo: usuario.data()!.ativo === true };
      });
      const authUser = await admin.auth().getUser(uid);
      await admin.auth().setCustomUserClaims(uid, {
        ...authUser.customClaims, roles: estado.roles, versao_permissoes: estado.versao, ativo: estado.ativo,
      });
      const atual = await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (snap.data()?.versao_permissoes !== estado.versao) return false;
        tx.update(ref, { claims_pendentes: false });
        return true;
      });
      if (atual) {
        // M9/RN-ROLE-14: etapa externa pós-commit. Revogar refresh tokens impede
        // que o ID token antigo continue sendo aceito até a renovação. Falha aqui
        // não reabre a autorização persistida já bloqueada.
        try {
          await admin.auth().revokeRefreshTokens(uid);
        } catch {
          // Reconciliável em nova tentativa; não falha a mutação persistida.
        }
        return;
      }
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
  // M7: identidade canônica (uid, tipo_operacao, payload_hash); `idOperacao` é o
  // próprio id do receipt e não entra no payload/hash.
  const tipoOperacao = dados.conceder ? "CONCEDER_PAPEL" : "REVOGAR_PAPEL";
  const identidade = construirIdentidade(claims.uid, tipoOperacao, {
    uidAlvo: dados.uid,
    papel: dados.papel,
    conceder: dados.conceder,
    motivo: dados.motivo,
    perfil: dados.perfil,
    identidade: dados.identidade,
    materias: dados.materias,
  });
  const auditRef = db.collection("Registro_de_Auditoria").doc(`papel_${dados.idOperacao}`);
  try {
    return await db.runTransaction(async tx => {
      const controle = await tx.get(controleRef);
      // M7: replay devolve o resultado persistido; reuso incompatível falha fechado.
      const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
      if (decisao.estado === "REPLAY") {
        return decisao.resultado as { uid: string; ativo: boolean };
      }
      if (decisao.estado === "PENDENTE") {
        return decisao.resultado as { uid: string; ativo: boolean };
      }
      if (decisao.estado !== "NOVA") {
        throw new HttpsError("failed-precondition", "Operação de papel não concluída.");
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
      if (dados.etapaAuthPendente) {
        registrarOperacaoPendenteTx(tx, dados.idOperacao, identidade, resultado);
      } else {
        registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
      }
      tx.set(auditRef, { id_usuario: dados.ator, acao: dados.conceder ? "CONCEDER_PAPEL" : "REVOGAR_PAPEL",
        tipo_entidade_sofre_acao: "USUARIO", id_do_objeto_da_entidade: dados.uid,
        acao_feita_em: FieldValue.serverTimestamp(), metadata: { papel: dados.papel, motivo: dados.motivo,
          resultado: mudou ? "APLICADO" : "SEM_ALTERACAO", situacao_conta: ativo ? "ATIVA" : "DESATIVADA" } });
      return resultado;
    });
  } catch (error) {
    // Fora do callback: registrar rejeição sem desfazer a tentativa já concluída.
    if (error instanceof HttpsError) await db.collection("Registro_de_Auditoria").doc(`rejeicao_${dados.idOperacao}`).set({
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
  const operacaoExistente = await admin.firestore().collection("Operacoes").doc(dados.idOperacao).get();
  const resultadoExistente = operacaoExistente.data()?.resultado;
  if (operacaoExistente.data()?.status === "CONCLUIDA" && resultadoExistente && typeof resultadoExistente === "object") {
    return resultadoExistente;
  }
  let uid: string;
  let identidadeAuth: admin.auth.UserRecord | undefined;
  let contaAuthExistente = false;
  if (operacaoExistente.data()?.status === "PENDENTE" && resultadoExistente && typeof resultadoExistente === "object"
    && typeof (resultadoExistente as Record<string, unknown>).uid === "string") {
    // Após qualquer falha pós-commit, o UID reservado no receipt é a identidade
    // estável do retry, mesmo que a conta Auth ainda não exista.
    uid = (resultadoExistente as Record<string, string>).uid;
    try {
      identidadeAuth = await admin.auth().getUser(uid);
      contaAuthExistente = true;
    } catch (error: any) {
      if (error.code !== "auth/user-not-found") throw error;
    }
  } else {
    try {
      identidadeAuth = dados.uidAlvo
        ? await admin.auth().getUser(dados.uidAlvo)
        : await admin.auth().getUserByEmail(dados.email!);
      uid = identidadeAuth.uid;
      contaAuthExistente = true;
    } catch (error: any) {
      if (error.code !== "auth/user-not-found") throw error;
      // UID reservado não é efeito externo: permite que o commit M9 aconteça
      // antes do provisionamento Auth.
      uid = randomUUID();
    }
  }
  if (contaAuthExistente && !identidadeAuth) identidadeAuth = await admin.auth().getUser(uid);
  const usuarioExistente = await admin.firestore().collection("Usuarios").doc(uid).get();
  const nome = dados.nome ?? usuarioExistente.data()?.nome ?? identidadeAuth?.displayName;
  const email = dados.email ?? identidadeAuth?.email;
  if (typeof nome !== "string" || !nome.trim() || typeof email !== "string" || !email.trim()) {
    throw new HttpsError("failed-precondition", "A identidade existente não possui nome e e-mail válidos.");
  }
  const perfil: Record<string, unknown> = { nome: nome.trim(), email: email.trim() };
  if (dados.papel === "Aluno") perfil.letra_inicial = nome.trim().charAt(0).toUpperCase();
  if (dados.papel === "Professor") { perfil.centro = dados.centro ?? "N/A"; perfil.laboratorio = dados.laboratorio ?? "N/A"; }
  const resultado = await alterarPapel({ ator: claims.uid, uid, papel: dados.papel,
    conceder: true, motivo: dados.motivo ?? "Concessão solicitada pela chefia", idOperacao: dados.idOperacao,
    perfil, identidade: { nome: nome.trim(), email: email.trim() }, materias: dados.materias ?? [], etapaAuthPendente: true }, claims);
  if (!contaAuthExistente) {
    try {
      await admin.auth().createUser({ uid, email: email.trim(), displayName: nome.trim() });
    } catch (error: any) {
      // Corrida de e-mail deixa a operação PENDENTE; retry/reconciliação
      // reconhece a intenção sem reaplicar o papel Firestore.
      if (error.code !== "auth/email-already-exists") throw error;
      throw new HttpsError("unavailable", "Provisionamento Auth pendente; repetir a mesma operação.");
    }
  }
  await reconciliarClaimsUsuario(uid);
  const resetLink = await admin.auth().generatePasswordResetLink(email.trim());
  await admin.firestore().runTransaction(async tx => {
    await concluirOperacaoPendenteTx(tx, dados.idOperacao, { ...resultado, resetLink });
  });
  return { ...resultado, resetLink };
});

/** UI-02/M9: diretório mínimo para selecionar identidade já existente. */
export const buscarUsuariosParaPapel = onCall(async request => {
  const { termo } = validatePayload(BuscarUsuariosPapelSchema, request.data);
  await validarAutoridadePersistida(request, ["Chefe_Geral"]);
  const db = admin.firestore();
  const usuarios = await db.collection("Usuarios").where("ativo", "==", true).limit(200).get();
  const termoNormalizado = termo?.toLowerCase() ?? "";
  const papeisPorUsuario = new Map<string, string[]>();
  for (const papel of PAPEIS) {
    const docs = await db.collection(papel).limit(200).get();
    for (const doc of docs.docs) {
      const papeis = papeisPorUsuario.get(doc.id) ?? [];
      papeis.push(papel);
      papeisPorUsuario.set(doc.id, papeis);
    }
  }
  const resultado = usuarios.docs
    .map(doc => {
      const data = doc.data();
      const nome = typeof data.nome === "string" && data.nome.trim() ? data.nome.trim() : "Sem nome";
      return { id: doc.id, nome, papeis: papeisPorUsuario.get(doc.id) ?? [] };
    })
    .filter(usuario => !termoNormalizado || usuario.nome.toLowerCase().includes(termoNormalizado))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id))
    .slice(0, 100);
  return { usuarios: resultado };
});

export const revogarUsuarioPapel = onCall(async request => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(RevogarUsuarioPapelSchema, request.data);
  let user;
  try { user = await admin.auth().getUserByEmail(dados.email); }
  catch { throw new HttpsError("not-found", "Usuário não encontrado."); }
  // A decisão autoritativa é tomada dentro da transação de `alterarPapel`.
  const resultado = await alterarPapel({ ator: claims.uid, uid: user.uid, papel: dados.papel,
    conceder: false, motivo: dados.motivo, idOperacao: dados.idOperacao }, claims);
  await reconciliarClaimsUsuario(user.uid);
  return resultado;
});

/**
 * S11: busca server-side de alunos para uso por professores/Chefe na UI.
 * Retorna projeção mínima { id, nome }. Nunca expõe e-mail, matrícula ou
 * letra inicial. O termo pode comparar nome/matricula no servidor, mas o
 * payload cliente só recebe id+nome.
 */
export const buscarAlunos = onCall(async request => {
  const { letra, termo } = validatePayload(BuscarAlunosSchema, request.data);

  // M9: autoridade persistida (Professor ou Chefe_Geral).
  await validarAutoridadePersistida(request, ["Professor", "Chefe_Geral"]);

  const db = admin.firestore();

  // Fail-closed: exigir critério de busca para evitar listagem ampla.
  if (!letra && !termo) {
    return { alunos: [] };
  }

  let consulta: admin.firestore.Query = db.collection("Aluno");

  if (letra) {
    consulta = consulta.where("letra_inicial", "==", letra);
  }

  // Limite de segurança; filtro por termo ocorre em memória sobre o limite.
  consulta = consulta.limit(200);

  const snap = await consulta.get();
  const termoNormalizado = termo ? termo.trim().toLowerCase() : "";

  const alunos = snap.docs
    .map(doc => {
      const data = doc.data();
      const nome = typeof data.nome === "string" ? data.nome : "Sem nome";
      const numeroMatricula = typeof data.numero_matricula === "string" ? data.numero_matricula : "";
      return { id: doc.id, nome, numeroMatricula };
    })
    .filter(item => {
      if (!termoNormalizado) return true;
      return (
        item.nome.toLowerCase().includes(termoNormalizado) ||
        item.numeroMatricula.toLowerCase().includes(termoNormalizado)
      );
    })
    .slice(0, 100)
    .map(({ id, nome }) => ({ id, nome }));

  return { alunos };
});

/**
 * S8 UI-02/UI-13: busca server-side de professores para uso por professores/Chefe
 * na UI de diretório mínimo. Retorna projeção mínima { id, nome }.
 * Nunca expõe e-mail, centro ou laboratório.
 * Nome vem de Usuarios/{uid}.nome — fonte canônica; o doc Professor pode não ter nome.
 */
export const buscarProfessores = onCall(async request => {
  const { termo } = validatePayload(BuscarProfessoresSchema, request.data);

  // M9: autoridade persistida (Professor ou Chefe_Geral).
  await validarAutoridadePersistida(request, ["Professor", "Chefe_Geral"]);

  const db = admin.firestore();

  const snap = await db.collection("Professor").limit(200).get();
  const ids = snap.docs.map(d => d.id);

  if (ids.length === 0) return { professores: [] };

  const usuarioSnaps = await db.getAll(...ids.map(id => db.collection("Usuarios").doc(id)));
  const nomePorId = new Map<string, string>();
  usuarioSnaps.forEach(s => {
    const n = s.exists ? (s.data()?.nome as string | undefined) : undefined;
    nomePorId.set(s.id, typeof n === "string" && n.trim() ? n.trim() : "Sem nome");
  });

  const termoNorm = termo ? termo.trim().toLowerCase() : "";
  const professores = ids
    .map(id => ({ id, nome: nomePorId.get(id) ?? "Sem nome" }))
    .filter(p => !termoNorm || p.nome.toLowerCase().includes(termoNorm))
    .slice(0, 100);

  return { professores };
});

/** UI-03/M9: projeção mínima de gestores ativos de almoxarifado. */
export const buscarGestoresAlmoxarifado = onCall(async request => {
  const { termo } = validatePayload(BuscarGestoresAlmoxarifadoSchema, request.data);
  await validarAutoridadePersistida(request, ["Chefe_Geral"]);
  const db = admin.firestore();
  const papeis = await db.collection("Gestor_Almoxarifado").limit(200).get();
  if (papeis.empty) return { gestores: [] };
  const usuarios = await db.getAll(...papeis.docs.map(d => db.collection("Usuarios").doc(d.id)));
  const termoNorm = termo ? termo.toLowerCase() : "";
  const gestores = papeis.docs.map((papel, i) => {
    if (!usuarios[i].exists || usuarios[i].data()?.ativo !== true) return null;
    const nome = usuarios[i].exists && typeof usuarios[i].data()?.nome === "string" && usuarios[i].data()?.nome.trim()
      ? usuarios[i].data()!.nome.trim() : "Sem nome";
    return { id: papel.id, nome };
  }).filter((g): g is { id: string; nome: string } => g !== null && (!termoNorm || g.nome.toLowerCase().includes(termoNorm))).slice(0, 100);
  return { gestores };
});

/**
 * S8 UI-01 L191: atualiza o nome do próprio usuário (self-service).
 * Propaga a projeção de nome para perfis de papel e vínculos canônicos de turma.
 * Preserva eventos históricos (HistoricoAlunos, Posts, Comentários).
 */
export const atualizarPerfil = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Autenticação obrigatória.");
  }

  const { nome } = validatePayload(AtualizarPerfilSchema, request.data);

  const db = admin.firestore();
  const usuarioRef = db.collection("Usuarios").doc(uid);
  const alunoRef = db.collection("Aluno").doc(uid);
  const professorRef = db.collection("Professor").doc(uid);
  const bolsistaRef = db.collection("Bolsista").doc(uid);

  await db.runTransaction(async (tx) => {
    // --- Todas as leituras primeiro (Firestore exige reads antes de writes na transação) ---
    const usuarioSnap = await tx.get(usuarioRef);
    if (!usuarioSnap.exists) {
      throw new HttpsError("not-found", "Usuário não encontrado.");
    }
    if (usuarioSnap.data()?.ativo !== true) {
      throw new HttpsError("permission-denied", "Usuário inativo não pode atualizar perfil.");
    }

    const [alunoSnap, professorSnap, bolsistaSnap] = await tx.getAll(alunoRef, professorRef, bolsistaRef);

    // Espelho de turmas do usuário
    const turmasEspelhoSnap = await tx.get(db.collection("Usuarios").doc(uid).collection("Turmas"));

    // Vínculos canônicos de turma (para propagar nome)
    const turmaVinculoRefs = turmasEspelhoSnap.docs.map(doc =>
      db.collection("Turma").doc(doc.id).collection("Alunos").doc(uid)
    );
    const turmaVinculoSnaps = turmaVinculoRefs.length > 0
      ? await tx.getAll(...turmaVinculoRefs)
      : [];

    // --- Escritas ---
    // 1. Usuarios/{uid}
    tx.update(usuarioRef, {
      nome,
      atualizado_em: FieldValue.serverTimestamp(),
    });

    // 2. Aluno/{uid} — nome + letra_inicial
    if (alunoSnap.exists) {
      tx.update(alunoRef, {
        nome,
        letra_inicial: nome.charAt(0).toUpperCase(),
      });
    }

    // 3. Professor/{uid} — nome
    if (professorSnap.exists) {
      tx.update(professorRef, { nome });
    }

    // 4. Bolsista/{uid} — nome (apenas se o doc tiver campo nome)
    if (bolsistaSnap.exists && "nome" in (bolsistaSnap.data() ?? {})) {
      tx.update(bolsistaRef, { nome });
    }

    // 5. Vínculos canônicos de turma — propagar nome se o vínculo existir
    for (let i = 0; i < turmaVinculoSnaps.length; i++) {
      if (turmaVinculoSnaps[i].exists) {
        tx.update(turmaVinculoRefs[i], { nome });
      }
    }
  });

  // Efeito externo pós-commit: atualizar displayName no Auth.
  // Falha aqui não desfaz o Firestore; apenas logue.
  try {
    await admin.auth().updateUser(uid, { displayName: nome });
  } catch (error) {
    console.error("Falha ao atualizar displayName no Auth para uid=%s:", uid, error);
  }

  return { sucesso: true };
});

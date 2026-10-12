import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth, UserRecord } from "firebase-admin/auth";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chaveAlunoMatricula, chaveLocal, chaveMateria, chaveTurmaCodigo, normalizarCodigoMateria } from "../src/chaves";
import { importedReagents } from "./reagentesSeedData";

/** Fixture manual canônica M9/M11/M13. Recusa qualquer execução fora dos emuladores. */
const ALLOWED_PROJECT_IDS = new Set(["lcqui-dev"]);
const PASSWORD = "Test123456!";
const FIXTURE_TIME = Timestamp.fromDate(new Date("2026-01-15T12:00:00.000Z"));
type Role = "Chefe_Geral" | "Gestor_Almoxarifado" | "Gestor_Bens_Patrimoniais" | "Professor" | "Aluno" | "Bolsista";
type FixtureId = "chefe" | "professor.owner" | "professor.outsider" | "gestor.almoxarifado" | "gestor.patrimonial" | "bolsista" | "aluno.normal" | "aluno.authOnly" | "aluno.unverified" | "aluno.disabled" | "aluno.enrolled" | "aluno.removed" | "aluno.noAuth" | "aluno.colegaA" | "aluno.colegaB";
interface FixtureUser { id: FixtureId; uid: string; email: string; name: string; roles: readonly Role[]; emailVerified: boolean; disabled: boolean; activeDocument: boolean; matricula?: string; note: string; }

const users: readonly FixtureUser[] = [
  { id: "chefe", uid: "seed-chefe-geral", email: "chefe.seed@lcqui.local", name: "Chefe Geral (Seed)", roles: ["Chefe_Geral"], emailVerified: true, disabled: false, activeDocument: true, note: "convite administrativo ordinário" },
  { id: "professor.owner", uid: "seed-professor-alpha", email: "professor.alpha@lcqui.local", name: "Professor Alpha", roles: ["Professor"], emailVerified: true, disabled: false, activeDocument: true, note: "dono das turmas T1–T4" },
  { id: "professor.outsider", uid: "seed-professor-beta", email: "professor.beta@lcqui.local", name: "Professor Beta", roles: ["Professor"], emailVerified: true, disabled: false, activeDocument: true, note: "terceiro para teste de ownership" },
  { id: "gestor.almoxarifado", uid: "seed-gestor-almox", email: "gestor.almoxarifado@lcqui.local", name: "Gestor de Almoxarifado (Seed)", roles: ["Gestor_Almoxarifado"], emailVerified: true, disabled: false, activeDocument: true, note: "papel M9 isolado" },
  { id: "gestor.patrimonial", uid: "seed-gestor-patrimonio", email: "gestor.patrimonial@lcqui.local", name: "Gestor Patrimonial (Seed)", roles: ["Gestor_Bens_Patrimoniais"], emailVerified: true, disabled: false, activeDocument: true, note: "papel M9 isolado" },
  { id: "bolsista", uid: "seed-bolsista", email: "bolsista.seed@lcqui.local", name: "Bolsista (Seed)", roles: ["Aluno", "Bolsista"], emailVerified: true, disabled: false, activeDocument: true, matricula: "2026000999", note: "combinação válida Bolsista ⇒ Aluno" },
  { id: "aluno.normal", uid: "seed-aluno-normal", email: "aluno.normal@lcqui.local", name: "Aluno Normal", roles: ["Aluno"], emailVerified: true, disabled: false, activeDocument: true, matricula: "2026000101", note: "sem vínculo e sem convite no baseline" },
  { id: "aluno.authOnly", uid: "seed-aluno-auth-only", email: "aluno.authonly@lcqui.local", name: "Conta Auth sem papel Aluno", roles: [], emailVerified: true, disabled: false, activeDocument: true, note: "bootstrap de convite: Usuarios.ativo=true, zero papéis" },
  { id: "aluno.unverified", uid: "seed-aluno-unverified", email: "aluno.nao.verificado@lcqui.local", name: "Aluno Não Verificado", roles: [], emailVerified: false, disabled: false, activeDocument: false, note: "conta Auth sem identidade autorizativa" },
  { id: "aluno.disabled", uid: "seed-aluno-disabled", email: "aluno.disabled@lcqui.local", name: "Aluno Auth Desabilitado", roles: [], emailVerified: true, disabled: true, activeDocument: false, note: "fail-closed no Auth" },
  { id: "aluno.enrolled", uid: "seed-aluno-enrolled", email: "aluno.matriculado@lcqui.local", name: "Aluno Matriculado", roles: ["Aluno"], emailVerified: true, disabled: false, activeDocument: true, matricula: "00020260102", note: "membro preexistente da turma de última vaga" },
  { id: "aluno.removed", uid: "seed-aluno-removed", email: "aluno.removido@lcqui.local", name: "Aluno Removido", roles: ["Aluno"], emailVerified: true, disabled: false, activeDocument: true, matricula: "2026000103", note: "histórico de exclusão, sem vínculo atual" },
  { id: "aluno.noAuth", uid: "seed-no-auth", email: "novo.aluno@seed.local", name: "Sem conta Auth", roles: [], emailVerified: false, disabled: false, activeDocument: false, note: "não criar Auth; fluxo OOB deve ser exercitado pelo convite" },
  { id: "aluno.colegaA", uid: "seed-aluno-colega-a", email: "aluno.colega.a@lcqui.local", name: "Aluno Colega A", roles: ["Aluno"], emailVerified: true, disabled: false, activeDocument: true, matricula: "2026000201", note: "colega da turma de projeção" },
  { id: "aluno.colegaB", uid: "seed-aluno-colega-b", email: "aluno.colega.b@lcqui.local", name: "Aluno Colega B", roles: ["Aluno"], emailVerified: true, disabled: false, activeDocument: true, matricula: "2026000202", note: "colega da turma de projeção" },
];
const byId = (id: FixtureId): FixtureUser => { const found = users.find((user) => user.id === id); if (!found) throw new Error(`Fixture ausente: ${id}`); return found; };
const alpha = byId("professor.owner").uid;
const beta = byId("professor.outsider").uid;
const profMaterias = [{ professor: alpha, materia: "materia-quimica-geral" }, { professor: alpha, materia: "materia-quimica-analitica" }, { professor: beta, materia: "materia-quimica-geral" }];

function projectId(): string {
  const value = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "lcqui-dev";
  if (!ALLOWED_PROJECT_IDS.has(value)) throw new Error(`SEED ABORTADO: projectId não permitido: ${value}`);
  return value;
}
function assertEmulatorOnly(id: string): { firestoreHost: string; authHost: string } {
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!firestoreHost || !authHost) throw new Error("SEED ABORTADO: FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST são obrigatórios.");
  const rawConfig = process.env.FIREBASE_CONFIG;
  if (rawConfig) {
    try {
      const config = JSON.parse(rawConfig) as { projectId?: unknown };
      if (config.projectId !== undefined && config.projectId !== id) throw new Error("SEED ABORTADO: FIREBASE_CONFIG e projectId divergem.");
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith("SEED ABORTADO")) throw error;
      throw new Error("SEED ABORTADO: FIREBASE_CONFIG não é JSON verificável.");
    }
  }
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? "127.0.0.1:9199";
  process.env.STORAGE_EMULATOR_HOST = process.env.STORAGE_EMULATOR_HOST ?? "http://127.0.0.1:9199";
  console.log("EMULATOR MODE CONFIRMED"); console.log(`projectId: ${id}`); console.log(`Firestore host: ${firestoreHost}`); console.log(`Auth host: ${authHost}`); console.log(`Storage host: ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`);
  return { firestoreHost, authHost };
}
function dbApp(id: string) { return getApps()[0] ?? initializeApp({ projectId: id, storageBucket: `${id}.appspot.com` }); }

async function reset(firestoreHost: string, id: string): Promise<void> {
  console.log("RESETTING EMULATOR DATA");
  const response = await fetch(`http://${firestoreHost}/emulator/v1/projects/${id}/databases/(default)/documents`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Falha ao resetar Firestore Emulator: HTTP ${response.status}`);
  const auth = getAuth(); let pageToken: string | undefined;
  do { const page = await auth.listUsers(1000, pageToken); if (page.users.length) await auth.deleteUsers(page.users.map((user) => user.uid)); pageToken = page.pageToken; } while (pageToken);
  // Limpa o Storage Emulator para manter o seed idempotente.
  try {
    const [files] = await admin.storage().bucket().getFiles();
    await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
  } catch (err) {
    console.error("Falha ao limpar Storage Emulator:", err);
  }
}
const authInput = (user: FixtureUser) => ({ uid: user.uid, email: user.email, password: PASSWORD, displayName: user.name, emailVerified: user.emailVerified, disabled: user.disabled });
async function ensureAuth(user: FixtureUser): Promise<UserRecord> {
  try {
    const found = await getAuth().getUserByEmail(user.email);
    assert.equal(found.uid, user.uid, `${user.id}: UID divergente; use --reset`); assert.equal(found.disabled, user.disabled, `${user.id}: disabled divergente; use --reset`); assert.equal(found.emailVerified, user.emailVerified, `${user.id}: emailVerified divergente; use --reset`); return found;
  } catch (error: unknown) { if ((error as { code?: string }).code !== "auth/user-not-found") throw error; return getAuth().createUser(authInput(user)); }
}
const usuarioData = (user: FixtureUser) => ({ nome: user.name, email: user.email, letra_inicial: user.name.trim().charAt(0).toUpperCase(), ativo: true, versao_permissoes: 1, claims_pendentes: false, atualizado_em: FIXTURE_TIME });

async function writeImportedReagents(firestore: FirebaseFirestore.Firestore): Promise<void> {
  // O Firestore limita um WriteBatch a 500 operações. Mantemos margem para
  // futuras colunas do contrato e gravamos os espelhos nested/top-level juntos.
  let batch = firestore.batch();
  let pending = 0;
  const set = (ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData): void => {
    batch.set(ref, data);
    pending += 1;
  };
  const flush = async (): Promise<void> => {
    if (!pending) return;
    await batch.commit();
    batch = firestore.batch();
    pending = 0;
  };

  for (const reagent of importedReagents) {
    const resumoRef = firestore.collection("Resumo_Reagente").doc(reagent.id);
    const substanciaRef = firestore.collection("Substancia_Quimica").doc(`${reagent.id}-substancia`);
    const especificacaoRef = resumoRef.collection("Especificacoes").doc(`${reagent.id}-especificacao`);
    const resumoData = {
      id: resumoRef.id,
      nome: reagent.nome,
      letra_inicial: reagent.nome.trim().charAt(0).toUpperCase(),
      tipo_substancia: reagent.tipo_substancia,
      natureza_quimica: reagent.natureza_quimica,
      requer_pesagem_frequente: false,
      frequencia_pesagem_dias: null,
      estado_fisico: reagent.estado_fisico,
      eh_higroscopico: false,
      qtd_em_que_e_considerado_escasso: 1,
      rotulos_origem: reagent.rotulos_origem,
      consulta_quimica: reagent.query,
      criado_em: FIXTURE_TIME,
      criado_por: byId("gestor.almoxarifado").uid,
    };
    set(resumoRef, resumoData);

    // A mistura não é uma substância química única. Sua especificação só
    // pode ser materializada quando houver componentes reais em composicao[];
    // o seed não inventa um componente com o nome comercial da mistura.
    if (reagent.tipo_substancia === "MISTURA") {
      continue;
    }

    set(substanciaRef, {
      id: substanciaRef.id,
      nome: reagent.nome,
      cas_number: reagent.cas_number,
      formula_quimica: reagent.formula_quimica,
      ativo: true,
      criado_em: FIXTURE_TIME,
      criado_por: byId("gestor.almoxarifado").uid,
    });
    if (reagent.cas_number) {
      set(firestore.collection("Chaves_Unicas").doc(`Substancia_Quimica__CAS__${reagent.cas_number}`), {
        tipo: "Substancia_Quimica_CAS",
        id_recurso: substanciaRef.id,
        chave_recurso: reagent.cas_number,
        criado_em: FIXTURE_TIME,
      });
    }

    // O par normativo exige densidade positiva para qualquer resumo LIQUIDO.
    // Rótulos sem densidade documental não são transformados em especificação
    // inventada; o resumo permanece disponível para reconciliação.
    if (reagent.estado_fisico === "LIQUIDO" && reagent.densidade === null) {
      continue;
    }
    const especificacaoData = {
      id: especificacaoRef.id,
      id_resumo_reagente: resumoRef.id,
      descricao: reagent.rotulos_origem.join("; ").slice(0, 150),
      fabricante: null,
      codigo_produto_fabricante: null,
      grau_pureza: reagent.grau_pureza,
      densidade: reagent.densidade,
      unidade_de_medida: reagent.estado_fisico === "LIQUIDO" ? "ml" : "g",
      classe_inflamabilidade: reagent.classe_inflamabilidade,
      eh_controlado_pf: false,
      eh_controlado_eb: false,
      link_fds_fispq: null,
      composicao: [{
        id_substancia_quimica: substanciaRef.id,
        valor_min: null,
        valor_max: null,
        tipo_concentracao: "M_M",
        notacao_original_fabricante: null,
      }],
      criado_em: FIXTURE_TIME,
      criado_por: byId("gestor.almoxarifado").uid,
    };
    set(especificacaoRef, especificacaoData);
    set(firestore.collection("Especificacao_Reagente").doc(especificacaoRef.id), especificacaoData);
    if (pending >= 400) await flush();
  }
  await flush();
}

async function writeFixture(): Promise<void> {
  const firestore = getFirestore(); const batch = firestore.batch();
  for (const user of users.filter((item) => item.activeDocument)) {
    batch.set(firestore.collection("Usuarios").doc(user.uid), usuarioData(user));
    for (const role of user.roles) batch.set(firestore.collection(role).doc(user.uid), role === "Professor" ? { id_usuario: user.uid, ativo: true, centro: "CCT", laboratorio: "Laboratório de Química" } : { id_usuario: user.uid });
    if (user.matricula) { batch.set(firestore.collection("Aluno").doc(user.uid), { id_usuario: user.uid, numero_matricula: user.matricula, nome: user.name, letra_inicial: user.name.charAt(0).toUpperCase() }); batch.set(firestore.collection("Chaves_Unicas").doc(chaveAlunoMatricula(user.matricula)), { tipo: "Aluno", id_recurso: user.uid, matricula: user.matricula, criado_em: FIXTURE_TIME }); }
  }
  batch.set(firestore.collection("Controle_Papeis").doc("singleton"), {
    chefes_ativos: 1,
    gestores_patrimoniais_ativos: 1,
    versao: 1,
  });
  const materias = [
    { id: "materia-quimica-geral", nome: "Química Geral", codigo: "QUI101" },
    { id: "materia-quimica-analitica", nome: "Química Analítica", codigo: "QUI202" },
    { id: "materia-ead07144", nome: "Química Orgânica I (2021)", codigo: "EAD07144" },
    { id: "materia-ead07146", nome: "Química Orgânica II (2021)", codigo: "EAD07146" },
    { id: "materia-ead07156", nome: "Química Ambiental", codigo: "EAD07156" },
    { id: "materia-ead07157", nome: "Físico Química I", codigo: "EAD07157" },
    { id: "materia-ead07158", nome: "Físico Química II", codigo: "EAD07158" },
    { id: "materia-int10521", nome: "Filosofia da Educação", codigo: "INT10521" },
    { id: "materia-int10522", nome: "Química Teórica e Estrutural", codigo: "INT10522" },
    { id: "materia-int10523", nome: "Síntese Química", codigo: "INT10523" },
    { id: "materia-int10524", nome: "Teoria e Desenvolvimento Curricular", codigo: "INT10524" },
    { id: "materia-int10525", nome: "Tratamento de Águas e Efluentes", codigo: "INT10525" },
    { id: "materia-qui01102", nome: "Química Geral I (2016)", codigo: "QUI01102" },
    { id: "materia-qui01103", nome: "Laboratório de Química Geral I (2006)", codigo: "QUI01103" },
    { id: "materia-qui01108", nome: "Laboratório de Química Analítica", codigo: "QUI01108" },
    { id: "materia-qui01109", nome: "Química Analítica", codigo: "QUI01109" },
    { id: "materia-qui01203", nome: "Química Geral II (2003)", codigo: "QUI01203" },
    { id: "materia-qui01206", nome: "Química Orgânica", codigo: "QUI01206" },
    { id: "materia-qui01217", nome: "Laboratório de Química", codigo: "QUI01217" },
    { id: "materia-qui012689", nome: "Linguagem da Natureza: Integração de Saberes e Práticas", codigo: "QUI012689" },
    { id: "materia-qui01314", nome: "Introdução Aos Processos da Indústria Química", codigo: "QUI01314" },
    { id: "materia-qui013232", nome: "Laboratório de Química Orgânica I (2026)", codigo: "QUI013232" },
    { id: "materia-qui013371", nome: "Química Inorgânica II", codigo: "QUI013371" },
    { id: "materia-qui013372", nome: "Laboratório de Química Inorgânica I", codigo: "QUI013372" },
    { id: "materia-qui013453", nome: "Laboratório de Química Analítica II", codigo: "QUI013453" },
    { id: "materia-qui013552", nome: "Laboratório de Físico-Química II", codigo: "QUI013552" },
    { id: "materia-qui01410", nome: "Metodos Fisicos de Analise II (2003)", codigo: "QUI01410" },
    { id: "materia-qui01411", nome: "Atividades Acadêmico-Científico-Culturais", codigo: "QUI01411" },
    { id: "materia-qui01412", nome: "Metodos Fisicos de Analise II (2004)", codigo: "QUI01412" },
    { id: "materia-qui014242", nome: "Laboratório de Química Orgânica II (2026)", codigo: "QUI014242" },
    { id: "materia-qui014441", nome: "Química Analítica I (2026)", codigo: "QUI014441" },
    { id: "materia-qui014442", nome: "Laboratório de Química Analítica I (2026)", codigo: "QUI014442" },
    { id: "materia-qui014542", nome: "Laboratório de Físico-Química I", codigo: "QUI014542" },
    { id: "materia-qui014688", nome: "Análise Instrumental", codigo: "QUI014688" },
    { id: "materia-qui01501", nome: "Quimica Bioorganica", codigo: "QUI01501" },
    { id: "materia-qui01504", nome: "Quimica Bioinorganica", codigo: "QUI01504" },
    { id: "materia-qui01506", nome: "Teatro de Divulgação Científica", codigo: "QUI01506" },
    { id: "materia-qui01507", nome: "Teatro de Divulgação Científica II", codigo: "QUI01507" },
    { id: "materia-qui01588", nome: "Eletroquímica Aplicada", codigo: "QUI01588" },
    { id: "materia-qui11011", nome: "Metodologia Científica", codigo: "QUI11011" },
    { id: "materia-qui11012", nome: "Introdução a Metrologia Científica", codigo: "QUI11012" },
    { id: "materia-qui11111", nome: "Química Geral I (2013)", codigo: "QUI11111" },
    { id: "materia-qui11112", nome: "Laboratório de Química Geral I (2013)", codigo: "QUI11112" },
    { id: "materia-qui11121", nome: "Química Geral II (2020)", codigo: "QUI11121" },
    { id: "materia-qui11122", nome: "Laboratório de Química Geral II", codigo: "QUI11122" },
    { id: "materia-qui11231", nome: "Química Orgânica I (2013)", codigo: "QUI11231" },
    { id: "materia-qui11232", nome: "Laboratório de Química Orgânica I (2013)", codigo: "QUI11232" },
    { id: "materia-qui11241", nome: "Química Orgânica II (2013)", codigo: "QUI11241" },
    { id: "materia-qui11242", nome: "Laboratório de Química Orgânica II (2013)", codigo: "QUI11242" },
    { id: "materia-qui11251", nome: "Química Orgânica III", codigo: "QUI11251" },
    { id: "materia-qui11341", nome: "Química Inorgânica I", codigo: "QUI11341" },
    { id: "materia-qui11441", nome: "Química Analítica I (2024)", codigo: "QUI11441" },
    { id: "materia-qui11442", nome: "Laboratório de Química Analítica I (2012)", codigo: "QUI11442" },
    { id: "materia-qui11443", nome: "Laboratório de Química Analítica I (2024)", codigo: "QUI11443" },
    { id: "materia-qui11611", nome: "Ensino e Aprendizagem de Química I", codigo: "QUI11611" },
    { id: "materia-qui11621", nome: "Ensino e Aprendizagem de Química II", codigo: "QUI11621" },
    { id: "materia-qui11631", nome: "Ensino e Aprendizagem de Química III", codigo: "QUI11631" },
    { id: "materia-qui12653", nome: "Ensino e Aprendizagem de Química V", codigo: "QUI12653" },
    { id: "materia-qui12654", nome: "Seminários de Práticas Educativas em Química II", codigo: "QUI12654" },
    { id: "materia-qui12655", nome: "Estágio Supervisionado Licenciatura I", codigo: "QUI12655" },
    { id: "materia-qui12661", nome: "Estágio Supervisionado Licenciatura II (2013)", codigo: "QUI12661" },
    { id: "materia-qui12662", nome: "Ensino e Aprendizagem de Química VI", codigo: "QUI12662" },
    { id: "materia-qui12663", nome: "Estágio Supervisionado Licenciatura II (2024)", codigo: "QUI12663" },
    { id: "materia-qui12671", nome: "Estágio Supervisionado Licenciatura III (2013)", codigo: "QUI12671" },
    { id: "materia-qui12672", nome: "História e Filosofia da Ciência", codigo: "QUI12672" },
    { id: "materia-qui12673", nome: "Tecnologia da Informação e Comunicação na Educação", codigo: "QUI12673" },
    { id: "materia-qui12674", nome: "Ensino e Aprendizagem de Química VII", codigo: "QUI12674" },
    { id: "materia-qui12675", nome: "Seminários de Práticas Educativas em Química III", codigo: "QUI12675" },
    { id: "materia-qui12676", nome: "Estágio Supervisionado Licenciatura III (2024)", codigo: "QUI12676" },
    { id: "materia-qui12681", nome: "Estágio Supervisionado Licenciatura IV (2013)", codigo: "QUI12681" },
    { id: "materia-qui12682", nome: "Prática de Ensino de Química II", codigo: "QUI12682" },
    { id: "materia-qui12683", nome: "Trabalho de Conclusão de Curso", codigo: "QUI12683" },
    { id: "materia-qui12684", nome: "Elementos de Química Geral (Eletiva)", codigo: "QUI12684" },
    { id: "materia-qui12685", nome: "Introdução ao Cálculo", codigo: "QUI12685" },
    { id: "materia-qui12686", nome: "Ensino e Aprendizagem de Química VIII", codigo: "QUI12686" },
    { id: "materia-qui12687", nome: "Estágio Supervisionado Licenciatura IV (2024)", codigo: "QUI12687" },
  ];
  for (const materia of materias) { const codigo = normalizarCodigoMateria(materia.codigo); batch.set(firestore.collection("Materia").doc(materia.id), { nome: materia.nome, codigo_materia: codigo }); batch.set(firestore.collection("Chaves_Unicas").doc(chaveMateria(codigo)), { tipo: "Materia", id_recurso: materia.id, codigo, criado_em: FIXTURE_TIME }); }
  for (const pm of profMaterias) { batch.set(firestore.collection("Professor_x_Materia").doc(`${pm.professor}__${pm.materia}`), { id_professor: pm.professor, id_materia: pm.materia }); }
  const turmas = [
    { id: "seed-turma-vazia", materia: "materia-quimica-geral", professor: alpha, status: "Ativo", nome: "Química Geral — T1 Vazia", ano: 2026, semestre: 1, capacidade: 5, codigo: "QGV101", members: [] as FixtureUser[] },
    { id: "seed-turma-ultima-vaga", materia: "materia-quimica-geral", professor: alpha, status: "Ativo", nome: "Química Geral — T2 Última Vaga", ano: 2026, semestre: 1, capacidade: 2, codigo: "QGV102", members: [byId("aluno.enrolled")] },
    { id: "seed-turma-cheia", materia: "materia-quimica-analitica", professor: alpha, status: "Ativo", nome: "Química Analítica — T1 Cheia", ano: 2026, semestre: 1, capacidade: 1, codigo: "QAN201", members: [byId("bolsista")] },
    { id: "seed-turma-arquivada", materia: "materia-quimica-analitica", professor: alpha, status: "Arquivada", nome: "Química Analítica — T2 Arquivada", ano: 2026, semestre: 2, capacidade: 5, codigo: "QAN202", members: [] as FixtureUser[] },
    { id: "seed-turma-beta", materia: "materia-quimica-geral", professor: beta, status: "Ativo", nome: "Química Geral — Beta", ano: 2026, semestre: 1, capacidade: 5, codigo: "QGB103", members: [] as FixtureUser[] },
    { id: "seed-turma-colegas", materia: "materia-quimica-geral", professor: alpha, status: "Ativo", nome: "Química Geral — T3 Colegas", ano: 2026, semestre: 1, capacidade: 5, codigo: "QGV103", members: [byId("aluno.enrolled"), byId("aluno.colegaA"), byId("aluno.colegaB")] },
  ];
  const names = new Map(materias.map((item) => [item.id, item.nome]));
  for (const turma of turmas) {
    batch.set(firestore.collection("Turma").doc(turma.id), { id_materia: turma.materia, nome_materia: names.get(turma.materia), id_professor: turma.professor, status: turma.status, nome_turma: turma.nome, ano: turma.ano, semestre: turma.semestre, capacidade: turma.capacidade, qtd_alunos: turma.members.length, codigo_turma: turma.codigo, data_criacao: FIXTURE_TIME, versao: 1 });
    batch.set(firestore.collection("Chaves_Unicas").doc(chaveTurmaCodigo(turma.codigo)), { tipo: "Turma", id_recurso: turma.id, codigo: turma.codigo, criado_em: FIXTURE_TIME });
    for (const member of turma.members) { const joined = Timestamp.fromDate(new Date("2026-01-10T12:00:00.000Z")); batch.set(firestore.collection("Turma").doc(turma.id).collection("Alunos").doc(member.uid), { id_aluno: member.uid, id_turma: turma.id, nome: member.name, ingressou_em: joined }); batch.set(firestore.collection("Usuarios").doc(member.uid).collection("Turmas").doc(turma.id), { id_turma: turma.id, id_professor: turma.professor, id_materia: turma.materia, nome_turma: turma.nome, nome_materia: names.get(turma.materia), ano: turma.ano, semestre: turma.semestre, status: turma.status, ingressou_em: joined }); batch.set(firestore.collection("Turma").doc(turma.id).collection("HistoricoAlunos").doc(`seed-inclusao-${member.uid}`), { id_turma: turma.id, id_aluno: member.uid, tipo: "inclusao_aluno", modo_ingresso: "CODIGO", justificativa: null, removido_por: null, timestamp: joined }); }
  }
  batch.set(firestore.collection("Turma").doc("seed-turma-vazia").collection("HistoricoAlunos").doc("seed-exclusao-aluno-removido"), { id_turma: "seed-turma-vazia", id_aluno: byId("aluno.removed").uid, tipo: "exclusao_aluno", modo_ingresso: null, justificativa: "Remoção anterior; reingresso somente por convite explícito.", removido_por: alpha, timestamp: Timestamp.fromDate(new Date("2026-01-12T12:00:00.000Z")) });

  // Fixtures patrimoniais M10. Cada bem possui Local, Resumo e requisição/lock
  // próprios para que os cenários E2E não compartilhem estado mutável.
  const patrimonioFixtures = [
    {
      sufixo: "aprovacao",
      bemId: "seed-bem-edicao-aprovacao",
      resumoId: "seed-resumo-bem-aprovacao",
      localId: "seed-local-patrimonio-aprovacao",
      requisicaoId: "seed-req-edicao-aprovacao",
      lockId: "bem_edicao_seed-bem-edicao-aprovacao",
      numero: "PAT-SEED-001",
      predio: "Bloco Patrimonial A",
      andar: "1",
      sala: "Sala 101",
      nome: "Balança Analítica Seed",
      descricao: "Balança analítica para o cenário de aprovação patrimonial.",
      novoNome: null as string | null,
      novoResumoId: "seed-resumo-bem-aprovacao-alvo",
      statusBem: "Ativo" as const,
      versaoBem: 1,
      versaoOrigem: 1,
    },
    {
      sufixo: "rejeicao",
      bemId: "seed-bem-edicao-rejeicao",
      resumoId: "seed-resumo-bem-rejeicao",
      localId: "seed-local-patrimonio-rejeicao",
      requisicaoId: "seed-req-edicao-rejeicao",
      lockId: "bem_edicao_seed-bem-edicao-rejeicao",
      numero: "PAT-SEED-002",
      predio: "Bloco Patrimonial B",
      andar: "2",
      sala: "Sala 202",
      nome: "Centrífuga Seed",
      descricao: "Centrífuga para o cenário de rejeição patrimonial.",
      novoNome: null,
      novoResumoId: null,
      statusBem: "Ativo" as const,
      versaoBem: 1,
      versaoOrigem: 1,
    },
    {
      sufixo: "conflito",
      bemId: "seed-bem-edicao-conflito",
      resumoId: "seed-resumo-bem-conflito",
      localId: "seed-local-patrimonio-conflito",
      requisicaoId: "seed-req-edicao-conflito",
      lockId: "bem_edicao_seed-bem-edicao-conflito",
      numero: "PAT-SEED-003",
      predio: "Bloco Patrimonial C",
      andar: "3",
      sala: "Sala 303",
      nome: "Espectrofotômetro Seed",
      descricao: "Espectrofotômetro para o cenário de conflito de versão.",
      novoNome: null,
      novoResumoId: null,
      statusBem: "Ativo" as const,
      versaoBem: 2,
      versaoOrigem: 1,
    },
  ];
  for (const fixture of patrimonioFixtures) {
    const localRef = firestore.collection("Local").doc(fixture.localId);
    const resumoRef = firestore.collection("Resumo_Bem_Patrimonial").doc(fixture.resumoId);
    const bemRef = firestore.collection("Bem_Patrimonial").doc(fixture.bemId);
    const reqRef = firestore.collection("Requisicao_Edicao_Bem_Patrimonial").doc(fixture.requisicaoId);
    batch.set(localRef, {
      predio: fixture.predio,
      andar: fixture.andar,
      sala: fixture.sala,
      criado_por: byId("chefe").uid,
      criado_em: FIXTURE_TIME,
      atualizado_em: FIXTURE_TIME,
    });
    batch.set(firestore.collection("Chaves_Unicas").doc(chaveLocal(fixture.predio, fixture.andar, fixture.sala)), {
      tipo: "Local",
      id_recurso: fixture.localId,
      criado_em: FIXTURE_TIME,
    });
    batch.set(resumoRef, {
      nome: fixture.nome,
      descricao: fixture.descricao,
      letra_inicial_nome: fixture.nome.charAt(0).toUpperCase(),
      cadastrado_em: FIXTURE_TIME,
      criado_em: FIXTURE_TIME,
    });
    if (fixture.novoResumoId) {
      batch.set(firestore.collection("Resumo_Bem_Patrimonial").doc(fixture.novoResumoId), {
        nome: "Balança Analítica — Modelo de Precisão",
        descricao: "Resumo alvo para reclassificação no cenário de aprovação.",
        letra_inicial_nome: "B",
        criado_em: FIXTURE_TIME,
      });
    }
    batch.set(bemRef, {
      id_resumo_bem_patrimonial: fixture.resumoId,
      numero_patrimonio: fixture.numero,
      estado_conservacao: "BOM",
      id_local: fixture.localId,
      photo_url: `seed/patrimonio/${fixture.sufixo}.jpg`,
      documento_dado_baixa_pdf_url: null,
      nome_responsavel_sei: "Responsável Patrimonial Seed",
      status: fixture.statusBem,
      descricao_complementar: `Fixture M10 de ${fixture.sufixo}.`,
      versao: fixture.versaoBem,
      nome_equipamento: fixture.nome,
      predio: fixture.predio,
      andar: fixture.andar,
      sala: fixture.sala,
      letra_inicial_nome: fixture.nome.charAt(0).toUpperCase(),
    });
    batch.set(firestore.collection("Chaves_Unicas").doc(`Bem_Patrimonial__${fixture.numero}`), {
      tipo: "Bem_Patrimonial",
      id_recurso: fixture.bemId,
      criado_em: FIXTURE_TIME,
    });
    batch.set(reqRef, {
      id_bem_patrimonial: fixture.bemId,
      status: "pendente",
      feita_em: FIXTURE_TIME,
      respondida_em: null,
      id_usuario_solicitante: alpha,
      id_usuario_respondente: null,
      novo_nome: fixture.novoNome,
      novo_status: null,
      novo_estado_conservacao: null,
      novo_id_local: null,
      nova_photo_url: null,
      motivo: `Fixture M10 — ${fixture.sufixo}.`,
      justificativa_resposta: null,
      versao_bem_origem: fixture.versaoOrigem,
      novo_id_resumo_bem_patrimonial: fixture.novoResumoId,
      nome_equipamento: fixture.nome,
      numero_patrimonio: fixture.numero,
    });
    batch.set(firestore.collection("Locks_Requisicao_Patrimonio").doc(fixture.lockId), {
      id_requisicao: fixture.requisicaoId,
      tipo: "EDICAO",
      chave_recurso: fixture.bemId,
      criado_em: FIXTURE_TIME,
    });
  }
  // Fixture M10/PAT-006: bem já classificado como Inservivel para o rito
  // terminal de baixa com comprovante PDF no Storage.
  const baixaBemId = "seed-bem-baixa-terminal";
  const baixaNumero = "PAT-SEED-004";
  const baixaLocalId = "seed-local-patrimonio-baixa";
  const baixaResumoId = "seed-resumo-bem-baixa";
  batch.set(firestore.collection("Local").doc(baixaLocalId), {
    predio: "Bloco Patrimonial D",
    andar: "4",
    sala: "Sala 404",
    criado_por: byId("chefe").uid,
    criado_em: FIXTURE_TIME,
    atualizado_em: FIXTURE_TIME,
  });
  batch.set(firestore.collection("Chaves_Unicas").doc(chaveLocal("Bloco Patrimonial D", "4", "Sala 404")), {
    tipo: "Local",
    id_recurso: baixaLocalId,
    criado_em: FIXTURE_TIME,
  });
  batch.set(firestore.collection("Resumo_Bem_Patrimonial").doc(baixaResumoId), {
    nome: "Banho-Maria Inservível Seed",
    descricao: "Fixture M10 para baixa patrimonial terminal.",
    letra_inicial_nome: "B",
    criado_em: FIXTURE_TIME,
  });
  batch.set(firestore.collection("Bem_Patrimonial").doc(baixaBemId), {
    id_resumo_bem_patrimonial: baixaResumoId,
    numero_patrimonio: baixaNumero,
    estado_conservacao: "RUIM",
    id_local: baixaLocalId,
    photo_url: null,
    documento_dado_baixa_pdf_url: null,
    nome_responsavel_sei: "Responsável Patrimonial Seed",
    status: "Inservivel",
    descricao_complementar: "Fixture M10 de baixa terminal.",
    versao: 1,
    nome_equipamento: "Banho-Maria Inservível Seed",
    predio: "Bloco Patrimonial D",
    andar: "4",
    sala: "Sala 404",
    letra_inicial_nome: "B",
    cadastrado_em: FIXTURE_TIME,
  });
  batch.set(firestore.collection("Chaves_Unicas").doc(`Bem_Patrimonial__${baixaNumero}`), {
    tipo: "Bem_Patrimonial",
    id_recurso: baixaBemId,
    criado_em: FIXTURE_TIME,
  });
  // Fixture de cadastro fechado M2/M7 para UI-06 e regressão do código atômico.
  const localAlmoxId = "seed-local-almox-frascos";
  batch.set(firestore.collection("Local").doc(localAlmoxId), {
    predio: "Bloco de Química",
    andar: "1",
    sala: "Almoxarifado de Frascos",
    criado_por: byId("chefe").uid,
    criado_em: FIXTURE_TIME,
    atualizado_em: FIXTURE_TIME,
  });
  batch.set(firestore.collection("Chaves_Unicas").doc(chaveLocal("Bloco de Química", "1", "Almoxarifado de Frascos")), {
    tipo: "Local",
    id_recurso: localAlmoxId,
    criado_em: FIXTURE_TIME,
  });
  const reagenteSeed = firestore.collection("Resumo_Reagente").doc("seed-resumo-reagente-frascos");
  const especSeed = reagenteSeed.collection("Especificacoes").doc("seed-especificacao-frascos");
  batch.set(firestore.collection("Almoxarifado").doc("seed-almox-frascos"), {
    id_local: localAlmoxId,
    nome: "Almoxarifado de Frascos Seed",
    descricao: "Almoxarifado principal para testes de reagentes e movimentações.",
    ativo: true,
    qtd_gestores_ativos: 1,
  });
  const vinculoGestorAlmoxId = createHash("sha256").update(JSON.stringify([byId("gestor.almoxarifado").uid, "seed-almox-frascos"])).digest("hex");
  batch.set(firestore.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(vinculoGestorAlmoxId), {
    id_gestor_almoxarifado: byId("gestor.almoxarifado").uid,
    id_almoxarifado: "seed-almox-frascos",
  });
  batch.set(reagenteSeed, {
    id: reagenteSeed.id,
    nome: "Reagente Seed",
    letra_inicial: "R",
    tipo_substancia: "PURA",
    natureza_quimica: "INORGANICO",
    requer_pesagem_frequente: false,
    frequencia_pesagem_dias: null,
    estado_fisico: "LIQUIDO",
    eh_higroscopico: false,
    qtd_em_que_e_considerado_escasso: 5,
  });
  const substanciaSeed = firestore.collection("Substancia_Quimica").doc("seed-substancia-reagente");
  batch.set(substanciaSeed, {
    id: substanciaSeed.id,
    nome: "Substância Seed",
    cas_number: "7732-18-5",
    formula_quimica: "H2O",
    ativo: true,
    criado_em: FIXTURE_TIME,
    criado_por: byId("gestor.almoxarifado").uid,
  });
  batch.set(firestore.collection("Chaves_Unicas").doc("Substancia_Quimica__CAS__7732-18-5"), {
    tipo: "Substancia_Quimica_CAS",
    id_recurso: substanciaSeed.id,
    chave_recurso: "7732-18-5",
    criado_em: FIXTURE_TIME,
  });
  const especificacaoSeed = {
    id: especSeed.id,
    id_resumo_reagente: reagenteSeed.id,
    descricao: "Reagente Analítico 1L",
    fabricante: "Fabricante Seed",
    codigo_produto_fabricante: "SEED-1L",
    grau_pureza: "PA",
    densidade: 1,
    unidade_de_medida: "ml",
    classe_inflamabilidade: "NAO_INFLAMAVEL",
    eh_controlado_pf: false,
    eh_controlado_eb: false,
    link_fds_fispq: null,
    composicao: [{
      id_substancia_quimica: substanciaSeed.id,
      valor_min: null,
      valor_max: null,
      tipo_concentracao: "M_M",
      notacao_original_fabricante: null,
    }],
    criado_em: FIXTURE_TIME,
    criado_por: byId("gestor.almoxarifado").uid,
  };
  batch.set(especSeed, especificacaoSeed);
  batch.set(firestore.collection("Especificacao_Reagente").doc(especSeed.id), especificacaoSeed);
  batch.set(firestore.collection("Contador_Codigo_Frasco").doc("singleton"), {
    ultimo_codigo_gerado: 0,
  });

  // Fixtures normativas de movimentação M3/M5/M6/UI-07. Os códigos são
  // identificadores canônicos de dados de teste e não participam do contador
  // de novos cadastros, que permanece em zero para que a primeira criação
  // operacional gere LCQUI-1.
  const historicoProfessorFrascoId = "seed-frasco-historico-professor";
  const historicoProfessorEmprestimoId = "seed-emprestimo-historico-professor";
  const historicoBolsistaFrascoId = "seed-frasco-historico-bolsista";
  const historicoBolsistaEmprestimoId = "seed-emprestimo-historico-bolsista";
  const localUsoSeedId = localAlmoxId;
  const retiradaProfessorEm = Timestamp.fromDate(new Date("2026-01-20T12:00:00.000Z"));
  const devolucaoProfessorEm = Timestamp.fromDate(new Date("2026-01-22T12:00:00.000Z"));
  const retiradaBolsistaEm = Timestamp.fromDate(new Date("2026-01-23T12:00:00.000Z"));

  batch.set(firestore.collection("Frasco_Reagente").doc(historicoProfessorFrascoId), {
    id: historicoProfessorFrascoId,
    id_almoxarifado: "seed-almox-frascos",
    id_lote: null,
    id_resumo_reagente: reagenteSeed.id,
    id_especificacao_reagente: especSeed.id,
    codigo_frasco: "LCQUI-9001",
    conteudo_nominal: 1000,
    peso_no_cadastrado: 1200,
    peso_atual: 1100,
    peso_frasco_vazio: 200,
    origem_tara: "MEDIDA_REAL",
    saldo_aferido_g: 900,
    saldo_aferido_ml: 900,
    saldo_desconhecido: false,
    medida_usada: 100,
    data_abertura: "2026-01-20",
    validade_fechado: "2027-01-20",
    validade_efetiva: "2027-01-20",
    validade_desconhecida: false,
    validade_apos_aberto_dias: 365,
    estado_fisico_frasco: "ABERTO",
    situacao_localizacao: "LOCALIZADO",
    disponibilidade: "DISPONIVEL",
    vencido: false,
    em_quarentena: false,
    uso_vencido_autorizado: false,
    detalhe_status: null,
    cadastrado_em: FIXTURE_TIME,
    cadastrado_por: byId("gestor.almoxarifado").uid,
    eh_higroscopico: false,
    abertura_historica_desconhecida: false,
    condicao_inicial_cadastro: "FECHADO",
  });
  batch.set(firestore.collection("Emprestimo_Reagente").doc(historicoProfessorEmprestimoId), {
    id_frasco_reagente: historicoProfessorFrascoId,
    id_usuario_retirou: byId("professor.owner").uid,
    id_gestor_retirada: byId("gestor.almoxarifado").uid,
    id_almoxarifado: "seed-almox-frascos",
    status: "DEVOLVIDO",
    data_retirada: retiradaProfessorEm,
    data_devolucao_prevista: "2026-01-22",
    data_devolucao_efetuada: devolucaoProfessorEm,
    id_local_usado: localUsoSeedId,
    id_usuario_devolveu: byId("professor.owner").uid,
    id_gestor_devolucao: byId("gestor.almoxarifado").uid,
    peso_saida: 1200,
    peso_retorno: 1100,
    medida_utilizada: 100,
    consumo_validado: true,
    anomalia_metrologica: null,
    peso_retorno_efetivo: 1100,
    id_resolucao_metrologica: null,
    unidade_medida_utilizada: "ml",
    densidade_aplicada: 1,
    peso_perda_evaporacao: 0,
    uso_vencido_aceito: false,
    vencido_na_retirada: false,
    finalidade_uso: "AULA_PRATICA",
    auto_atendimento: false,
    justificativa_metodologica: null,
    tcr_versao: null,
    tcr_aceito_em: null,
    tcr_aceito_por: null,
    tcr_auditoria_id: null,
    tipo_encerramento_excepcional: null,
    motivo_encerramento_excepcional: null,
    id_gestor_encerramento: null,
    massa_perda_estimada_g: null,
  });
  for (const [id, tipo, timestamp, extras] of [
    [`${historicoProfessorEmprestimoId}-cadastro`, "CADASTRO", FIXTURE_TIME, {}],
    [`${historicoProfessorEmprestimoId}-saiu`, "SAIU", retiradaProfessorEm, { id_emprestimo_reagente: historicoProfessorEmprestimoId }],
    [`${historicoProfessorEmprestimoId}-entrou`, "ENTROU", devolucaoProfessorEm, { id_emprestimo_reagente: historicoProfessorEmprestimoId }],
  ] as const) {
    batch.set(firestore.collection("Historico_Frasco_Reagente").doc(id), {
      id_frasco_reagente: historicoProfessorFrascoId,
      id_almoxarifado: "seed-almox-frascos",
      id_gestor: byId("gestor.almoxarifado").uid,
      tipo,
      timestamp,
      ...extras,
    });
  }

  batch.set(firestore.collection("Frasco_Reagente").doc(historicoBolsistaFrascoId), {
    id: historicoBolsistaFrascoId,
    id_almoxarifado: "seed-almox-frascos",
    id_lote: null,
    id_resumo_reagente: reagenteSeed.id,
    id_especificacao_reagente: especSeed.id,
    codigo_frasco: "LCQUI-9002",
    condicao_inicial_cadastro: "FECHADO",
    conteudo_nominal: 1000,
    peso_no_cadastrado: 1200,
    peso_atual: 1150,
    peso_frasco_vazio: 200,
    origem_tara: "REFERENCIA_TEORICA",
    saldo_aferido_g: 950,
    saldo_aferido_ml: 950,
    saldo_desconhecido: false,
    medida_usada: 50,
    data_abertura: "2026-01-23",
    validade_fechado: "2027-01-23",
    validade_efetiva: "2027-01-23",
    validade_desconhecida: false,
    validade_apos_aberto_dias: 365,
    estado_fisico_frasco: "ABERTO",
    situacao_localizacao: "LOCALIZADO",
    disponibilidade: "EMPRESTADO",
    vencido: false,
    em_quarentena: false,
    uso_vencido_autorizado: false,
    detalhe_status: null,
    cadastrado_em: FIXTURE_TIME,
    cadastrado_por: byId("gestor.almoxarifado").uid,
    eh_higroscopico: false,
    abertura_historica_desconhecida: false,
  });
  batch.set(firestore.collection("Emprestimo_Reagente").doc(historicoBolsistaEmprestimoId), {
    id_frasco_reagente: historicoBolsistaFrascoId,
    id_usuario_retirou: byId("bolsista").uid,
    id_gestor_retirada: byId("gestor.almoxarifado").uid,
    id_almoxarifado: "seed-almox-frascos",
    status: "EM_USO",
    data_retirada: retiradaBolsistaEm,
    data_devolucao_prevista: "2026-01-30",
    data_devolucao_efetuada: null,
    id_local_usado: localUsoSeedId,
    id_usuario_devolveu: null,
    id_gestor_devolucao: null,
    peso_saida: 1150,
    peso_retorno: null,
    medida_utilizada: null,
    consumo_validado: false,
    anomalia_metrologica: null,
    peso_retorno_efetivo: null,
    id_resolucao_metrologica: null,
    unidade_medida_utilizada: "ml",
    densidade_aplicada: 1,
    peso_perda_evaporacao: 0,
    uso_vencido_aceito: false,
    vencido_na_retirada: false,
    finalidade_uso: "PESQUISA_TCC_POS",
    auto_atendimento: false,
    justificativa_metodologica: null,
    tcr_versao: null,
    tcr_aceito_em: null,
    tcr_aceito_por: null,
    tcr_auditoria_id: null,
    tipo_encerramento_excepcional: null,
    motivo_encerramento_excepcional: null,
    id_gestor_encerramento: null,
    massa_perda_estimada_g: null,
  });
  for (const [id, tipo, timestamp, extras] of [
    [`${historicoBolsistaEmprestimoId}-cadastro`, "CADASTRO", FIXTURE_TIME, {}],
    [`${historicoBolsistaEmprestimoId}-saiu`, "SAIU", retiradaBolsistaEm, { id_emprestimo_reagente: historicoBolsistaEmprestimoId }],
  ] as const) {
    batch.set(firestore.collection("Historico_Frasco_Reagente").doc(id), {
      id_frasco_reagente: historicoBolsistaFrascoId,
      id_almoxarifado: "seed-almox-frascos",
      id_gestor: byId("gestor.almoxarifado").uid,
      tipo,
      timestamp,
      ...extras,
    });
  }
  await batch.commit();
  await writeImportedReagents(firestore);
  // O seed instala a fotografia canônica; a publicação JSON continua sendo
  // responsabilidade da Cloud Function e começa com a fonte pendente.
  await firestore.collection("Sistema_Catalogo_Reagentes").doc("estado").set({
    versao_fonte: 1,
    versao_publicada: 0,
    storage_path: null,
    sha256: null,
    gerado_em: null,
    schema_version: 1,
  });

  // Roteiro canônico M12.2 (PDF público de seed-professor-alpha)
  const storagePath = `roteiros/${alpha}/seed-roteiro-m12.pdf`;
  const pdfBuffer = Buffer.concat([Buffer.from("%PDF-1.4\\n"), Buffer.alloc(1024)]);
  const pdfFile = admin.storage().bucket().file(storagePath);
  try { await pdfFile.delete({ ignoreNotFound: true }); } catch { /* ignorar */ }
  await pdfFile.save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: { metadata: { owner: alpha } },
  });
  const [pdfMetadata] = await pdfFile.getMetadata();
  await firestore.collection("Roteiro_Experimento").doc("seed-roteiro-m12").set({
    id_professor_upload: alpha,
    nome: "Roteiro M12.2 — Síntese",
    descricao: "Roteiro canônico de experimento para testes E2E de anexo a Post.",
    nome_arquivo: "seed-roteiro-m12.pdf",
    referencia: {
      storage_path: storagePath,
      content_type: "application/pdf",
      tamanho_bytes: pdfBuffer.length,
      owner_uid: alpha,
      geracao: String(pdfMetadata.generation),
      criado_em: new Date("2026-01-15T12:00:00.000Z").toISOString(),
    },
    status: "PUBLICAVEL",
    professores_compartilhados: [],
    file_url: null,
    criado_em: FIXTURE_TIME,
  });
  const baixaPdfPath = `baixas_patrimoniais/${baixaBemId}/termo_baixa.pdf`;
  const baixaPdfBuffer = Buffer.from("%PDF-1.4\nfixture comprovante baixa patrimonial\n%%EOF\n");
  for (const bucket of [admin.storage().bucket(), admin.storage().bucket(`${projectId()}.firebasestorage.app`)]) {
    const baixaPdf = bucket.file(baixaPdfPath);
    await baixaPdf.save(baixaPdfBuffer, { contentType: "application/pdf" });
  }
}

async function verify(): Promise<void> {
  console.log("VERIFYING SEED INVARIANTS"); const firestore = getFirestore(); const auth = getAuth(); const roles: readonly Role[] = ["Chefe_Geral", "Gestor_Almoxarifado", "Gestor_Bens_Patrimoniais", "Professor", "Aluno", "Bolsista"];
  for (const user of users.filter((item) => item.activeDocument)) {
    const authUser = await auth.getUser(user.uid); assert.equal(authUser.email, user.email); assert.equal(authUser.disabled, false);     assert.deepEqual(authUser.customClaims, { roles: [...user.roles], versao_permissoes: 1, ativo: true }); const account = await firestore.collection("Usuarios").doc(user.uid).get(); assert.equal(account.exists, true); assert.equal(account.data()?.ativo, true); assert.equal(account.data()?.versao_permissoes, 1);
    for (const role of roles) { const roleDoc = await firestore.collection(role).doc(user.uid).get(); assert.equal(roleDoc.exists, user.roles.includes(role), `${user.id}: papel divergente (${role})`); if (roleDoc.exists) assert.equal(roleDoc.data()?.id_usuario, user.uid); }
    if (user.matricula) { const aluno = await firestore.collection("Aluno").doc(user.uid).get(); assert.equal(aluno.data()?.numero_matricula, user.matricula); const key = await firestore.collection("Chaves_Unicas").doc(chaveAlunoMatricula(user.matricula)).get(); assert.equal(key.data()?.tipo, "Aluno"); assert.equal(key.data()?.id_recurso, user.uid); }
  }
  for (const user of users.filter((item) => !item.activeDocument && item.id !== "aluno.noAuth")) { const authUser = await auth.getUser(user.uid); assert.equal(authUser.disabled, user.disabled); assert.equal((await firestore.collection("Usuarios").doc(user.uid).get()).exists, false); assert.equal((await firestore.collection("Aluno").doc(user.uid).get()).exists, false); }
  await assert.rejects(() => auth.getUserByEmail(byId("aluno.noAuth").email), { code: "auth/user-not-found" });
  const controlePapeis = await firestore.collection("Controle_Papeis").doc("singleton").get();
  assert.deepEqual(controlePapeis.data(), { chefes_ativos: 1, gestores_patrimoniais_ativos: 1, versao: 1 });
  for (const [id, codigo] of [["materia-quimica-geral", "QUI101"], ["materia-quimica-analitica", "QUI202"]] as const) { const materia = await firestore.collection("Materia").doc(id).get(); assert.equal(materia.data()?.codigo_materia, codigo); const key = await firestore.collection("Chaves_Unicas").doc(chaveMateria(codigo)).get(); assert.equal(key.data()?.tipo, "Materia"); assert.equal(key.data()?.id_recurso, id); }
  assert.equal((await firestore.collection("Materia").get()).size, 76, "A carga canônica deve conter as 74 disciplinas importadas e os 2 fixtures históricos.");
  const importedSubstanceCount = importedReagents.filter((reagent) => reagent.tipo_substancia === "PURA").length;
  const importedSpecCount = importedReagents.filter((reagent) => reagent.tipo_substancia === "PURA" && (reagent.estado_fisico !== "LIQUIDO" || reagent.densidade !== null)).length;
  for (const reagent of importedReagents) {
    const resumo = await firestore.collection("Resumo_Reagente").doc(reagent.id).get();
    assert.equal(resumo.exists, true, `Resumo importado ausente: ${reagent.nome}`);
    assert.equal(resumo.data()?.estado_fisico, reagent.estado_fisico);
    const substancia = await firestore.collection("Substancia_Quimica").doc(`${reagent.id}-substancia`).get();
    assert.equal(substancia.exists, reagent.tipo_substancia === "PURA", `Substância indevida/ausente: ${reagent.nome}`);
    if (reagent.tipo_substancia === "PURA" && reagent.cas_number) assert.equal((await firestore.collection("Chaves_Unicas").doc(`Substancia_Quimica__CAS__${reagent.cas_number}`).get()).data()?.id_recurso, substancia.id);
    const especificacoes = await resumo.ref.collection("Especificacoes").get();
    const expectedSpecification = reagent.tipo_substancia === "PURA" && (reagent.estado_fisico !== "LIQUIDO" || reagent.densidade !== null) ? 1 : 0;
    assert.equal(especificacoes.size, expectedSpecification, `Especificação importada divergente: ${reagent.nome}`);
  }
  assert.equal((await firestore.collection("Resumo_Reagente").get()).size, importedReagents.length + 1);
  assert.equal((await firestore.collection("Substancia_Quimica").get()).size, importedSubstanceCount + 1);
  assert.equal((await firestore.collection("Especificacao_Reagente").get()).size, importedSpecCount + 1);
  const estadoCatalogo = await firestore.collection("Sistema_Catalogo_Reagentes").doc("estado").get();
  assert.equal(estadoCatalogo.data()?.versao_fonte, 1);
  assert.equal(estadoCatalogo.data()?.versao_publicada, 0);
  assert.equal(estadoCatalogo.data()?.schema_version, 1);
  for (const pm of profMaterias) { const rel = await firestore.collection("Professor_x_Materia").doc(`${pm.professor}__${pm.materia}`).get(); assert.equal(rel.exists, true); assert.equal(rel.data()?.id_professor, pm.professor); assert.equal(rel.data()?.id_materia, pm.materia); assert.equal("id_usuario" in (rel.data() ?? {}), false); }
  for (const turmaDoc of (await firestore.collection("Turma").get()).docs) { const turma = turmaDoc.data(); assert.ok(["Ativo", "Arquivada"].includes(turma.status)); assert.ok([1, 2].includes(turma.semestre)); assert.ok(Number.isInteger(turma.capacidade) && turma.capacidade >= 1); assert.ok(Number.isInteger(turma.qtd_alunos) && turma.qtd_alunos >= 0); assert.ok(Number.isInteger(turma.versao) && turma.versao >= 1); assert.equal((await firestore.collection("Materia").doc(turma.id_materia).get()).exists, true); assert.equal((await firestore.collection("Professor").doc(turma.id_professor).get()).exists, true); const key = await firestore.collection("Chaves_Unicas").doc(chaveTurmaCodigo(turma.codigo_turma)).get(); assert.equal(key.data()?.id_recurso, turmaDoc.id); const links = await turmaDoc.ref.collection("Alunos").get(); assert.equal(turma.qtd_alunos, links.size, `${turmaDoc.id}: contador divergente`); for (const link of links.docs) { const value = link.data(); assert.equal(link.id, value.id_aluno); assert.equal(value.id_turma, turmaDoc.id); assert.ok(value.ingressou_em); assert.equal("email" in value, false); assert.equal("numero_matricula" in value, false); assert.equal((await firestore.collection("Usuarios").doc(link.id).collection("Turmas").doc(turmaDoc.id).get()).exists, true); } }
  const removed = byId("aluno.removed"); assert.equal((await firestore.collection("Turma").doc("seed-turma-vazia").collection("Alunos").doc(removed.uid).get()).exists, false); assert.equal((await firestore.collection("Usuarios").doc(removed.uid).collection("Turmas").doc("seed-turma-vazia").get()).exists, false); const history = await firestore.collection("Turma").doc("seed-turma-vazia").collection("HistoricoAlunos").where("id_aluno", "==", removed.uid).where("tipo", "==", "exclusao_aluno").get(); assert.equal(history.size, 1);
  assert.equal((await firestore.collection("Convite_Aluno").get()).empty, true); for (const user of users.filter((item) => item.activeDocument)) assert.equal((await firestore.collection("Usuarios").doc(user.uid).collection("Notificacoes").get()).empty, true); assert.equal((await firestore.collection("Chaves_Unicas").get()).docs.some((doc) => doc.id.startsWith("ConvitePendente__")), false);
  const roteiroDoc = await firestore.collection("Roteiro_Experimento").doc("seed-roteiro-m12").get();
  assert.equal(roteiroDoc.exists, true);
  const roteiroData = roteiroDoc.data()!;
  assert.equal(roteiroData.status, "PUBLICAVEL");
  assert.equal(roteiroData.id_professor_upload, byId("professor.owner").uid);
  assert.equal(roteiroData.nome_arquivo, "seed-roteiro-m12.pdf");
  assert.equal(roteiroData.referencia.content_type, "application/pdf");
  assert.equal(roteiroData.referencia.tamanho_bytes, Buffer.concat([Buffer.from("%PDF-1.4\\n"), Buffer.alloc(1024)]).length);
  assert.equal(typeof roteiroData.referencia.geracao, "string");
  for (const id of ["aprovacao", "rejeicao", "conflito"]) {
    const requisicao = await firestore.collection("Requisicao_Edicao_Bem_Patrimonial").doc(`seed-req-edicao-${id}`).get();
    assert.equal(requisicao.data()?.status, "pendente");
    assert.equal((await firestore.collection("Locks_Requisicao_Patrimonio").doc(`bem_edicao_seed-bem-edicao-${id}`).get()).data()?.tipo, "EDICAO");
  }
  assert.equal((await firestore.collection("Bem_Patrimonial").doc("seed-bem-edicao-conflito").get()).data()?.versao, 2);
  assert.equal((await firestore.collection("Bem_Patrimonial").doc("seed-bem-baixa-terminal").get()).data()?.status, "Inservivel");
  const baixaPdf = admin.storage().bucket().file("baixas_patrimoniais/seed-bem-baixa-terminal/termo_baixa.pdf");
  assert.equal((await baixaPdf.exists())[0], true);
  const resumoSeed = await firestore.collection("Resumo_Reagente").doc("seed-resumo-reagente-frascos").get();
  assert.equal(resumoSeed.data()?.estado_fisico, "LIQUIDO");
  assert.equal(resumoSeed.data()?.tipo_substancia, "PURA");
  assert.equal(resumoSeed.data()?.requer_pesagem_frequente, false);
  assert.equal(resumoSeed.data()?.frequencia_pesagem_dias, null);
  assert.equal(resumoSeed.data()?.qtd_em_que_e_considerado_escasso, 5);
  const especSeed = await firestore.collection("Especificacao_Reagente").doc("seed-especificacao-frascos").get();
  assert.equal(especSeed.data()?.id_resumo_reagente, "seed-resumo-reagente-frascos");
  assert.equal(especSeed.data()?.classe_inflamabilidade, "NAO_INFLAMAVEL");
  assert.equal(especSeed.data()?.eh_controlado_pf, false);
  assert.equal(especSeed.data()?.eh_controlado_eb, false);
  const emprestimoProfessor = await firestore.collection("Emprestimo_Reagente").doc("seed-emprestimo-historico-professor").get();
  assert.equal(emprestimoProfessor.data()?.id_usuario_retirou, byId("professor.owner").uid);
  assert.equal(emprestimoProfessor.data()?.status, "DEVOLVIDO");
  assert.equal(emprestimoProfessor.data()?.consumo_validado, true);
  const emprestimoBolsista = await firestore.collection("Emprestimo_Reagente").doc("seed-emprestimo-historico-bolsista").get();
  assert.equal(emprestimoBolsista.data()?.id_usuario_retirou, byId("bolsista").uid);
  assert.equal(emprestimoBolsista.data()?.status, "EM_USO");
  assert.equal((await firestore.collection("Historico_Frasco_Reagente").where("id_frasco_reagente", "==", "seed-frasco-historico-professor").get()).size, 3);
  assert.equal((await firestore.collection("Historico_Frasco_Reagente").where("id_frasco_reagente", "==", "seed-frasco-historico-bolsista").get()).size, 2);
  assert.equal((await firestore.collection("Resumo_Bem_Patrimonial").doc("seed-resumo-bem-aprovacao-alvo").get()).data()?.descricao, "Resumo alvo para reclassificação no cenário de aprovação.");
  console.log("SEED INVARIANTS OK: M9, papéis/claims/versões, matrículas, Chaves_Unicas, turmas, vínculos, espelhos, histórico, contadores, baseline sem convites/notificações/receipts e roteiro canônico M12.2.");
}
function manifest(): void { console.log("\n=== LCQUI MANUAL TEST SEED ===\n[FIXTURES]"); for (const user of users) console.log(`${user.id.padEnd(24)} ${user.email.padEnd(38)} senha=${user.id === "aluno.noAuth" ? "—" : PASSWORD} uid=${user.uid} roles=${user.roles.join(",") || "—"} verified=${user.emailVerified} ativo=${user.activeDocument} | ${user.note}`); console.log("\n[TURMAS]\nTURMA_VAZIA=seed-turma-vazia/QGV101 | TURMA_ULTIMA_VAGA=seed-turma-ultima-vaga/QGV102 | TURMA_CHEIA=seed-turma-cheia/QAN201 | TURMA_ARQUIVADA=seed-turma-arquivada/QAN202 | TURMA_PROF_BETA=seed-turma-beta/QGB103 | TURMA_COLEGAS=seed-turma-colegas/QGV103"); console.log("[PATRIMÔNIO]\nAPROVACAO=seed-bem-edicao-aprovacao / seed-req-edicao-aprovacao\nREJEICAO=seed-bem-edicao-rejeicao / seed-req-edicao-rejeicao\nCONFLITO=seed-bem-edicao-conflito / seed-req-edicao-conflito (versao do bem=2, origem=1)\nBAIXA=seed-bem-baixa-terminal / baixas_patrimoniais/seed-bem-baixa-terminal/termo_baixa.pdf"); console.log("Roteiro canônico M12.2: Roteiro_Experimento/seed-roteiro-m12 (PUBLICAVEL)"); console.log("Baseline sem Convite_Aluno pendente, CONVITE_PARA_TURMA, receipt M7 ou segredo/token."); }

async function main(): Promise<void> { const args = new Set(process.argv.slice(2)); if ([...args].some((arg) => !["--reset", "--verify-only"].includes(arg)) || (args.has("--reset") && args.has("--verify-only"))) throw new Error("Uso: tsx scripts/seed.ts [--reset|--verify-only]"); const id = projectId(); const { firestoreHost } = assertEmulatorOnly(id); dbApp(id); if (args.has("--verify-only")) { await verify(); manifest(); return; } if (args.has("--reset")) await reset(firestoreHost, id); for (const user of users.filter((item) => item.id !== "aluno.noAuth")) { await ensureAuth(user);       if (user.activeDocument) await getAuth().setCustomUserClaims(user.uid, { roles: [...user.roles], versao_permissoes: 1, ativo: true }); } await writeFixture(); await verify(); manifest(); }
main().catch((error: unknown) => { console.error("SEED FAILURE", error instanceof Error ? error.message : String(error)); process.exitCode = 1; });

import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth, UserRecord } from "firebase-admin/auth";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import assert from "node:assert/strict";
import { chaveAlunoMatricula, chaveMateria, chaveTurmaCodigo, normalizarCodigoMateria } from "../src/chaves";

/** Fixture manual canônica M9/M11/M13. Recusa qualquer execução fora dos emuladores. */
const ALLOWED_PROJECT_IDS = new Set(["lcqui-uenf", "lcqui-dev"]);
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
  { id: "aluno.authOnly", uid: "seed-aluno-auth-only", email: "aluno.authonly@lcqui.local", name: "Conta Auth sem papel Aluno", roles: [], emailVerified: true, disabled: false, activeDocument: false, note: "não possui Usuarios nem Aluno" },
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
  const value = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "lcqui-uenf";
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
const usuarioData = (user: FixtureUser) => ({ nome: user.name, email: user.email, ativo: true, versao_permissoes: 1, claims_pendentes: false, atualizado_em: FIXTURE_TIME });

async function writeFixture(): Promise<void> {
  const firestore = getFirestore(); const batch = firestore.batch();
  for (const user of users.filter((item) => item.activeDocument)) {
    batch.set(firestore.collection("Usuarios").doc(user.uid), usuarioData(user));
    for (const role of user.roles) batch.set(firestore.collection(role).doc(user.uid), role === "Professor" ? { id_usuario: user.uid, centro: "CCT", laboratorio: "Laboratório de Química" } : { id_usuario: user.uid });
    if (user.matricula) { batch.set(firestore.collection("Aluno").doc(user.uid), { id_usuario: user.uid, numero_matricula: user.matricula, nome: user.name, letra_inicial: user.name.charAt(0).toUpperCase() }); batch.set(firestore.collection("Chaves_Unicas").doc(chaveAlunoMatricula(user.matricula)), { tipo: "Aluno", id_recurso: user.uid, matricula: user.matricula, criado_em: FIXTURE_TIME }); }
  }
  const materias = [{ id: "materia-quimica-geral", nome: "Química Geral", codigo: "QUI101" }, { id: "materia-quimica-analitica", nome: "Química Analítica", codigo: "QUI202" }];
  for (const materia of materias) { const codigo = normalizarCodigoMateria(materia.codigo); batch.set(firestore.collection("Materia").doc(materia.id), { nome: materia.nome, codigo_materia: codigo }); batch.set(firestore.collection("Chaves_Unicas").doc(chaveMateria(codigo)), { tipo: "Materia", id_recurso: materia.id, codigo, criado_em: FIXTURE_TIME }); }
  for (const pm of profMaterias) { batch.set(firestore.collection("Professor_x_Materia").doc(`${pm.professor}__${pm.materia}`), { id_usuario: pm.professor, id_professor: pm.professor, id_materia: pm.materia }); }
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
  await batch.commit();

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
}

async function verify(): Promise<void> {
  console.log("VERIFYING SEED INVARIANTS"); const firestore = getFirestore(); const auth = getAuth(); const roles: readonly Role[] = ["Chefe_Geral", "Gestor_Almoxarifado", "Gestor_Bens_Patrimoniais", "Professor", "Aluno", "Bolsista"];
  for (const user of users.filter((item) => item.activeDocument)) {
    const authUser = await auth.getUser(user.uid); assert.equal(authUser.email, user.email); assert.equal(authUser.disabled, false); assert.deepEqual(authUser.customClaims, { roles: [...user.roles], versao_permissoes: 1 }); const account = await firestore.collection("Usuarios").doc(user.uid).get(); assert.equal(account.exists, true); assert.equal(account.data()?.ativo, true); assert.equal(account.data()?.versao_permissoes, 1);
    for (const role of roles) { const roleDoc = await firestore.collection(role).doc(user.uid).get(); assert.equal(roleDoc.exists, user.roles.includes(role), `${user.id}: papel divergente (${role})`); if (roleDoc.exists) assert.equal(roleDoc.data()?.id_usuario, user.uid); }
    if (user.matricula) { const aluno = await firestore.collection("Aluno").doc(user.uid).get(); assert.equal(aluno.data()?.numero_matricula, user.matricula); const key = await firestore.collection("Chaves_Unicas").doc(chaveAlunoMatricula(user.matricula)).get(); assert.equal(key.data()?.tipo, "Aluno"); assert.equal(key.data()?.id_recurso, user.uid); }
  }
  for (const user of users.filter((item) => !item.activeDocument && item.id !== "aluno.noAuth")) { const authUser = await auth.getUser(user.uid); assert.equal(authUser.disabled, user.disabled); assert.equal((await firestore.collection("Usuarios").doc(user.uid).get()).exists, false); assert.equal((await firestore.collection("Aluno").doc(user.uid).get()).exists, false); }
  await assert.rejects(() => auth.getUserByEmail(byId("aluno.noAuth").email), { code: "auth/user-not-found" });
  for (const [id, codigo] of [["materia-quimica-geral", "QUI101"], ["materia-quimica-analitica", "QUI202"]] as const) { const materia = await firestore.collection("Materia").doc(id).get(); assert.equal(materia.data()?.codigo_materia, codigo); const key = await firestore.collection("Chaves_Unicas").doc(chaveMateria(codigo)).get(); assert.equal(key.data()?.tipo, "Materia"); assert.equal(key.data()?.id_recurso, id); }
  for (const pm of profMaterias) { const rel = await firestore.collection("Professor_x_Materia").doc(`${pm.professor}__${pm.materia}`).get(); assert.equal(rel.exists, true); assert.equal(rel.data()?.id_usuario, pm.professor); assert.equal(rel.data()?.id_materia, pm.materia); }
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
  console.log("SEED INVARIANTS OK: M9, papéis/claims/versões, matrículas, Chaves_Unicas, turmas, vínculos, espelhos, histórico, contadores, baseline sem convites/notificações/receipts e roteiro canônico M12.2.");
}
function manifest(): void { console.log("\n=== LCQUI MANUAL TEST SEED ===\n[FIXTURES]"); for (const user of users) console.log(`${user.id.padEnd(24)} ${user.email.padEnd(38)} senha=${user.id === "aluno.noAuth" ? "—" : PASSWORD} uid=${user.uid} roles=${user.roles.join(",") || "—"} verified=${user.emailVerified} ativo=${user.activeDocument} | ${user.note}`); console.log("\n[TURMAS]\nTURMA_VAZIA=seed-turma-vazia/QGV101 | TURMA_ULTIMA_VAGA=seed-turma-ultima-vaga/QGV102 | TURMA_CHEIA=seed-turma-cheia/QAN201 | TURMA_ARQUIVADA=seed-turma-arquivada/QAN202 | TURMA_PROF_BETA=seed-turma-beta/QGB103 | TURMA_COLEGAS=seed-turma-colegas/QGV103"); console.log("Roteiro canônico M12.2: Roteiro_Experimento/seed-roteiro-m12 (PUBLICAVEL)"); console.log("Baseline sem Convite_Aluno pendente, CONVITE_PARA_TURMA, receipt M7 ou segredo/token."); }

async function main(): Promise<void> { const args = new Set(process.argv.slice(2)); if ([...args].some((arg) => !["--reset", "--verify-only"].includes(arg)) || (args.has("--reset") && args.has("--verify-only"))) throw new Error("Uso: tsx scripts/seed.ts [--reset|--verify-only]"); const id = projectId(); const { firestoreHost } = assertEmulatorOnly(id); dbApp(id); if (args.has("--verify-only")) { await verify(); manifest(); return; } if (args.has("--reset")) await reset(firestoreHost, id); for (const user of users.filter((item) => item.id !== "aluno.noAuth")) { await ensureAuth(user); if (user.activeDocument) await getAuth().setCustomUserClaims(user.uid, { roles: [...user.roles], versao_permissoes: 1 }); } await writeFixture(); await verify(); manifest(); }
main().catch((error: unknown) => { console.error("SEED FAILURE", error instanceof Error ? error.message : String(error)); process.exitCode = 1; });

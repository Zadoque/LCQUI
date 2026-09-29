process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { criarPost, adicionarComentario, removerPost, moderarComentario, listarComentariosPost } from "../../posts";

const testEnv = fft({ projectId: "lcqui-dev" });

/** Projeção tipada de listarComentariosPost (o wrap devolve unknown). */
interface ItemComentarioListado {
  id: string;
  visao: "AUTOR" | "COLEGA" | "AUDITOR";
  id_usuario: string;
  nome_usuario: string;
  texto: string | null;
  moderado: boolean;
  aviso_institucional?: string | null;
  motivo_moderacao?: string | null;
  moderado_por?: string | null;
  moderado_em?: unknown;
}
interface ResultadoListar {
  comentarios: ItemComentarioListado[];
  visao: "COLEGA" | "AUDITOR";
}
let db: admin.firestore.Firestore;

beforeAll(() => {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: "lcqui-dev" });
  }
  db = admin.firestore();
});

afterAll(() => {
  testEnv.cleanup();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRequest = (data: any, uid: string, roles: string[] = ["Professor"], versao_permissoes = 1): any => ({
  data,
  auth: {
    uid,
    token: { roles, versao_permissoes }
  },
  rawRequest: {}
});

async function semearUsuario(uid: string, roles: string[], versao = 1): Promise<void> {
  await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: versao, nome: `Nome ${uid}` });
  for (const r of roles) await db.collection(r).doc(uid).set({ id_usuario: uid, ativo: true });
}

async function semearTurma(id: string, idProfessor: string, status = "Ativo"): Promise<void> {
  await db.collection("Turma").doc(id).set({ 
    id_professor: idProfessor, 
    status, 
    nome_turma: `Turma ${id}`, 
    codigo_turma: id, 
    versao: 1, 
    ano: 2026, 
    semestre: 1, 
    capacidade: 30, 
    qtd_alunos: 0 
  });
}

async function semearVinculo(idTurma: string, uid: string): Promise<void> {
  await db.collection("Turma").doc(idTurma).collection("Alunos").doc(uid).set({ 
    id_aluno: uid, 
    id_turma: idTurma, 
    nome: `Aluno ${uid}`, 
    ingressou_em: admin.firestore.FieldValue.serverTimestamp() 
  });
}

let opSeq = 0;
const novaOperacao = (): string => `op_posts_${Date.now()}_${++opSeq}`;

describe("Módulo Acadêmico (Posts e Comentários - Baseado no main.tex)", () => {
  beforeEach(async () => {
    // Wipe total do Firestore Emulator (inclui subcoleções Posts/Comentarios/
    // Alunos, que um delete de documento raiz NÃO remove). Garante isolamento
    // real entre testes que reutilizam ids fixos.
    const host = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
    const url = `http://${host}/emulator/v1/projects/lcqui-dev/databases/(default)/documents`;
    const resposta = await fetch(url, { method: "DELETE" });
    if (!resposta.ok) {
      throw new Error(`Falha ao limpar o Firestore Emulator: HTTP ${resposta.status}`);
    }
  });

  // --- criarPost ---
  
  it("TEST-INT-POST-001 — professor-dono cria com sucesso", async () => {
    const professor = "prof_dono";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor);
    
    const wrapped = testEnv.wrap(criarPost);
    const result = await wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    expect(result.id).toBeDefined();
    expect(result.titulo).toBe("Titulo Teste");
    
    const postDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(result.id).get();
    expect(postDoc.exists).toBe(true);
    const postData = postDoc.data();
    expect(postData?.id_professor).toBe(professor);
    expect(postData?.id_turma).toBe("turma1");
    expect(postData?.removido_da_apresentacao).toBe(false);
    expect(postData?.editado).toBe(false);
  });

  it("TEST-INT-POST-002 — professor não-dono rejeitado", async () => {
    const professor1 = "prof1";
    const professor2 = "prof2";
    await semearUsuario(professor1, ["Professor"]);
    await semearUsuario(professor2, ["Professor"]);
    await semearTurma("turma1", professor1);
    
    const wrapped = testEnv.wrap(criarPost);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor2))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-POST-003 — Chefe_Geral rejeitado (ChefeNaoCriaPost)", async () => {
    const professor = "prof";
    const chefe = "chefe";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(chefe, ["Chefe_Geral"]);
    await semearTurma("turma1", professor);
    
    const wrapped = testEnv.wrap(criarPost);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, chefe, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-POST-004 — turma arquivada rejeitada", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor, "Arquivada");
    
    const wrapped = testEnv.wrap(criarPost);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-POST-005 — M7 replay com mesmo idOperacao e mesma identidade devolve mesmo resultado", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor);
    
    const op = novaOperacao();
    const wrapped = testEnv.wrap(criarPost);
    const primeiro = await wrapped(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    const segundo = await wrapped(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    expect(segundo).toEqual(primeiro);
    
    const posts = await db.collection("Turma").doc("turma1").collection("Posts").get();
    expect(posts.size).toBe(1);
  });

  it("TEST-INT-POST-006 — M7 reuso incompatível de idOperacao rejeitado", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor);
    
    const op = novaOperacao();
    const wrapped = testEnv.wrap(criarPost);
    await wrapped(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      titulo: "Titulo A",
      descricao: "Descricao A"
    }, professor));
    
    await expect(wrapped(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      titulo: "Titulo B",
      descricao: "Descricao B"
    }, professor))).rejects.toMatchObject({ code: "already-exists" });
  });

  // --- adicionarComentario ---

  it("TEST-INT-COM-001 — aluno com vínculo comenta com sucesso", async () => {
    const professor = "prof";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    const wrapped = testEnv.wrap(adicionarComentario);
    const result = await wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]));
    
    expect(result.id).toBeDefined();
    
    const comentarioDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(result.id).get();
    expect(comentarioDoc.exists).toBe(true);
    const comentarioData = comentarioDoc.data();
    expect(comentarioData?.id_usuario).toBe(aluno);
    expect(comentarioData?.texto).toBe("Texto do comentario");
    expect(comentarioData?.moderado).toBe(false);
    expect(comentarioData?.editado).toBe(false);
  });

  it("TEST-INT-COM-002 — aluno sem vínculo rejeitado", async () => {
    const professor = "prof";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    const wrapped = testEnv.wrap(adicionarComentario);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-COM-003 — professor não-dono rejeitado", async () => {
    const professor1 = "prof1";
    const professor2 = "prof2";
    const aluno = "aluno1";
    await semearUsuario(professor1, ["Professor"]);
    await semearUsuario(professor2, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor1);
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor1));
    
    const wrapped = testEnv.wrap(adicionarComentario);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, professor2))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-COM-004 — Post inexistente rejeitado", async () => {
    const professor = "prof";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", aluno);
    
    const wrapped = testEnv.wrap(adicionarComentario);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: "post_inexistente",
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]))).rejects.toMatchObject({ code: "not-found" });
  });

  it("TEST-INT-COM-005 — Post removido rejeitado", async () => {
    const professor = "prof";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Remover o post
    const wrappedRemover = testEnv.wrap(removerPost);
    await wrappedRemover(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      motivo: "Remover post"
    }, professor));
    
    const wrapped = testEnv.wrap(adicionarComentario);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-COM-006 — turma arquivada rejeitada", async () => {
    const professor = "prof";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor); // Inicialmente Ativo
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Arquivar a turma
    await db.collection("Turma").doc("turma1").update({ status: "Arquivada" });
    
    const wrapped = testEnv.wrap(adicionarComentario);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-COM-007 — M7 replay não duplica comentário", async () => {
    const professor = "prof";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    const op = novaOperacao();
    const wrapped = testEnv.wrap(adicionarComentario);
    await wrapped(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]));
    
    // Replay
    await wrapped(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]));
    
    const comentarios = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").get();
    expect(comentarios.size).toBe(1);
  });

  // --- removerPost ---

  it("TEST-INT-REM-001 — professor-dono remove com sucesso", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    const wrapped = testEnv.wrap(removerPost);
    const result = await wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      motivo: "Motivo da remoção"
    }, professor));
    
    expect(result.success).toBe(true);
    
    const postDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).get();
    expect(postDoc.exists).toBe(true);
    const postData = postDoc.data();
    expect(postData?.removido_da_apresentacao).toBe(true);
    expect(postData?.motivo_remocao).toBe("Motivo da remoção");
    expect(postData?.removido_por).toBe(professor);
  });

  it("TEST-INT-REM-002 — Chefe_Geral remove", async () => {
    const professor = "prof";
    const chefe = "chefe";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(chefe, ["Chefe_Geral"]);
    await semearTurma("turma1", professor);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    const wrapped = testEnv.wrap(removerPost);
    const result = await wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      motivo: "Motivo da remoção"
    }, chefe, ["Chefe_Geral"]));
    
    expect(result.success).toBe(true);
    
    const postDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).get();
    expect(postDoc.exists).toBe(true);
    const postData = postDoc.data();
    expect(postData?.removido_da_apresentacao).toBe(true);
    expect(postData?.motivo_remocao).toBe("Motivo da remoção");
    expect(postData?.removido_por).toBe(chefe);
  });

  it("TEST-INT-REM-003 — professor não-dono e não-chefe rejeitado", async () => {
    const professor1 = "prof1";
    const professor2 = "prof2";
    await semearUsuario(professor1, ["Professor"]);
    await semearUsuario(professor2, ["Professor"]);
    await semearTurma("turma1", professor1);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor1));
    
    const wrapped = testEnv.wrap(removerPost);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      motivo: "Motivo da remoção"
    }, professor2))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-REM-004 — turma arquivada rejeitada", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor); // Inicialmente Ativo
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Arquivar a turma
    await db.collection("Turma").doc("turma1").update({ status: "Arquivada" });
    
    const wrapped = testEnv.wrap(removerPost);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      motivo: "Motivo da remoção"
    }, professor))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-REM-005 — idempotente (segunda remoção não falha)", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    const wrappedRemover = testEnv.wrap(removerPost);
    await wrappedRemover(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      motivo: "Motivo da remoção"
    }, professor));
    
    // Segunda remoção
    const result = await wrappedRemover(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      motivo: "Motivo da remoção"
    }, professor));
    
    expect(result.success).toBe(true);
    
    const postDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).get();
    const postData = postDoc.data();
    expect(postData?.removido_da_apresentacao).toBe(true);
    expect(postData?.motivo_remocao).toBe("Motivo da remoção"); // Deve manter o primeiro motivo
  });

  it("TEST-INT-REM-006 — M7 replay", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    const op = novaOperacao();
    const wrappedRemover = testEnv.wrap(removerPost);
    await wrappedRemover(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id,
      motivo: "Motivo da remoção"
    }, professor));
    
    // Replay
    const result = await wrappedRemover(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id,
      motivo: "Motivo da remoção"
    }, professor));
    
    expect(result.success).toBe(true);
    
    const postDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).get();
    const postData = postDoc.data();
    expect(postData?.removido_da_apresentacao).toBe(true);
    expect(postData?.motivo_remocao).toBe("Motivo da remoção"); // Deve manter o primeiro motivo
  });

  // --- moderarComentario ---

  it("TEST-INT-MOD-001 — professor-dono modera com sucesso", async () => {
    const professor = "prof";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]));
    
    const wrapped = testEnv.wrap(moderarComentario);
    const result = await wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Motivo da moderação"
    }, professor));
    
    expect(result.success).toBe(true);
    
    const comentarioDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(comentarioResult.id).get();
    expect(comentarioDoc.exists).toBe(true);
    const comentarioData = comentarioDoc.data();
    expect(comentarioData?.moderado).toBe(true);
    expect(comentarioData?.motivo_moderacao).toBe("Motivo da moderação");
    expect(comentarioData?.moderado_por).toBe(professor);
  });

  it("TEST-INT-MOD-002 — Chefe_Geral modera", async () => {
    const professor = "prof";
    const chefe = "chefe";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(chefe, ["Chefe_Geral"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]));
    
    const wrapped = testEnv.wrap(moderarComentario);
    const result = await wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Motivo da moderação"
    }, chefe, ["Chefe_Geral"]));
    
    expect(result.success).toBe(true);
    
    const comentarioDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(comentarioResult.id).get();
    expect(comentarioDoc.exists).toBe(true);
    const comentarioData = comentarioDoc.data();
    expect(comentarioData?.moderado).toBe(true);
    expect(comentarioData?.motivo_moderacao).toBe("Motivo da moderação");
    expect(comentarioData?.moderado_por).toBe(chefe);
  });

  it("TEST-INT-MOD-003 — professor não-dono rejeitado", async () => {
    const professor1 = "prof1";
    const professor2 = "prof2";
    const aluno = "aluno1";
    await semearUsuario(professor1, ["Professor"]);
    await semearUsuario(professor2, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor1);
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor1));
    
    // Adicionar um comentario
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]));
    
    const wrapped = testEnv.wrap(moderarComentario);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Motivo da moderação"
    }, professor2))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-MOD-004 — turma arquivada rejeitada", async () => {
    const professor = "prof";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor); // Inicialmente Ativo
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]));
    
    // Arquivar a turma
    await db.collection("Turma").doc("turma1").update({ status: "Arquivada" });
    
    const wrapped = testEnv.wrap(moderarComentario);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Motivo da moderação"
    }, professor))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-MOD-005 — idempotente", async () => {
    const professor = "prof";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]));
    
    const wrappedModerar = testEnv.wrap(moderarComentario);
    await wrappedModerar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Motivo da moderação"
    }, professor));
    
    // Segunda moderação
    const result = await wrappedModerar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Motivo da moderação"
    }, professor));
    
    expect(result.success).toBe(true);
    
    const comentarioDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(comentarioResult.id).get();
    const comentarioData = comentarioDoc.data();
    expect(comentarioData?.moderado).toBe(true);
    expect(comentarioData?.motivo_moderacao).toBe("Motivo da moderação"); // Deve manter o primeiro motivo
  });

  it("TEST-INT-MOD-006 — M7 replay", async () => {
    const professor = "prof";
    const aluno = "aluno1";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", aluno);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, aluno, ["Aluno"]));
    
    const op = novaOperacao();
    const wrappedModerar = testEnv.wrap(moderarComentario);
    await wrappedModerar(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Motivo da moderação"
    }, professor));
    
    // Replay
    const result = await wrappedModerar(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Motivo da moderação"
    }, professor));
    
    expect(result.success).toBe(true);
    
    const comentarioDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(comentarioResult.id).get();
    const comentarioData = comentarioDoc.data();
    expect(comentarioData?.moderado).toBe(true);
    expect(comentarioData?.motivo_moderacao).toBe("Motivo da moderação"); // Deve manter o primeiro motivo
  });

  // --- listarComentariosPost ---

  it("TEST-INT-LST-001 — Teste básico de listagem", async () => {
    const professor = "prof_dono";
    const alunoA = "aluno_autor";
    const alunoB = "aluno_colega";
    
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(alunoA, ["Aluno"]);
    await semearUsuario(alunoB, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", alunoA);
    await semearVinculo("turma1", alunoB);
    
    // Criar um post
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar comentarios
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Comentario do autor"
    }, alunoA, ["Aluno"]));
    
    await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Comentario do colega"
    }, alunoB, ["Aluno"]));
    
    // Testar visao AUTOR (alunoA) - apenas verificar que funciona
    const wrappedListar = testEnv.wrap(listarComentariosPost) as (req: unknown) => Promise<ResultadoListar>;
    const resultA = await wrappedListar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id
    }, alunoA, ["Aluno"]));
    
    expect(resultA.comentarios).toHaveLength(2);
    expect(resultA.visao).toBe("COLEGA");
    
    // Testar visao COLEGA (alunoB) - apenas verificar que funciona
    const resultB = await wrappedListar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id
    }, alunoB, ["Aluno"]));
    
    expect(resultB.comentarios).toHaveLength(2);
    expect(resultB.visao).toBe("COLEGA");
    
    // Testar visao AUDITOR (professor) - apenas verificar que funciona
    const resultP = await wrappedListar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id
    }, professor));
    
    expect(resultP.comentarios).toHaveLength(2);
    expect(resultP.visao).toBe("AUDITOR");
  });

  it("TEST-INT-LST-002 — Autor A chama → vê próprio texto original", async () => {
    const professor = "prof_dono";
    const alunoA = "aluno_autor";
    
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(alunoA, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", alunoA);
    
    // Criar um post
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario do autor
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario autor"
    }, alunoA, ["Aluno"]));
    
    // Listar comentarios
    const wrappedListar = testEnv.wrap(listarComentariosPost) as (req: unknown) => Promise<ResultadoListar>;
    const result = await wrappedListar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id
    }, alunoA, ["Aluno"]));
    
    expect(result.comentarios).toHaveLength(1);
    expect(result.visao).toBe("COLEGA");

    const comentario = result.comentarios[0];
    expect(comentario.id).toBe(comentarioResult.id);
    expect(comentario.visao).toBe("AUTOR");
    expect(comentario.texto).toBe("Texto do comentario autor");
    expect(comentario.moderado).toBe(false);
  });

  it("TEST-INT-LST-003 — Colega B (não moderador, não autor) → para comentario NÃO moderado vê original", async () => {
    const professor = "prof_dono";
    const alunoA = "aluno_autor";
    const alunoB = "aluno_colega";
    
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(alunoA, ["Aluno"]);
    await semearUsuario(alunoB, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", alunoA);
    await semearVinculo("turma1", alunoB);
    
    // Criar um post
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario do autor
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario original"
    }, alunoA, ["Aluno"]));
    
    // Listar comentarios
    const wrappedListar = testEnv.wrap(listarComentariosPost) as (req: unknown) => Promise<ResultadoListar>;
    const result = await wrappedListar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id
    }, alunoB, ["Aluno"]));
    
    expect(result.comentarios).toHaveLength(1);
    expect(result.visao).toBe("COLEGA");
    
    const comentario = result.comentarios[0];
    expect(comentario.id).toBe(comentarioResult.id);
    expect(comentario.texto).toBe("Texto do comentario original");
    expect(comentario.aviso_institucional).toBeNull();
  });

  it("TEST-INT-LST-004 — Colega B (não moderador, não autor) → para comentario MODERADO vê null + aviso", async () => {
    const professor = "prof_dono";
    const alunoA = "aluno_autor";
    const alunoB = "aluno_colega";
    
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(alunoA, ["Aluno"]);
    await semearUsuario(alunoB, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", alunoA);
    await semearVinculo("turma1", alunoB);
    
    // Criar um post
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario do autor
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario original"
    }, alunoA, ["Aluno"]));
    
    // Moderar o comentario
    const wrappedModerar = testEnv.wrap(moderarComentario);
    await wrappedModerar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Moderacao de teste"
    }, professor));
    
    // Listar comentarios
    const wrappedListar = testEnv.wrap(listarComentariosPost) as (req: unknown) => Promise<ResultadoListar>;
    const result = await wrappedListar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id
    }, alunoB, ["Aluno"]));
    
    expect(result.comentarios).toHaveLength(1);
    expect(result.visao).toBe("COLEGA");
    
    const comentario = result.comentarios[0];
    expect(comentario.id).toBe(comentarioResult.id);
    expect(comentario.texto).toBeNull();
    expect(comentario.aviso_institucional).toBe("Este comentário foi moderado pelo professor responsável.");
  });

  it("TEST-INT-LST-005 — Auditor P (dono) → vê original + motivo", async () => {
    const professor = "prof_dono";
    const alunoA = "aluno_autor";
    
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(alunoA, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", alunoA);
    
    // Criar um post
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario do autor
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario original"
    }, alunoA, ["Aluno"]));
    
    // Moderar o comentario
    const wrappedModerar = testEnv.wrap(moderarComentario);
    await wrappedModerar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Moderacao de teste"
    }, professor));
    
    // Listar comentarios
    const wrappedListar = testEnv.wrap(listarComentariosPost) as (req: unknown) => Promise<ResultadoListar>;
    const result = await wrappedListar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id
    }, professor));
    
    expect(result.comentarios).toHaveLength(1);
    expect(result.visao).toBe("AUDITOR");
    
    const comentario = result.comentarios[0];
    expect(comentario.id).toBe(comentarioResult.id);
    expect(comentario.texto).toBe("Texto do comentario original");
    expect(comentario.motivo_moderacao).toBe("Moderacao de teste");
    expect(comentario.moderado_por).toBe(professor);
    expect(comentario.moderado_em).toBeDefined();
  });

  it("TEST-INT-LST-006 — Chefe_Geral auditor → vê original + motivo", async () => {
    const professor = "prof_dono";
    const chefe = "chefe_auditor";
    const alunoA = "aluno_autor";
    
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(chefe, ["Chefe_Geral"]);
    await semearUsuario(alunoA, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", alunoA);
    
    // Criar um post
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario do autor
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    const comentarioResult = await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario original"
    }, alunoA, ["Aluno"]));
    
    // Moderar o comentario
    const wrappedModerar = testEnv.wrap(moderarComentario);
    await wrappedModerar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Moderacao de teste"
    }, professor));
    
    // Listar comentarios
    const wrappedListar = testEnv.wrap(listarComentariosPost) as (req: unknown) => Promise<ResultadoListar>;
    const result = await wrappedListar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id
    }, chefe, ["Chefe_Geral"]));
    
    expect(result.comentarios).toHaveLength(1);
    expect(result.visao).toBe("AUDITOR");
    
    const comentario = result.comentarios[0];
    expect(comentario.id).toBe(comentarioResult.id);
    expect(comentario.texto).toBe("Texto do comentario original");
    expect(comentario.motivo_moderacao).toBe("Moderacao de teste");
    expect(comentario.moderado_por).toBe(professor);
    expect(comentario.moderado_em).toBeDefined();
  });

  it("TEST-INT-LST-007 — non-member rejected", async () => {
    const professor = "prof_dono";
    const alunoA = "aluno_autor";
    const alunoB = "aluno_fora";
    
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(alunoA, ["Aluno"]);
    await semearUsuario(alunoB, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", alunoA);
    // alunoB não está vinculado
    
    // Criar um post
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Listar comentarios
    const wrappedListar = testEnv.wrap(listarComentariosPost) as (req: unknown) => Promise<ResultadoListar>;
    await expect(wrappedListar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id
    }, alunoB, ["Aluno"]))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-LST-008 — M7 replay retorna mesmo resultado", async () => {
    const professor = "prof_dono";
    const alunoA = "aluno_autor";
    
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(alunoA, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", alunoA);
    
    // Criar um post
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor));
    
    // Adicionar um comentario do autor
    const wrappedComentar = testEnv.wrap(adicionarComentario);
    await wrappedComentar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      texto: "Texto do comentario"
    }, alunoA, ["Aluno"]));
    
    const op = novaOperacao();
    const wrappedListar = testEnv.wrap(listarComentariosPost) as (req: unknown) => Promise<ResultadoListar>;
    
    const primeiro = await wrappedListar(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id
    }, alunoA, ["Aluno"]));
    
    const segundo = await wrappedListar(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id
    }, alunoA, ["Aluno"]));
    
    expect(primeiro).toEqual(segundo);
  });

  // --- M9 role revocation ---

  it("TEST-INT-M9-001 — professor-dono loses Persisted Professor role → criarPost com claim version 2 rejeitado", async () => {
    const professor = "prof_revoked";
    await semearUsuario(professor, ["Professor"], 1); // versao_permissoes: 1
    await semearTurma("turma1", professor);
    
    // Primeira chamada com versão 1 deve funcionar
    const wrappedCriar = testEnv.wrap(criarPost);
    const result1 = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste",
      descricao: "Descricao Teste"
    }, professor, ["Professor"], 1));
    
    expect(result1.id).toBeDefined();
    
    // Atualizar a versão do usuário para 2 (role revogada)
    await db.collection("Usuarios").doc(professor).update({ versao_permissoes: 2 });
    
    // Chamada com claim versao 1 deve ser rejeitada
    await expect(wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Teste 2",
      descricao: "Descricao Teste 2"
    }, professor, ["Professor"], 1))).rejects.toMatchObject({ code: "permission-denied" });
  });
});
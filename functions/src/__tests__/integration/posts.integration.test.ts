import "../emulator-credentials";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.STORAGE_EMULATOR_HOST = "http://127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { criarPost, adicionarComentario, removerPost, moderarComentario, listarComentariosPost, editarPost, editarComentario } from "../../posts";
import { registrarRoteiro, validarObjetoRoteiro, publicarRoteiro, compartilharRoteiro, descompartilharRoteiro, removerRoteiro } from "../../roteiros";

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
    admin.initializeApp({
      projectId: "lcqui-dev",
      storageBucket: "lcqui-dev.appspot.com",
    });
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

async function criarRoteiroPublicavel(
  uid: string,
  nome: string,
  nomeArquivo: string
): Promise<{ idRoteiro: string; storagePath: string; geracao: string; tamanhoBytes: number }> {
  const storagePath = `roteiros/${uid}/${Date.now()}_${nomeArquivo}`;
  const buffer = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(1024)]);
  await admin.storage().bucket().file(storagePath).save(buffer, {
    contentType: "application/pdf",
    metadata: {
      metadata: { owner: uid },
    },
  });

  const wrappedReg = testEnv.wrap(registrarRoteiro);
  const resultReg = await wrappedReg(mockRequest({
    idOperacao: novaOperacao(),
    nome,
    descricao: `Descrição de ${nome}`,
    storagePath,
    nomeArquivo,
  }, uid));

  const wrappedValidar = testEnv.wrap(validarObjetoRoteiro);
  const resultValidar = await wrappedValidar(mockRequest({
    idOperacao: novaOperacao(),
    idRoteiro: resultReg.idRoteiro,
  }, uid));

  const wrappedPublicar = testEnv.wrap(publicarRoteiro);
  await wrappedPublicar(mockRequest({
    idOperacao: novaOperacao(),
    idRoteiro: resultReg.idRoteiro,
  }, uid));

  return {
    idRoteiro: resultReg.idRoteiro,
    storagePath,
    geracao: resultValidar.geracao,
    tamanhoBytes: buffer.length,
  };
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

  // --- editarPost ---

  it("TEST-INT-EDT-POST-001 — professor-dono edita título e descrição com sucesso", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Original",
      descricao: "Descricao Original"
    }, professor));
    
    const wrapped = testEnv.wrap(editarPost);
    const result = await wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      titulo: "Novo Titulo",
      descricao: "Nova Descricao"
    }, professor));
    
    expect(result.id).toBe(postResult.id);
    
    const postDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).get();
    expect(postDoc.exists).toBe(true);
    const postData = postDoc.data();
    expect(postData?.titulo).toBe("Novo Titulo");
    expect(postData?.descricao).toBe("Nova Descricao");
    expect(postData?.editado).toBe(true);
    expect(postData?.editado_em).toBeDefined();
    
    // Verificar histórico
    const historicoSnap = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Historico_Posts_Turma").get();
    expect(historicoSnap.size).toBe(1);
    const historicoData = historicoSnap.docs[0].data();
    expect(historicoData.tipo).toBe("edicao");
    expect(historicoData.novo_titulo).toBe("Novo Titulo");
    expect(historicoData.nova_descricao).toBe("Nova Descricao");
    expect(historicoData.antigo_titulo).toBe("Titulo Original");
    expect(historicoData.antiga_descricao).toBe("Descricao Original");
  });

  it("TEST-INT-EDT-POST-002 — professor não-dono é rejeitado (permission-denied)", async () => {
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
      titulo: "Titulo Original",
      descricao: "Descricao Original"
    }, professor1));
    
    const wrapped = testEnv.wrap(editarPost);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      titulo: "Novo Titulo"
    }, professor2))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-EDT-POST-003 — Chefe_Geral é rejeitado (permission-denied)", async () => {
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
      titulo: "Titulo Original",
      descricao: "Descricao Original"
    }, professor));
    
    const wrapped = testEnv.wrap(editarPost);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      titulo: "Novo Titulo"
    }, chefe, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-EDT-POST-004 — turma arquivada rejeitada (failed-precondition)", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor); // Inicialmente Ativo
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Original",
      descricao: "Descricao Original"
    }, professor));
    
    // Arquivar a turma
    await db.collection("Turma").doc("turma1").update({ status: "Arquivada" });
    
    const wrapped = testEnv.wrap(editarPost);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      titulo: "Novo Titulo"
    }, professor))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-EDT-POST-005 — post removido rejeitado (failed-precondition)", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Original",
      descricao: "Descricao Original"
    }, professor));
    
    // Remover o post
    const wrappedRemover = testEnv.wrap(removerPost);
    await wrappedRemover(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      motivo: "Remover post"
    }, professor));
    
    const wrapped = testEnv.wrap(editarPost);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      titulo: "Novo Titulo"
    }, professor))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-EDT-POST-006 — M7 replay com mesmo idOperacao devolve mesmo resultado sem duplicar histórico", async () => {
    const professor = "prof";
    await semearUsuario(professor, ["Professor"]);
    await semearTurma("turma1", professor);
    
    // Criar um post primeiro
    const wrappedCriar = testEnv.wrap(criarPost);
    const postResult = await wrappedCriar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      titulo: "Titulo Original",
      descricao: "Descricao Original"
    }, professor));
    
    const op = novaOperacao();
    const wrapped = testEnv.wrap(editarPost);
    const primeiro = await wrapped(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id,
      titulo: "Novo Titulo"
    }, professor));
    
    const segundo = await wrapped(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id,
      titulo: "Novo Titulo"
    }, professor));
    
    expect(segundo).toEqual(primeiro);
    
    const postDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).get();
    const postData = postDoc.data();
    expect(postData?.titulo).toBe("Novo Titulo");
    
    // Verificar que histórico não foi duplicado
    const historicoSnap = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Historico_Posts_Turma").get();
    expect(historicoSnap.size).toBe(1);
  });

  // --- editarComentario ---

  it("TEST-INT-EDT-COM-001 — autor edita comentário com sucesso", async () => {
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
      texto: "Texto original do comentario"
    }, aluno, ["Aluno"]));
    
    const wrapped = testEnv.wrap(editarComentario);
    const result = await wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      texto: "Texto editado do comentario"
    }, aluno, ["Aluno"]));
    
    expect(result.id).toBe(comentarioResult.id);
    
    const comentarioDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(comentarioResult.id).get();
    expect(comentarioDoc.exists).toBe(true);
    const comentarioData = comentarioDoc.data();
    expect(comentarioData?.texto).toBe("Texto editado do comentario");
    expect(comentarioData?.editado).toBe(true);
    expect(comentarioData?.editado_em).toBeDefined();
    
    // Verificar histórico
    const historicoSnap = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(comentarioResult.id).collection("Historico_Comentario").get();
    expect(historicoSnap.size).toBe(1);
    const historicoData = historicoSnap.docs[0].data();
    expect(historicoData.tipo).toBe("edicao");
    expect(historicoData.novo_texto).toBe("Texto editado do comentario");
    expect(historicoData.texto_antigo).toBe("Texto original do comentario");
  });

  it("TEST-INT-EDT-COM-002 — terceiro não autor rejeitado (permission-denied)", async () => {
    const professor = "prof";
    const aluno1 = "aluno1";
    const aluno2 = "aluno2";
    await semearUsuario(professor, ["Professor"]);
    await semearUsuario(aluno1, ["Aluno"]);
    await semearUsuario(aluno2, ["Aluno"]);
    await semearTurma("turma1", professor);
    await semearVinculo("turma1", aluno1);
    await semearVinculo("turma1", aluno2);
    
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
      texto: "Texto original do comentario"
    }, aluno1, ["Aluno"]));
    
    const wrapped = testEnv.wrap(editarComentario);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      texto: "Texto editado do comentario"
    }, aluno2, ["Aluno"]))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-EDT-COM-003 — turma arquivada rejeitada", async () => {
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
      texto: "Texto original do comentario"
    }, aluno, ["Aluno"]));
    
    // Arquivar a turma
    await db.collection("Turma").doc("turma1").update({ status: "Arquivada" });
    
    const wrapped = testEnv.wrap(editarComentario);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      texto: "Texto editado do comentario"
    }, aluno, ["Aluno"]))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-EDT-COM-004 — comentário moderado permanece moderado após edição do autor (invariante)", async () => {
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
      texto: "Texto original do comentario"
    }, aluno, ["Aluno"]));
    
    // Moderar o comentario
    const wrappedModerar = testEnv.wrap(moderarComentario);
    await wrappedModerar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      motivo: "Motivo da moderação"
    }, professor));
    
    // Verificar que está moderado
    const comentarioDoc1 = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(comentarioResult.id).get();
    const comentarioData1 = comentarioDoc1.data();
    expect(comentarioData1?.moderado).toBe(true);
    
    // Editar o comentario
    const wrappedEditar = testEnv.wrap(editarComentario);
    await wrappedEditar(mockRequest({
      idOperacao: novaOperacao(),
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      texto: "Texto editado do comentario"
    }, aluno, ["Aluno"]));
    
    // Verificar que continua moderado
    const comentarioDoc2 = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(comentarioResult.id).get();
    const comentarioData2 = comentarioDoc2.data();
    expect(comentarioData2?.moderado).toBe(true);
    expect(comentarioData2?.texto).toBe("Texto editado do comentario");
  });

  it("TEST-INT-EDT-COM-005 — M7 replay com mesmo idOperacao devolve mesmo resultado sem duplicar histórico", async () => {
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
      texto: "Texto original do comentario"
    }, aluno, ["Aluno"]));
    
    const op = novaOperacao();
    const wrapped = testEnv.wrap(editarComentario);
    const primeiro = await wrapped(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      texto: "Texto editado do comentario"
    }, aluno, ["Aluno"]));
    
    const segundo = await wrapped(mockRequest({
      idOperacao: op,
      idTurma: "turma1",
      idPost: postResult.id,
      idComentario: comentarioResult.id,
      texto: "Texto editado do comentario"
    }, aluno, ["Aluno"]));
    
    expect(segundo).toEqual(primeiro);
    
    const comentarioDoc = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(comentarioResult.id).get();
    const comentarioData = comentarioDoc.data();
    expect(comentarioData?.texto).toBe("Texto editado do comentario");
    
    // Verificar que histórico não foi duplicado
    const historicoSnap = await db.collection("Turma").doc("turma1").collection("Posts").doc(postResult.id).collection("Comentarios").doc(comentarioResult.id).collection("Historico_Comentario").get();
    expect(historicoSnap.size).toBe(1);
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

  // --- Anexo de Roteiro a Post (M12.2) ---

  describe("Anexo de Roteiro a Post", () => {
    it("TEST-INT-RTR-POST-001 — professor dono cria Post com roteiro próprio PUBLICAVEL", async () => {
      const professor = "prof_rtr_dono";
      await semearUsuario(professor, ["Professor"]);
      await semearTurma("turma_rtr_1", professor);

      const roteiro = await criarRoteiroPublicavel(professor, "Roteiro Próprio", "proprio.pdf");

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_1",
        titulo: "Post com Roteiro",
        descricao: "Descricao",
        idRoteiroExperimento: roteiro.idRoteiro,
      }, professor));

      const postDoc = await db.collection("Turma").doc("turma_rtr_1").collection("Posts").doc(postResult.id).get();
      expect(postDoc.exists).toBe(true);
      const postData = postDoc.data()!;
      expect(postData.id_roteiro_experimento).toBe(roteiro.idRoteiro);

      const anexo = postData.roteiro_anexo as Record<string, unknown>;
      expect(Object.keys(anexo).sort()).toEqual([
        "id_roteiro",
        "nome_arquivo",
        "tamanho_bytes",
        "storage_path",
        "geracao",
      ].sort());
      expect(anexo.id_roteiro).toBe(roteiro.idRoteiro);
      expect(typeof anexo.nome_arquivo).toBe("string");
      expect((anexo.nome_arquivo as string).length).toBeLessThanOrEqual(150);
      expect(typeof anexo.tamanho_bytes).toBe("number");
      expect(anexo.tamanho_bytes).toBeGreaterThan(0);
      expect(anexo.storage_path).toBe(roteiro.storagePath);
      expect(anexo.geracao).toBe(roteiro.geracao);
    });

    it("TEST-INT-RTR-POST-002 — criarPost com roteiro de outro professor sem compartilhamento é rejeitado", async () => {
      const professor = "prof_rtr_protecao";
      const outro = "prof_rtr_outro";
      await semearUsuario(professor, ["Professor"]);
      await semearUsuario(outro, ["Professor"]);
      await semearTurma("turma_rtr_2", professor);

      const roteiro = await criarRoteiroPublicavel(outro, "Roteiro Alheio", "alheio.pdf");

      const wrappedCriar = testEnv.wrap(criarPost);
      await expect(wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_2",
        titulo: "Post com Roteiro Alheio",
        descricao: "Descricao",
        idRoteiroExperimento: roteiro.idRoteiro,
      }, professor))).rejects.toMatchObject({ code: "permission-denied" });

      const posts = await db.collection("Turma").doc("turma_rtr_2").collection("Posts").get();
      expect(posts.empty).toBe(true);
    });

    it("TEST-INT-RTR-POST-003 — criarPost com roteiro compartilhado é permitido", async () => {
      const professor = "prof_rtr_comp_dono";
      const outro = "prof_rtr_comp_alvo";
      await semearUsuario(professor, ["Professor"]);
      await semearUsuario(outro, ["Professor"]);
      await semearTurma("turma_rtr_3", professor);

      const roteiro = await criarRoteiroPublicavel(outro, "Roteiro Compartilhado", "comp.pdf");
      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await wrappedComp(mockRequest({
        idOperacao: novaOperacao(),
        idRoteiro: roteiro.idRoteiro,
        uidProfessor: professor,
      }, outro));

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_3",
        titulo: "Post com Roteiro Compartilhado",
        descricao: "Descricao",
        idRoteiroExperimento: roteiro.idRoteiro,
      }, professor));

      const postDoc = await db.collection("Turma").doc("turma_rtr_3").collection("Posts").doc(postResult.id).get();
      expect(postDoc.data()?.roteiro_anexo?.id_roteiro).toBe(roteiro.idRoteiro);
    });

    it("TEST-INT-RTR-POST-004 — editarPost desvincula anexo mesmo sem acesso atual", async () => {
      const professor = "prof_rtr_desvinc";
      const outro = "prof_rtr_desvinc_outro";
      await semearUsuario(professor, ["Professor"]);
      await semearUsuario(outro, ["Professor"]);
      await semearTurma("turma_rtr_4", professor);

      const roteiro = await criarRoteiroPublicavel(outro, "Roteiro a Desvincular", "desvinc.pdf");
      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await wrappedComp(mockRequest({
        idOperacao: novaOperacao(),
        idRoteiro: roteiro.idRoteiro,
        uidProfessor: professor,
      }, outro));

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_4",
        titulo: "Post com Anexo",
        descricao: "Descricao",
        idRoteiroExperimento: roteiro.idRoteiro,
      }, professor));

      // Revoga o compartilhamento
      const wrappedDescomp = testEnv.wrap(descompartilharRoteiro);
      await wrappedDescomp(mockRequest({
        idOperacao: novaOperacao(),
        idRoteiro: roteiro.idRoteiro,
        uidProfessor: professor,
      }, outro));

      const wrappedEditar = testEnv.wrap(editarPost);
      const result = await wrappedEditar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_4",
        idPost: postResult.id,
        idRoteiroExperimento: null,
      }, professor));
      expect(result.id).toBe(postResult.id);

      const postDoc = await db.collection("Turma").doc("turma_rtr_4").collection("Posts").doc(postResult.id).get();
      const postData = postDoc.data()!;
      expect(postData.roteiro_anexo).toBeNull();
      expect(postData.id_roteiro_experimento).toBeNull();
    });

    it("TEST-INT-RTR-POST-005 — editarPost mantendo anexo após revogação de compartilhamento é rejeitado", async () => {
      const professor = "prof_rtr_manter";
      const outro = "prof_rtr_manter_outro";
      await semearUsuario(professor, ["Professor"]);
      await semearUsuario(outro, ["Professor"]);
      await semearTurma("turma_rtr_5", professor);

      const roteiro = await criarRoteiroPublicavel(outro, "Roteiro a Revogar", "revog.pdf");
      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await wrappedComp(mockRequest({
        idOperacao: novaOperacao(),
        idRoteiro: roteiro.idRoteiro,
        uidProfessor: professor,
      }, outro));

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_5",
        titulo: "Post com Anexo",
        descricao: "Descricao",
        idRoteiroExperimento: roteiro.idRoteiro,
      }, professor));

      const wrappedDescomp = testEnv.wrap(descompartilharRoteiro);
      await wrappedDescomp(mockRequest({
        idOperacao: novaOperacao(),
        idRoteiro: roteiro.idRoteiro,
        uidProfessor: professor,
      }, outro));

      const wrappedEditar = testEnv.wrap(editarPost);
      await expect(wrappedEditar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_5",
        idPost: postResult.id,
        titulo: "Novo Titulo",
      }, professor))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("TEST-INT-RTR-POST-006 — editarPost trocando para roteiro sem acesso é rejeitado", async () => {
      const professor = "prof_rtr_troca";
      const outro = "prof_rtr_troca_outro";
      await semearUsuario(professor, ["Professor"]);
      await semearUsuario(outro, ["Professor"]);
      await semearTurma("turma_rtr_6", professor);

      const roteiroSemAcesso = await criarRoteiroPublicavel(outro, "Roteiro Sem Acesso", "semacesso.pdf");

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_6",
        titulo: "Post sem Anexo",
        descricao: "Descricao",
      }, professor));

      const wrappedEditar = testEnv.wrap(editarPost);
      await expect(wrappedEditar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_6",
        idPost: postResult.id,
        idRoteiroExperimento: roteiroSemAcesso.idRoteiro,
      }, professor))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("TEST-INT-RTR-POST-007 — criarPost com roteiro nao PUBLICAVEL é rejeitado", async () => {
      const professor = "prof_rtr_status";
      await semearUsuario(professor, ["Professor"]);
      await semearTurma("turma_rtr_7", professor);

      const storagePath = `roteiros/${professor}/${Date.now()}_provisorio.pdf`;
      const buffer = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(1024)]);
      await admin.storage().bucket().file(storagePath).save(buffer, {
        contentType: "application/pdf",
        metadata: { metadata: { owner: professor } },
      });

      const roteiroRef = db.collection("Roteiro_Experimento").doc();
      await roteiroRef.set({
        id_professor_upload: professor,
        nome: "Roteiro Provisorio",
        descricao: "...",
        nome_arquivo: "provisorio.pdf",
        referencia: {
          storage_path: storagePath,
          tamanho_bytes: 1035,
          geracao: "123",
          owner_uid: professor,
          content_type: "application/pdf",
        },
        status: "PROVISORIO",
        professores_compartilhados: [],
      });

      const wrappedCriar = testEnv.wrap(criarPost);
      await expect(wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_7",
        titulo: "Post com Roteiro Provisorio",
        descricao: "Descricao",
        idRoteiroExperimento: roteiroRef.id,
      }, professor))).rejects.toMatchObject({ code: "permission-denied" });

      const posts = await db.collection("Turma").doc("turma_rtr_7").collection("Posts").get();
      expect(posts.empty).toBe(true);
    });

    it("TEST-INT-RTR-POST-008 — histórico de anexo preserva snapshots de troca e desvínculo", async () => {
      const professor = "prof_rtr_historico";
      await semearUsuario(professor, ["Professor"]);
      await semearTurma("turma_rtr_historico", professor);

      const roteiroA = await criarRoteiroPublicavel(professor, "Roteiro A", "a.pdf");
      const roteiroB = await criarRoteiroPublicavel(professor, "Roteiro B", "b.pdf");

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_historico",
        titulo: "Post Histórico",
        descricao: "Descricao",
        idRoteiroExperimento: roteiroA.idRoteiro,
      }, professor));

      const wrappedEditar = testEnv.wrap(editarPost);
      await wrappedEditar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_historico",
        idPost: postResult.id,
        idRoteiroExperimento: roteiroB.idRoteiro,
      }, professor));

      await wrappedEditar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_historico",
        idPost: postResult.id,
        idRoteiroExperimento: null,
      }, professor));

      const historicoSnap = await db.collection("Turma").doc("turma_rtr_historico").collection("Posts").doc(postResult.id).collection("Historico_Posts_Turma").get();
      expect(historicoSnap.size).toBeGreaterThanOrEqual(2);

      const historicos = historicoSnap.docs.map((d) => d.data());
      for (const h of historicos) {
        expect(h).toHaveProperty("antigo_roteiro_anexo");
        expect(h).toHaveProperty("novo_roteiro_anexo");
      }

      const troca = historicos.find((h) => h.novo_roteiro_anexo?.id_roteiro === roteiroB.idRoteiro);
      expect(troca).toBeDefined();
      expect(troca!.antigo_roteiro_anexo.id_roteiro).toBe(roteiroA.idRoteiro);
      expect(troca!.antigo_roteiro_anexo.geracao).toBe(roteiroA.geracao);
      expect(troca!.novo_roteiro_anexo.geracao).toBe(roteiroB.geracao);

      const desvinculo = historicos.find((h) => h.antigo_roteiro_anexo?.id_roteiro === roteiroB.idRoteiro && h.novo_roteiro_anexo === null);
      expect(desvinculo).toBeDefined();

      const snapshotAindaPresente = historicos.some((h) =>
        h.antigo_roteiro_anexo?.id_roteiro === roteiroA.idRoteiro ||
        h.novo_roteiro_anexo?.id_roteiro === roteiroA.idRoteiro
      );
      expect(snapshotAindaPresente).toBe(true);
    });

    it("TEST-INT-RTR-POST-011 — snapshot do anexo sobrevive à remoção do Roteiro_Experimento", async () => {
      const professor = "prof_rtr_remove_roteiro";
      await semearUsuario(professor, ["Professor"]);
      await semearTurma("turma_rtr_remove_roteiro", professor);

      const roteiroA = await criarRoteiroPublicavel(professor, "Roteiro A Sobrevive", "a.pdf");

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_remove_roteiro",
        titulo: "Post com Anexo Sobrevivente",
        descricao: "Descricao",
        idRoteiroExperimento: roteiroA.idRoteiro,
      }, professor));

      // Remover o roteiro (documento Firestore + objeto Storage).
      const wrappedRemoverRoteiro = testEnv.wrap(removerRoteiro);
      await wrappedRemoverRoteiro(mockRequest({
        idOperacao: novaOperacao(),
        idRoteiro: roteiroA.idRoteiro,
      }, professor));

      // O documento de Roteiro foi removido.
      const roteiroSnap = await db.collection("Roteiro_Experimento").doc(roteiroA.idRoteiro).get();
      expect(roteiroSnap.exists).toBe(false);

      // O Post preserva o snapshot do anexo mesmo sem o documento de Roteiro.
      const postDoc = await db.collection("Turma").doc("turma_rtr_remove_roteiro").collection("Posts").doc(postResult.id).get();
      const postData = postDoc.data()!;
      expect(postData.roteiro_anexo).toBeTruthy();
      expect(postData.roteiro_anexo.id_roteiro).toBe(roteiroA.idRoteiro);
      expect(postData.roteiro_anexo.geracao).toBe(roteiroA.geracao);
    });

    it("TEST-INT-RTR-POST-012 — snapshot do anexo sobrevive à remoção lógica do Post", async () => {
      const professor = "prof_rtr_remove_post";
      await semearUsuario(professor, ["Professor"]);
      await semearTurma("turma_rtr_remove_post", professor);

      const roteiroA = await criarRoteiroPublicavel(professor, "Roteiro A no Post Removido", "a.pdf");

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_remove_post",
        titulo: "Post que Será Removido",
        descricao: "Descricao",
        idRoteiroExperimento: roteiroA.idRoteiro,
      }, professor));

      const wrappedRemoverPost = testEnv.wrap(removerPost);
      await wrappedRemoverPost(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_remove_post",
        idPost: postResult.id,
        motivo: "Remoção para teste de histórico",
      }, professor));

      // O Post foi removido logicamente, mas o documento e o anexo persistem.
      const postDoc = await db.collection("Turma").doc("turma_rtr_remove_post").collection("Posts").doc(postResult.id).get();
      const postData = postDoc.data()!;
      expect(postData.removido_da_apresentacao).toBe(true);
      expect(postData.roteiro_anexo).toBeTruthy();
      expect(postData.roteiro_anexo.id_roteiro).toBe(roteiroA.idRoteiro);
      expect(postData.roteiro_anexo.geracao).toBe(roteiroA.geracao);
    });

    it("TEST-INT-RTR-POST-009 — turma arquivada nega criação de Post com roteiro", async () => {
      const professor = "prof_rtr_arquivado";
      await semearUsuario(professor, ["Professor"]);
      await semearTurma("turma_rtr_arq", professor);
      await db.collection("Turma").doc("turma_rtr_arq").update({ status: "Arquivada" });

      const roteiro = await criarRoteiroPublicavel(professor, "Roteiro Arquivado", "arq.pdf");

      const wrappedCriar = testEnv.wrap(criarPost);
      await expect(wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_arq",
        titulo: "Post Turma Arquivada",
        descricao: "Descricao",
        idRoteiroExperimento: roteiro.idRoteiro,
      }, professor))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("TEST-INT-RTR-POST-010 — aluno não pode criar Post com roteiro anexado", async () => {
      const professor = "prof_rtr_aluno_prof";
      const aluno = "aluno_rtr_anexo";
      await semearUsuario(professor, ["Professor"]);
      await semearUsuario(aluno, ["Aluno"]);
      await semearTurma("turma_rtr_aluno", professor);
      await semearVinculo("turma_rtr_aluno", aluno);

      const roteiro = await criarRoteiroPublicavel(professor, "Roteiro Aluno", "aluno.pdf");

      const wrappedCriar = testEnv.wrap(criarPost);
      await expect(wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: "turma_rtr_aluno",
        titulo: "Post Aluno",
        descricao: "Descricao",
        idRoteiroExperimento: roteiro.idRoteiro,
      }, aluno, ["Aluno"]))).rejects.toMatchObject({ code: "permission-denied" });
    });
  });
});
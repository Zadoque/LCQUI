process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { CallableRequest } from "firebase-functions/v2/https";
import { convidarUsuario, revogarUsuarioPapel, atualizarPerfil, buscarProfessores, buscarUsuariosParaPapel } from "../../usuarios";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Integração: Múltiplos Papéis (convidarUsuario)", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  afterAll(async () => {
    testEnv.cleanup();
  });

  const mockRequest = (data: any, uid: string, roles: string[] = ["Chefe_Geral"]): any => ({
    data,
    auth: {
      uid,
      token: { roles, versao_permissoes: 1 }
    },
    rawRequest: {}
  });

  // M9: o ator exige autoridade persistida (Usuarios ativo + documento de papel).
  beforeEach(async () => {
    await db.collection("Usuarios").doc("chefe123").set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc("chefe123").set({ id_usuario: "chefe123" });
    await Promise.all([
      "op-revogar-aluno-1",
      "op-m7-receipt-1",
      "op-m7-replay-1",
      "op-m7-reuso-1",
    ].map(id => db.collection("Operacoes").doc(id).delete()));
  });

  it("deve bloquear a atribuição de Professor para um usuário que já é Aluno, sem poluir Firestore", async () => {
    const wrapped = testEnv.wrap(convidarUsuario);
    
    // Configurar o estado inicial no Firestore
    const userEmail = "aluno_teste_multi@example.com";
    
    // Primeiro, vamos criar o user no Firebase Auth emulator
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(userEmail);
    } catch(e) {
      userRecord = await admin.auth().createUser({
        email: userEmail,
        displayName: "Aluno Teste Multi"
      });
    }

    // Adiciona como Aluno no Firestore
    await db.collection("Aluno").doc(userRecord.uid).set({
      nome: "Aluno Teste Multi",
      email: userEmail
    });

    const req = mockRequest({
      idOperacao: "op-multi-professor-1",
      email: userEmail,
      nome: "Aluno Teste Multi",
      papel: "Professor",
      centro: "CCT",
      laboratorio: "Lab 1"
    }, "chefe123");

    // Tentativa de adicionar papel incompatível
    await expect(wrapped(req)).rejects.toThrow("O usuário que é aluno não pode ser professor.");

    // Verifica que não poluiu o Firestore
    const professorDoc = await db.collection("Professor").doc(userRecord.uid).get();
    expect(professorDoc.exists).toBe(false);
  });

  it("deve concluir provisionamento Auth pós-commit e receipt M7", async () => {
    const email = `aluno_outbox_${Date.now()}@example.com`;
    const idOperacao = `op-outbox-${Date.now()}`;
    const resultado = await testEnv.wrap(convidarUsuario)(mockRequest({
      idOperacao,
      email,
      nome: "Aluno Outbox",
      papel: "Aluno",
      motivo: "Provisionamento pós-commit",
    }, "chefe123"));

    const authUser = await admin.auth().getUserByEmail(email);
    expect(authUser.uid).toBe(resultado.uid);
    expect((await db.collection("Aluno").doc(resultado.uid).get()).exists).toBe(true);
    expect((await db.collection("Operacoes").doc(idOperacao).get()).data()?.status).toBe("CONCLUIDA");
  });

  it("TEST-INT-ROLE-UI02-001 — seleciona identidade existente por UID e conserva projeção mínima", async () => {
    const email = `role_existente_${Date.now()}@example.com`;
    const authUser = await admin.auth().createUser({ email, displayName: "Alvo Existente" });
    await db.collection("Usuarios").doc(authUser.uid).set({
      id_usuario: authUser.uid, nome: "Alvo Existente", email, ativo: true, versao_permissoes: 1,
    });
    await db.collection("Aluno").doc(authUser.uid).set({ id_usuario: authUser.uid, nome: "Alvo Existente", email });

    const idOperacao = `op-role-ui02-${Date.now()}`;
    const resultado = await testEnv.wrap(convidarUsuario)(mockRequest({
      idOperacao,
      uidAlvo: authUser.uid,
      papel: "Bolsista",
      motivo: "Concessão de Bolsista para identidade existente",
    }, "chefe123"));

    expect(resultado.uid).toBe(authUser.uid);
    expect((await db.collection("Bolsista").doc(authUser.uid).get()).exists).toBe(true);

    const busca = await testEnv.wrap(buscarUsuariosParaPapel)(mockRequest({ termo: "Alvo Existente" }, "chefe123"));
    const alvo = (busca as { usuarios: Array<Record<string, unknown>> }).usuarios.find(item => item.id === authUser.uid);
    expect(alvo).toMatchObject({ id: authUser.uid, nome: "Alvo Existente", papeis: ["Aluno", "Bolsista"] });
    expect(alvo).not.toHaveProperty("email");
  });

  it("deve desativar o usuário ao revogar seu último papel e manter em Usuarios com ativo = false", async () => {
    const { revogarUsuarioPapel } = require("../../usuarios");
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    
    const userEmail = "aluno_revogar_unico@example.com";
    
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(userEmail);
    } catch(e) {
      userRecord = await admin.auth().createUser({
        email: userEmail,
        displayName: "Aluno Para Revogar"
      });
    }

    // O usuário é APENAS Aluno
    await db.collection("Aluno").doc(userRecord.uid).set({
      nome: "Aluno Para Revogar",
      email: userEmail
    });

    // Simulando que ele também existe na coleção central Usuarios
    await db.collection("Usuarios").doc(userRecord.uid).set({
      nome: "Aluno Para Revogar",
      email: userEmail,
      ativo: true,
      versao_permissoes: 1,
    });

    const req = mockRequest({
      idOperacao: "op-revogar-aluno-1",
      email: userEmail,
      papel: "Aluno",
      motivo: "Fim do curso"
    }, "chefe123");

    const result = await wrapped(req);

    // O retorno deve indicar que a conta foi desativada (ativo: false)
    expect(result.ativo).toBe(false);
    expect(result.uid).toBe(userRecord.uid);

    // Verifica que apagou da coleção do Papel
    const alunoDoc = await db.collection("Aluno").doc(userRecord.uid).get();
    expect(alunoDoc.exists).toBe(false);

    // Verifica que a identidade permaneceu em Usuarios, mas inativa
    const usuarioCentralDoc = await db.collection("Usuarios").doc(userRecord.uid).get();
    expect(usuarioCentralDoc.exists).toBe(true);
    expect(usuarioCentralDoc.data()?.ativo).toBe(false);
  });
});

describe("Integração: M7 em mutações de papel", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  afterAll(async () => {
    testEnv.cleanup();
  });

  beforeEach(async () => {
    await db.collection("Usuarios").doc("chefe123").set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc("chefe123").set({ id_usuario: "chefe123" });
  });

  const mockRequest = (data: unknown, uid: string, roles: string[] = ["Chefe_Geral"]): CallableRequest =>
    ({
      data,
      auth: { uid, token: { roles, versao_permissoes: 1 } },
      rawRequest: {}
    }) as unknown as CallableRequest;

  async function criarAlvo(email: string): Promise<string> {
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch {
      user = await admin.auth().createUser({ email, displayName: "Alvo M7" });
    }
    await db.collection("Aluno").doc(user.uid).set({ nome: "Alvo M7", email });
    await db.collection("Usuarios").doc(user.uid).set({ nome: "Alvo M7", email, ativo: true, versao_permissoes: 1 });
    return user.uid;
  }

  it("TEST-INT-ROLE-M7-001 — idOperacao ausente é rejeitado (invalid-argument)", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const email = "m7_sem_id@example.com";
    await criarAlvo(email);
    const req = mockRequest({ email, papel: "Aluno", motivo: "Sem id" }, "chefe123");
    await expect(wrapped(req)).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("TEST-INT-ROLE-M7-002 — receipt canônico gravado em Operacoes/{idOperacao}", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const email = "m7_receipt@example.com";
    const alvo = await criarAlvo(email);
    const id = "op-m7-receipt-1";
    await wrapped(mockRequest({ idOperacao: id, email, papel: "Aluno", motivo: "Receipt" }, "chefe123"));
    const receipt = await db.collection("Operacoes").doc(id).get();
    expect(receipt.exists).toBe(true);
    expect(receipt.data()).toMatchObject({
      uid: "chefe123",
      tipo_operacao: "REVOGAR_PAPEL",
      status: "CONCLUIDA",
    });
    expect(receipt.data()?.payload_hash).toMatch(/^[0-9a-f]{64}$/);
    const aluno = await db.collection("Aluno").doc(alvo).get();
    expect(aluno.exists).toBe(false);
  });

  it("TEST-INT-ROLE-M7-003 — replay devolve o mesmo resultado e não reaplica efeito", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const email = "m7_replay@example.com";
    const alvo = await criarAlvo(email);
    const id = "op-m7-replay-1";
    const dados = { idOperacao: id, email, papel: "Aluno", motivo: "Replay" };
    const primeira = await wrapped(mockRequest(dados, "chefe123"));
    const receipt1 = await db.collection("Operacoes").doc(id).get();
    const segunda = await wrapped(mockRequest(dados, "chefe123"));
    const receipt2 = await db.collection("Operacoes").doc(id).get();
    expect(segunda).toEqual(primeira);
    expect(receipt1.data()?.criado_em.toMillis()).toBe(receipt2.data()?.criado_em.toMillis());
    const auditorias = await db.collection("Registro_de_Auditoria").where("id_do_objeto_da_entidade", "==", alvo).get();
    expect(auditorias.size).toBe(1);
  });

  it("TEST-INT-ROLE-M7-004 — mesmo idOperacao com payload diferente é rejeitado", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const email = "m7_conflito@example.com";
    await criarAlvo(email);
    const id = "op-m7-conflito-1";
    await wrapped(mockRequest({ idOperacao: id, email, papel: "Aluno", motivo: "Motivo A" }, "chefe123"));
    await expect(
      wrapped(mockRequest({ idOperacao: id, email, papel: "Aluno", motivo: "Motivo B" }, "chefe123"))
    ).rejects.toMatchObject({ code: "already-exists" });
  });
});

describe("Integração: atualizarPerfil (S8 UI-01 L191)", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  afterAll(async () => {
    testEnv.cleanup();
  });

  const mockRequest = (data: unknown, uid: string): CallableRequest =>
    ({
      data,
      auth: { uid, token: { roles: ["Aluno"], versao_permissoes: 1 } },
      rawRequest: {}
    }) as unknown as CallableRequest;

  const uidAluno = "aluno_perfil_001";

  beforeEach(async () => {
    // Limpa estado anterior
    await db.collection("Usuarios").doc(uidAluno).delete().catch(() => {});
    await db.collection("Aluno").doc(uidAluno).delete().catch(() => {});

    // Cria usuário ativo com perfil Aluno
    await db.collection("Usuarios").doc(uidAluno).set({
      nome: "Aluno Original",
      email: "aluno_perfil@example.com",
      ativo: true,
      versao_permissoes: 1,
    });
    await db.collection("Aluno").doc(uidAluno).set({
      nome: "Aluno Original",
      letra_inicial: "A",
      email: "aluno_perfil@example.com",
      id_usuario: uidAluno,
      ativo: true,
    });
  });

  it("S8-PERFIL-INT-001 — atualiza Usuarios.nome, Aluno.nome e Aluno.letra_inicial", async () => {
    const wrapped = testEnv.wrap(atualizarPerfil);
    const req = mockRequest({ nome: "Bruno Silva" }, uidAluno);
    const result = await wrapped(req);

    expect(result).toMatchObject({ sucesso: true });

    const usuarioDoc = await db.collection("Usuarios").doc(uidAluno).get();
    expect(usuarioDoc.data()?.nome).toBe("Bruno Silva");

    const alunoDoc = await db.collection("Aluno").doc(uidAluno).get();
    expect(alunoDoc.data()?.nome).toBe("Bruno Silva");
    expect(alunoDoc.data()?.letra_inicial).toBe("B");
  });

  it("S8-PERFIL-INT-002 — rejeita nome vazio (invalid-argument)", async () => {
    const wrapped = testEnv.wrap(atualizarPerfil);
    const req = mockRequest({ nome: "   " }, uidAluno);
    await expect(wrapped(req)).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("S8-PERFIL-INT-003 — rejeita nome com mais de 150 caracteres (invalid-argument)", async () => {
    const wrapped = testEnv.wrap(atualizarPerfil);
    const req = mockRequest({ nome: "X".repeat(151) }, uidAluno);
    await expect(wrapped(req)).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("S8-PERFIL-INT-004 — rejeita usuário não autenticado", async () => {
    const wrapped = testEnv.wrap(atualizarPerfil);
    const req = { data: { nome: "Novo Nome" }, auth: undefined, rawRequest: {} } as unknown as CallableRequest;
    await expect(wrapped(req)).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("S8-PERFIL-INT-005 — rejeita usuário inativo (permission-denied)", async () => {
    await db.collection("Usuarios").doc(uidAluno).update({ ativo: false });
    const wrapped = testEnv.wrap(atualizarPerfil);
    const req = mockRequest({ nome: "Novo Nome" }, uidAluno);
    await expect(wrapped(req)).rejects.toMatchObject({ code: "permission-denied" });
  });
});

describe("Integração: buscarProfessores (S8 UI-02/UI-13)", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  afterAll(async () => {
    testEnv.cleanup();
  });

  const mockRequest = (data: unknown, uid: string, roles: string[] = ["Chefe_Geral"]): CallableRequest =>
    ({
      data,
      auth: { uid, token: { roles, versao_permissoes: 1 } },
      rawRequest: {}
    }) as unknown as CallableRequest;

  const uidChefe = "chefe_buscaprof_001";
  const uidProf = "prof_buscaprof_001";

  beforeEach(async () => {
    await db.collection("Usuarios").doc(uidChefe).delete().catch(() => {});
    await db.collection("Chefe_Geral").doc(uidChefe).delete().catch(() => {});
    await db.collection("Usuarios").doc(uidProf).delete().catch(() => {});
    await db.collection("Professor").doc(uidProf).delete().catch(() => {});

    // Chefe_Geral ativo
    await db.collection("Usuarios").doc(uidChefe).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc(uidChefe).set({ id_usuario: uidChefe });

    // Professor com nome em Usuarios (fonte canônica)
    await db.collection("Usuarios").doc(uidProf).set({
      nome: "Professora Ana Lima",
      email: "ana.lima@example.com",
      centro: "CCT",
      laboratorio: "Lab Física",
      ativo: true,
    });
    await db.collection("Professor").doc(uidProf).set({ id_usuario: uidProf });
  });

  it("S8-BUSCAPROF-INT-001 — retorna projeção mínima { id, nome } sem email/centro/laboratorio", async () => {
    const wrapped = testEnv.wrap(buscarProfessores);
    const req = mockRequest({}, uidChefe);
    const result = await wrapped(req);

    expect(result.professores).toBeDefined();
    const found = result.professores.find((p: { id: string; nome: string }) => p.id === uidProf);
    expect(found).toBeDefined();
    expect(found).toMatchObject({ id: uidProf, nome: "Professora Ana Lima" });
    // Projeção mínima: NÃO deve conter email, centro ou laboratorio
    const foundKeys = Object.keys(found!);
    expect(foundKeys).toEqual(expect.arrayContaining(["id", "nome"]));
    expect(foundKeys).not.toContain("email");
    expect(foundKeys).not.toContain("centro");
    expect(foundKeys).not.toContain("laboratorio");
  });

  it("S8-BUSCAPROF-INT-002 — filtra por termo no nome", async () => {
    const wrapped = testEnv.wrap(buscarProfessores);
    const req = mockRequest({ termo: "Ana" }, uidChefe);
    const result = await wrapped(req);

    expect(result.professores.length).toBeGreaterThanOrEqual(1);
    expect(result.professores[0].nome.toLowerCase()).toContain("ana");
  });

  it("S8-BUSCAPROF-INT-003 — rejeita chamada sem autenticação", async () => {
    const wrapped = testEnv.wrap(buscarProfessores);
    const req = { data: {}, auth: undefined, rawRequest: {} } as unknown as CallableRequest;
    await expect(wrapped(req)).rejects.toMatchObject({ code: "unauthenticated" });
  });
});

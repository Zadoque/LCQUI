import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Inicializa o ambiente de teste apontando para o emulador
  testEnv = await initializeTestEnvironment({
    projectId: "lcqui-test",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../../../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Firestore Security Rules", () => {
  
  // Helpers
  const unauthedDb = () => testEnv.unauthenticatedContext().firestore();
  
  const authedDb = (uid: string, claims?: Record<string, boolean>) => 
    testEnv.authenticatedContext(uid, claims).firestore();

  describe("Acessos Básicos", () => {
    it("não deve permitir leitura ou escrita se não estiver autenticado", async () => {
      const db = unauthedDb();
      await assertFails(db.collection("Turmas").get());
      await assertFails(db.collection("Frascos").add({ nome: "Teste" }));
      await assertFails(db.collection("QualquerCoisa").get());
    });
  });

  describe("Coleção Usuarios", () => {
    it("deve permitir que o usuário leia a si mesmo", async () => {
      const db = authedDb("alice");
      await assertSucceeds(db.collection("Usuarios").doc("alice").get());
    });

    it("não deve permitir que o usuário leia outro usuário (sem ser chefe/admin)", async () => {
      const db = authedDb("alice");
      await assertFails(db.collection("Usuarios").doc("bob").get());
    });

    it("deve permitir que o chefe leia qualquer usuário", async () => {
      const db = authedDb("boss", { chefe: true });
      await assertSucceeds(db.collection("Usuarios").doc("alice").get());
    });
  });

  describe("Turmas", () => {
    it("deve permitir que qualquer usuário logado liste turmas", async () => {
      const db = authedDb("aluno1", { aluno: true });
      await assertSucceeds(db.collection("Turmas").get());
    });

    it("não deve permitir que um aluno crie uma turma", async () => {
      const db = authedDb("aluno1", { aluno: true });
      await assertFails(db.collection("Turmas").add({ nome: "Nova Turma" }));
    });

    it("deve permitir que um professor crie uma turma", async () => {
      const db = authedDb("prof1", { professor: true });
      await assertSucceeds(db.collection("Turmas").add({ nome: "Turma do Prof" }));
    });
  });

  describe("Patrimônio", () => {
    it("não deve permitir que um aluno leia patrimônio", async () => {
      const db = authedDb("aluno1", { aluno: true });
      await assertFails(db.collection("Patrimonio").get());
    });

    it("deve permitir que um professor leia patrimônio, mas não crie diretamente", async () => {
      const db = authedDb("prof1", { professor: true });
      await assertSucceeds(db.collection("Patrimonio").get());
      await assertFails(db.collection("Patrimonio").add({ nome: "Microscópio" }));
    });

    it("deve permitir que um gestor de patrimônio crie patrimônio", async () => {
      const db = authedDb("gestor1", { gestorPatrimonio: true });
      await assertSucceeds(db.collection("Patrimonio").add({ nome: "Microscópio" }));
    });

    it("deve permitir que um professor crie requisição de patrimônio", async () => {
      const db = authedDb("prof1", { professor: true });
      await assertSucceeds(db.collection("Requisicoes").add({ nome: "Microscópio" }));
    });
  });

  describe("Almoxarifado e Reagentes", () => {
    it("qualquer usuário autenticado pode listar frascos", async () => {
      const db = authedDb("aluno1", { aluno: true });
      await assertSucceeds(db.collection("Frascos").get());
    });

    it("apenas gestor almoxarifado (ou admin) pode criar frascos", async () => {
      const dbAluno = authedDb("aluno1", { aluno: true });
      await assertFails(dbAluno.collection("Frascos").add({ nome: "NaCl" }));

      const dbGestor = authedDb("gestorAlm", { gestorAlmoxarifado: true });
      await assertSucceeds(dbGestor.collection("Frascos").add({ nome: "NaCl" }));
    });
  });

  describe("Auditoria", () => {
    it("ninguém pelo frontend pode escrever em auditoria", async () => {
      const dbAdmin = authedDb("boss", { chefe: true });
      await assertFails(dbAdmin.collection("Auditoria").add({ acao: "Teste" }));
    });

    it("apenas chefe/admin pode ler auditoria", async () => {
      const dbProf = authedDb("prof", { professor: true });
      await assertFails(dbProf.collection("Auditoria").get());

      const dbAdmin = authedDb("boss", { chefe: true });
      await assertSucceeds(dbAdmin.collection("Auditoria").get());
    });
  });

});

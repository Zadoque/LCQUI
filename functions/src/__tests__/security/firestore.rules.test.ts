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
  
  const authedDb = (uid: string, roles: string[] = []) => 
    testEnv.authenticatedContext(uid, { roles }).firestore();

  describe("Acessos Básicos", () => {
    it("não deve permitir leitura ou escrita se não estiver autenticado", async () => {
      const db = unauthedDb();
      await assertFails(db.collection("Turma").get());
      await assertFails(db.collection("Frasco_Reagente").add({ nome: "Teste" }));
      await assertFails(db.collection("QualquerCoisa").get());
    });
  });

  describe("Coleção Usuarios", () => {
    it("deve permitir que o usuário leia a si mesmo", async () => {
      const db = authedDb("alice");
      await assertSucceeds(db.collection("Usuarios").doc("alice").get());
    });

    it("não deve permitir que o usuário leia outro usuário (sem ser chefe)", async () => {
      const db = authedDb("alice");
      await assertFails(db.collection("Usuarios").doc("bob").get());
    });

    it("deve permitir que o chefe leia qualquer usuário", async () => {
      const db = authedDb("boss", ["Chefe_Geral"]);
      await assertSucceeds(db.collection("Usuarios").doc("alice").get());
    });
  });

  describe("Turmas", () => {
    it("deve permitir que qualquer usuário logado liste turmas", async () => {
      const db = authedDb("aluno1", ["Aluno"]);
      await assertSucceeds(db.collection("Turma").get());
    });

    it("não deve permitir que um aluno crie uma turma", async () => {
      const db = authedDb("aluno1", ["Aluno"]);
      await assertFails(db.collection("Turma").add({ nome: "Nova Turma" }));
    });

    it("deve permitir que um professor crie uma turma", async () => {
      const db = authedDb("prof1", ["Professor"]);
      await assertSucceeds(db.collection("Turma").add({ nome: "Turma do Prof" }));
    });
  });

  describe("Patrimônio", () => {
    it("não deve permitir que um aluno leia patrimônio", async () => {
      const db = authedDb("aluno1", ["Aluno"]);
      await assertFails(db.collection("Bem_Patrimonial").get());
    });

    it("deve permitir que um professor leia patrimônio, mas não crie diretamente", async () => {
      const db = authedDb("prof1", ["Professor"]);
      await assertSucceeds(db.collection("Bem_Patrimonial").get());
      await assertFails(db.collection("Bem_Patrimonial").add({ nome: "Microscópio" }));
    });

    it("deve permitir que um gestor de patrimônio crie patrimônio", async () => {
      const db = authedDb("gestor1", ["Gestor_Bens_Patrimoniais"]);
      await assertSucceeds(db.collection("Bem_Patrimonial").add({ nome: "Microscópio" }));
    });

    it("deve permitir que um professor crie requisição de patrimônio", async () => {
      const db = authedDb("prof1", ["Professor"]);
      await assertSucceeds(db.collection("Requisicao_Adicao_Bem_Patrimonial").add({ nome: "Microscópio" }));
    });
  });

  describe("Almoxarifado e Reagentes", () => {
    it("qualquer usuário autenticado pode listar frascos", async () => {
      const db = authedDb("aluno1", ["Aluno"]);
      await assertSucceeds(db.collection("Frasco_Reagente").get());
    });

    it("apenas gestor almoxarifado (ou admin) pode criar frascos", async () => {
      const dbAluno = authedDb("aluno1", ["Aluno"]);
      await assertFails(dbAluno.collection("Frasco_Reagente").add({ nome: "NaCl" }));

      const dbGestor = authedDb("gestorAlm", ["Gestor_Almoxarifado"]);
      await assertSucceeds(dbGestor.collection("Frasco_Reagente").add({ nome: "NaCl" }));
    });
  });

  describe("Auditoria", () => {
    it("ninguém pelo frontend pode escrever em auditoria", async () => {
      const dbAdmin = authedDb("boss", ["Chefe_Geral"]);
      await assertFails(dbAdmin.collection("Registro_de_Auditoria").add({ acao: "Teste" }));
    });

    it("apenas chefe/admin pode ler auditoria", async () => {
      const dbProf = authedDb("prof", ["Professor"]);
      await assertFails(dbProf.collection("Registro_de_Auditoria").get());

      const dbAdmin = authedDb("boss", ["Chefe_Geral"]);
      await assertSucceeds(dbAdmin.collection("Registro_de_Auditoria").get());
    });
  });

});

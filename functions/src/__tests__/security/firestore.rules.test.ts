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

    it("não deve permitir que o usuário modifique o próprio perfil se não for admin", async () => {
      const db = authedDb("alice");
      // A escrita agora requer admin (as atualizações devem ser feitas por Cloud Function)
      await assertFails(db.collection("Usuarios").doc("alice").update({ roles: ["Chefe_Geral"] }));
      await assertFails(db.collection("Usuarios").doc("alice").set({ nome: "Alice 2" }));
    });

    it("deve permitir que o chefe leia e escreva qualquer usuário", async () => {
      const db = authedDb("boss", ["Chefe_Geral"]);
      await assertSucceeds(db.collection("Usuarios").doc("alice").get());
      await assertSucceeds(db.collection("Usuarios").doc("alice").set({ nome: "Alice Alterada" }));
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

    it("não deve permitir que um professor crie uma turma diretamente", async () => {
      const db = authedDb("prof1", ["Professor"]);
      // Criação deve ser via Cloud Function
      await assertFails(db.collection("Turma").add({ nome: "Turma do Prof", id_professor: "prof1" }));
    });

    it("deve permitir que um professor altere apenas sua própria turma", async () => {
      // Setup da turma burlando as regras (já que a criação normal seria por Cloud Function)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const dbAdmin = context.firestore();
        await dbAdmin.collection("Turma").doc("turmaProf1").set({ nome: "Turma do Prof 1", id_professor: "prof1" });
      });

      const dbProf1 = authedDb("prof1", ["Professor"]);
      const dbProf2 = authedDb("prof2", ["Professor"]);

      // Prof 1 atualiza sua própria turma (deve passar)
      await assertSucceeds(dbProf1.collection("Turma").doc("turmaProf1").update({ nome: "Novo Nome" }));

      // Prof 2 tenta atualizar a turma do Prof 1 (deve falhar)
      await assertFails(dbProf2.collection("Turma").doc("turmaProf1").update({ nome: "Hacked" }));
    });

    it("não deve permitir que um aluno se inscreva diretamente em uma turma", async () => {
      const dbAluno = authedDb("aluno1", ["Aluno"]);
      // A inscrição é gerenciada via Cloud Function
      await assertFails(dbAluno.collection("Turma").doc("turmaProf1").collection("Alunos").doc("aluno1").set({ matricula: "123" }));
    });

    describe("Posts e Comentários", () => {
      it("apenas o professor da turma pode criar um post", async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const dbAdmin = context.firestore();
          await dbAdmin.collection("Turma").doc("turmaProf1").set({ id_professor: "prof1" });
        });

        const dbProf1 = authedDb("prof1", ["Professor"]);
        const dbProf2 = authedDb("prof2", ["Professor"]);

        // Prof 1 cria post na sua turma
        await assertSucceeds(dbProf1.collection("Turma").doc("turmaProf1").collection("Posts").add({ titulo: "Aula 1", id_autor: "prof1" }));
        
        // Prof 2 cria post na turma do Prof 1
        await assertFails(dbProf2.collection("Turma").doc("turmaProf1").collection("Posts").add({ titulo: "Hacked", id_autor: "prof2" }));
      });

      it("apenas alunos da turma e o professor da turma podem comentar", async () => {
        const dbAlunoMatriculado = authedDb("aluno1", ["Aluno"]);
        const dbAlunoNaoMatriculado = authedDb("aluno2", ["Aluno"]);

        // Setup: matricular aluno1 e criar turma e post
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const dbAdmin = context.firestore();
          await dbAdmin.collection("Turma").doc("turmaProf1").set({ id_professor: "prof1" });
          await dbAdmin.collection("Turma").doc("turmaProf1").collection("Alunos").doc("aluno1").set({ ativo: true });
          await dbAdmin.collection("Turma").doc("turmaProf1").collection("Posts").doc("post1").set({ titulo: "Aula 1" });
        });
        
        // Aluno 1 comenta (deve passar)
        await assertSucceeds(dbAlunoMatriculado.collection("Turma").doc("turmaProf1").collection("Posts").doc("post1").collection("Comentarios").add({ texto: "Dúvida", id_autor: "aluno1" }));
        
        // Aluno 2 comenta (deve falhar)
        await assertFails(dbAlunoNaoMatriculado.collection("Turma").doc("turmaProf1").collection("Posts").doc("post1").collection("Comentarios").add({ texto: "Hacked", id_autor: "aluno2" }));
      });
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

    it("apenas admin pode criar frascos diretamente; gestor deve usar Cloud Function", async () => {
      const dbAluno = authedDb("aluno1", ["Aluno"]);
      await assertFails(dbAluno.collection("Frasco_Reagente").add({ nome: "NaCl" }));

      const dbGestor = authedDb("gestorAlm", ["Gestor_Almoxarifado"]);
      // Gestor não pode mais criar frasco diretamente via client, apenas Cloud Function
      await assertFails(dbGestor.collection("Frasco_Reagente").add({ nome: "NaCl" }));
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

  describe("Roteiros de Experimento", () => {
    it("não deve permitir que um professor altere o roteiro de outro", async () => {
      const dbProf1 = authedDb("prof1", ["Professor"]);
      const dbProf2 = authedDb("prof2", ["Professor"]);

      // Prof 1 cria o roteiro
      const roteiroRef = dbProf1.collection("Roteiro_Experimento").doc("rot1");
      await assertSucceeds(roteiroRef.set({ titulo: "Roteiro", id_professor: "prof1" }));

      // Prof 2 tenta deletar o roteiro do Prof 1
      await assertFails(dbProf2.collection("Roteiro_Experimento").doc("rot1").delete());
    });
  });

});

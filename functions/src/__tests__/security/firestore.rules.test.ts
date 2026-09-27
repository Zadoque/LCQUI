import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

let testEnv: RulesTestEnvironment;

type KnownRole =
  | "Chefe_Geral"
  | "Gestor_Almoxarifado"
  | "Gestor_Bens_Patrimoniais"
  | "Professor"
  | "Aluno"
  | "Bolsista";

const AUTHORITY_VERSION = 1;
const LEGACY_AUTHORITIES: Record<string, KnownRole[]> = {
  alice: ["Aluno"],
  boss: ["Chefe_Geral"],
  aluno1: ["Aluno"],
  prof1: ["Professor"],
  prof2: ["Professor"],
  gestor1: ["Gestor_Bens_Patrimoniais"],
  gestorAlm: ["Gestor_Almoxarifado"],
  prof: ["Professor"],
};

async function seedAuthority(uid: string, roles: KnownRole[]): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const batch = db.batch();
    batch.set(db.collection("Usuarios").doc(uid), {
      ativo: true,
      versao_permissoes: AUTHORITY_VERSION,
    });
    for (const role of roles) {
      batch.set(db.collection(role).doc(uid), {id_usuario: uid, ativo: true});
    }
    await batch.commit();
  });
}

jest.setTimeout(30000);

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
}, 30000);

beforeEach(async () => {
  await testEnv.clearFirestore();
  for (const [uid, roles] of Object.entries(LEGACY_AUTHORITIES)) {
    await seedAuthority(uid, roles);
  }
}, 30000);

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Firestore Security Rules", () => {
  
  // Helpers
  const unauthedDb = () => testEnv.unauthenticatedContext().firestore();
  
  const authedDb = (uid: string, roles: KnownRole[] = LEGACY_AUTHORITIES[uid] ?? []) =>
    testEnv.authenticatedContext(uid, {roles, versao_permissoes: AUTHORITY_VERSION}).firestore();

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

    it("chefe lê identidade, mas não altera ativo ou papéis diretamente", async () => {
      const db = authedDb("boss", ["Chefe_Geral"]);
      await assertSucceeds(db.collection("Usuarios").doc("alice").get());
      await assertFails(db.collection("Usuarios").doc("alice").set({ nome: "Alice Alterada", ativo: false }));
    });
  });

  describe("Turmas", () => {
    it("não autenticado GET Turma -> DENY; não autenticado LIST Turma -> DENY", async () => {
      const db = unauthedDb();
      await assertFails(db.collection("Turma").doc("turma1").get());
      await assertFails(db.collection("Turma").get());
    });

    it("usuário autenticado sem vínculo GET -> DENY; LIST -> DENY", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const dbAdmin = context.firestore();
        await dbAdmin.collection("Turma").doc("t_alheia").set({ nome: "T Alheia", id_professor: "prof1", status: "Ativo" });
      });
      const db = authedDb("aluno1", ["Aluno"]);
      await assertFails(db.collection("Turma").doc("t_alheia").get());
      await assertFails(db.collection("Turma").get());
    });

    it("aluno membro canônico GET -> PASS; aluno membro canônico LIST raiz Turma -> DENY", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const dbAdmin = context.firestore();
        await dbAdmin.collection("Turma").doc("t_aluno").set({ nome: "T Aluno", id_professor: "prof1", status: "Ativo" });
        await dbAdmin.collection("Turma").doc("t_aluno").collection("Alunos").doc("aluno1").set({
          id_aluno: "aluno1",
          id_turma: "t_aluno",
          nome: "Aluno 1",
        });
      });
      const dbAluno = authedDb("aluno1", ["Aluno"]);
      await assertSucceeds(dbAluno.collection("Turma").doc("t_aluno").get());
      await assertFails(dbAluno.collection("Turma").get());
    });

    it("aluno removido GET -> DENY; aluno com apenas espelho antigo GET -> DENY", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const dbAdmin = context.firestore();
        await dbAdmin.collection("Turma").doc("t_removido").set({ nome: "T Removido", id_professor: "prof1", status: "Ativo" });
        // Espelho existe em Usuarios/aluno1/Turmas/t_removido, mas o vínculo canônico Turma/t_removido/Alunos/aluno1 NÃO existe (removido)
        await dbAdmin.collection("Usuarios").doc("aluno1").collection("Turmas").doc("t_removido").set({
          id_turma: "t_removido",
          nome: "T Removido",
          status: "removido",
        });
      });
      const dbAluno = authedDb("aluno1", ["Aluno"]);
      await assertFails(dbAluno.collection("Turma").doc("t_removido").get());
    });

    it("professor dono GET -> PASS; professor dono query id_professor==uid -> PASS; professor não dono GET turma alheia -> DENY", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const dbAdmin = context.firestore();
        await dbAdmin.collection("Turma").doc("t_prof1").set({ nome: "T Prof 1", id_professor: "prof1", status: "Ativo" });
        await dbAdmin.collection("Turma").doc("t_prof2").set({ nome: "T Prof 2", id_professor: "prof2", status: "Ativo" });
      });
      const dbProf1 = authedDb("prof1", ["Professor"]);
      // Dono GET -> PASS
      await assertSucceeds(dbProf1.collection("Turma").doc("t_prof1").get());
      // Dono query id_professor == uid -> PASS
      await assertSucceeds(dbProf1.collection("Turma").where("id_professor", "==", "prof1").get());
      // Dono LIST sem filtro -> DENY
      await assertFails(dbProf1.collection("Turma").get());
      // Não dono GET turma alheia -> DENY
      await assertFails(dbProf1.collection("Turma").doc("t_prof2").get());
    });

    it("Chefe_Geral GET -> PASS; Chefe_Geral LIST -> PASS", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const dbAdmin = context.firestore();
        await dbAdmin.collection("Turma").doc("t_chefe").set({ nome: "T Chefe", id_professor: "prof1", status: "Ativo" });
      });
      const dbChefe = authedDb("boss", ["Chefe_Geral"]);
      await assertSucceeds(dbChefe.collection("Turma").doc("t_chefe").get());
      await assertSucceeds(dbChefe.collection("Turma").get());
    });

    it("turma Arquivada: membro canônico atual pode ler mas cliente não pode escrever", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const dbAdmin = context.firestore();
        await dbAdmin.collection("Turma").doc("t_arq").set({ nome: "T Arquivada", id_professor: "prof1", status: "Arquivada" });
        await dbAdmin.collection("Turma").doc("t_arq").collection("Alunos").doc("aluno1").set({
          id_aluno: "aluno1",
          id_turma: "t_arq",
          nome: "Aluno 1",
        });
      });
      const dbAluno = authedDb("aluno1", ["Aluno"]);
      const dbProf = authedDb("prof1", ["Professor"]);

      // Leitura permitida para membro canônico e professor dono
      await assertSucceeds(dbAluno.collection("Turma").doc("t_arq").get());
      await assertSucceeds(dbProf.collection("Turma").doc("t_arq").get());

      // Escrita negada a qualquer cliente
      await assertFails(dbAluno.collection("Turma").doc("t_arq").update({ nome: "Hack" }));
      await assertFails(dbProf.collection("Turma").doc("t_arq").update({ nome: "Hack" }));
    });

    it("não permite que nenhum cliente crie, altere ou delete a turma diretamente (server-owned)", async () => {
      // Setup da turma burlando as regras (já que a criação normal seria por Cloud Function)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const dbAdmin = context.firestore();
        await dbAdmin.collection("Turma").doc("turmaProf1").set({ nome: "Turma do Prof 1", id_professor: "prof1" });
      });

      const dbProf1 = authedDb("prof1", ["Professor"]);
      const dbProf2 = authedDb("prof2", ["Professor"]);
      const dbChefe = authedDb("boss", ["Chefe_Geral"]);

      // CREATE direto negado
      await assertFails(dbProf1.collection("Turma").add({ nome: "Nova Turma", id_professor: "prof1" }));
      // UPDATE direto negado (criarTurma/alterarStatusTurma são server-owned)
      await assertFails(dbProf1.collection("Turma").doc("turmaProf1").update({ nome: "Novo Nome" }));
      await assertFails(dbProf2.collection("Turma").doc("turmaProf1").update({ nome: "Hacked" }));
      await assertFails(dbProf1.collection("Turma").doc("turmaProf1").update({ status: "Arquivada" }));
      await assertFails(dbChefe.collection("Turma").doc("turmaProf1").update({ status: "Arquivada" }));
      // DELETE direto negado
      await assertFails(dbProf1.collection("Turma").doc("turmaProf1").delete());
      await assertFails(dbChefe.collection("Turma").doc("turmaProf1").delete());
    });

    it("não deve permitir que um aluno se inscreva diretamente em uma turma", async () => {
      const dbAluno = authedDb("aluno1", ["Aluno"]);
      // A inscrição é gerenciada via Cloud Function
      await assertFails(dbAluno.collection("Turma").doc("turmaProf1").collection("Alunos").doc("aluno1").set({ matricula: "123" }));
    });

    it("leitura de membros: self e colega da turma podem, aluno de turma alheia é negado", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t1").set({ nome: "T1", id_professor: "prof1", status: "Ativo" });
        await db.collection("Turma").doc("t1").collection("Alunos").doc("aluno1")
          .set({ id_aluno: "aluno1", id_turma: "t1", nome: "A1" });
        await db.collection("Turma").doc("t1").collection("Alunos").doc("aluno2")
          .set({ id_aluno: "aluno2", id_turma: "t1", nome: "A2" });
        await db.collection("Usuarios").doc("aluno_fora").set({ ativo: true, versao_permissoes: AUTHORITY_VERSION });
        await db.collection("Aluno").doc("aluno_fora").set({ id_usuario: "aluno_fora", ativo: true });
      });

      const dbAluno1 = authedDb("aluno1");
      await assertSucceeds(dbAluno1.collection("Turma").doc("t1").collection("Alunos").doc("aluno1").get());
      await assertSucceeds(dbAluno1.collection("Turma").doc("t1").collection("Alunos").doc("aluno2").get());
      // Consulta direta da subcoleção por alunos é negada (fail-closed para evitar vazamento de PII)
      await assertFails(dbAluno1.collection("Turma").doc("t1").collection("Alunos").get());

      const dbFora = authedDb("aluno_fora");
      await assertFails(dbFora.collection("Turma").doc("t1").collection("Alunos").doc("aluno1").get());
      await assertFails(dbFora.collection("Turma").doc("t1").collection("Alunos").get());

      const dbProfDono = authedDb("prof1");
      await assertSucceeds(dbProfDono.collection("Turma").doc("t1").collection("Alunos").doc("aluno1").get());
      await assertSucceeds(dbProfDono.collection("Turma").doc("t1").collection("Alunos").get());

      const dbProfOutro = authedDb("prof2");
      await assertFails(dbProfOutro.collection("Turma").doc("t1").collection("Alunos").doc("aluno1").get());
      await assertFails(dbProfOutro.collection("Turma").doc("t1").collection("Alunos").get());

      const dbChefe = authedDb("boss");
      await assertSucceeds(dbChefe.collection("Turma").doc("t1").collection("Alunos").doc("aluno1").get());
      await assertSucceeds(dbChefe.collection("Turma").doc("t1").collection("Alunos").get());

      await assertFails(dbAluno1.collection("Turma").doc("t1").collection("Alunos").doc("novo").set({ id_aluno: "novo" }));
    });

    describe("Posts e Comentários", () => {
      it("nenhum usuário pode criar post diretamente via client (apenas via Cloud Function)", async () => {
        const dbProf1 = authedDb("prof1", ["Professor"]);
        // Prof 1 tenta criar post na sua turma via client (deve falhar)
        await assertFails(dbProf1.collection("Turma").doc("turmaProf1").collection("Posts").add({ titulo: "Aula 1", id_autor: "prof1" }));
      });

      it("nenhum usuário pode comentar diretamente via client (apenas via Cloud Function)", async () => {
        const dbAlunoMatriculado = authedDb("aluno1", ["Aluno"]);
        
        // Aluno 1 tenta comentar via client (deve falhar)
        await assertFails(dbAlunoMatriculado.collection("Turma").doc("turmaProf1").collection("Posts").doc("post1").collection("Comentarios").add({ texto: "Dúvida", id_autor: "aluno1" }));
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

    it("não permite que nenhum cliente escreva Local diretamente (server-owned)", async () => {
      const dbGestor = authedDb("gestor1", ["Gestor_Bens_Patrimoniais"]);
      const dbProf = authedDb("prof1", ["Professor"]);
      await assertFails(dbGestor.collection("Local").add({ predio: "A", andar: "1", sala: "2" }));
      await assertFails(dbProf.collection("Local").doc("l1").set({ predio: "A", andar: "1", sala: "2" }));
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

    it("não permite que nenhum cliente escreva Almoxarifado ou vínculo diretamente", async () => {
      const dbChefe = authedDb("boss", ["Chefe_Geral"]);
      const dbGestor = authedDb("gestorAlm", ["Gestor_Almoxarifado"]);
      await assertFails(dbChefe.collection("Almoxarifado").add({ nome: "Central", id_local: "l1" }));
      await assertFails(dbGestor.collection("Gestor_Almoxarifado_x_Almoxarifado").add({ id_gestor_almoxarifado: "gestorAlm", id_almoxarifado: "a1" }));
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

  describe("Rules M11 — janela de migração e vínculo canônico", () => {
    it("TEST-RULES-M11-MIGR-001 — colega lê vínculo sanitizado (sem email/matricula) → PASS", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t_migr1").set({ nome: "T1", id_professor: "prof1", status: "Ativo" });
        // Vínculo canônico sanitizado do requerente
        await db.collection("Turma").doc("t_migr1").collection("Alunos").doc("aluno1")
          .set({ id_aluno: "aluno1", id_turma: "t_migr1", nome: "A1" });
        // Vínculo canonicamente sanitizado do alvo
        await db.collection("Turma").doc("t_migr1").collection("Alunos").doc("aluno2")
          .set({ id_aluno: "aluno2", id_turma: "t_migr1", nome: "A2" });
      });

      const dbAluno1 = authedDb("aluno1");
      await assertSucceeds(dbAluno1.collection("Turma").doc("t_migr1").collection("Alunos").doc("aluno2").get());
    });

    it("TEST-RULES-M11-MIGR-002 — colega tenta ler vínculo legado com email → DENY", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t_migr2").set({ nome: "T2", id_professor: "prof1", status: "Ativo" });
        await db.collection("Turma").doc("t_migr2").collection("Alunos").doc("aluno1")
          .set({ id_aluno: "aluno1", id_turma: "t_migr2", nome: "A1" });
        // Vínculo legado com campo proibido
        await db.collection("Turma").doc("t_migr2").collection("Alunos").doc("aluno_legado")
          .set({ id_aluno: "aluno_legado", id_turma: "t_migr2", nome: "Legado", email: "legado@x.com" });
      });

      const dbAluno1 = authedDb("aluno1");
      // Colega não pode ler vínculo legado com email
      await assertFails(dbAluno1.collection("Turma").doc("t_migr2").collection("Alunos").doc("aluno_legado").get());
    });

    it("TEST-RULES-M11-MIGR-003 — colega tenta ler vínculo legado com numero_matricula → DENY", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t_migr3").set({ nome: "T3", id_professor: "prof1", status: "Ativo" });
        await db.collection("Turma").doc("t_migr3").collection("Alunos").doc("aluno1")
          .set({ id_aluno: "aluno1", id_turma: "t_migr3", nome: "A1" });
        await db.collection("Turma").doc("t_migr3").collection("Alunos").doc("aluno_mat")
          .set({ id_aluno: "aluno_mat", id_turma: "t_migr3", nome: "Mat", numero_matricula: "20100001" });
      });

      const dbAluno1 = authedDb("aluno1");
      await assertFails(dbAluno1.collection("Turma").doc("t_migr3").collection("Alunos").doc("aluno_mat").get());
    });

    it("TEST-RULES-M11-MIGR-004 — professor dono lê qualquer vínculo → PASS", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t_migr4").set({ nome: "T4", id_professor: "prof1", status: "Ativo" });
        await db.collection("Turma").doc("t_migr4").collection("Alunos").doc("aluno_legado2")
          .set({ id_aluno: "aluno_legado2", id_turma: "t_migr4", nome: "L", email: "l@x.com" });
      });
      const dbProf = authedDb("prof1");
      await assertSucceeds(dbProf.collection("Turma").doc("t_migr4").collection("Alunos").doc("aluno_legado2").get());
    });

    it("TEST-RULES-M11-MIGR-005 — aluno de turma alheia → DENY", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t_migr5").set({ nome: "T5", id_professor: "prof1", status: "Ativo" });
        await db.collection("Turma").doc("t_migr5").collection("Alunos").doc("aluno_fora")
          .set({ id_aluno: "aluno_fora", id_turma: "t_migr5", nome: "Fora" });
        await db.collection("Usuarios").doc("aluno_externo").set({ ativo: true, versao_permissoes: AUTHORITY_VERSION });
        await db.collection("Aluno").doc("aluno_externo").set({ id_usuario: "aluno_externo", ativo: true });
      });
      const dbExt = authedDb("aluno_externo", ["Aluno"]);
      await assertFails(dbExt.collection("Turma").doc("t_migr5").collection("Alunos").doc("aluno_fora").get());
    });

    it("TEST-RULES-M11-MIGR-006 — write cliente em Alunos → DENY", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t_migr6").set({ nome: "T6", id_professor: "prof1", status: "Ativo" });
      });
      const dbAluno1 = authedDb("aluno1");
      await assertFails(dbAluno1.collection("Turma").doc("t_migr6").collection("Alunos").doc("aluno1").set({ id_aluno: "aluno1", id_turma: "t_migr6" }));
    });

    it("TEST-RULES-M11-MIGR-007 — membro canônico tenta fazer LIST/QUERY quando houver vínculo legado sensível → DENY (não expõe PII)", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t_migr7").set({ nome: "T7", id_professor: "prof1", status: "Ativo" });
        await db.collection("Turma").doc("t_migr7").collection("Alunos").doc("aluno1")
          .set({ id_aluno: "aluno1", id_turma: "t_migr7", nome: "A1" });
        await db.collection("Turma").doc("t_migr7").collection("Alunos").doc("aluno_legado")
          .set({ id_aluno: "aluno_legado", id_turma: "t_migr7", nome: "L", email: "legado@x.com", numero_matricula: "20109999" });
      });
      const dbAluno1 = authedDb("aluno1");
      // LIST/QUERY direto negado a aluno para proteger PII (fail-closed)
      await assertFails(dbAluno1.collection("Turma").doc("t_migr7").collection("Alunos").get());
    });

    it("TEST-RULES-M11-MIGR-008 — professor dono faz LIST/QUERY na subcoleção Alunos → PASS", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t_migr8").set({ nome: "T8", id_professor: "prof1", status: "Ativo" });
        await db.collection("Turma").doc("t_migr8").collection("Alunos").doc("aluno1")
          .set({ id_aluno: "aluno1", id_turma: "t_migr8", nome: "A1" });
        await db.collection("Turma").doc("t_migr8").collection("Alunos").doc("aluno_legado")
          .set({ id_aluno: "aluno_legado", id_turma: "t_migr8", nome: "L", email: "l@x.com" });
      });
      const dbProf = authedDb("prof1");
      await assertSucceeds(dbProf.collection("Turma").doc("t_migr8").collection("Alunos").get());
    });

    it("TEST-RULES-M11-MIGR-009 — Chefe_Geral faz LIST/QUERY na subcoleção Alunos → PASS", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t_migr9").set({ nome: "T9", id_professor: "prof1", status: "Ativo" });
        await db.collection("Turma").doc("t_migr9").collection("Alunos").doc("aluno1")
          .set({ id_aluno: "aluno1", id_turma: "t_migr9", nome: "A1" });
      });
      const dbChefe = authedDb("boss");
      await assertSucceeds(dbChefe.collection("Turma").doc("t_migr9").collection("Alunos").get());
    });

    it("TEST-RULES-M11-MIGR-010 — Chefe_Geral lê vínculo legado com email/matrícula → PASS", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("Turma").doc("t_migr10").set({ nome: "T10", id_professor: "prof1", status: "Ativo" });
        await db.collection("Turma").doc("t_migr10").collection("Alunos").doc("aluno_legado")
          .set({ id_aluno: "aluno_legado", id_turma: "t_migr10", nome: "L", email: "chefe_le@x.com", numero_matricula: "20108888" });
      });
      const dbChefe = authedDb("boss");
      await assertSucceeds(dbChefe.collection("Turma").doc("t_migr10").collection("Alunos").doc("aluno_legado").get());
    });
  });

  describe("Convite_Aluno (M11 / C.16)", () => {
    it("nega get, list e write direto a qualquer cliente (aluno, professor, chefe)", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const dbAdmin = context.firestore();
        await dbAdmin.collection("Convite_Aluno").doc("c1").set({
          email: "convidado@exemplo.com",
          status: "pendente",
          token_hash: "hash123",
        });
      });

      const dbAluno = authedDb("aluno1", ["Aluno"]);
      const dbProf = authedDb("prof1", ["Professor"]);
      const dbChefe = authedDb("boss", ["Chefe_Geral"]);

      // Aluno DENY
      await assertFails(dbAluno.collection("Convite_Aluno").doc("c1").get());
      await assertFails(dbAluno.collection("Convite_Aluno").get());
      await assertFails(dbAluno.collection("Convite_Aluno").doc("c1").set({ status: "aceitado" }));

      // Professor DENY
      await assertFails(dbProf.collection("Convite_Aluno").doc("c1").get());
      await assertFails(dbProf.collection("Convite_Aluno").get());
      await assertFails(dbProf.collection("Convite_Aluno").doc("c2").set({ email: "novo@exemplo.com" }));

      // Chefe DENY
      await assertFails(dbChefe.collection("Convite_Aluno").doc("c1").get());
      await assertFails(dbChefe.collection("Convite_Aluno").get());
      await assertFails(dbChefe.collection("Convite_Aluno").doc("c1").delete());
    });
  });

});

// AUD-35/36: usar documentos existentes para provar negativa por Rules, não ausência.
describe.each(["Controle_Papeis", "Operacoes", "Chaves_Unicas", "Convite_Aluno"])("Coleção interna %s", colecao => {
  it.each<KnownRole[]>([[], ["Aluno"], ["Professor"], ["Gestor_Almoxarifado"], ["Chefe_Geral"]])("nega cliente com roles %j", async (...roles) => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().collection(colecao).doc("singleton").set({ versao: 1 });
    });
    await seedAuthority("cliente", roles);
    const db = testEnv.authenticatedContext("cliente", {
      roles,
      versao_permissoes: AUTHORITY_VERSION,
    }).firestore();
    const ref = db.collection(colecao).doc("singleton");
    await assertFails(ref.get());
    await assertFails(db.collection(colecao).get());
    await assertFails(db.collection(colecao).doc("novo").set({ versao: 9 }));
    await assertFails(ref.update({ versao: 9 }));
    await assertFails(ref.delete());
    await assertFails(ref.collection("aninhado").doc("item").set({ versao: 9 }));
  });
});

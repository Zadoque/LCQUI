import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = "lcqui-notif-rules-test";
const CURRENT_VERSION = 3;

type KnownRole = "Aluno";

let testEnv: RulesTestEnvironment;

async function seedUser(
  uid: string,
  options: { ativo?: boolean; versaoPermissoes?: number; roles?: KnownRole[] } = {}
): Promise<void> {
  const { ativo = true, versaoPermissoes = CURRENT_VERSION, roles = ["Aluno"] } = options;
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await db.collection("Usuarios").doc(uid).set({ ativo, versao_permissoes: versaoPermissoes });
    for (const role of roles) {
      await db.collection(role).doc(uid).set({ id_usuario: uid, ativo: true });
    }
  });
}

async function seedNotificacao(uid: string, id: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async context => {
    await context
      .firestore()
      .collection("Usuarios")
      .doc(uid)
      .collection("Notificacoes")
      .doc(id)
      .set({ lida: false, tipo: "POST" });
  });
}

function dbFor(uid: string, roles: string[] = ["Aluno"], version: number | null = CURRENT_VERSION) {
  const token = version === null ? { roles } : { roles, versao_permissoes: version };
  return testEnv.authenticatedContext(uid, token).firestore();
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
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

describe("IMP-NOTIF-002 — notificações server-owned", () => {
  it("TEST-RULES-NOTIF-001 — dono com autoridade corrente lê a própria notificação", async () => {
    await seedUser("dono");
    await seedNotificacao("dono", "n1");
    const db = dbFor("dono");
    await assertSucceeds(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").doc("n1").get()
    );
  });

  it("TEST-RULES-NOTIF-002 — update direto do cliente é negado (server-owned)", async () => {
    await seedUser("dono");
    await seedNotificacao("dono", "n1");
    const db = dbFor("dono");
    await assertFails(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").doc("n1").update({ lida: true })
    );
  });

  it("TEST-RULES-NOTIF-003 — delete direto do cliente é negado", async () => {
    await seedUser("dono");
    await seedNotificacao("dono", "n1");
    const db = dbFor("dono");
    await assertFails(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").doc("n1").delete()
    );
  });

  it("TEST-RULES-NOTIF-004 — create direto do cliente é negado", async () => {
    await seedUser("dono");
    const db = dbFor("dono");
    await assertFails(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").doc("n1").set({ lida: false })
    );
  });

  it("TEST-RULES-NOTIF-005 — terceiro não lê notificação alheia", async () => {
    await seedUser("dono");
    await seedNotificacao("dono", "n1");
    await seedUser("outro");
    const db = dbFor("outro");
    await assertFails(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").doc("n1").get()
    );
  });

  it("TEST-RULES-NOTIF-006 — token com versão obsoleta não lê", async () => {
    await seedUser("dono", { versaoPermissoes: CURRENT_VERSION });
    await seedNotificacao("dono", "n1");
    const db = dbFor("dono", ["Aluno"], CURRENT_VERSION - 1);
    await assertFails(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").doc("n1").get()
    );
  });

  it("TEST-RULES-NOTIF-007 — usuário inativo não lê", async () => {
    await seedUser("dono", { ativo: false });
    await seedNotificacao("dono", "n1");
    const db = dbFor("dono");
    await assertFails(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").doc("n1").get()
    );
  });
});

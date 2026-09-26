import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = "lcqui-materias-rules-test";
const CURRENT_VERSION = 2;

let testEnv: RulesTestEnvironment;

async function seedUser(uid: string, role: "Professor" | "Chefe_Geral"): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: CURRENT_VERSION });
    await db.collection(role).doc(uid).set({ id_usuario: uid, ativo: true });
  });
}

async function seedMateria(id: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async context => {
    await context.firestore().collection("Materia").doc(id).set({ nome: "Química", codigo_materia: "QM1" });
  });
}

function dbFor(uid: string, roles: string[]) {
  return testEnv.authenticatedContext(uid, { roles, versao_permissoes: CURRENT_VERSION }).firestore();
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

describe("IMP-BASE-003 — Materia server-owned", () => {
  it("TEST-RULES-MATERIA-001 — Professor autenticado lê o catálogo", async () => {
    await seedUser("prof", "Professor");
    await seedMateria("m1");
    const db = dbFor("prof", ["Professor"]);
    await assertSucceeds(db.collection("Materia").doc("m1").get());
  });

  it("TEST-RULES-MATERIA-002 — Professor não cria matéria direto", async () => {
    await seedUser("prof", "Professor");
    const db = dbFor("prof", ["Professor"]);
    await assertFails(db.collection("Materia").doc("m1").set({ nome: "X", codigo_materia: "X1" }));
  });

  it("TEST-RULES-MATERIA-003 — Chefe não escreve matéria direto (server-owned)", async () => {
    await seedUser("chefe", "Chefe_Geral");
    await seedMateria("m1");
    const db = dbFor("chefe", ["Chefe_Geral"]);
    await assertFails(db.collection("Materia").doc("m1").update({ nome: "Y" }));
  });

  it("TEST-RULES-MATERIA-004 — não autenticado não lê", async () => {
    await seedMateria("m1");
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection("Materia").doc("m1").get());
  });
});

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

async function seedNotificacao(
  uid: string,
  id: string,
  options: { idDestinatario?: string; lida?: boolean; lidaEm?: unknown; tipo?: string } = {}
): Promise<void> {
  const { idDestinatario = uid, lida = false, lidaEm = null, tipo = "POST" } = options;
  await testEnv.withSecurityRulesDisabled(async context => {
    await context
      .firestore()
      .collection("Usuarios")
      .doc(uid)
      .collection("Notificacoes")
      .doc(id)
      .set({ id_destinatario: idDestinatario, lida, lida_em: lidaEm, tipo });
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

  it("TEST-RULES-NOTIF-008 — dono não lê documento cujo id_destinatario difere do UID do caminho", async () => {
    await seedUser("dono");
    await seedNotificacao("dono", "n_alheia", { idDestinatario: "outro" });
    const db = dbFor("dono");
    await assertFails(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").doc("n_alheia").get()
    );
  });

  it("TEST-RULES-NOTIF-009 — leitura coerente (id_destinatario == UID do caminho) é permitida", async () => {
    await seedUser("dono");
    await seedNotificacao("dono", "n_coerente", { idDestinatario: "dono" });
    const db = dbFor("dono");
    await assertSucceeds(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").doc("n_coerente").get()
    );
  });

  it("TEST-RULES-NOTIF-010 — listagem filtrada por id_destinatario é permitida", async () => {
    await seedUser("dono");
    await seedNotificacao("dono", "n1", { idDestinatario: "dono" });
    const db = dbFor("dono");
    await assertSucceeds(
      db
        .collection("Usuarios")
        .doc("dono")
        .collection("Notificacoes")
        .where("id_destinatario", "==", "dono")
        .get()
    );
  });

  it("TEST-RULES-NOTIF-011 — listagem sem o filtro de coerência é negada", async () => {
    await seedUser("dono");
    await seedNotificacao("dono", "n1", { idDestinatario: "dono" });
    const db = dbFor("dono");
    await assertFails(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").get()
    );
  });
});

describe("IMP-NOTIF-001 / #M13Leitura — caixa própria por UID independentemente de papel", () => {
  it("TEST-RULES-NOTIF-012 — conta sem papel persistido lê a própria caixa (POST)", async () => {
    // Sem documento Usuarios, sem documento Aluno, sem claims de papel.
    await seedNotificacao("user_no_role", "notif_post", {
      idDestinatario: "user_no_role",
      tipo: "POST",
    });

    const db = testEnv.authenticatedContext("user_no_role").firestore();
    await assertSucceeds(
      db.collection("Usuarios").doc("user_no_role").collection("Notificacoes").doc("notif_post").get()
    );
  });

  it("TEST-RULES-NOTIF-013 — conta sem papel persistido NÃO lê caixa alheia", async () => {
    await seedUser("dono");
    await seedNotificacao("dono", "n1", { idDestinatario: "dono" });
    const db = testEnv.authenticatedContext("user_no_role").firestore();
    await assertFails(
      db.collection("Usuarios").doc("dono").collection("Notificacoes").doc("n1").get()
    );
  });

  it("TEST-RULES-NOTIF-014 — conta sem papel persistido lê listagem da própria caixa", async () => {
    await seedNotificacao("user_no_role", "n1", { idDestinatario: "user_no_role", tipo: "POST" });
    await seedNotificacao("user_no_role", "n2", {
      idDestinatario: "user_no_role",
      tipo: "CONVITE_PARA_TURMA",
    });

    const db = testEnv.authenticatedContext("user_no_role").firestore();
    await assertSucceeds(
      db
        .collection("Usuarios")
        .doc("user_no_role")
        .collection("Notificacoes")
        .where("id_destinatario", "==", "user_no_role")
        .get()
    );
  });

  it("TEST-RULES-NOTIF-015 — conta sem papel NÃO lê documento com id_destinatario divergente", async () => {
    await seedNotificacao("user_no_role", "n_alheia", { idDestinatario: "outro", tipo: "POST" });

    const db = testEnv.authenticatedContext("user_no_role").firestore();
    await assertFails(
      db.collection("Usuarios").doc("user_no_role").collection("Notificacoes").doc("n_alheia").get()
    );
  });

  it("TEST-RULES-NOTIF-016 — write negado mesmo para dono sem papel", async () => {
    await seedNotificacao("user_no_role", "n1", { idDestinatario: "user_no_role", tipo: "POST" });
    const db = testEnv.authenticatedContext("user_no_role").firestore();
    const docRef = db.collection("Usuarios").doc("user_no_role").collection("Notificacoes").doc("n1");
    await assertFails(docRef.update({ lida: true }));
    await assertFails(docRef.delete());
    await assertFails(
      db
        .collection("Usuarios")
        .doc("user_no_role")
        .collection("Notificacoes")
        .doc("n2")
        .set({ tipo: "POST", id_destinatario: "user_no_role", lida: false })
    );
  });

  it("TEST-RULES-NOTIF-017 — usuário não autenticado não lê", async () => {
    await seedNotificacao("user_no_role", "n1", { idDestinatario: "user_no_role", tipo: "POST" });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      db.collection("Usuarios").doc("user_no_role").collection("Notificacoes").doc("n1").get()
    );
  });
});

describe("IMP-RULES-003 — bootstrap de leitura de CONVITE_PARA_TURMA (agora coberto pela caixa própria)", () => {
  it("TEST-RULES-CONVITE-001 — usuário autenticado sem papel lê a própria notificação CONVITE_PARA_TURMA", async () => {
    await seedNotificacao("user_bootstrap", "convite_bootstrap", {
      idDestinatario: "user_bootstrap",
      tipo: "CONVITE_PARA_TURMA",
    });

    const db = testEnv.authenticatedContext("user_bootstrap").firestore();
    await assertSucceeds(
      db
        .collection("Usuarios")
        .doc("user_bootstrap")
        .collection("Notificacoes")
        .doc("convite_bootstrap")
        .get()
    );
  });

  it("TEST-RULES-CONVITE-002 — outro UID não lê notificação CONVITE_PARA_TURMA alheia", async () => {
    await seedNotificacao("user_bootstrap", "convite_bootstrap", {
      idDestinatario: "user_bootstrap",
      tipo: "CONVITE_PARA_TURMA",
    });

    const db = testEnv.authenticatedContext("outro_uid").firestore();
    await assertFails(
      db
        .collection("Usuarios")
        .doc("user_bootstrap")
        .collection("Notificacoes")
        .doc("convite_bootstrap")
        .get()
    );
  });

  it("TEST-RULES-CONVITE-003 — usuário autenticado não lê documento com id_destinatario divergente do path", async () => {
    await seedNotificacao("user_bootstrap", "convite_divergente", {
      idDestinatario: "outro_uid",
      tipo: "CONVITE_PARA_TURMA",
    });

    const db = testEnv.authenticatedContext("user_bootstrap").firestore();
    await assertFails(
      db
        .collection("Usuarios")
        .doc("user_bootstrap")
        .collection("Notificacoes")
        .doc("convite_divergente")
        .get()
    );
  });

  it("TEST-RULES-CONVITE-004 — cliente tentando create/update/delete em CONVITE_PARA_TURMA é negado", async () => {
    await seedNotificacao("user_bootstrap", "convite_bootstrap", {
      idDestinatario: "user_bootstrap",
      tipo: "CONVITE_PARA_TURMA",
    });

    const db = testEnv.authenticatedContext("user_bootstrap").firestore();
    const docRef = db
      .collection("Usuarios")
      .doc("user_bootstrap")
      .collection("Notificacoes")
      .doc("convite_bootstrap");

    await assertFails(docRef.update({ lida: true }));
    await assertFails(docRef.delete());
    await assertFails(
      db
        .collection("Usuarios")
        .doc("user_bootstrap")
        .collection("Notificacoes")
        .doc("novo_convite")
        .set({
          tipo: "CONVITE_PARA_TURMA",
          id_destinatario: "user_bootstrap",
          lida: false,
        })
    );
  });

  // TEST-RULES-CONVITE-005 foi removido: a Rule agora permite a leitura da
  // própria caixa por UID independentemente de tipo (#M13Leitura / Seção 11).
  // O caso de leitura sem papel para qualquer tipo é coberto por
  // TEST-RULES-NOTIF-012.
});


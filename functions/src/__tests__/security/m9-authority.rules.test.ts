import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = "lcqui-m9-authority-test";
const CURRENT_VERSION = 7;

type KnownRole =
  | "Chefe_Geral"
  | "Gestor_Almoxarifado"
  | "Gestor_Bens_Patrimoniais"
  | "Professor"
  | "Aluno"
  | "Bolsista";

let testEnv: RulesTestEnvironment;

async function seedUser(
  uid: string,
  options: {
    ativo?: boolean;
    versaoPermissoes?: number;
    roles?: KnownRole[];
  } = {},
): Promise<void> {
  const {
    ativo = true,
    versaoPermissoes = CURRENT_VERSION,
    roles = [],
  } = options;

  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await db.collection("Usuarios").doc(uid).set({
      ativo,
      versao_permissoes: versaoPermissoes,
    });
    for (const role of roles) {
      await db.collection(role).doc(uid).set({id_usuario: uid, ativo: true});
    }
  });
}

function dbFor(uid: string, roles: string[], version: number | undefined = CURRENT_VERSION) {
  const token = version === undefined
    ? {roles}
    : {roles, versao_permissoes: version};
  return testEnv.authenticatedContext(uid, token).firestore();
}

function catalogRef(db: ReturnType<typeof dbFor>) {
  return db.collection("Resumo_Reagente").doc("catalogo");
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
  await testEnv.withSecurityRulesDisabled(async context => {
    await context.firestore().collection("Resumo_Reagente").doc("catalogo").set({nome: "Catálogo"});
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("IMP-RULES-001 — autoridade persistida M9", () => {
  // Seção 7/M9; Seção 11: autenticação é precondição, nunca autoridade suficiente.
  it("TEST-RULES-M9-001 nega usuário não autenticado", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(catalogRef(db).get());
  });

  // Seção 7/M9; Seção 11: Usuarios/{uid} ausente implica negação.
  it("TEST-RULES-M9-002 nega auth.uid sem documento Usuarios", async () => {
    const db = dbFor("sem-usuario", ["Aluno"]);
    await assertFails(catalogRef(db).get());
  });

  // M9-INV-001/M9-INV-008: conta inativa nunca é autorizada.
  it("TEST-RULES-M9-003 nega usuário inativo", async () => {
    await seedUser("inativo", {ativo: false, roles: ["Aluno"]});
    const db = dbFor("inativo", ["Aluno"]);
    await assertFails(catalogRef(db).get());
  });

  // Seção 11: campo versao_permissoes ausente no token falha fechado.
  it("TEST-RULES-M9-004 nega token sem versão de permissões", async () => {
    await seedUser("sem-versao", {roles: ["Aluno"]});
    const db = dbFor("sem-versao", ["Aluno"], undefined);
    await assertFails(catalogRef(db).get());
  });

  // M9-INV-005: claim obsoleta não restaura autorização revogada.
  it("TEST-RULES-M9-005 nega versão de permissões obsoleta", async () => {
    await seedUser("versao-antiga", {roles: ["Aluno"]});
    const db = dbFor("versao-antiga", ["Aluno"], CURRENT_VERSION - 1);
    await assertFails(catalogRef(db).get());
  });

  // M9-WIT-017: estado ativo, versão corrente e papel persistido formam cenário alcançável positivo.
  it("TEST-RULES-M9-006 permite versão coerente e papel conhecido persistido", async () => {
    await seedUser("aluno-valido", {roles: ["Aluno"]});
    const db = dbFor("aluno-valido", ["Aluno"]);
    await assertSucceeds(catalogRef(db).get());
  });

  // Seção 7/M9: papel ausente significa negação.
  it("TEST-RULES-M9-007 nega usuário sem papel", async () => {
    await seedUser("sem-papel");
    const db = dbFor("sem-papel", []);
    await assertFails(catalogRef(db).get());
  });

  // CUE #M9Papel e Seção 7/M9: conjunto de papéis é fechado.
  it("TEST-RULES-M9-008 nega papel desconhecido", async () => {
    await seedUser("papel-inventado");
    const db = dbFor("papel-inventado", ["Administrador"]);
    await assertFails(catalogRef(db).get());
  });

  // Seção 7/M9: claim não cria autoridade persistida correspondente.
  it("TEST-RULES-M9-009 nega claim sem documento do papel afirmado", async () => {
    await seedUser("claim-sem-papel", {roles: ["Aluno"]});
    const db = dbFor("claim-sem-papel", ["Professor"]);
    await assertFails(catalogRef(db).get());
  });

  // Seção 7/M9: papel persistido não autoriza quando o token é incompatível.
  it("TEST-RULES-M9-010 nega autoridade persistida incompatível com o token", async () => {
    await seedUser("token-incompativel", {roles: ["Professor"]});
    const db = dbFor("token-incompativel", ["Aluno"]);
    await assertFails(catalogRef(db).get());
  });

  // Seção 11: documento de papel é legível pelo próprio usuário, não por outro cliente.
  it("TEST-RULES-M9-011 limita a leitura de coleção de papel ao documento próprio", async () => {
    await seedUser("professor-a", {roles: ["Professor"]});
    await seedUser("professor-b", {roles: ["Professor"]});
    const db = dbFor("professor-a", ["Professor"]);
    await assertSucceeds(db.collection("Professor").doc("professor-a").get());
    await assertFails(db.collection("Professor").doc("professor-b").get());
    await assertFails(db.collection("Professor").get());
  });

  // Seção 7/M9 e Seção 11: coleções internas continuam client-denied mesmo com autoridade válida.
  it("TEST-RULES-M9-012 mantém coleções internas negadas a autoridade válida", async () => {
    await seedUser("chefe-valido", {roles: ["Chefe_Geral"]});
    await testEnv.withSecurityRulesDisabled(async context => {
      await context.firestore().collection("Controle_Papeis").doc("singleton").set({versao: 1});
    });
    const db = dbFor("chefe-valido", ["Chefe_Geral"]);
    await assertFails(db.collection("Controle_Papeis").doc("singleton").get());
    await assertFails(db.collection("Controle_Papeis").doc("singleton").update({versao: 2}));
  });

  // CUE #M9Usuario: a versão persistida é um inteiro não negativo.
  it("TEST-RULES-M9-013 nega versão persistida estruturalmente inválida", async () => {
    await seedUser("versao-invalida", {versaoPermissoes: -1, roles: ["Aluno"]});
    const db = dbFor("versao-invalida", ["Aluno"], -1);
    await assertFails(catalogRef(db).get());
  });

  // Seção 5 e Seção 7/M9: o documento de papel precisa afirmar o mesmo UID.
  it("TEST-RULES-M9-014 nega documento de papel com id_usuario incompatível", async () => {
    await seedUser("papel-incompativel", {roles: ["Aluno"]});
    await testEnv.withSecurityRulesDisabled(async context => {
      await context.firestore().collection("Aluno").doc("papel-incompativel").set({
        id_usuario: "outro-uid",
        ativo: true,
      });
    });
    const db = dbFor("papel-incompativel", ["Aluno"]);
    await assertFails(catalogRef(db).get());
  });
});

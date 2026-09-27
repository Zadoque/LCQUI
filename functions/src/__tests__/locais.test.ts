process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { gerenciarLocal } from "../patrimonio";
import { chaveLocal } from "../chaves";

const testEnv = fft({ projectId: "lcqui-dev" });

let contador = 0;
function uidUnico(prefixo: string): string {
  contador += 1;
  return `${prefixo}_${Date.now()}_${contador}`;
}

describe("Cadastros base — Local (M9 + M7 + unicidade)", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  const mockRequest = (data: unknown, uid: string, roles: string[] = ["Gestor_Bens_Patrimoniais"]): any => ({
    data,
    auth: { uid, token: { roles, versao_permissoes: 1 } },
    rawRequest: {},
  });

  let opSeq = 0;
  const novaOperacao = (): string => `op_local_${Date.now()}_${++opSeq}`;

  async function semearGestor(uid: string): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Gestor_Bens_Patrimoniais").doc(uid).set({ id_usuario: uid, ativo: true });
  }

  function corpo(extra: Record<string, unknown> = {}) {
    return {
      idOperacao: novaOperacao(),
      acao: "CRIAR",
      predio: "Bloco A",
      andar: "1",
      sala: "101",
      ...extra,
    };
  }

  it("TEST-INT-LOCAL-001 — cria local com chave única e autoria", async () => {
    const gestor = uidUnico("gestor_local");
    await semearGestor(gestor);
    const wrapped = testEnv.wrap(gerenciarLocal);
    const res = await wrapped(mockRequest(corpo(), gestor));

    expect(res.id).toBeDefined();
    const doc = await db.collection("Local").doc(res.id).get();
    expect(doc.data()?.predio).toBe("Bloco A");
    expect(doc.data()?.andar).toBe("1");
    expect(doc.data()?.sala).toBe("101");
    expect(doc.data()?.criado_por).toBe(gestor);
    const chave = await db.collection("Chaves_Unicas").doc(chaveLocal("Bloco A", "1", "101")).get();
    expect(chave.exists).toBe(true);
    expect(chave.data()?.id_recurso).toBe(res.id);
  });

  it("TEST-INT-LOCAL-002 — endereço duplicado é already-exists", async () => {
    const gestor = uidUnico("gestor_local_dup");
    await semearGestor(gestor);
    const wrapped = testEnv.wrap(gerenciarLocal);
    await wrapped(mockRequest(corpo({ predio: "Bloco B", andar: "2", sala: "201" }), gestor));
    await expect(
      wrapped(mockRequest(corpo({ predio: "Bloco B", andar: "2", sala: "201" }), gestor))
    ).rejects.toMatchObject({ code: "already-exists" });
  });

  it("TEST-INT-LOCAL-003 — trim normaliza o endereço", async () => {
    const gestor = uidUnico("gestor_local_trim");
    await semearGestor(gestor);
    const wrapped = testEnv.wrap(gerenciarLocal);
    await wrapped(mockRequest(corpo({ predio: "  Bloco C  ", andar: " 3 ", sala: " 301 " }), gestor));
    const doc = await db.collection("Local").where("predio", "==", "Bloco C").where("sala", "==", "301").get();
    expect(doc.size).toBe(1);
    await expect(
      wrapped(mockRequest(corpo({ predio: "Bloco C", andar: "3", sala: "301" }), gestor))
    ).rejects.toMatchObject({ code: "already-exists" });
  });

  it("TEST-INT-LOCAL-004 — limites de campo são aplicados", async () => {
    const gestor = uidUnico("gestor_local_limite");
    await semearGestor(gestor);
    const wrapped = testEnv.wrap(gerenciarLocal);
    await expect(
      wrapped(mockRequest(corpo({ predio: "P".repeat(31) }), gestor))
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(
      wrapped(mockRequest(corpo({ andar: "A".repeat(11) }), gestor))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("TEST-INT-LOCAL-005 — usuário sem papel autorizado é negado (M9)", async () => {
    const wrapped = testEnv.wrap(gerenciarLocal);
    await expect(
      wrapped(mockRequest(corpo(), "sem_papel_local"))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-LOCAL-006 — replay do mesmo idOperacao não duplica", async () => {
    const gestor = uidUnico("gestor_local_replay");
    await semearGestor(gestor);
    const op = novaOperacao();
    const body = corpo({ idOperacao: op, predio: "Bloco R", andar: "1", sala: "R1" });
    const wrapped = testEnv.wrap(gerenciarLocal);
    const primeiro = await wrapped(mockRequest(body, gestor));
    const segundo = await wrapped(mockRequest(body, gestor));
    expect(segundo).toEqual(primeiro);
    const locais = await db.collection("Local").where("predio", "==", "Bloco R").get();
    expect(locais.size).toBe(1);
  });

  it("TEST-INT-LOCAL-007 — reuso incompatível do idOperacao é already-exists", async () => {
    const gestor = uidUnico("gestor_local_reuso");
    await semearGestor(gestor);
    const op = novaOperacao();
    const wrapped = testEnv.wrap(gerenciarLocal);
    await wrapped(mockRequest(corpo({ idOperacao: op, predio: "Bloco X", andar: "1", sala: "X1" }), gestor));
    await expect(
      wrapped(mockRequest(corpo({ idOperacao: op, predio: "Bloco X", andar: "1", sala: "X2" }), gestor))
    ).rejects.toMatchObject({ code: "already-exists" });
  });

  it("TEST-INT-LOCAL-008 — editar troca endereço, atualiza chave e mantém o id", async () => {
    const gestor = uidUnico("gestor_local_edit");
    await semearGestor(gestor);
    const wrapped = testEnv.wrap(gerenciarLocal);
    const criado = await wrapped(mockRequest(corpo({ predio: "Bloco E", andar: "1", sala: "E1" }), gestor));

    await wrapped(mockRequest(corpo({
      acao: "EDITAR", idLocal: criado.id, predio: "Bloco E", andar: "2", sala: "E2",
    }), gestor));

    const doc = await db.collection("Local").doc(criado.id).get();
    expect(doc.data()?.andar).toBe("2");
    expect(doc.data()?.sala).toBe("E2");
    expect((await db.collection("Chaves_Unicas").doc(chaveLocal("Bloco E", "2", "E2")).get()).exists).toBe(true);
    expect((await db.collection("Chaves_Unicas").doc(chaveLocal("Bloco E", "1", "E1")).get()).exists).toBe(false);
  });

  it("TEST-INT-LOCAL-009 — editar para endereço existente é already-exists", async () => {
    const gestor = uidUnico("gestor_local_edit_dup");
    await semearGestor(gestor);
    const wrapped = testEnv.wrap(gerenciarLocal);
    const a = await wrapped(mockRequest(corpo({ predio: "Bloco F", andar: "1", sala: "F1" }), gestor));
    await wrapped(mockRequest(corpo({ predio: "Bloco F", andar: "1", sala: "F2" }), gestor));
    await expect(
      wrapped(mockRequest(corpo({
        acao: "EDITAR", idLocal: a.id, predio: "Bloco F", andar: "1", sala: "F2",
      }), gestor))
    ).rejects.toMatchObject({ code: "already-exists" });
  });
});

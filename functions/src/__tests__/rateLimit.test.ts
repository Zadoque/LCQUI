import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { CallableRequest } from "firebase-functions/v2/https";
import { verificarRateLimitCallable } from "../utils/rateLimit";
import { buscarProfessores } from "../usuarios";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("rate limit das callable functions", () => {
  jest.setTimeout(30_000);

  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) admin.initializeApp({ projectId: "lcqui-dev" });
    db = admin.firestore();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  it("bloqueia a 31ª leitura de catálogo na mesma janela e UID", async () => {
    const uid = `rate_catalogo_${Date.now()}`;

    for (let tentativa = 0; tentativa < 30; tentativa += 1) {
      await verificarRateLimitCallable(uid, "catalogo-leitura");
    }

    await expect(verificarRateLimitCallable(uid, "catalogo-leitura"))
      .rejects.toMatchObject({ code: "resource-exhausted" });

    const estado = await db.collection("Sistema_Rate_Limit_Callables")
      .doc(`catalogo-leitura__${uid}`)
      .get();
    expect(estado.data()?.requisicoes).toHaveLength(30);
  });

  it("mantém limites independentes por operação", async () => {
    const uid = `rate_escopos_${Date.now()}`;

    await verificarRateLimitCallable(uid, "catalogo-leitura");
    await verificarRateLimitCallable(uid, "catalogo-resolucao");

    const leitura = await db.collection("Sistema_Rate_Limit_Callables")
      .doc(`catalogo-leitura__${uid}`)
      .get();
    const resolucao = await db.collection("Sistema_Rate_Limit_Callables")
      .doc(`catalogo-resolucao__${uid}`)
      .get();

    expect(leitura.data()?.requisicoes).toHaveLength(1);
    expect(resolucao.data()?.requisicoes).toHaveLength(1);
  });

  it("aplica o limite no endpoint real de busca de professores", async () => {
    const uid = `rate_busca_prof_${Date.now()}`;
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc(uid).set({ id_usuario: uid });

    const request = {
      data: { termo: "" },
      auth: { uid, token: { roles: ["Chefe_Geral"], versao_permissoes: 1 } },
      rawRequest: {},
    } as unknown as CallableRequest<unknown>;
    const chamar = testEnv.wrap(buscarProfessores);

    for (let tentativa = 0; tentativa < 30; tentativa += 1) {
      await chamar(request);
    }

    await expect(chamar(request)).rejects.toMatchObject({ code: "resource-exhausted" });
  });
});

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

import * as admin from "firebase-admin";
import { backfillChavesUnicas } from "../../manutencao/chavesUnicas";

describe("Backfill de Chaves_Unicas (dry-run/apply, idempotente)", () => {
  let db: admin.firestore.Firestore;
  const colecoes = ["Materia", "Local", "Turma", "Chaves_Unicas"];

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  async function limpar(): Promise<void> {
    for (const nome of colecoes) {
      const snap = await db.collection(nome).get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    }
  }

  beforeEach(limpar);
  afterAll(limpar);

  it("TEST-INT-MANUT-CHAVE-001 — base vazia é no-op", async () => {
    const r = await backfillChavesUnicas(db, { apply: false });
    expect(r.examinados).toBe(0);
    expect(r.planejadas).toEqual([]);
    expect(r.conflitos).toEqual([]);
  });

  it("TEST-INT-MANUT-CHAVE-002 — dry-run reporta, apply cria e rerun é idempotente", async () => {
    await db.collection("Materia").doc("m1").set({ nome: "Química", codigo_materia: "qui1" });

    const dry = await backfillChavesUnicas(db, { apply: false });
    expect(dry.planejadas.length).toBe(1);
    expect(dry.planejadas[0].chave).toBe("Materia__QUI1");
    expect((await db.collection("Chaves_Unicas").doc("Materia__QUI1").get()).exists).toBe(false);

    const apply = await backfillChavesUnicas(db, { apply: true });
    expect(apply.criadas).toEqual(["Materia__QUI1"]);
    const chave = await db.collection("Chaves_Unicas").doc("Materia__QUI1").get();
    expect(chave.data()?.tipo).toBe("Materia");
    expect(chave.data()?.id_recurso).toBe("m1");

    const rerun = await backfillChavesUnicas(db, { apply: true });
    expect(rerun.criadas).toEqual([]);
    expect(rerun.jaExistentes).toEqual(["Materia__QUI1"]);
  });

  it("TEST-INT-MANUT-CHAVE-003 — duplicidade na origem vira conflito sem escolha arbitrária", async () => {
    await db.collection("Materia").doc("m1").set({ nome: "A", codigo_materia: "MAT1" });
    await db.collection("Materia").doc("m2").set({ nome: "B", codigo_materia: " mat1 " });

    const r = await backfillChavesUnicas(db, { apply: true });
    expect(r.conflitos.length).toBe(1);
    expect(r.criadas).toEqual([]);
    expect((await db.collection("Chaves_Unicas").doc("Materia__MAT1").get()).exists).toBe(false);
  });

  it("TEST-INT-MANUT-CHAVE-004 — chave preexistente correta é idempotente; conflitante é conflito", async () => {
    await db.collection("Local").doc("l1").set({ predio: "A", andar: "1", sala: "101" });
    await db.collection("Chaves_Unicas").doc("Local__A__1__101").set({ tipo: "Local", id_recurso: "l1" });
    const ok = await backfillChavesUnicas(db, { apply: true });
    expect(ok.jaExistentes).toContain("Local__A__1__101");
    expect(ok.criadas).toEqual([]);

    await db.collection("Turma").doc("t1").set({ codigo_turma: "ABC123", status: "Ativo" });
    await db.collection("Chaves_Unicas").doc("Turma__ABC123").set({ tipo: "Turma", id_recurso: "outro" });
    const conflito = await backfillChavesUnicas(db, { apply: true });
    expect(conflito.conflitos.some((c) => c.includes("Turma__ABC123"))).toBe(true);
    expect(conflito.criadas).not.toContain("Turma__ABC123");
  });

  it("TEST-INT-MANUT-CHAVE-005 — Local e Turma são cobertos", async () => {
    await db.collection("Local").doc("l2").set({ predio: "B", andar: "2", sala: "202" });
    await db.collection("Turma").doc("t2").set({ codigo_turma: "XYZ789", status: "Ativo" });
    const r = await backfillChavesUnicas(db, { apply: true });
    expect(r.criadas).toEqual(expect.arrayContaining(["Local__B__2__202", "Turma__XYZ789"]));
  });
});

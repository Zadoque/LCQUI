process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

import * as admin from "firebase-admin";
import { backfillChavesUnicas } from "../../manutencao/chavesUnicas";
import { chaveMateria, chaveLocal, chaveTurmaCodigo, normalizarCodigoMateria } from "../../chaves";

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
    const chaveEsperada = chaveMateria(normalizarCodigoMateria("qui1"));

    const dry = await backfillChavesUnicas(db, { apply: false });
    expect(dry.planejadas.length).toBe(1);
    expect(dry.planejadas[0].chave).toBe(chaveEsperada);
    expect((await db.collection("Chaves_Unicas").doc(chaveEsperada).get()).exists).toBe(false);

    const apply = await backfillChavesUnicas(db, { apply: true });
    expect(apply.criadas).toEqual([chaveEsperada]);
    const chave = await db.collection("Chaves_Unicas").doc(chaveEsperada).get();
    expect(chave.data()?.tipo).toBe("Materia");
    expect(chave.data()?.id_recurso).toBe("m1");

    const rerun = await backfillChavesUnicas(db, { apply: true });
    expect(rerun.criadas).toEqual([]);
    expect(rerun.jaExistentes).toEqual([chaveEsperada]);
  });

  it("TEST-INT-MANUT-CHAVE-003 — duplicidade na origem vira conflito sem escolha arbitrária", async () => {
    await db.collection("Materia").doc("m1").set({ nome: "A", codigo_materia: "MAT1" });
    await db.collection("Materia").doc("m2").set({ nome: "B", codigo_materia: " mat1 " });
    // Ambos normalizam para "MAT1", portanto a mesma chave — duplicidade na origem
    const chaveConflito = chaveMateria(normalizarCodigoMateria("MAT1"));

    const r = await backfillChavesUnicas(db, { apply: true });
    expect(r.conflitos.length).toBe(1);
    expect(r.criadas).toEqual([]);
    expect((await db.collection("Chaves_Unicas").doc(chaveConflito).get()).exists).toBe(false);
  });

  it("TEST-INT-MANUT-CHAVE-004 — chave preexistente correta é idempotente; conflitante é conflito", async () => {
    await db.collection("Local").doc("l1").set({ predio: "A", andar: "1", sala: "101" });
    const chaveLocal1 = chaveLocal("A", "1", "101");
    await db.collection("Chaves_Unicas").doc(chaveLocal1).set({ tipo: "Local", id_recurso: "l1" });
    const ok = await backfillChavesUnicas(db, { apply: true });
    expect(ok.jaExistentes).toContain(chaveLocal1);
    expect(ok.criadas).toEqual([]);

    await db.collection("Turma").doc("t1").set({ codigo_turma: "ABC123", status: "Ativo" });
    const chaveTurma1 = chaveTurmaCodigo("ABC123");
    await db.collection("Chaves_Unicas").doc(chaveTurma1).set({ tipo: "Turma", id_recurso: "outro" });
    const conflito = await backfillChavesUnicas(db, { apply: true });
    expect(conflito.conflitos.some((c) => c.includes(chaveTurma1))).toBe(true);
    expect(conflito.criadas).not.toContain(chaveTurma1);
  });

  it("TEST-INT-MANUT-CHAVE-005 — Local e Turma são cobertos", async () => {
    await db.collection("Local").doc("l2").set({ predio: "B", andar: "2", sala: "202" });
    await db.collection("Turma").doc("t2").set({ codigo_turma: "XYZ789", status: "Ativo" });
    const chaveLocalB = chaveLocal("B", "2", "202");
    const chaveTurmaXYZ = chaveTurmaCodigo("XYZ789");
    const r = await backfillChavesUnicas(db, { apply: true });
    expect(r.criadas).toEqual(expect.arrayContaining([chaveLocalB, chaveTurmaXYZ]));
  });

  it("TEST-INT-MANUT-CHAVE-006 — injetividade: campos com __ não colidem com separador", async () => {
    // Prova a razão do encoding: "A__B"+"C" != "A"+"B__C" na chave.
    await db.collection("Local").doc("la").set({ predio: "A__B", andar: "C", sala: "D" });
    await db.collection("Local").doc("lb").set({ predio: "A", andar: "B__C", sala: "D" });
    const r = await backfillChavesUnicas(db, { apply: true });
    // As duas chaves devem ser DISTINTAS (sem colisão).
    expect(r.criadas.length).toBe(2);
    expect(new Set(r.criadas).size).toBe(2);
    expect(r.conflitos).toEqual([]);
    // Verifique que cada chave aponta para o recurso correto.
    const docA = await db.collection("Chaves_Unicas").doc(r.criadas[0]).get();
    const docB = await db.collection("Chaves_Unicas").doc(r.criadas[1]).get();
    const recursos = new Set([docA.data()?.id_recurso, docB.data()?.id_recurso]);
    expect(recursos).toContain("la");
    expect(recursos).toContain("lb");
  });
});

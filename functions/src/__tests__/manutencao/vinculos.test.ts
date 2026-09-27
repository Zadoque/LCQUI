process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

import * as admin from "firebase-admin";
import { reconciliarVinculos } from "../../manutencao/vinculos";

describe("Reconciliação de vínculos legados (dry-run/apply)", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  beforeEach(async () => {
    const turmas = await db.collection("Turma").get();
    for (const turma of turmas.docs) {
      const alunos = await turma.ref.collection("Alunos").get();
      await Promise.all(alunos.docs.map((a) => a.ref.delete()));
      await turma.ref.delete();
    }
  });

  afterAll(async () => {
    const turmas = await db.collection("Turma").get();
    for (const turma of turmas.docs) {
      const alunos = await turma.ref.collection("Alunos").get();
      await Promise.all(alunos.docs.map((a) => a.ref.delete()));
      await turma.ref.delete();
    }
  });

  it("TEST-INT-MANUT-VINC-001 — dry-run reporta sem escrever; apply corrige; rerun é idempotente", async () => {
    await db.collection("Turma").doc("t1").set({ nome: "T1", id_professor: "prof1", status: "Ativo" });
    await db.collection("Turma").doc("t1").collection("Alunos").doc("a1").set({
      id_aluno: "a1",
      email: "a@x",
      numero_matricula: "999",
      nome: "A",
    });

    const dry = await reconciliarVinculos(db, { apply: false });
    expect(dry.examinados).toBe(1);
    expect(dry.corrigidos).toBe(1);
    expect(dry.alteracoes[0].camposRemovidos).toEqual(expect.arrayContaining(["email", "numero_matricula"]));
    expect(dry.alteracoes[0].camposAdicionados).toEqual(["id_turma"]);

    const antes = (await db.collection("Turma").doc("t1").collection("Alunos").doc("a1").get()).data()!;
    expect(antes.email).toBe("a@x");
    expect(antes.id_turma).toBeUndefined();

    const apply = await reconciliarVinculos(db, { apply: true });
    expect(apply.corrigidos).toBe(1);

    const depois = (await db.collection("Turma").doc("t1").collection("Alunos").doc("a1").get()).data()!;
    expect(depois.email).toBeUndefined();
    expect(depois.numero_matricula).toBeUndefined();
    expect(depois.id_turma).toBe("t1");
    expect(depois.id_aluno).toBe("a1");
    expect(depois.nome).toBe("A");

    const rerun = await reconciliarVinculos(db, { apply: true });
    expect(rerun.examinados).toBe(1);
    expect(rerun.corrigidos).toBe(0);
  });

  it("TEST-INT-MANUT-VINC-002 — divergência de id_turma é conflito, sem correção arbitrária", async () => {
    await db.collection("Turma").doc("t2").set({ nome: "T2", id_professor: "prof1", status: "Ativo" });
    await db.collection("Turma").doc("t2").collection("Alunos").doc("a2").set({
      id_aluno: "a2",
      id_turma: "outra_turma",
    });

    const resultado = await reconciliarVinculos(db, { apply: true });
    expect(resultado.conflitos.length).toBe(1);
    expect(resultado.corrigidos).toBe(0);
    const doc = (await db.collection("Turma").doc("t2").collection("Alunos").doc("a2").get()).data()!;
    expect(doc.id_turma).toBe("outra_turma");
  });

  it("TEST-INT-MANUT-VINC-003 — vínculo sem ingressou_em → conflito REQUER_RECONCILIACAO_HUMANA, campos proibidos ainda removidos", async () => {
    await db.collection("Turma").doc("t3").set({ nome: "T3", id_professor: "prof1", status: "Ativo" });
    await db.collection("Turma").doc("t3").collection("Alunos").doc("a3").set({
      id_aluno: "a3",
      id_turma: "t3",
      email: "legado@x.com",
      // ingressou_em ausente
    });

    const dry = await reconciliarVinculos(db, { apply: false });
    // Deve reportar conflito sobre ingressou_em ausente
    expect(dry.conflitos.some((c) => c.includes("REQUER_RECONCILIACAO_HUMANA"))).toBe(true);
    // Ainda planeja remoção do email
    expect(dry.alteracoes.some((a) => a.camposRemovidos.includes("email"))).toBe(true);

    const apply = await reconciliarVinculos(db, { apply: true });
    expect(apply.conflitos.some((c) => c.includes("REQUER_RECONCILIACAO_HUMANA"))).toBe(true);
    // email ainda é removido
    const depois = (await db.collection("Turma").doc("t3").collection("Alunos").doc("a3").get()).data()!;
    expect(depois.email).toBeUndefined();
    // ingressou_em NÃO foi inventado
    expect(depois.ingressou_em).toBeUndefined();
  });

  it("TEST-INT-MANUT-VINC-004 — vínculo canônico completo não precisa de reconciliação", async () => {
    await db.collection("Turma").doc("t4").set({ nome: "T4", id_professor: "prof1", status: "Ativo" });
    await db.collection("Turma").doc("t4").collection("Alunos").doc("a4").set({
      id_aluno: "a4",
      id_turma: "t4",
      nome: "A4",
      ingressou_em: new Date(),
    });

    const result = await reconciliarVinculos(db, { apply: true });
    expect(result.examinados).toBe(1);
    expect(result.corrigidos).toBe(0);
    expect(result.conflitos).toEqual([]);
  });
});

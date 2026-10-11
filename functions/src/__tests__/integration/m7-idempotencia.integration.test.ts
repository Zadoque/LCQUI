process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  IdentidadeOperacao,
  concluirOperacaoPendenteTx,
  construirIdentidade,
  falharOperacaoPendenteTx,
  registrarOperacaoConcluidaTx,
  registrarOperacaoPendenteTx,
  resolverOperacaoTx,
} from "../../idempotencia";
import { gerenciarMateria } from "../../materias";
import { criarRequisicaoAdicaoBem } from "../../patrimonio";

const COLECAO_EFEITOS = "_M7_Teste_Efeitos";

let contador = 0;
function idUnico(prefixo: string): string {
  contador += 1;
  return `${prefixo}-${Date.now()}-${contador}`;
}

async function executarComando(
  db: admin.firestore.Firestore,
  idOperacao: string,
  identidade: IdentidadeOperacao
): Promise<{ estado: string; resultado?: unknown }> {
  const efeitoRef = db.collection(COLECAO_EFEITOS).doc(idOperacao);
  return db.runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado !== "NOVA") return { estado: decisao.estado, resultado: decisao.resultado };
    tx.set(efeitoRef, { contador: FieldValue.increment(1) }, { merge: true });
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, { executado: true });
    return { estado: "EXECUTADO" };
  });
}

async function contadorEfeito(db: admin.firestore.Firestore, idOperacao: string): Promise<number> {
  const snap = await db.collection(COLECAO_EFEITOS).doc(idOperacao).get();
  return (snap.data()?.contador as number | undefined) ?? 0;
}

describe("TEST-INT-M7-RECEIPT — receipt e replay canônicos (Seção 5/7 M7)", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  it("TEST-INT-M7-RECEIPT-001 — primeira execução reserva/aplica e grava identidade correta", async () => {
    const id = idUnico("primeira");
    const ident = construirIdentidade("u1", "EXTRAVIO", { frasco: "f1" });
    const resultado = await executarComando(db, id, ident);
    expect(resultado.estado).toBe("EXECUTADO");
    expect(await contadorEfeito(db, id)).toBe(1);

    const receipt = await db.collection("Operacoes").doc(id).get();
    expect(receipt.exists).toBe(true);
    expect(receipt.data()).toMatchObject({
      uid: "u1",
      tipo_operacao: "EXTRAVIO",
      payload_hash: ident.payloadHash,
      status: "CONCLUIDA",
    });
    expect(receipt.data()?.criado_em).toBeDefined();
    expect(receipt.data()?.atualizado_em).toBeDefined();
  });

  it("TEST-INT-M7-RECEIPT-002 — replay CONCLUIDA devolve resultado sem novo efeito", async () => {
    const id = idUnico("replay");
    const ident = construirIdentidade("u1", "DEVOLUCAO", { frasco: "f1" });
    await executarComando(db, id, ident);
    const segunda = await executarComando(db, id, ident);
    expect(segunda.estado).toBe("REPLAY");
    expect(segunda.resultado).toEqual({ executado: true });
    expect(await contadorEfeito(db, id)).toBe(1);
  });

  it("TEST-INT-M7-RECEIPT-003 — mesmo idOperacao com outro ator é rejeitado", async () => {
    const id = idUnico("outro_ator");
    await executarComando(db, id, construirIdentidade("u1", "T", { a: 1 }));
    await expect(executarComando(db, id, construirIdentidade("u2", "T", { a: 1 }))).rejects.toMatchObject({
      code: "already-exists",
    });
    expect(await contadorEfeito(db, id)).toBe(1);
  });

  it("TEST-INT-M7-RECEIPT-004 — mesmo idOperacao com outro tipo_operacao é rejeitado", async () => {
    const id = idUnico("outro_tipo");
    await executarComando(db, id, construirIdentidade("u1", "T", { a: 1 }));
    await expect(executarComando(db, id, construirIdentidade("u1", "OUTRA", { a: 1 }))).rejects.toMatchObject({
      code: "already-exists",
    });
    expect(await contadorEfeito(db, id)).toBe(1);
  });

  it("TEST-INT-M7-RECEIPT-005 — mesmo idOperacao com outro payload é rejeitado", async () => {
    const id = idUnico("outro_payload");
    await executarComando(db, id, construirIdentidade("u1", "T", { a: 1 }));
    await expect(executarComando(db, id, construirIdentidade("u1", "T", { a: 2 }))).rejects.toMatchObject({
      code: "already-exists",
    });
    expect(await contadorEfeito(db, id)).toBe(1);
  });

  it("TEST-INT-M7-RECEIPT-006 — concorrência idêntica produz um único efeito", async () => {
    const id = idUnico("concorrencia");
    const ident = construirIdentidade("u1", "T", { a: 1 });
    const resultados = await Promise.all([
      executarComando(db, id, ident),
      executarComando(db, id, ident),
    ]);
    expect(resultados.map((r) => r.estado).sort()).toEqual(["EXECUTADO", "REPLAY"]);
    expect(await contadorEfeito(db, id)).toBe(1);
  });

  it("TEST-INT-M7-RECEIPT-007 — intenções diferentes (ids distintos) não deduplicam entre si", async () => {
    const idA = idUnico("intencao_a");
    const idB = idUnico("intencao_b");
    const ident = construirIdentidade("u1", "T", { a: 1 });
    await executarComando(db, idA, ident);
    await executarComando(db, idB, ident);
    expect(await contadorEfeito(db, idA)).toBe(1);
    expect(await contadorEfeito(db, idB)).toBe(1);
  });

  it("TEST-INT-M7-RECEIPT-008 — receipt corrompido falha fechado", async () => {
    const id = idUnico("corrompido");
    await db.collection("Operacoes").doc(id).set({ uid: "u1" });
    const ident = construirIdentidade("u1", "T", { a: 1 });
    await expect(executarComando(db, id, ident)).rejects.toMatchObject({
      code: "failed-precondition",
    });
    expect(await contadorEfeito(db, id)).toBe(0);
  });

  it("TEST-INT-M7-RECEIPT-009 — PENDENTE não é tratado como CONCLUIDA", async () => {
    const id = idUnico("pendente");
    const ident = construirIdentidade("u1", "ETIQUETA", { a: 1 });
    await db.runTransaction(async (tx) => { registrarOperacaoPendenteTx(tx, id, ident); });

    const resultado = await executarComando(db, id, ident);
    expect(resultado.estado).toBe("PENDENTE");
    expect(await contadorEfeito(db, id)).toBe(0);
  });

  it("TEST-INT-M7-RECEIPT-010 — processador conclui PENDENTE e retry vira REPLAY", async () => {
    const id = idUnico("processador");
    const ident = construirIdentidade("u1", "ETIQUETA", { a: 1 });
    await db.runTransaction(async (tx) => { registrarOperacaoPendenteTx(tx, id, ident); });
    await db.runTransaction((tx) => concluirOperacaoPendenteTx(tx, id, { pdf: "path" }));

    const receipt = await db.collection("Operacoes").doc(id).get();
    expect(receipt.data()?.status).toBe("CONCLUIDA");
    expect(receipt.data()?.resultado).toEqual({ pdf: "path" });

    const retry = await executarComando(db, id, ident);
    expect(retry.estado).toBe("REPLAY");
    expect(retry.resultado).toEqual({ pdf: "path" });
    expect(await contadorEfeito(db, id)).toBe(0);
  });

  it("TEST-INT-M7-RECEIPT-011 — idOperacao fora do hash: ids distintos, mesmo payload_hash", async () => {
    const ident = construirIdentidade("u1", "T", { a: 1 });
    const idA = idUnico("hash_a");
    const idB = idUnico("hash_b");
    await executarComando(db, idA, ident);
    await executarComando(db, idB, ident);
    const docA = await db.collection("Operacoes").doc(idA).get();
    const docB = await db.collection("Operacoes").doc(idB).get();
    expect(docA.data()?.payload_hash).toBe(docB.data()?.payload_hash);
    expect(docA.id).not.toBe(docB.id);
  });

  it("TEST-INT-M7-RECEIPT-012 — FALHOU é terminal e distinto de CONCLUIDA", async () => {
    const id = idUnico("falhou");
    const ident = construirIdentidade("u1", "ETIQUETA", { a: 1 });
    await db.runTransaction(async (tx) => { registrarOperacaoPendenteTx(tx, id, ident); });
    await db.runTransaction((tx) => falharOperacaoPendenteTx(tx, id));

    const retry = await executarComando(db, id, ident);
    expect(retry.estado).toBe("FALHOU");
    expect(await contadorEfeito(db, id)).toBe(0);

    const receipt = await db.collection("Operacoes").doc(id).get();
    expect(receipt.data()?.status).toBe("FALHOU");
  });

  it("TEST-INT-M7-RECEIPT-013 — gerenciarMateria replay com idOperacao e rejeição em reuso incompatível", async () => {
    const uid = idUnico("prof");
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Professor").doc(uid).set({ id_usuario: uid });

    const idOp = idUnico("op_mat");
    const codigo = idUnico("MAT").substring(0, 10).toUpperCase();
    const req = {
      data: {
        acao: "CRIAR",
        nome: "Química Orgânica I",
        codigoMateria: codigo,
        idOperacao: idOp,
      },
      auth: { uid, token: { roles: ["Professor"], versao_permissoes: 1 } },
      rawRequest: {},
    } as any;

    const res1 = await gerenciarMateria.run(req);
    expect(res1.id).toBeDefined();

    // Replay com o mesmo idOperacao
    const res2 = await gerenciarMateria.run(req);
    expect(res2.id).toBe(res1.id);

    // Reuso incompatível com outro payload
    const reqIncompativel = {
      ...req,
      data: { ...req.data, nome: "Nome Completamente Diferente" },
    };
    await expect(gerenciarMateria.run(reqIncompativel)).rejects.toMatchObject({
      code: "already-exists",
    });
  });

  it("TEST-INT-M7-RECEIPT-014 — criarRequisicaoAdicaoBem replay com idOperacao sem colisão de lock", async () => {
    const uid = idUnico("prof");
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Professor").doc(uid).set({ id_usuario: uid });

    const idLocal = idUnico("local");
    await db.collection("Local").doc(idLocal).set({ predio: "CCT", andar: "1", sala: "101" });

    const numPat = idUnico("PAT").substring(0, 20).toUpperCase();
    const idOp = idUnico("op_adicao");

    const req = {
      data: {
        numeroPatrimonioProposto: numPat,
        estadoConservacaoProposto: "BOM",
        photoUrlProposta: "requisicoes/prof/foto.png",
        idLocal,
        nomeResponsavelProposto: "Prof. Teste",
        motivo: "Equipamento novo para laboratório",
        idOperacao: idOp,
      },
      auth: { uid, token: { roles: ["Professor"], versao_permissoes: 1 } },
      rawRequest: {},
    } as any;

    const res1 = await criarRequisicaoAdicaoBem.run(req);
    expect(res1.idRequisicao).toBeDefined();

    // Replay não deve falhar com colisão de lock
    const res2 = await criarRequisicaoAdicaoBem.run(req);
    expect(res2.idRequisicao).toBe(res1.idRequisicao);
  });
});

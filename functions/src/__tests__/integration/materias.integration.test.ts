process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { CallableRequest } from "firebase-functions/v2/https";
import { gerenciarMateria } from "../../materias";
import { chaveMateria, normalizarCodigoMateria } from "../../chaves";

const testEnv = fft({ projectId: "lcqui-dev" });

jest.setTimeout(20000);

let contador = 0;
function uidUnico(prefixo: string): string {
  contador += 1;
  return `${prefixo}_${Date.now()}_${contador}`;
}

describe("Integração: Matérias (M9 + unicidade transacional + projeção)", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  afterAll(async () => {
    testEnv.cleanup();
  });

  function mockRequest(data: unknown, uid: string | undefined, versao = 1, roles = ["Professor"]): CallableRequest {
    return {
      data,
      auth: uid === undefined ? undefined : { uid, token: { roles, versao_permissoes: versao } },
      rawRequest: {},
    } as unknown as CallableRequest;
  }

  async function semearProfessor(uid: string, opcoes: { ativo?: boolean; versao?: number } = {}): Promise<void> {
    const { ativo = true, versao = 1 } = opcoes;
    await db.collection("Usuarios").doc(uid).set({ ativo, versao_permissoes: versao });
    await db.collection("Professor").doc(uid).set({ id_usuario: uid });
  }

  it("TEST-INT-MAT-001 — cria matéria, reserva código e persiste autoria", async () => {
    const uid = uidUnico("prof_criar");
    await semearProfessor(uid);
    const wrapped = testEnv.wrap(gerenciarMateria);
    const resultado = await wrapped(mockRequest({ acao: "CRIAR", nome: "Química Analítica", codigoMateria: "qmc101" }, uid));

    expect(resultado).toMatchObject({ nome: "Química Analítica", codigoMateria: "QMC101" });
    const materia = await db.collection("Materia").doc(resultado.id).get();
    expect(materia.data()).toMatchObject({ nome: "Química Analítica", codigo_materia: "QMC101", criado_por: uid });
    const chave = await db.collection("Chaves_Unicas").doc(chaveMateria(normalizarCodigoMateria("QMC101"))).get();
    expect(chave.exists).toBe(true);
    expect(chave.data()?.id_recurso).toBe(resultado.id);
  });

  it("TEST-INT-MAT-002 — código já em uso (normalizado) nega e não cria duplicata", async () => {
    const uid = uidUnico("prof_dup");
    await semearProfessor(uid);
    const wrapped = testEnv.wrap(gerenciarMateria);
    await wrapped(mockRequest({ acao: "CRIAR", nome: "Orgânica", codigoMateria: "QO1" }, uid));
    await expect(
      wrapped(mockRequest({ acao: "CRIAR", nome: "Outra", codigoMateria: " qo1 " }, uid))
    ).rejects.toMatchObject({ code: "already-exists" });
    const materias = await db.collection("Materia").where("codigo_materia", "==", "QO1").get();
    expect(materias.size).toBe(1);
  });

  it("TEST-INT-MAT-003 — criação concorrente do mesmo código produz um único efeito", async () => {
    const uid = uidUnico("prof_conc");
    await semearProfessor(uid);
    const wrapped = testEnv.wrap(gerenciarMateria);
    const resultados = await Promise.allSettled([
      wrapped(mockRequest({ acao: "CRIAR", nome: "Física", codigoMateria: "FIS1" }, uid)),
      wrapped(mockRequest({ acao: "CRIAR", nome: "Física", codigoMateria: "FIS1" }, uid)),
    ]);
    const ok = resultados.filter(r => r.status === "fulfilled").length;
    const falhas = resultados.filter(r => r.status === "rejected").length;
    expect(ok).toBe(1);
    expect(falhas).toBe(1);
    const materias = await db.collection("Materia").where("codigo_materia", "==", "FIS1").get();
    expect(materias.size).toBe(1);
  });

  it("TEST-INT-MAT-004 — editar mantém o ID e atualiza a projeção Turma.nome_materia", async () => {
    const uid = uidUnico("prof_edit");
    await semearProfessor(uid);
    const wrapped = testEnv.wrap(gerenciarMateria);
    const criada = await wrapped(mockRequest({ acao: "CRIAR", nome: "Cálculo I", codigoMateria: "CAL1" }, uid));
    const turmaRef = db.collection("Turma").doc("turma_mat_1");
    await turmaRef.set({ id_materia: criada.id, nome_materia: "Cálculo I", id_professor: uid });

    const editada = await wrapped(mockRequest({ acao: "EDITAR", idMateria: criada.id, nome: "Cálculo Diferencial", codigoMateria: "CAL1" }, uid));
    expect(editada.id).toBe(criada.id);
    const materia = await db.collection("Materia").doc(criada.id).get();
    expect(materia.data()?.nome).toBe("Cálculo Diferencial");
    const turma = await turmaRef.get();
    expect(turma.data()?.nome_materia).toBe("Cálculo Diferencial");
    expect(turma.data()?.id_materia).toBe(criada.id);
  });

  it("TEST-INT-MAT-005 — editar o código reserva a nova chave e libera a antiga", async () => {
    const uid = uidUnico("prof_troca");
    await semearProfessor(uid);
    const wrapped = testEnv.wrap(gerenciarMateria);
    const criada = await wrapped(mockRequest({ acao: "CRIAR", nome: "Estatística", codigoMateria: "EST1" }, uid));
    await wrapped(mockRequest({ acao: "EDITAR", idMateria: criada.id, nome: "Estatística", codigoMateria: "EST2" }, uid));

    expect((await db.collection("Chaves_Unicas").doc(chaveMateria(normalizarCodigoMateria("EST1"))).get()).exists).toBe(false);
    const nova = await db.collection("Chaves_Unicas").doc(chaveMateria(normalizarCodigoMateria("EST2"))).get();
    expect(nova.exists).toBe(true);
    expect(nova.data()?.id_recurso).toBe(criada.id);
    const materia = await db.collection("Materia").doc(criada.id).get();
    expect(materia.data()?.codigo_materia).toBe("EST2");
  });

  it("TEST-INT-MAT-006 — Aluno sem papel autorizado nega", async () => {
    const uid = uidUnico("aluno");
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Aluno").doc(uid).set({ id_usuario: uid });
    const wrapped = testEnv.wrap(gerenciarMateria);
    await expect(
      wrapped(mockRequest({ acao: "CRIAR", nome: "X", codigoMateria: "X1" }, uid, 1, ["Aluno"]))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-MAT-007 — token com versão obsoleta nega", async () => {
    const uid = uidUnico("prof_obsoleto");
    await semearProfessor(uid, { versao: 9 });
    const wrapped = testEnv.wrap(gerenciarMateria);
    await expect(
      wrapped(mockRequest({ acao: "CRIAR", nome: "Y", codigoMateria: "Y1" }, uid, 8))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-MAT-008 — professor inativo nega", async () => {
    const uid = uidUnico("prof_inativo");
    await semearProfessor(uid, { ativo: false });
    const wrapped = testEnv.wrap(gerenciarMateria);
    await expect(
      wrapped(mockRequest({ acao: "CRIAR", nome: "Z", codigoMateria: "Z1" }, uid))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });
});

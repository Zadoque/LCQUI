process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.STORAGE_EMULATOR_HOST = "http://127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import {
  registrarRoteiro,
  compartilharRoteiro,
  descompartilharRoteiro,
  listarRoteirosProfessor,
  removerRoteiro,
  emitirUrlDownloadRoteiro,
} from "../roteiros";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Módulo de Roteiros", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: "lcqui-dev",
        storageBucket: "lcqui-dev.appspot.com",
      });
    }
    db = admin.firestore();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRequest = (data: any, uid: string, roles: string[] = ["Professor"], versao_permissoes = 1): any => ({
    data,
    auth: {
      uid,
      token: { roles, versao_permissoes }
    },
    rawRequest: {}
  });

  async function semearUsuario(uid: string, roles: string[] = ["Professor"]): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({
      ativo: true,
      versao_permissoes: 1,
      nome: `Nome ${uid}`,
    });
    for (const papel of roles) {
      await db.collection(papel).doc(uid).set({
        id_usuario: uid,
        ativo: true,
      });
    }
  }

  async function criarArquivoRoteiro(uid: string, fileName: string): Promise<{ storagePath: string; buffer: Buffer; geracao: string; tamanhoBytes: number }> {
    const storagePath = `roteiros/${uid}/${Date.now()}_${fileName}`;
    const buffer = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(1024)]);
    const file = admin.storage().bucket().file(storagePath);
    await file.save(buffer, {
      contentType: "application/pdf",
      metadata: {
        metadata: { owner: uid },
      },
    });
    const [metadata] = await file.getMetadata();
    return { storagePath, buffer, geracao: String(metadata.generation), tamanhoBytes: buffer.length };
  }

  describe("registrarRoteiro", () => {
    it("deve permitir que um professor registre um roteiro publicável a partir de objeto no Storage", async () => {
      const uid = "prof_registrar_1";
      await semearUsuario(uid);
      const { storagePath } = await criarArquivoRoteiro(uid, "roteiro.pdf");

      const wrapped = testEnv.wrap(registrarRoteiro);
      const result = await wrapped(mockRequest({
        nome: "Roteiro de Titulação",
        descricao: "Titulação ácido-base",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, uid));

      expect(result.idRoteiro).toBeDefined();

      const roteiroSnap = await db.collection("Roteiro_Experimento").doc(result.idRoteiro).get();
      expect(roteiroSnap.exists).toBe(true);
      const data = roteiroSnap.data()!;
      expect(data.id_professor_upload).toBe(uid);
      expect(data.nome).toBe("Roteiro de Titulação");
      expect(data.status).toBe("PUBLICAVEL");
      expect(data.nome_arquivo).toBe("roteiro.pdf");
      expect(data.professores_compartilhados).toEqual([]);
      expect(data.referencia.storage_path).toBe(storagePath);
      expect(typeof data.referencia.geracao).toBe("string");
      expect(data.referencia.tamanho_bytes).toBeGreaterThan(0);
    });

    it("deve rejeitar storagePath fora do namespace do dono (H02)", async () => {
      const uid = "prof_registrar_namespace";
      const outroUid = "outro_prof";
      await semearUsuario(uid);
      await semearUsuario(outroUid);

      // Cria arquivo no namespace de outro professor.
      const storagePath = `roteiros/${outroUid}/outro.pdf`;
      await admin.storage().bucket().file(storagePath).save(Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(1024)]), {
        contentType: "application/pdf",
        metadata: {
          metadata: { owner: uid },
        },
      });

      const wrapped = testEnv.wrap(registrarRoteiro);
      await expect(wrapped(mockRequest({
        nome: "Roteiro inválido",
        descricao: "Fora do namespace",
        storagePath,
        nomeArquivo: "outro.pdf",
      }, uid))).rejects.toMatchObject({ code: "permission-denied" });
    });
  });

  describe("compartilharRoteiro", () => {
    it("deve permitir compartilhar roteiro apenas se for o dono e enviar notificação", async () => {
      const dono = "prof_comp_1";
      const alvo = "prof_alvo_1";
      await semearUsuario(dono);
      await semearUsuario(alvo);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "roteiro.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro 2",
        descricao: "Descrição",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, dono));

      // Tentativa por não-dono deve falhar
      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await expect(wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, alvo))).rejects.toThrow(/Somente o dono/i);

      // Compartilhamento correto
      await wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, dono));

      const roteiroSnap = await db.collection("Roteiro_Experimento").doc(resultReg.idRoteiro).get();
      expect(roteiroSnap.data()?.professores_compartilhados).toContain(alvo);

      const notifSnap = await db.collection("Usuarios").doc(alvo).collection("Notificacoes")
        .where("tipo", "==", "ROTEIRO_COMPARTILHADO").get();
      expect(notifSnap.empty).toBe(false);
    });
  });

  describe("descompartilharRoteiro", () => {
    it("deve permitir descompartilhar roteiro", async () => {
      const dono = "prof_descomp_1";
      const alvo = "prof_alvo_2";
      await semearUsuario(dono);
      await semearUsuario(alvo);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "roteiro.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro 3",
        descricao: "Descrição",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, dono));

      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, dono));

      const wrappedDescomp = testEnv.wrap(descompartilharRoteiro);
      await wrappedDescomp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, dono));

      const roteiroSnap = await db.collection("Roteiro_Experimento").doc(resultReg.idRoteiro).get();
      expect(roteiroSnap.data()?.professores_compartilhados).not.toContain(alvo);
    });
  });

  describe("listarRoteirosProfessor", () => {
    it("deve listar roteiros do dono e compartilhados com ele", async () => {
      const dono = "prof_lista_dono";
      const alvo = "prof_lista_alvo";
      await semearUsuario(dono);
      await semearUsuario(alvo);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath: st1 } = await criarArquivoRoteiro(dono, "dono.pdf");
      const reg1 = await wrappedReg(mockRequest({
        nome: "Roteiro Dono",
        descricao: "X",
        storagePath: st1,
        nomeArquivo: "dono.pdf",
      }, dono));

      const { storagePath: st2 } = await criarArquivoRoteiro(dono, "comp.pdf");
      const reg2 = await wrappedReg(mockRequest({
        nome: "Roteiro Compartilhado",
        descricao: "Y",
        storagePath: st2,
        nomeArquivo: "comp.pdf",
      }, dono));

      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await wrappedComp(mockRequest({
        idRoteiro: reg2.idRoteiro,
        uidProfessor: alvo,
      }, dono));

      const wrappedList = testEnv.wrap(listarRoteirosProfessor);
      const resultDono = await wrappedList(mockRequest({}, dono));
      const idsDono = resultDono.roteiros.map((r: { id: string }) => r.id);
      expect(idsDono).toContain(reg1.idRoteiro);
      expect(idsDono).toContain(reg2.idRoteiro);

      const resultAlvo = await wrappedList(mockRequest({}, alvo));
      const idsAlvo = resultAlvo.roteiros.map((r: { id: string }) => r.id);
      expect(idsAlvo).toContain(reg2.idRoteiro);
      expect(idsAlvo).not.toContain(reg1.idRoteiro);
    });
  });

  describe("removerRoteiro", () => {
    it("deve permitir que o dono remova o roteiro e o objeto do Storage", async () => {
      const dono = "prof_remove_1";
      const outro = "prof_remove_outro";
      await semearUsuario(dono);
      await semearUsuario(outro);

      const { storagePath } = await criarArquivoRoteiro(dono, "remover.pdf");
      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro a Remover",
        descricao: "Z",
        storagePath,
        nomeArquivo: "remover.pdf",
      }, dono));

      const wrappedRem = testEnv.wrap(removerRoteiro);
      await expect(wrappedRem(mockRequest({
        idRoteiro: resultReg.idRoteiro,
      }, outro))).rejects.toThrow(/Somente o dono/i);

      const remResult = await wrappedRem(mockRequest({
        idRoteiro: resultReg.idRoteiro,
      }, dono));
      expect(remResult.success).toBe(true);

      const roteiroSnap = await db.collection("Roteiro_Experimento").doc(resultReg.idRoteiro).get();
      expect(roteiroSnap.exists).toBe(false);

      const [exists] = await admin.storage().bucket().file(storagePath).exists();
      expect(exists).toBe(false);
    });
  });

  describe("emitirUrlDownloadRoteiro", () => {
    it("deve rejeitar Chefe_Geral (B03 — caminho Q13 fechado)", async () => {
      const dono = "prof_download_b03";
      const chefe = "chefe_download_b03";
      await semearUsuario(dono, ["Professor"]);
      await semearUsuario(chefe, ["Chefe_Geral"]);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "b03.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro B03",
        descricao: "B",
        storagePath,
        nomeArquivo: "b03.pdf",
      }, dono));

      const wrapped = testEnv.wrap(emitirUrlDownloadRoteiro);
      await expect(wrapped(mockRequest({
        idRoteiro: resultReg.idRoteiro,
      }, chefe, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "permission-denied" });
    });
  });
});

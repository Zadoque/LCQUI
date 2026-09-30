import "./emulator-credentials";

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
import { criarPost, removerPost } from "../posts";

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

  let operacaoSeq = 0;
  const novaOperacao = (): string => `op_rtr_${Date.now()}_${++operacaoSeq}`;

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

  async function semearTurma(id: string, idProfessor: string, status = "Ativo"): Promise<void> {
    await db.collection("Turma").doc(id).set({
      id_professor: idProfessor,
      status,
      nome_turma: `Turma ${id}`,
      codigo_turma: id,
      versao: 1,
      ano: 2026,
      semestre: 1,
      capacidade: 30,
      qtd_alunos: 0,
    });
  }

  async function semearVinculo(idTurma: string, uid: string): Promise<void> {
    await db.collection("Turma").doc(idTurma).collection("Alunos").doc(uid).set({
      id_aluno: uid,
      id_turma: idTurma,
      nome: `Aluno ${uid}`,
      ingressou_em: admin.firestore.FieldValue.serverTimestamp(),
    });
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

  async function criarArquivoRoteiroCustom(
    ownerUid: string,
    fileName: string,
    opts: {
      storagePath?: string;
      contentType?: string;
      buffer?: Buffer;
      owner?: string | null;
    } = {}
  ): Promise<{ storagePath: string; buffer: Buffer; geracao: string; tamanhoBytes: number }> {
    const storagePath = opts.storagePath ?? `roteiros/${ownerUid}/${Date.now()}_${fileName}`;
    const buffer = opts.buffer ?? Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(1024)]);
    const file = admin.storage().bucket().file(storagePath);
    const metadata: Record<string, unknown> = {};
    if (opts.owner !== null) {
      metadata.owner = opts.owner ?? ownerUid;
    }
    await file.save(buffer, {
      contentType: opts.contentType ?? "application/pdf",
      metadata: Object.keys(metadata).length > 0 ? { metadata } : undefined,
    });
    const [metadataResult] = await file.getMetadata();
    return {
      storagePath,
      buffer,
      geracao: String(metadataResult.generation),
      tamanhoBytes: buffer.length,
    };
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

    it("deve rejeitar objeto inexistente no Storage", async () => {
      const uid = "prof_registrar_inexistente";
      await semearUsuario(uid);

      const wrapped = testEnv.wrap(registrarRoteiro);
      await expect(wrapped(mockRequest({
        nome: "Roteiro Inexistente",
        descricao: "Descricao",
        storagePath: `roteiros/${uid}/nao_existe.pdf`,
        nomeArquivo: "nao_existe.pdf",
      }, uid))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("deve rejeitar contentType que não seja application/pdf", async () => {
      const uid = "prof_registrar_content_type";
      await semearUsuario(uid);
      const { storagePath } = await criarArquivoRoteiroCustom(uid, "roteiro.pdf", {
        contentType: "text/plain",
      });

      const wrapped = testEnv.wrap(registrarRoteiro);
      await expect(wrapped(mockRequest({
        nome: "Roteiro Tipo Errado",
        descricao: "Descricao",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, uid))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("deve rejeitar buffer sem prefixo mágico %PDF-", async () => {
      const uid = "prof_registrar_magic";
      await semearUsuario(uid);
      const { storagePath } = await criarArquivoRoteiroCustom(uid, "roteiro.pdf", {
        buffer: Buffer.from("Nao é um PDF"),
      });

      const wrapped = testEnv.wrap(registrarRoteiro);
      await expect(wrapped(mockRequest({
        nome: "Roteiro Sem Prefixo",
        descricao: "Descricao",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, uid))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("deve rejeitar storagePath fora do namespace roteiros/{uid}/", async () => {
      const uid = "prof_registrar_forado_namespace";
      await semearUsuario(uid);

      const wrapped = testEnv.wrap(registrarRoteiro);
      await expect(wrapped(mockRequest({
        nome: "Roteiro Fora do Namespace",
        descricao: "Descricao",
        storagePath: "fotos_perfil/outro.pdf",
        nomeArquivo: "outro.pdf",
      }, uid))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("deve rejeitar objeto cujo owner no metadata não coincide com o uid", async () => {
      const uid = "prof_registrar_owner";
      const outro = "outro_owner";
      await semearUsuario(uid);
      await semearUsuario(outro);
      const { storagePath } = await criarArquivoRoteiroCustom(uid, "roteiro.pdf", {
        owner: outro,
      });

      const wrapped = testEnv.wrap(registrarRoteiro);
      await expect(wrapped(mockRequest({
        nome: "Roteiro Owner Errado",
        descricao: "Descricao",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, uid))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("deve rejeitar arquivo com tamanho igual ou superior a 15 MiB", async () => {
      const uid = "prof_registrar_tamanho";
      await semearUsuario(uid);
      const tamanhoLimite = 15 * 1024 * 1024;
      const { storagePath } = await criarArquivoRoteiroCustom(uid, "roteiro.pdf", {
        buffer: Buffer.alloc(tamanhoLimite),
      });

      const wrapped = testEnv.wrap(registrarRoteiro);
      await expect(wrapped(mockRequest({
        nome: "Roteiro Grande",
        descricao: "Descricao",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, uid))).rejects.toMatchObject({ code: "failed-precondition" });
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

  describe("compartilharRoteiro — negativos", () => {
    it("deve rejeitar compartilhamento por não-dono", async () => {
      const dono = "prof_comp_neg_dono";
      const alvo = "prof_comp_neg_alvo";
      const intruso = "prof_comp_neg_intruso";
      await semearUsuario(dono);
      await semearUsuario(alvo);
      await semearUsuario(intruso);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "roteiro.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Neg",
        descricao: "Descricao",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, dono));

      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await expect(wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, intruso))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("deve rejeitar destinatário inexistente", async () => {
      const dono = "prof_comp_dest_inexistente";
      await semearUsuario(dono);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "roteiro.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Dest Inexistente",
        descricao: "Descricao",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, dono));

      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await expect(wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: "nao_existe",
      }, dono))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("deve rejeitar destinatário inativo", async () => {
      const dono = "prof_comp_dest_inativo_dono";
      const alvo = "prof_comp_dest_inativo_alvo";
      await semearUsuario(dono);
      await semearUsuario(alvo);
      await db.collection("Usuarios").doc(alvo).update({ ativo: false });

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "roteiro.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Dest Inativo",
        descricao: "Descricao",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, dono));

      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await expect(wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, dono))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("deve rejeitar destinatário sem papel de Professor", async () => {
      const dono = "prof_comp_dest_sem_papel_dono";
      const alvo = "prof_comp_dest_sem_papel_alvo";
      await semearUsuario(dono);
      await semearUsuario(alvo, ["Aluno"]);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "roteiro.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Dest Sem Papel",
        descricao: "Descricao",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, dono));

      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await expect(wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, dono))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("deve rejeitar compartilhamento de roteiro não PUBLICAVEL", async () => {
      const dono = "prof_comp_nao_publicavel";
      const alvo = "prof_comp_alvo_publicavel";
      await semearUsuario(dono);
      await semearUsuario(alvo);

      const roteiroRef = db.collection("Roteiro_Experimento").doc();
      await roteiroRef.set({
        id_professor_upload: dono,
        nome: "Roteiro Provisorio",
        descricao: "...",
        nome_arquivo: "prov.pdf",
        referencia: {
          storage_path: "roteiros/x/prov.pdf",
          tamanho_bytes: 1035,
          geracao: "123",
          owner_uid: dono,
          content_type: "application/pdf",
        },
        status: "PROVISORIO",
        professores_compartilhados: [],
      });

      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await expect(wrappedComp(mockRequest({
        idRoteiro: roteiroRef.id,
        uidProfessor: alvo,
      }, dono))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("deve rejeitar compartilhamento duplicado com already-exists", async () => {
      const dono = "prof_comp_dup_dono";
      const alvo = "prof_comp_dup_alvo";
      await semearUsuario(dono);
      await semearUsuario(alvo);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "roteiro.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Dup",
        descricao: "Descricao",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, dono));

      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, dono));

      await expect(wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, dono))).rejects.toMatchObject({ code: "already-exists" });
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

    it("deve rejeitar descompartilhamento por não-dono", async () => {
      const dono = "prof_descomp_neg_dono";
      const alvo = "prof_descomp_neg_alvo";
      const intruso = "prof_descomp_neg_intruso";
      await semearUsuario(dono);
      await semearUsuario(alvo);
      await semearUsuario(intruso);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "roteiro.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Descomp Neg",
        descricao: "Descricao",
        storagePath,
        nomeArquivo: "roteiro.pdf",
      }, dono));

      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, dono));

      const wrappedDescomp = testEnv.wrap(descompartilharRoteiro);
      await expect(wrappedDescomp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, intruso))).rejects.toMatchObject({ code: "permission-denied" });
    });
  });

  describe("listarRoteirosProfessor", () => {
    it("deve listar roteiros do dono e compartilhados com ele, sem duplicatas ou de terceiros", async () => {
      const dono = "prof_lista_dono";
      const alvo = "prof_lista_alvo";
      const terceiro = "prof_lista_terceiro";
      await semearUsuario(dono);
      await semearUsuario(alvo);
      await semearUsuario(terceiro);

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

      const { storagePath: st3 } = await criarArquivoRoteiro(terceiro, "terceiro.pdf");
      const reg3 = await wrappedReg(mockRequest({
        nome: "Roteiro Terceiro",
        descricao: "Z",
        storagePath: st3,
        nomeArquivo: "terceiro.pdf",
      }, terceiro));

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
      expect(idsDono).not.toContain(reg3.idRoteiro);

      const resultAlvo = await wrappedList(mockRequest({}, alvo));
      const idsAlvo = resultAlvo.roteiros.map((r: { id: string }) => r.id);
      expect(idsAlvo).toContain(reg2.idRoteiro);
      expect(idsAlvo).not.toContain(reg1.idRoteiro);
      expect(idsAlvo).not.toContain(reg3.idRoteiro);
      expect(new Set(idsAlvo).size).toBe(idsAlvo.length);

      const resultTerceiro = await wrappedList(mockRequest({}, terceiro));
      const idsTerceiro = resultTerceiro.roteiros.map((r: { id: string }) => r.id);
      expect(idsTerceiro).toContain(reg3.idRoteiro);
      expect(idsTerceiro).not.toContain(reg1.idRoteiro);
      expect(idsTerceiro).not.toContain(reg2.idRoteiro);
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
    it("deve permitir que o dono emite URL com via PROPRIETARIO", async () => {
      const dono = "prof_download_proprietario";
      await semearUsuario(dono, ["Professor"]);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath, geracao } = await criarArquivoRoteiro(dono, "proprietario.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Proprietario",
        descricao: "P",
        storagePath,
        nomeArquivo: "proprietario.pdf",
      }, dono));

      const roteiroSnap = await db.collection("Roteiro_Experimento").doc(resultReg.idRoteiro).get();
      const roteiroData = roteiroSnap.data()!;

      const wrapped = testEnv.wrap(emitirUrlDownloadRoteiro);
      const result = await wrapped(mockRequest({
        idRoteiro: resultReg.idRoteiro,
      }, dono));

      expect(result.id_roteiro).toBe(resultReg.idRoteiro);
      expect(result.via).toBe("PROPRIETARIO");
      expect(result.storage_path).toBe(storagePath);
      expect(result.geracao).toBe(roteiroData.referencia.geracao);
      expect(result.geracao).toBe(geracao);
      expect(typeof result.url).toBe("string");
      expect(result.url.length).toBeGreaterThan(0);
      expect(result.emitida_em).toBeDefined();
      expect(result.expira_em).toBeDefined();
      expect(result.validade).toBe("ATIVA");
    });

    it("deve permitir que professor compartilhado emite URL com via COMPARTILHADO", async () => {
      const dono = "prof_download_comp_dono";
      const alvo = "prof_download_comp_alvo";
      await semearUsuario(dono, ["Professor"]);
      await semearUsuario(alvo, ["Professor"]);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "compartilhado.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Compartilhado",
        descricao: "C",
        storagePath,
        nomeArquivo: "compartilhado.pdf",
      }, dono));

      const wrappedComp = testEnv.wrap(compartilharRoteiro);
      await wrappedComp(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        uidProfessor: alvo,
      }, dono));

      const wrapped = testEnv.wrap(emitirUrlDownloadRoteiro);
      const result = await wrapped(mockRequest({
        idRoteiro: resultReg.idRoteiro,
      }, alvo));

      expect(result.via).toBe("COMPARTILHADO");
      expect(result.id_roteiro).toBe(resultReg.idRoteiro);
      expect(result.geracao).toBeDefined();
      expect(typeof result.url).toBe("string");
    });

    it("deve rejeitar professor não autorizado", async () => {
      const dono = "prof_download_neg_dono";
      const outro = "prof_download_neg_outro";
      await semearUsuario(dono, ["Professor"]);
      await semearUsuario(outro, ["Professor"]);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(dono, "negado.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Negado",
        descricao: "N",
        storagePath,
        nomeArquivo: "negado.pdf",
      }, dono));

      const wrapped = testEnv.wrap(emitirUrlDownloadRoteiro);
      await expect(wrapped(mockRequest({
        idRoteiro: resultReg.idRoteiro,
      }, outro))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("deve permitir que aluno com vínculo e Post anexado emite URL com via ALUNO_POST", async () => {
      const professor = "prof_download_aluno_prof";
      const aluno = "aluno_download";
      const idTurma = "turma_download_aluno";
      await semearUsuario(professor, ["Professor"]);
      await semearUsuario(aluno, ["Aluno"]);
      await semearTurma(idTurma, professor);
      await semearVinculo(idTurma, aluno);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(professor, "aluno.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Aluno",
        descricao: "A",
        storagePath,
        nomeArquivo: "aluno.pdf",
      }, professor));

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma,
        titulo: "Post com Roteiro",
        descricao: "Descricao",
        idRoteiroExperimento: resultReg.idRoteiro,
      }, professor));

      const wrapped = testEnv.wrap(emitirUrlDownloadRoteiro);
      const result = await wrapped(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        idTurma,
        idPost: postResult.id,
      }, aluno, ["Aluno"]));

      expect(result.via).toBe("ALUNO_POST");
      expect(result.id_roteiro).toBe(resultReg.idRoteiro);
      expect(result.geracao).toBeDefined();
      expect(typeof result.url).toBe("string");
    });

    it("deve rejeitar aluno sem vínculo canônico", async () => {
      const professor = "prof_download_aluno_fora_prof";
      const aluno = "aluno_download_fora";
      const outroAluno = "aluno_download_fora_outro";
      const idTurma = "turma_download_fora";
      await semearUsuario(professor, ["Professor"]);
      await semearUsuario(aluno, ["Aluno"]);
      await semearUsuario(outroAluno, ["Aluno"]);
      await semearTurma(idTurma, professor);
      await semearVinculo(idTurma, aluno);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(professor, "fora.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Fora",
        descricao: "F",
        storagePath,
        nomeArquivo: "fora.pdf",
      }, professor));

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma,
        titulo: "Post com Roteiro",
        descricao: "Descricao",
        idRoteiroExperimento: resultReg.idRoteiro,
      }, professor));

      const wrapped = testEnv.wrap(emitirUrlDownloadRoteiro);
      await expect(wrapped(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        idTurma,
        idPost: postResult.id,
      }, outroAluno, ["Aluno"]))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("deve rejeitar aluno quando o Post foi removido da apresentação", async () => {
      const professor = "prof_download_post_removido_prof";
      const aluno = "aluno_download_post_removido";
      const idTurma = "turma_download_post_removido";
      await semearUsuario(professor, ["Professor"]);
      await semearUsuario(aluno, ["Aluno"]);
      await semearTurma(idTurma, professor);
      await semearVinculo(idTurma, aluno);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(professor, "removido.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Removido",
        descricao: "R",
        storagePath,
        nomeArquivo: "removido.pdf",
      }, professor));

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma,
        titulo: "Post com Roteiro",
        descricao: "Descricao",
        idRoteiroExperimento: resultReg.idRoteiro,
      }, professor));

      const wrappedRemover = testEnv.wrap(removerPost);
      await wrappedRemover(mockRequest({
        idOperacao: novaOperacao(),
        idTurma,
        idPost: postResult.id,
        motivo: "Remover para teste",
      }, professor));

      const wrapped = testEnv.wrap(emitirUrlDownloadRoteiro);
      await expect(wrapped(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        idTurma,
        idPost: postResult.id,
      }, aluno, ["Aluno"]))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("deve rejeitar aluno quando o snapshot do anexo diverge da referência canônica", async () => {
      const professor = "prof_download_divergente_prof";
      const aluno = "aluno_download_divergente";
      const idTurma = "turma_download_divergente";
      await semearUsuario(professor, ["Professor"]);
      await semearUsuario(aluno, ["Aluno"]);
      await semearTurma(idTurma, professor);
      await semearVinculo(idTurma, aluno);

      const wrappedReg = testEnv.wrap(registrarRoteiro);
      const { storagePath } = await criarArquivoRoteiro(professor, "divergente.pdf");
      const resultReg = await wrappedReg(mockRequest({
        nome: "Roteiro Divergente",
        descricao: "D",
        storagePath,
        nomeArquivo: "divergente.pdf",
      }, professor));

      const wrappedCriar = testEnv.wrap(criarPost);
      const postResult = await wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma,
        titulo: "Post com Roteiro",
        descricao: "Descricao",
        idRoteiroExperimento: resultReg.idRoteiro,
      }, professor));

      await db.collection("Turma").doc(idTurma).collection("Posts").doc(postResult.id).update({
        "roteiro_anexo.geracao": "999999999999999",
      });

      const wrapped = testEnv.wrap(emitirUrlDownloadRoteiro);
      await expect(wrapped(mockRequest({
        idRoteiro: resultReg.idRoteiro,
        idTurma,
        idPost: postResult.id,
      }, aluno, ["Aluno"]))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("deve rejeitar emissão quando o roteiro não está PUBLICAVEL", async () => {
      const dono = "prof_download_nao_publicavel";
      await semearUsuario(dono, ["Professor"]);

      const roteiroRef = db.collection("Roteiro_Experimento").doc();
      await roteiroRef.set({
        id_professor_upload: dono,
        nome: "Roteiro Nao Publicavel",
        descricao: "...",
        nome_arquivo: "nao_publicavel.pdf",
        referencia: {
          storage_path: "roteiros/x/nao_publicavel.pdf",
          tamanho_bytes: 1035,
          geracao: "123",
          owner_uid: dono,
          content_type: "application/pdf",
        },
        status: "PROVISORIO",
        professores_compartilhados: [],
      });

      const wrapped = testEnv.wrap(emitirUrlDownloadRoteiro);
      await expect(wrapped(mockRequest({
        idRoteiro: roteiroRef.id,
      }, dono))).rejects.toMatchObject({ code: "failed-precondition" });
    });

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

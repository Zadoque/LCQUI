import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import PDFDocument from "pdfkit-table";
import { validarPermissao, validarGestorDoAlmoxarifado } from "./auth";

async function buildPdfBuffer(doc: any, docs: admin.firestore.QueryDocumentSnapshot[], totalConsumo: number): Promise<Buffer> {
  return new Promise((resolve) => {
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.text(`Total consumido: ${totalConsumo}`);
    doc.text(`Registros: ${docs.length}`);
    doc.end();
  });
}

async function buildPredioPdfBuffer(doc: any, docs: admin.firestore.QueryDocumentSnapshot[], filtros: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.text(`Prédio: ${filtros.predio}`);
    doc.text(`Bens encontrados: ${docs.length}`);
    doc.end();
  });
}

async function buildPersonalizadoPdfBuffer(doc: any, docs: admin.firestore.QueryDocumentSnapshot[], entidade: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.text(`Relatório Personalizado: ${entidade}`);
    doc.text(`Registros encontrados: ${docs.length}`);
    doc.end();
  });
}

interface FiltrosAlmoxarifado {
  idAlmoxarifado: string;
  mes: number;
  ano: number;
}

export const gerarRelatorioAlmoxarifado = onCall(async (request) => {
  const { idAlmoxarifado, mes, ano } = request.data as FiltrosAlmoxarifado;
  validarPermissao(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
  await validarGestorDoAlmoxarifado(request.auth!.uid, request.auth!.token, idAlmoxarifado);

  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 0);

  const devolucoesSnapshot = await admin.firestore().collection("Emprestimo_Reagente")
    .where("id_almoxarifado", "==", idAlmoxarifado)
    .where("data_devolucao_efetuada", ">=", dataInicio)
    .where("data_devolucao_efetuada", "<=", dataFim)
    .get();

  const volumeTotalConsumido = devolucoesSnapshot.docs.reduce(
    (acc, doc) => acc + (doc.data().medida_utilizada || 0), 0
  );

  const historicoSnapshot = await admin.firestore().collection("Historico_Frasco_Reagente")
    .where("id_almoxarifado", "==", idAlmoxarifado)
    .where("timestamp", ">=", dataInicio)
    .where("timestamp", "<=", dataFim)
    .orderBy("timestamp", "asc").get();

  const doc = new PDFDocument({ margin: 30, size: "A4" });
  const buffer = await buildPdfBuffer(doc, historicoSnapshot.docs, volumeTotalConsumido);

  const fileName = `relatorios/almoxarifado_${idAlmoxarifado}_${mes}_${ano}_${Date.now()}.pdf`;
  const fileRef = admin.storage().bucket().file(fileName);
  await fileRef.save(buffer, { contentType: "application/pdf" });

  const [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
  return { url };
});

interface FiltrosPredio {
  predio: string;
  mes: number;
  ano: number;
  andar?: string;
  sala?: string;
  estadoConservacao?: string;
  status?: string;
}

export const gerarRelatorioBensPredio = onCall(async (request) => {
  const filtros = request.data as FiltrosPredio;
  validarPermissao(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais"]);

  let query: admin.firestore.Query = admin.firestore().collection("Bem_Patrimonial").where("predio", "==", filtros.predio);
  if (filtros.andar) query = query.where("andar", "==", filtros.andar);
  if (filtros.sala) query = query.where("sala", "==", filtros.sala);
  if (filtros.estadoConservacao) query = query.where("estado_conservacao", "==", filtros.estadoConservacao);
  if (filtros.status) query = query.where("status", "==", filtros.status);

  const bensSnapshot = await query.get();

  const doc = new PDFDocument({ size: "A4" });
  const buffer = await buildPredioPdfBuffer(doc, bensSnapshot.docs, filtros);

  const fileRef = admin.storage().bucket().file(`relatorios/predio_${filtros.predio}_${Date.now()}.pdf`);
  await fileRef.save(buffer, { contentType: "application/pdf" });

  const [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
  return { url };
});

interface FiltrosGeralEPersonalizado {
  dataInicio: string;
  dataFim: string;
  entidade: "Bens_Patrimoniais" | "Reagentes";
  prediosSelecionados?: string[];
}

export const gerarRelatorioPersonalizado = onCall(async (request) => {
  const { dataInicio, dataFim, entidade, prediosSelecionados } = request.data as FiltrosGeralEPersonalizado;
  validarPermissao(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Gestor_Almoxarifado"]);

  const dataIniObj = new Date(dataInicio);
  const dataFimObj = new Date(dataFim);
  let snapshot;

  if (entidade === "Bens_Patrimoniais") {
    let query: admin.firestore.Query = admin.firestore().collection("Historico_Bem_Patrimonial")
      .where("timestamp", ">=", dataIniObj)
      .where("timestamp", "<=", dataFimObj);
    if (prediosSelecionados && prediosSelecionados.length > 0) {
      query = query.where("predio", "in", prediosSelecionados);
    }
    snapshot = await query.get();
  } else {
    snapshot = await admin.firestore().collection("Emprestimo_Reagente")
      .where("data_devolucao_efetuada", ">=", dataIniObj)
      .where("data_devolucao_efetuada", "<=", dataFimObj)
      .get();
  }

  const doc = new PDFDocument({ layout: "landscape", size: "A4" });
  const buffer = await buildPersonalizadoPdfBuffer(doc, snapshot.docs, entidade);

  const fileRef = admin.storage().bucket().file(`relatorios/personalizado_${Date.now()}.pdf`);
  await fileRef.save(buffer, { contentType: "application/pdf" });
  const [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
  return { url };
});

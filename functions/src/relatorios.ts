import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import PDFDocument from "pdfkit-table";
import { createHash } from "crypto";
import { validarGestorDoAlmoxarifado, validarAutoridadePersistida } from "./auth";
import { addHeader } from "./relatorios/pdfHeader";
import { addFooterAndHash } from "./relatorios/pdfFooter";
import { chunkArray } from "./utils/chunk";
import { FONTS } from "./relatorios/pdfStyles";
import * as bwipjs from "bwip-js";
import { validatePayload } from "./utils/validation";
import {
  COLECAO_OPERACOES,
  validarIdOperacao,
  construirIdentidade,
} from "./idempotencia";
import { 
  FiltrosAlmoxarifadoSchema, 
  FiltrosPredioSchema, 
  FiltrosGeralEPersonalizadoSchema, 
  DadosEtiquetasVirgensSchema, 
  DadosReimpressaoSchema 
} from "./schemas/relatorios.schema";
import type {
  DocumentoPdf,
  EventoHistoricoRelatorio,
  FrascoFichaRelatorio,
  RegistroFirestore,
} from "./types/relatorios";

// -------------------------------------------------------------
// LIMITES E RATE LIMITING (IMP-REP-003)
// -------------------------------------------------------------
const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB máximo

export async function verificarRateLimitRelatorios(uid: string): Promise<void> {
  const db = admin.firestore();
  const ref = db.collection("Sistema_Rate_Limit_Relatorios").doc(uid);
  const agora = Date.now();
  const janelaMs = 60_000;
  const limite = 10; // Máximo 10 relatórios por minuto por UID

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const requisicoes: number[] = doc.exists ? (doc.data()?.requisicoes ?? []) : [];
    const validas = requisicoes.filter((ts) => agora - ts < janelaMs);
    if (validas.length >= limite) {
      throw new HttpsError(
        "resource-exhausted",
        "Limite de requisições de relatórios excedido (máximo 10/min). Aguarde antes de tentar novamente."
      );
    }
    validas.push(agora);
    tx.set(ref, { requisicoes: validas, ultimo_acesso: agora });
  });
}

function validarTamanhoPdf(buffer: Buffer): void {
  if (buffer.length > MAX_PDF_BYTES) {
    throw new HttpsError(
      "resource-exhausted",
      `O relatório gerado excedeu o limite máximo de 10MB (${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`
    );
  }
}

function gerarHashCanonico(partes: string[]): string {
  return createHash("sha256").update(partes.join("|")).digest("hex");
}

async function buildPdfBuffer(doc: DocumentoPdf, builderCallback: (doc: DocumentoPdf) => Promise<void> | void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);
    
    try {
      const result = builderCallback(doc);
      if (result instanceof Promise) {
        result.then(() => doc.end()).catch((err: unknown) => reject(err));
      } else {
        doc.end();
      }
    } catch (e) {
      reject(e);
    }
  });
}

// -------------------------------------------------------------
// RELATÓRIOS ALMOXARIFADO (IMP-REP-001)
// -------------------------------------------------------------
export const gerarRelatorioAlmoxarifado = onCall(async (request) => {
  const { idAlmoxarifado, mes, ano, idOperacao } = validatePayload(FiltrosAlmoxarifadoSchema, request.data);
  
  const hoje = new Date();
  if (ano > hoje.getFullYear()) {
    throw new HttpsError("invalid-argument", "O ano do relatório não pode ser no futuro.");
  }
  if (ano === hoje.getFullYear() && mes > hoje.getMonth() + 1) {
    throw new HttpsError("invalid-argument", "O mês do relatório não pode ser no futuro.");
  }

  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  // 1. Rate Limit & M9 Authority
  await verificarRateLimitRelatorios(uid);
  await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
  await validarGestorDoAlmoxarifado(uid, request.auth!.token, idAlmoxarifado);

  // 2. M7 Idempotência (se idOperacao fornecido)
  const db = admin.firestore();
  if (idOperacao) {
    validarIdOperacao(idOperacao);
    const identidade = construirIdentidade(uid, "RELATORIO_ALMOXARIFADO", { idAlmoxarifado, mes, ano });
    const opSnap = await db.collection(COLECAO_OPERACOES).doc(idOperacao).get();
    if (opSnap.exists) {
      const op = opSnap.data()!;
      if (op.status === "CONCLUIDA" && op.uid === uid && op.tipo_operacao === identidade.tipoOperacao && op.payload_hash === identidade.payloadHash) {
        return op.resultado;
      }
      if (op.uid !== uid || op.tipo_operacao !== identidade.tipoOperacao || op.payload_hash !== identidade.payloadHash) {
        throw new HttpsError("already-exists", "idOperacao reutilizado com identidade incompatível.");
      }
    }
  }

  // 3. Obter metadados do almoxarifado
  const almoxSnap = await db.collection("Almoxarifado").doc(idAlmoxarifado).get();
  const almox = almoxSnap.data();
  const nomeAlmox = almox ? `${almox.nome_almoxarifado} (Prédio ${almox.predio}, Sala ${almox.sala})` : `Almoxarifado ID: ${idAlmoxarifado}`;

  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 0);
  dataFim.setHours(23, 59, 59, 999);

  const mesStr = mes.toString().padStart(2, "0");
  const dataInicioIso = `${ano}-${mesStr}-01`;
  const ultimoDiaNum = dataFim.getDate();
  const dataFimIso = `${ano}-${mesStr}-${ultimoDiaNum.toString().padStart(2, "0")}`;

  // 4. Buscar materializações diárias consolidadas (Resumo_Almoxarifado_Diario) para prevenir N+1
  const resumosSnap = await db.collection("Resumo_Almoxarifado_Diario")
    .where("id_almoxarifado", "==", idAlmoxarifado)
    .where("data_alvo", ">=", dataInicioIso)
    .where("data_alvo", "<=", dataFimIso)
    .get();

  const diasMaterializados = new Set<string>();
  let consumoMassaG = 0;
  let consumoVolumeMl = 0;
  for (const doc of resumosSnap.docs) {
    const data = doc.data();
    diasMaterializados.add(data.data_alvo);
    consumoMassaG += (data.massa_utilizada_g || 0);
    consumoVolumeMl += (data.volume_utilizado_ml || 0);
  }

  // 5. Buscar dados operacionais detalhados no período (para listagem e dias não consolidados)
  const [devolucoesSnap, historicoSnap] = await Promise.all([
    db.collection("Emprestimo_Reagente")
      .where("id_almoxarifado", "==", idAlmoxarifado)
      .where("data_devolucao_efetuada", ">=", dataInicio)
      .where("data_devolucao_efetuada", "<=", dataFim)
      .get(),
      
    db.collection("Historico_Frasco_Reagente")
      .where("id_almoxarifado", "==", idAlmoxarifado)
      .where("timestamp", ">=", dataInicio)
      .where("timestamp", "<=", dataFim)
      .orderBy("timestamp", "asc")
      .get()
  ]);

  const devolucoes = devolucoesSnap.docs.map(d => ({ id: d.id, ...d.data() } as RegistroFirestore));
  const historicos = historicoSnap.docs.map(d => ({ id: d.id, ...d.data() } as RegistroFirestore));

  // Se não houver materializações suficientes (ex: dias correntes ou dados anteriores ao job),
  // complementar os totais a partir dos fatos crus
  if (diasMaterializados.size === 0) {
    devolucoes.forEach(d => {
      if (d.unidade_medida_utilizada === "g") consumoMassaG += (d.medida_utilizada || 0);
      else if (d.unidade_medida_utilizada === "ml") consumoVolumeMl += (d.medida_utilizada || 0);
      else if (d.unidade_medida_utilizada === "L") consumoVolumeMl += ((d.medida_utilizada || 0) * 1000);
    });
  }

  // Resolução de Entidades Otimizada (Prevenção de N+1)
  const frascoIds = new Set<string>();
  devolucoes.forEach(d => { if (d.id_frasco_reagente) frascoIds.add(d.id_frasco_reagente); });
  historicos.forEach(h => { if (h.id_frasco_reagente) frascoIds.add(h.id_frasco_reagente); });

  const frascosMap = new Map<string, RegistroFirestore>();
  if (frascoIds.size > 0) {
    const frascoRefs = Array.from(frascoIds).map(id => db.collection("Frasco_Reagente").doc(id));
    const frascoChunks = chunkArray(frascoRefs, 200);
    const frascoSnapsNested = await Promise.all(frascoChunks.map(chunk => db.getAll(...chunk)));
    const frascoSnaps = frascoSnapsNested.flat();
    frascoSnaps.forEach(snap => { if (snap.exists) frascosMap.set(snap.id, snap.data() ?? {}); });
  }

  const especIds = new Set<string>();
  frascosMap.forEach(f => {
    if (f.id_especificacao_reagente) especIds.add(f.id_especificacao_reagente);
  });

  const especMap = new Map<string, RegistroFirestore>();
  if (especIds.size > 0) {
    const especRefs = Array.from(especIds).map(id => db.collection("Especificacao_Reagente").doc(id));
    const especChunks = chunkArray(especRefs, 200);
    const especSnapsNested = await Promise.all(especChunks.map(chunk => db.getAll(...chunk)));
    const especSnaps = especSnapsNested.flat();
    especSnaps.forEach(snap => { if (snap.exists) especMap.set(snap.id, snap.data() ?? {}); });
  }

  const ocorrenciasCriticas = historicos.filter(h => 
    ["QUEBROU", "FOI_DESCARTADO", "ENTROU_EM_QUARENTENA", "VENCEU", "EXTRAVIO"].includes(h.tipo)
  );

  const movimentacoesControladas: Array<{ h: RegistroFirestore; frasco: RegistroFirestore; espec: RegistroFirestore }> = [];
  historicos.forEach(h => {
    const frasco = frascosMap.get(h.id_frasco_reagente);
    if (frasco && frasco.id_especificacao_reagente) {
      const espec = especMap.get(frasco.id_especificacao_reagente);
      if (espec && (espec.eh_controlado_pf || espec.eh_controlado_eb)) {
        movimentacoesControladas.push({ h, frasco, espec });
      }
    }
  });

  // 6. Hash Canônico Determinístico (Sem Date.now())
  const canonicalParts = [
    idAlmoxarifado,
    ano.toString(),
    mes.toString(),
    consumoMassaG.toFixed(3),
    consumoVolumeMl.toFixed(3),
    ocorrenciasCriticas.length.toString(),
    Array.from(frascoIds).sort().join(",")
  ];
  const canonicalString = canonicalParts.join("|");
  const canonicalHash = gerarHashCanonico(canonicalParts);

  // 7. Gerar PDF
  const doc = new PDFDocument({ bufferPages: true, margin: 30, size: "A4" });
  
  const buffer = await buildPdfBuffer(doc, async (d) => {
    addHeader(d, "Relatório Mensal de Movimentação e Estoque", `${nomeAlmox}\nPeríodo de Referência: 01/${mesStr}/${ano} a ${ultimoDiaNum}/${mesStr}/${ano}`);

    // Quadro Resumo
    d.font(FONTS.bold).fontSize(12).text("1. QUADRO RESUMO DE BALANÇO DE MASSA E VOLUME");
    d.font(FONTS.regular).fontSize(10);
    d.text(`Consumo Sólidos no Período (Massa): ${consumoMassaG.toFixed(3)} g`);
    d.text(`Consumo Líquidos no Período (Volume): ${consumoVolumeMl.toFixed(3)} ml`);
    d.moveDown();

    // Histórico Operacional
    d.font(FONTS.bold).fontSize(12).text("2. REGISTRO DE MOVIMENTAÇÕES NO PERÍODO");
    d.font(FONTS.regular).fontSize(10).moveDown(0.5);
    
    if (historicos.length > 0) {
      const tableArray = {
        headers: ["Data", "Código", "Ação", "Gestor", "Variação/Ajuste"],
        rows: historicos.map(h => {
          const frasco = frascosMap.get(h.id_frasco_reagente);
          const codigo = frasco ? frasco.codigo_frasco : "Desconhecido";
          const dataStr = h.timestamp?.toDate ? h.timestamp.toDate().toLocaleDateString("pt-BR") : "-";
          const val = h.medida_ajustada != null ? `${h.medida_ajustada} ${h.unidade_medida_ajustada || "g"}` : "-";
          return [dataStr, codigo, h.tipo, h.id_gestor || "-", val];
        }),
      };
      await d.table(tableArray, { width: 535 });
    } else {
      d.text("Nenhuma movimentação registrada no período.");
    }
    d.moveDown();

    // Substâncias Controladas
    d.font(FONTS.bold).fontSize(12).text("3. SESSÃO DE REAGENTES CONTROLADOS (POLÍCIA FEDERAL / EXÉRCITO)");
    d.font(FONTS.regular).fontSize(10).moveDown(0.5);
    
    if (movimentacoesControladas.length > 0) {
      const tableArray = {
        headers: ["Data", "Reagente", "Especificação", "Ação", "Orgão"],
        rows: movimentacoesControladas.map(m => {
          const dataStr = m.h.timestamp?.toDate ? m.h.timestamp.toDate().toLocaleDateString("pt-BR") : "-";
          const orgao = m.espec.eh_controlado_pf && m.espec.eh_controlado_eb ? "PF, EB" 
            : m.espec.eh_controlado_pf ? "PF" : "EB";
          return [dataStr, m.frasco.codigo_frasco, m.espec.descricao || "N/A", m.h.tipo, orgao];
        }),
      };
      await d.table(tableArray, { width: 535 });
    } else {
      d.text("Nenhuma substância controlada movimentada no período.");
    }
    d.moveDown();

    // Ocorrências Críticas
    d.font(FONTS.bold).fontSize(12).text("4. INCORPORAÇÕES, PERDAS E OCORRÊNCIAS");
    d.font(FONTS.regular).fontSize(10).moveDown(0.5);
    if (ocorrenciasCriticas.length > 0) {
      const tableArray = {
        headers: ["Data", "Código", "Ocorrência"],
        rows: ocorrenciasCriticas.map(h => {
          const frasco = frascosMap.get(h.id_frasco_reagente);
          const codigo = frasco ? frasco.codigo_frasco : "Desconhecido";
          const dataStr = h.timestamp?.toDate ? h.timestamp.toDate().toLocaleDateString("pt-BR") : "-";
          return [dataStr, codigo, h.tipo];
        }),
      };
      await d.table(tableArray, { width: 535 });
    } else {
      d.text("Nenhuma quebra, descarte ou quarentena registrada no período.");
    }
    
    addFooterAndHash(d, canonicalString);
  });

  validarTamanhoPdf(buffer);

  const resultado = {
    base64: buffer.toString("base64"),
    hash: canonicalHash,
    tamanhoBytes: buffer.length,
    consumoMassaG,
    consumoVolumeMl,
    totalMovimentacoes: historicos.length,
  };

  if (idOperacao) {
    const identidade = construirIdentidade(uid, "RELATORIO_ALMOXARIFADO", { idAlmoxarifado, mes, ano });
    await db.collection(COLECAO_OPERACOES).doc(idOperacao).set({
      uid,
      tipo_operacao: identidade.tipoOperacao,
      payload_hash: identidade.payloadHash,
      status: "CONCLUIDA",
      resultado,
      criado_em: FieldValue.serverTimestamp(),
      atualizado_em: FieldValue.serverTimestamp(),
    });
  }

  return resultado;
});

// -------------------------------------------------------------
// RELATÓRIOS BENS PATRIMONIAIS (IMP-REP-002)
// -------------------------------------------------------------
export const gerarRelatorioBensPredio = onCall(async (request) => {
  const filtros = validatePayload(FiltrosPredioSchema, request.data);
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  await verificarRateLimitRelatorios(uid);
  await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais"]);

  const db = admin.firestore();
  if (filtros.idOperacao) {
    validarIdOperacao(filtros.idOperacao);
    const identidade = construirIdentidade(uid, "RELATORIO_BENS_PREDIO", {
      predio: filtros.predio,
      andar: filtros.andar,
      sala: filtros.sala,
      estadoConservacao: filtros.estadoConservacao,
      status: filtros.status,
    });
    const opSnap = await db.collection(COLECAO_OPERACOES).doc(filtros.idOperacao).get();
    if (opSnap.exists) {
      const op = opSnap.data()!;
      if (op.status === "CONCLUIDA" && op.uid === uid && op.tipo_operacao === identidade.tipoOperacao && op.payload_hash === identidade.payloadHash) {
        return op.resultado;
      }
      if (op.uid !== uid || op.tipo_operacao !== identidade.tipoOperacao || op.payload_hash !== identidade.payloadHash) {
        throw new HttpsError("already-exists", "idOperacao reutilizado com identidade incompatível.");
      }
    }
  }

  let query: admin.firestore.Query = db.collection("Bem_Patrimonial");
  if (filtros.predio) query = query.where("predio", "==", filtros.predio);
  if (filtros.andar) query = query.where("andar", "==", filtros.andar);
  if (filtros.sala) query = query.where("sala", "==", filtros.sala);
  if (filtros.estadoConservacao) query = query.where("estado_conservacao", "==", filtros.estadoConservacao);
  if (filtros.status) query = query.where("status", "==", filtros.status);

  const bensSnapshot = await query.get();
  const bens = bensSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistroFirestore));

  // Hash Canônico Determinístico
  const canonicalParts = [
    filtros.predio || "ALL",
    filtros.andar || "ALL",
    filtros.sala || "ALL",
    filtros.status || "ALL",
    filtros.estadoConservacao || "ALL",
    bens.map(b => b.id).sort().join(",")
  ];
  const canonicalString = canonicalParts.join("|");
  const canonicalHash = gerarHashCanonico(canonicalParts);

  const doc = new PDFDocument({ bufferPages: true, size: "A4", layout: "landscape", margin: 30 });
  
  const buffer = await buildPdfBuffer(doc, async (d) => {
    let subtitulo = "";
    if (filtros.predio) subtitulo += `Prédio: ${filtros.predio} `;
    if (filtros.andar) subtitulo += `| Andar: ${filtros.andar} `;
    if (filtros.sala) subtitulo += `| Sala: ${filtros.sala} `;
    if (filtros.status) subtitulo += `| Status: ${filtros.status} `;
    if (filtros.estadoConservacao) subtitulo += `| Conservação: ${filtros.estadoConservacao}`;
    
    addHeader(d, "Relatório de Bens Patrimoniais", subtitulo);

    if (bens.length > 0) {
      const tableArray = {
        title: "Bens Encontrados",
        headers: ["Patrimônio", "Equipamento", "Prédio", "Sala", "Status", "Conservação", "Responsável (SEI)"],
        rows: bens.map(b => [
          b.numero_patrimonio,
          b.nome_equipamento,
          b.predio || "-",
          b.sala || "-",
          b.status || "-",
          b.estado_conservacao || "-",
          b.nome_responsavel_sei || "-"
        ]),
      };
      await d.table(tableArray, { width: 750 });
    } else {
      d.text("Nenhum bem patrimonial encontrado com os filtros selecionados.");
    }
    
    addFooterAndHash(d, canonicalString);
  });

  validarTamanhoPdf(buffer);

  const resultado = {
    base64: buffer.toString("base64"),
    hash: canonicalHash,
    tamanhoBytes: buffer.length,
    totalBens: bens.length,
  };

  if (filtros.idOperacao) {
    const identidade = construirIdentidade(uid, "RELATORIO_BENS_PREDIO", {
      predio: filtros.predio,
      andar: filtros.andar,
      sala: filtros.sala,
      estadoConservacao: filtros.estadoConservacao,
      status: filtros.status,
    });
    await db.collection(COLECAO_OPERACOES).doc(filtros.idOperacao).set({
      uid,
      tipo_operacao: identidade.tipoOperacao,
      payload_hash: identidade.payloadHash,
      status: "CONCLUIDA",
      resultado,
      criado_em: FieldValue.serverTimestamp(),
      atualizado_em: FieldValue.serverTimestamp(),
    });
  }

  return resultado;
});

// -------------------------------------------------------------
// RELATÓRIO GERAL E PERSONALIZADO (IMP-REP-001/002)
// -------------------------------------------------------------
export const gerarRelatorioPersonalizado = onCall(async (request) => {
  const { dataInicio, dataFim, entidade, idOperacao } = validatePayload(FiltrosGeralEPersonalizadoSchema, request.data);
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const dataIniObj = new Date(dataInicio);
  const dataFimObj = new Date(dataFim);
  dataFimObj.setHours(23, 59, 59, 999);
  
  const hoje = new Date();
  if (dataIniObj > hoje) throw new HttpsError("invalid-argument", "A data inicial não pode ser no futuro.");
  if (dataFimObj > hoje) throw new HttpsError("invalid-argument", "A data final não pode ser no futuro.");
  if (dataIniObj > dataFimObj) throw new HttpsError("invalid-argument", "A data inicial não pode ser maior que a data final.");
  
  const diffTime = Math.abs(dataFimObj.getTime() - dataIniObj.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  if (diffDays > 31) {
    throw new HttpsError("invalid-argument", "O período selecionado permite no máximo 31 dias corridos.");
  }

  await verificarRateLimitRelatorios(uid);
  await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Gestor_Almoxarifado"]);

  const db = admin.firestore();
  if (idOperacao) {
    validarIdOperacao(idOperacao);
    const identidade = construirIdentidade(uid, "RELATORIO_PERSONALIZADO", { dataInicio, dataFim, entidade });
    const opSnap = await db.collection(COLECAO_OPERACOES).doc(idOperacao).get();
    if (opSnap.exists) {
      const op = opSnap.data()!;
      if (op.status === "CONCLUIDA" && op.uid === uid && op.tipo_operacao === identidade.tipoOperacao && op.payload_hash === identidade.payloadHash) {
        return op.resultado;
      }
      if (op.uid !== uid || op.tipo_operacao !== identidade.tipoOperacao || op.payload_hash !== identidade.payloadHash) {
        throw new HttpsError("already-exists", "idOperacao reutilizado com identidade incompatível.");
      }
    }
  }

  const doc = new PDFDocument({ bufferPages: true, layout: "landscape", size: "A4", margin: 30 });
  let canonicalString = "";
  let canonicalHash = "";
  let totalRegistros = 0;
  
  const buffer = await buildPdfBuffer(doc, async (d) => {
    addHeader(d, `Relatório Personalizado: ${entidade.replace("_", " ")}`, `Período: ${dataIniObj.toLocaleDateString("pt-BR")} até ${dataFimObj.toLocaleDateString("pt-BR")}`);

    if (entidade === "Bens_Patrimoniais") {
      const snapshot = await db.collectionGroup("Historico_Patrimonio")
        .where("timestamp", ">=", dataIniObj)
        .where("timestamp", "<=", dataFimObj)
        .get();
        
      const registros = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as RegistroFirestore));
      totalRegistros = registros.length;
      const canonicalParts = [entidade, dataInicio, dataFim, registros.map(r => r.id).sort().join(",")];
      canonicalString = canonicalParts.join("|");
      canonicalHash = gerarHashCanonico(canonicalParts);

      if (registros.length > 0) {
        const tableArray = {
          title: "Histórico de Patrimônio no Período",
          headers: ["Data", "Tipo de Ação", "Usuário ID"],
          rows: registros.map(r => [
            r.timestamp?.toDate ? r.timestamp.toDate().toLocaleDateString("pt-BR") : "-",
            r.tipo,
            r.id_usuario || "-"
          ]),
        };
        await d.table(tableArray, { width: 700 });
      } else {
        d.text("Nenhum histórico encontrado no período.");
      }

    } else {
      // Reagentes - Devoluções
      const snapshot = await db.collection("Emprestimo_Reagente")
        .where("data_devolucao_efetuada", ">=", dataIniObj)
        .where("data_devolucao_efetuada", "<=", dataFimObj)
        .get();
        
      const registros = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as RegistroFirestore));
      totalRegistros = registros.length;
      const canonicalParts = [entidade, dataInicio, dataFim, registros.map(r => r.id).sort().join(",")];
      canonicalString = canonicalParts.join("|");
      canonicalHash = gerarHashCanonico(canonicalParts);

      if (registros.length > 0) {
        const tableArray = {
          title: "Empréstimos Concluídos no Período",
          headers: ["Data Devolução", "Retirante", "Consumo Lançado", "Finalidade", "Status"],
          rows: registros.map(r => [
            r.data_devolucao_efetuada?.toDate ? r.data_devolucao_efetuada.toDate().toLocaleDateString("pt-BR") : "-",
            r.id_usuario_retirou || "-",
            `${r.medida_utilizada || 0} ${r.unidade_medida_utilizada || "g"}`,
            r.finalidade_uso || "-",
            r.status || "-"
          ]),
        };
        await d.table(tableArray, { width: 750 });
      } else {
        d.text("Nenhuma devolução de reagente registrada no período.");
      }
    }
    
    addFooterAndHash(d, canonicalString);
  });

  validarTamanhoPdf(buffer);

  const resultado = {
    base64: buffer.toString("base64"),
    hash: canonicalHash,
    tamanhoBytes: buffer.length,
    totalRegistros,
  };

  if (idOperacao) {
    const identidade = construirIdentidade(uid, "RELATORIO_PERSONALIZADO", { dataInicio, dataFim, entidade });
    await db.collection(COLECAO_OPERACOES).doc(idOperacao).set({
      uid,
      tipo_operacao: identidade.tipoOperacao,
      payload_hash: identidade.payloadHash,
      status: "CONCLUIDA",
      resultado,
      criado_em: FieldValue.serverTimestamp(),
      atualizado_em: FieldValue.serverTimestamp(),
    });
  }

  return resultado;
});

// ============================================================================
// GERAÇÃO DE ETIQUETAS VIRGENS (NOVOS FRASCOS) - ABA 1 (IMP-LABEL-001)
// ============================================================================
const mmToPt = (mm: number) => mm * 2.83465;

const GRID_A4_VIRGEM = {
  cols: 3,
  rows: 10,
  labelWidth: mmToPt(65.0),
  labelHeight: mmToPt(26.5),
  marginLeft: mmToPt(7.5),
  marginTop: mmToPt(16.0),
};

async function gerarBufferBarcode(texto: string) {
  return await bwipjs.toBuffer({
    bcid: "code128",
    text: texto,
    scale: 2,
    height: 8.0,
    includetext: false,
    textxalign: "center",
  });
}

async function renderBarcodesGrid(doc: DocumentoPdf, codigos: string[], startRow: number, startCol: number) {
  let slotAtual = (startRow - 1) * GRID_A4_VIRGEM.cols + (startCol - 1);

  for (const codigo of codigos) {
    if (slotAtual >= GRID_A4_VIRGEM.cols * GRID_A4_VIRGEM.rows) {
      doc.addPage({ size: "A4", margin: 0 });
      slotAtual = 0;
    }

    const r = Math.floor(slotAtual / GRID_A4_VIRGEM.cols);
    const c = slotAtual % GRID_A4_VIRGEM.cols;

    const x = GRID_A4_VIRGEM.marginLeft + c * GRID_A4_VIRGEM.labelWidth;
    const y = GRID_A4_VIRGEM.marginTop + r * GRID_A4_VIRGEM.labelHeight;

    // Linha guia de corte
    doc
      .rect(x, y, GRID_A4_VIRGEM.labelWidth, GRID_A4_VIRGEM.labelHeight)
      .lineWidth(0.4)
      .strokeColor("#D5D5D5")
      .stroke();

    const paddingX = mmToPt(2.5);
    const paddingY = mmToPt(2.0);
    const printableWidth = GRID_A4_VIRGEM.labelWidth - paddingX * 2;

    // Código e Data manual
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#000000");
    doc.text(codigo, x + paddingX, y + paddingY, {
      width: printableWidth * 0.50,
      align: "left",
      lineBreak: false,
    });

    const larguraData = mmToPt(24);
    const xData = x + GRID_A4_VIRGEM.labelWidth - paddingX - larguraData;
    doc.font("Helvetica").fontSize(6.5).fillColor("#444444");
    doc.text("Cad: ___/___/___", xData, y + paddingY + 1.8, {
      width: larguraData,
      align: "right",
      lineBreak: false,
    });

    // Rótulo Reagente e linha de escrita manual
    const yReagente = y + paddingY + 12;
    doc.font("Helvetica-Bold").fontSize(7.0).fillColor("#333333");
    doc.text("Reagente:", x + paddingX, yReagente, {
      lineBreak: false,
    });

    const xInicioLinha = x + paddingX + mmToPt(14);
    const xFimLinha = x + GRID_A4_VIRGEM.labelWidth - paddingX;
    doc
      .moveTo(xInicioLinha, yReagente + 7.5)
      .lineTo(xFimLinha, yReagente + 7.5)
      .lineWidth(0.5)
      .strokeColor("#AAAAAA")
      .stroke();

    // Código de Barras Code 128
    const barcodeBuffer = await gerarBufferBarcode(codigo);
    const barcodeWidth = mmToPt(42);
    const barcodeHeight = mmToPt(7.5);
    const barcodeX = x + (GRID_A4_VIRGEM.labelWidth - barcodeWidth) / 2;
    const barcodeY = y + GRID_A4_VIRGEM.labelHeight - barcodeHeight - paddingY;

    doc.image(barcodeBuffer, barcodeX, barcodeY, {
      width: barcodeWidth,
      height: barcodeHeight,
    });

    slotAtual++;
  }
}

export const gerarPdfEtiquetasVirgens = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  await verificarRateLimitRelatorios(uid);
  await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
  const dados = validatePayload(DadosEtiquetasVirgensSchema, request.data);

  if (dados.idAlmoxarifado) {
    await validarGestorDoAlmoxarifado(uid, request.auth!.token, dados.idAlmoxarifado);
  }

  const total = dados.codigoFinal - dados.codigoInicial + 1;
  if (total <= 0 || total > 50) {
    throw new HttpsError("invalid-argument", "O lote deve conter entre 1 e 50 etiquetas por impressão.");
  }

  const db = admin.firestore();

  // M7 Idempotência
  if (dados.idOperacao) {
    validarIdOperacao(dados.idOperacao);
    const identidade = construirIdentidade(uid, "ETIQUETAS_VIRGENS", {
      codigoInicial: dados.codigoInicial,
      codigoFinal: dados.codigoFinal,
      idAlmoxarifado: dados.idAlmoxarifado,
      startRow: dados.startRow,
      startCol: dados.startCol,
    });
    const opSnap = await db.collection(COLECAO_OPERACOES).doc(dados.idOperacao).get();
    if (opSnap.exists) {
      const op = opSnap.data()!;
      if (op.status === "CONCLUIDA" && op.uid === uid && op.tipo_operacao === identidade.tipoOperacao && op.payload_hash === identidade.payloadHash) {
        return op.resultado;
      }
      if (op.uid !== uid || op.tipo_operacao !== identidade.tipoOperacao || op.payload_hash !== identidade.payloadHash) {
        throw new HttpsError("already-exists", "idOperacao reutilizado com identidade incompatível.");
      }
    }
  }

  const codigos = Array.from({ length: total }, (_, i) => `LCQUI-${dados.codigoInicial + i}`);
  
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const buffer = await buildPdfBuffer(doc, async (d) => {
    await renderBarcodesGrid(d, codigos, dados.startRow || 1, dados.startCol || 1);
  });

  validarTamanhoPdf(buffer);

  // Registro de emissão de etiquetas efetuado somente após sucesso da geração do PDF
  await db.collection("Impressao_Etiqueta_Frasco").add({
    gerado_em: FieldValue.serverTimestamp(),
    gerado_por: uid,
    codigo_inicial: dados.codigoInicial,
    codigo_final: dados.codigoFinal,
    id_almoxarifado: dados.idAlmoxarifado || null,
    total_etiquetas: total,
  });

  const resultado = {
    base64: buffer.toString("base64"),
    totalEtiquetas: total,
    tamanhoBytes: buffer.length,
  };

  if (dados.idOperacao) {
    const identidade = construirIdentidade(uid, "ETIQUETAS_VIRGENS", {
      codigoInicial: dados.codigoInicial,
      codigoFinal: dados.codigoFinal,
      idAlmoxarifado: dados.idAlmoxarifado,
      startRow: dados.startRow,
      startCol: dados.startCol,
    });
    await db.collection(COLECAO_OPERACOES).doc(dados.idOperacao).set({
      uid,
      tipo_operacao: identidade.tipoOperacao,
      payload_hash: identidade.payloadHash,
      status: "CONCLUIDA",
      resultado,
      criado_em: FieldValue.serverTimestamp(),
      atualizado_em: FieldValue.serverTimestamp(),
    });
  }

  return resultado;
});

// ============================================================================
// REIMPRESSÃO E FICHA DE CONFERÊNCIA POR FRASCO (IMP-LABEL-002)
// ============================================================================
async function desenharEtiquetaReposicao(doc: DocumentoPdf, x: number, y: number, frasco: FrascoFichaRelatorio) {
  const labelWidth = mmToPt(65.0);
  const labelHeight = mmToPt(26.5);
  const paddingX = mmToPt(2.5);
  const paddingY = mmToPt(2.0);
  const printableWidth = labelWidth - paddingX * 2;

  doc.rect(x, y, labelWidth, labelHeight).lineWidth(0.5).strokeColor("#B0B0B0").stroke();

  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#000000");
  doc.text(frasco.codigo_frasco ?? frasco.id, x + paddingX, y + paddingY, {
    width: printableWidth * 0.55,
    align: "left",
    lineBreak: false,
  });

  doc.font("Helvetica").fontSize(6.5).fillColor("#555555");
  const dataFormatada = frasco.cadastrado_em || "__/__/____";
  doc.text(`Cad: ${dataFormatada}`, x + paddingX + printableWidth * 0.55, y + paddingY + 1.8, {
    width: printableWidth * 0.45,
    align: "right",
    lineBreak: false,
  });

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#111111");
  doc.text(frasco.nome_reagente || "Reagente", x + paddingX, y + paddingY + 12, {
    width: printableWidth,
    align: "center",
    lineBreak: false,
    ellipsis: true,
  });

  const barcodeBuffer = await gerarBufferBarcode(frasco.codigo_frasco ?? frasco.id);
  const barcodeWidth = mmToPt(42);
  const barcodeHeight = mmToPt(7.5);
  const barcodeX = x + (labelWidth - barcodeWidth) / 2;
  const barcodeY = y + labelHeight - barcodeHeight - paddingY;

  doc.image(barcodeBuffer, barcodeX, barcodeY, {
    width: barcodeWidth,
    height: barcodeHeight,
  });
}

async function gerarBufferFichaConferencia(frascos: FrascoFichaRelatorio[]): Promise<Buffer> {
  const pdfDoc = new PDFDocument({
    size: "A4",
    margin: 36,
    autoFirstPage: false,
  });

  return buildPdfBuffer(pdfDoc, async (doc) => {
    for (let i = 0; i < frascos.length; i++) {
      const frasco = frascos[i];
      doc.addPage({ size: "A4", margin: 36 });

        const margin = 36;
        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - margin * 2;
        let y = margin;

        // Cabeçalho Institucional
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#1A365D");
        doc.text("UENF - UNIVERSIDADE ESTADUAL DO NORTE FLUMINENSE DARCY RIBEIRO", margin, y, { align: "center" });
        y += 13;
        doc.font("Helvetica").fontSize(8.5).fillColor("#4A5568");
        doc.text("CCT | LCQUI - Laboratório de Ciências Químicas - Almoxarifado", margin, y, { align: "center" });
        y += 14;

        doc.rect(margin, y, contentWidth, 22).fillAndStroke("#EBF8FF", "#BEE3F8");
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#2B6CB0");
        doc.text(`FICHA DE CONFERÊNCIA E REPOSIÇÃO - FRASCO: ${frasco.codigo_frasco}`, margin, y + 6, {
          align: "center",
          width: contentWidth,
        });
        y += 30;

        // Dados Cadastrais
        doc.rect(margin, y, contentWidth, 58).lineWidth(0.5).strokeColor("#CBD5E0").stroke();
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#2D3748").text("DADOS CADASTRAIS DO ITEM", margin + 8, y + 6);

        const col1X = margin + 8;
        const col2X = margin + contentWidth * 0.52;

        doc.font("Helvetica-Bold").fontSize(8).fillColor("#4A5568");
        doc.text("Reagente: ", col1X, y + 20, { continued: true })
          .font("Helvetica").fillColor("#1A202C").text(frasco.nome_reagente || "Reagente");

        doc.font("Helvetica-Bold").fillColor("#4A5568");
        doc.text("Especificação: ", col1X, y + 32, { continued: true })
          .font("Helvetica").fillColor("#1A202C").text(frasco.especificacao || "Padrão");

        doc.font("Helvetica-Bold").fillColor("#4A5568");
        doc.text("Localização: ", col1X, y + 44, { continued: true })
          .font("Helvetica").fillColor("#1A202C").text(frasco.localizacao || "Não informada");

        doc.font("Helvetica-Bold").fillColor("#4A5568");
        doc.text("Lote: ", col2X, y + 20, { continued: true })
          .font("Helvetica").fillColor("#1A202C").text(frasco.numero_lote || "Sem Lote Vinculado");

        doc.font("Helvetica-Bold").fillColor("#4A5568");
        doc.text("Validade Efetiva: ", col2X, y + 32, { continued: true })
          .font("Helvetica").fillColor("#1A202C").text(frasco.validade_efetiva || "Indeterminada");

        doc.font("Helvetica-Bold").fillColor("#4A5568");
        doc.text("Status Atual: ", col2X, y + 44, { continued: true })
          .font("Helvetica").fillColor(frasco.status === "DISPONIVEL" ? "#22543D" : "#742A2A").text(frasco.status || "DISPONIVEL");

        y += 66;

        // Estado Gravimétrico
        const boxWidth = (contentWidth - 10) / 2;

        doc.rect(margin, y, boxWidth, 54).lineWidth(0.5).strokeColor("#CBD5E0").stroke();
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#2D3748").text("CONTROLE GRAVIMÉTRICO (BALANÇA)", margin + 6, y + 6);
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#4A5568");
        doc.text("Último Peso Medido: ", margin + 6, y + 20, { continued: true })
          .font("Helvetica-Bold").fillColor("#2B6CB0").text(`${frasco.peso_atual ?? "-"} g`);
        doc.font("Helvetica-Bold").fillColor("#4A5568");
        doc.text("Peso Frasco Vazio (Tara): ", margin + 6, y + 32, { continued: true })
          .font("Helvetica").fillColor("#1A202C").text(frasco.peso_frasco_vazio ? `${frasco.peso_frasco_vazio} g` : "Não registrado");
        doc.font("Helvetica-Bold").fillColor("#4A5568");
        doc.text("Conteúdo Declarado: ", margin + 6, y + 44, { continued: true })
          .font("Helvetica").fillColor("#1A202C").text(`${frasco.conteudo_nominal ?? "-"} ${frasco.unidade_medida || "mL"}`);

        doc.rect(margin + boxWidth + 10, y, boxWidth, 54).lineWidth(0.5).strokeColor("#CBD5E0").stroke();
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#2D3748").text("ÚLTIMO EMPRÉSTIMO REGISTRADO", margin + boxWidth + 16, y + 6);
        if (frasco.ultimo_emprestimo) {
          doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#4A5568");
          doc.text("Tomador: ", margin + boxWidth + 16, y + 20, { continued: true })
            .font("Helvetica").fillColor("#1A202C").text(frasco.ultimo_emprestimo.usuario);
          doc.font("Helvetica-Bold").fillColor("#4A5568");
          doc.text("Retirado em: ", margin + boxWidth + 16, y + 32, { continued: true })
            .font("Helvetica").fillColor("#1A202C").text(frasco.ultimo_emprestimo.data_retirada);
          doc.font("Helvetica-Bold").fillColor("#4A5568");
          doc.text("Situação: ", margin + boxWidth + 16, y + 44, { continued: true })
            .font("Helvetica-Bold").fillColor("#C53030").text(frasco.ultimo_emprestimo.status);
        } else {
          doc.font("Helvetica-Oblique").fontSize(8).fillColor("#718096");
          doc.text("Nenhum histórico de empréstimo anterior.", margin + boxWidth + 16, y + 25);
        }

        y += 62;

        // Histórico Recente
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#1A202C").text("HISTÓRICO RECENTE DO FRASCO (ÚLTIMAS 10 MOVIMENTAÇÕES)", margin, y);
        y += 12;

        const tableTop = y;
        const rowHeight = 15;
        const cData = { width: 90, align: "left" };
        const cEvento = { width: 110, align: "left" };
        const cGestor = { width: 120, align: "left" };
        const cPesoAnt = { width: 65, align: "right" };
        const cPesoNovo = { width: 65, align: "right" };
        const cAjuste = { width: 73, align: "right" };

        doc.rect(margin, tableTop, contentWidth, rowHeight).fill("#EDF2F7");
        let hX = margin + 4;
        doc.font("Helvetica-Bold").fontSize(7).fillColor("#2D3748");
        doc.text("Data / Hora", hX, tableTop + 4, { width: cData.width - 6, align: "left" }); hX += cData.width;
        doc.text("Evento", hX, tableTop + 4, { width: cEvento.width - 6, align: "left" }); hX += cEvento.width;
        doc.text("Gestor", hX, tableTop + 4, { width: cGestor.width - 6, align: "left" }); hX += cGestor.width;
        doc.text("Peso Ant.", hX, tableTop + 4, { width: cPesoAnt.width - 6, align: "right" }); hX += cPesoAnt.width;
        doc.text("Peso Novo", hX, tableTop + 4, { width: cPesoNovo.width - 6, align: "right" }); hX += cPesoNovo.width;
        doc.text("Ajuste / Consumo", hX, tableTop + 4, { width: cAjuste.width - 6, align: "right" });
        y += rowHeight;

        const eventos = frasco.historico && frasco.historico.length > 0 ? frasco.historico.slice(0, 10) : [];
        if (eventos.length === 0) {
          doc.rect(margin, y, contentWidth, 20).lineWidth(0.5).strokeColor("#E2E8F0").stroke();
          doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("#718096").text("Nenhuma movimentação registrada no histórico.", margin, y + 6, { align: "center", width: contentWidth });
          y += 24;
        } else {
          eventos.forEach((ev: EventoHistoricoRelatorio, idx: number) => {
            const bg = idx % 2 === 0 ? "#FFFFFF" : "#F7FAFC";
            doc.rect(margin, y, contentWidth, rowHeight).fill(bg);
            let rowX = margin + 4;
            doc.font("Helvetica").fontSize(6.8).fillColor("#1A202C");

            doc.text(ev.timestamp || "-", rowX, y + 4, { width: cData.width - 6, align: "left" }); rowX += cData.width;
            
            doc.font("Helvetica-Bold").fillColor(ev.tipo === "SAIU" ? "#C53030" : ev.tipo === "ENTROU" ? "#22543D" : "#2D3748");
            doc.text(ev.tipo || "-", rowX, y + 4, { width: cEvento.width - 6, align: "left" }); rowX += cEvento.width;
            
            doc.font("Helvetica").fillColor("#1A202C");
            doc.text(ev.gestor || "Sistema", rowX, y + 4, { width: cGestor.width - 6, align: "left", ellipsis: true }); rowX += cGestor.width;
            
            doc.text(ev.peso_anterior != null ? `${ev.peso_anterior}g` : "-", rowX, y + 4, { width: cPesoAnt.width - 6, align: "right" }); rowX += cPesoAnt.width;
            doc.text(ev.peso_novo != null ? `${ev.peso_novo}g` : "-", rowX, y + 4, { width: cPesoNovo.width - 6, align: "right" }); rowX += cPesoNovo.width;
            
            const consumoTexto = ev.medida_ajustada != null ? `${ev.medida_ajustada} ${ev.unidade || "mL"}` : "-";
            doc.font("Helvetica-Bold").text(consumoTexto, rowX, y + 4, { width: cAjuste.width - 6, align: "right" });
            y += rowHeight;
          });
        }

        // Divisória e Etiqueta
        const bottomSectionY = doc.page.height - margin - mmToPt(38);
        doc.save();
        doc.dash(3, { space: 3 });
        doc.moveTo(margin, bottomSectionY - 14).lineTo(pageWidth - margin, bottomSectionY - 14).strokeColor("#718096").stroke();
        doc.restore();

        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#718096");
        doc.text("✂  RECORTE A ETIQUETA DE REPOSIÇÃO ABAIXO E FIXE COM FITA ADESIVA TRANSPARENTE (DUREX)  ✂", margin, bottomSectionY - 10, {
          align: "center",
          width: contentWidth,
        });
        
        const etiquetaW = mmToPt(65.0);
        const xCentralizado = margin + (contentWidth - etiquetaW) / 2;
        await desenharEtiquetaReposicao(doc, xCentralizado, bottomSectionY + 4, frasco);
      }
  });
}

export const gerarPdfReimpressaoFrascos = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  await verificarRateLimitRelatorios(uid);
  const autoridade = await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
  const { frascoIds, idAlmoxarifado, idOperacao } = validatePayload(DadosReimpressaoSchema, request.data);

  if (!frascoIds || frascoIds.length === 0 || frascoIds.length > 10) {
    throw new HttpsError("invalid-argument", "Selecione entre 1 e 10 frascos por sessão de reimpressão.");
  }

  const db = admin.firestore();

  // M7 Idempotência
  if (idOperacao) {
    validarIdOperacao(idOperacao);
    const identidade = construirIdentidade(uid, "REIMPRESSAO_ETIQUETAS", { frascoIds, idAlmoxarifado });
    const opSnap = await db.collection(COLECAO_OPERACOES).doc(idOperacao).get();
    if (opSnap.exists) {
      const op = opSnap.data()!;
      if (op.status === "CONCLUIDA" && op.uid === uid && op.tipo_operacao === identidade.tipoOperacao && op.payload_hash === identidade.payloadHash) {
        return op.resultado;
      }
      if (op.uid !== uid || op.tipo_operacao !== identidade.tipoOperacao || op.payload_hash !== identidade.payloadHash) {
        throw new HttpsError("already-exists", "idOperacao reutilizado com identidade incompatível.");
      }
    }
  }

  // 1. FAIL CLOSED: Buscar e validar existência E escopo de CADA frasco
  const frascosEnriquecidos: FrascoFichaRelatorio[] = [];
  const ehChefeGeral = autoridade.papeis.includes("Chefe_Geral");

  for (const frascoId of frascoIds) {
    const snap = await db.collection("Frasco_Reagente").doc(frascoId).get();
    if (!snap.exists) {
      throw new HttpsError("not-found", `Frasco com ID '${frascoId}' não foi encontrado.`);
    }
    const frasco = { id: snap.id, ...snap.data() } as FrascoFichaRelatorio;

    // Se o usuário não for Chefe Geral, deve ter escopo de gestor no almoxarifado do frasco
    if (!ehChefeGeral) {
      if (!frasco.id_almoxarifado) {
        throw new HttpsError("permission-denied", `Frasco '${frasco.codigo_frasco || frasco.id}' não possui almoxarifado vinculado.`);
      }
      await validarGestorDoAlmoxarifado(uid, request.auth!.token, frasco.id_almoxarifado);
    }

    // Se tiver lote, busca numero_lote
    if (frasco.id_lote) {
      const loteSnap = await db.collection("Lote").doc(frasco.id_lote).get();
      if (loteSnap.exists) {
        frasco.numero_lote = loteSnap.data()?.numero_lote;
      }
    }

    // Buscar histórico recente (últimas 10 movimentações)
    const histSnap = await db.collection("Historico_Frasco_Reagente")
      .where("id_frasco_reagente", "==", frascoId)
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();
    
    frasco.historico = histSnap.docs.map(h => {
      const data = h.data();
      return {
        ...data,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "-",
      };
    });

    // Buscar último empréstimo
    const empSnap = await db.collection("Emprestimo_Reagente")
      .where("id_frasco_reagente", "==", frascoId)
      .orderBy("data_retirada", "desc")
      .limit(1)
      .get();
    
    if (!empSnap.empty) {
      const emp = empSnap.docs[0].data();
      frasco.ultimo_emprestimo = {
        usuario: emp.nome_usuario_retirou || "Usuário não identificado",
        data_retirada: emp.data_retirada?.toDate ? emp.data_retirada.toDate().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "-",
        status: emp.status,
      };
    }

    frasco.cadastrado_em = typeof frasco.cadastrado_em !== "string" && frasco.cadastrado_em?.toDate
      ? frasco.cadastrado_em.toDate().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : frasco.cadastrado_em ?? "";
    if (frasco.validade_efetiva?.toDate) {
      frasco.validade_efetiva = frasco.validade_efetiva.toDate().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    }
    frasco.status = frasco.estado_fisico_frasco || frasco.status;
    frasco.localizacao = frasco.detalhe_local_armazenamento || frasco.localizacao;

    frascosEnriquecidos.push(frasco);
  }

  // 2. Gerar PDF
  const buffer = await gerarBufferFichaConferencia(frascosEnriquecidos);
  validarTamanhoPdf(buffer);

  // 3. Auditoria efetuada SOMENTE APÓS a geração bem-sucedida do PDF (sem efeitos colaterais em caso de falha)
  const batch = db.batch();
  for (const frasco of frascosEnriquecidos) {
    const auditRef = db.collection("Registro_de_Auditoria").doc();
    batch.set(auditRef, {
      id_usuario: uid,
      acao: "REIMPRESSAO_ETIQUETA",
      tipo_entidade_sofre_acao: "FRASCO_REAGENTE",
      id_do_objeto_da_entidade: frasco.id,
      acao_feita_em: FieldValue.serverTimestamp(),
      metadata: { motivo: "segunda_via_conferencia", codigo_frasco: frasco.codigo_frasco },
    });
  }
  await batch.commit();

  const resultado = {
    base64: buffer.toString("base64"),
    totalFrascos: frascosEnriquecidos.length,
    tamanhoBytes: buffer.length,
  };

  if (idOperacao) {
    const identidade = construirIdentidade(uid, "REIMPRESSAO_ETIQUETAS", { frascoIds, idAlmoxarifado });
    await db.collection(COLECAO_OPERACOES).doc(idOperacao).set({
      uid,
      tipo_operacao: identidade.tipoOperacao,
      payload_hash: identidade.payloadHash,
      status: "CONCLUIDA",
      resultado,
      criado_em: FieldValue.serverTimestamp(),
      atualizado_em: FieldValue.serverTimestamp(),
    });
  }

  return resultado;
});

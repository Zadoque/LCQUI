import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { extrairClaimsAutoridade } from "../auth";

const TIME_ZONE = "America/Sao_Paulo";

export function obterJanelaDiaSaoPaulo(dataCivil: string): { inicio: Date; fim: Date } {
  // dataCivil no formato YYYY-MM-DD
  // Início: 00:00:00.000 em America/Sao_Paulo
  // Fim: 23:59:59.999 em America/Sao_Paulo (ou 00:00 do dia seguinte exclusivo)
  // Utiliza offset de -03:00 para Brasil
  const inicio = new Date(`${dataCivil}T00:00:00.000-03:00`);
  const fim = new Date(`${dataCivil}T23:59:59.999-03:00`);
  return { inicio, fim };
}

export function obterDataOntemSaoPaulo(): string {
  const agora = new Date();
  const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ontem);
  const valores = Object.fromEntries(partes.map((p) => [p.type, p.value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

export async function processarMaterializacaoDiariaFlow(dataAlvo: string): Promise<{
  dataAlvo: string;
  totalAlmoxarifados: number;
  totalResumos: number;
}> {
  const db = admin.firestore();
  const { inicio, fim } = obterJanelaDiaSaoPaulo(dataAlvo);
  const inicioTs = Timestamp.fromDate(inicio);
  const fimTs = Timestamp.fromDate(fim);

  // Consulta todos os almoxarifados ativos
  const almoxSnap = await db.collection("Almoxarifado").get();
  const almoxIds = almoxSnap.docs.map((d) => d.id);

  // Busca histórico dentro da janela do dia
  const historicoSnap = await db
    .collection("Historico_Frasco_Reagente")
    .where("timestamp", ">=", inicioTs)
    .where("timestamp", "<=", fimTs)
    .get();

  // Busca empréstimos/devoluções com fatos no dia
  const [retiradasSnap, devolucoesSnap] = await Promise.all([
    db.collection("Emprestimo_Reagente")
      .where("data_retirada", ">=", inicioTs)
      .where("data_retirada", "<=", fimTs)
      .get(),
    db.collection("Emprestimo_Reagente")
      .where("data_devolucao_efetuada", ">=", inicioTs)
      .where("data_devolucao_efetuada", "<=", fimTs)
      .get(),
  ]);

  let totalResumosProcessados = 0;

  for (const idAlmox of almoxIds) {
    let totalRetiradas = 0;
    let totalDevolucoes = 0;
    let volumeUtilizadoMl = 0;
    let massaUtilizadaG = 0;
    let volumeEvaporadoMl = 0;
    let massaEvaporadaG = 0;
    let totalDescartes = 0;
    let totalQuebras = 0;
    let totalExtravios = 0;

    // Métricas por reagente
    const reagentesFlow = new Map<string, {
      totalRetiradas: number;
      totalDevolucoes: number;
      volumeUtilizadoMl: number;
      massaUtilizadaG: number;
    }>();

    // Processa retiradas
    for (const doc of retiradasSnap.docs) {
      const data = doc.data();
      if (data.id_almoxarifado !== idAlmox) continue;
      totalRetiradas += 1;
      if (data.id_resumo_reagente) {
        const idRes = data.id_resumo_reagente;
        const cur = reagentesFlow.get(idRes) ?? {
          totalRetiradas: 0,
          totalDevolucoes: 0,
          volumeUtilizadoMl: 0,
          massaUtilizadaG: 0,
        };
        cur.totalRetiradas += 1;
        reagentesFlow.set(idRes, cur);
      }
    }

    // Processa devoluções
    for (const doc of devolucoesSnap.docs) {
      const data = doc.data();
      if (data.id_almoxarifado !== idAlmox) continue;
      totalDevolucoes += 1;

      if (data.consumo_validado === true && typeof data.medida_utilizada === "number") {
        if (data.unidade_medida_utilizada === "ml") {
          volumeUtilizadoMl += data.medida_utilizada;
        } else if (data.unidade_medida_utilizada === "g") {
          massaUtilizadaG += data.medida_utilizada;
        }
      }

      if (typeof data.peso_perda_evaporacao === "number" && data.peso_perda_evaporacao > 0) {
        if (data.unidade_medida_utilizada === "ml") {
          volumeEvaporadoMl += data.peso_perda_evaporacao;
        } else {
          massaEvaporadaG += data.peso_perda_evaporacao;
        }
      }

      if (data.id_resumo_reagente) {
        const idRes = data.id_resumo_reagente;
        const cur = reagentesFlow.get(idRes) ?? {
          totalRetiradas: 0,
          totalDevolucoes: 0,
          volumeUtilizadoMl: 0,
          massaUtilizadaG: 0,
        };
        cur.totalDevolucoes += 1;
        if (data.consumo_validado === true && typeof data.medida_utilizada === "number") {
          if (data.unidade_medida_utilizada === "ml") {
            cur.volumeUtilizadoMl += data.medida_utilizada;
          } else {
            cur.massaUtilizadaG += data.medida_utilizada;
          }
        }
        reagentesFlow.set(idRes, cur);
      }
    }

    // Processa eventos históricos
    for (const doc of historicoSnap.docs) {
      const data = doc.data();
      if (data.id_almoxarifado !== idAlmox) continue;
      if (data.tipo === "FOI_DESCARTADO") totalDescartes += 1;
      if (data.tipo === "QUEBROU") totalQuebras += 1;
      if (data.tipo === "EXTRAVIO") totalExtravios += 1;
    }

    const docAlmoxId = `${dataAlvo}__${idAlmox}`;
    await db.collection("Resumo_Almoxarifado_Diario").doc(docAlmoxId).set({
      data_alvo: dataAlvo,
      id_almoxarifado: idAlmox,
      versao_calculo: "flow-v2",
      calculado_em: FieldValue.serverTimestamp(),
      total_retiradas: totalRetiradas,
      total_devolucoes: totalDevolucoes,
      volume_utilizado_no_dia_ml: Math.round(volumeUtilizadoMl * 1000) / 1000,
      massa_utilizada_no_dia_g: Math.round(massaUtilizadaG * 1000) / 1000,
      volume_evaporado_no_dia_ml: Math.round(volumeEvaporadoMl * 1000) / 1000,
      massa_evaporada_no_dia_g: Math.round(massaEvaporadaG * 1000) / 1000,
      total_descartes: totalDescartes,
      total_quebras: totalQuebras,
      total_extravios: totalExtravios,
    });

    // Grava projeções por resumo
    for (const [idResumo, metrics] of reagentesFlow.entries()) {
      const docResumoId = `${dataAlvo}__${idAlmox}__${idResumo}`;
      await db.collection("Resumo_Reagente_Diario").doc(docResumoId).set({
        data_alvo: dataAlvo,
        id_almoxarifado: idAlmox,
        id_resumo_reagente: idResumo,
        versao_calculo: "flow-v2",
        calculado_em: FieldValue.serverTimestamp(),
        total_retiradas: metrics.totalRetiradas,
        total_devolucoes: metrics.totalDevolucoes,
        volume_utilizado_no_dia_ml: Math.round(metrics.volumeUtilizadoMl * 1000) / 1000,
        massa_utilizada_no_dia_g: Math.round(metrics.massaUtilizadaG * 1000) / 1000,
      });
      totalResumosProcessados += 1;
    }
  }

  return {
    dataAlvo,
    totalAlmoxarifados: almoxIds.length,
    totalResumos: totalResumosProcessados,
  };
}

export const consolidarResumosDiariosCallable = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const ehChefe = claims.papeis.includes("Chefe_Geral");
  const ehGestor = claims.papeis.includes("Gestor_Almoxarifado");

  if (!ehChefe && !ehGestor) {
    throw new HttpsError("permission-denied", "Acesso não autorizado para acionar materializações.");
  }

  const dataAlvo = (request.data && typeof request.data.dataAlvo === "string" && request.data.dataAlvo.trim())
    ? request.data.dataAlvo.trim()
    : obterDataOntemSaoPaulo();

  const resultado = await processarMaterializacaoDiariaFlow(dataAlvo);
  return { status: "OK", ...resultado };
});

export const consolidarResumosDiariosAgendado = onSchedule({
  schedule: "every day 00:05",
  timeZone: TIME_ZONE,
}, async () => {
  const dataAlvo = obterDataOntemSaoPaulo();
  await processarMaterializacaoDiariaFlow(dataAlvo);
});

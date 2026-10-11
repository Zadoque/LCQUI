import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  extrairClaimsAutoridade,
  validarGestorDoAlmoxarifadoTx,
} from "./auth";
import { validatePayload } from "./utils/validation";
import { construirIdentidade, registrarOperacaoConcluidaTx, resolverOperacaoTx } from "./idempotencia";
import {
  ObterEstoqueAtualSchema,
  ConfigurarLimiarEscassezSchema,
} from "./schemas/estoque.schema";

export interface M8Estoque {
  qtd_aptos: number;
  qtd_total: number;
  qtd_emprestados: number;
  qtd_saldo_desconhecido: number;
  massa_aferida_g: number | null;
  volume_aferido_ml: number | null;
}

export function frascoAptoParaUso(dados: FirebaseFirestore.DocumentData): boolean {
  if (dados.situacao_localizacao && dados.situacao_localizacao !== "LOCALIZADO") return false;
  if (dados.disponibilidade !== "DISPONIVEL") return false;
  if (dados.estado_fisico_frasco !== "FECHADO" && dados.estado_fisico_frasco !== "ABERTO") return false;
  if (dados.em_quarentena === true) return false;
  if (dados.vencido === true && dados.uso_vencido_autorizado !== true) return false;
  if (dados.detalhe_status && typeof dados.detalhe_status === "string" && dados.detalhe_status.includes("anomalia")) return false;
  return true;
}

export function invalidarCacheEstoqueTx(
  tx: FirebaseFirestore.Transaction,
  idAlmoxarifado: string,
  idResumoReagente?: string
): void {
  const chaves = [`ESTOQUE__ALMOX__${idAlmoxarifado}`];
  if (idResumoReagente) {
    chaves.push(`ESTOQUE__ALMOX__RESUMO__${idAlmoxarifado}__${idResumoReagente}`);
  }
  for (const chave of chaves) {
    const ref = admin.firestore().collection("Sistema_Cache_Dashboard").doc(chave);
    tx.set(
      ref,
      {
        geracao: FieldValue.increment(1),
        valido: false,
        resultado: null,
      },
      { merge: true }
    );
  }
}

export async function verificarRateLimitDashboard(uid: string): Promise<void> {
  const db = admin.firestore();
  const ref = db.collection("Sistema_Rate_Limit_Dashboard").doc(uid);
  const agora = Date.now();
  const janelaMs = 60_000;
  const limite = 5;

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const requisicoes: number[] = doc.exists ? (doc.data()?.requisicoes ?? []) : [];
    const validas = requisicoes.filter((ts) => agora - ts < janelaMs);
    if (validas.length >= limite) {
      throw new HttpsError(
        "resource-exhausted",
        "Limite de requisições do dashboard excedido (máximo 5/min). Aguarde antes de tentar novamente."
      );
    }
    validas.push(agora);
    tx.set(ref, { requisicoes: validas, ultimo_acesso: agora });
  });
}

export const obterEstoqueAtual = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(ObterEstoqueAtualSchema, request.data);

  // Verificação de permissão: Chefe Geral, Gestor do Almoxarifado vinculado, Professor ou Bolsista
  const ehChefe = claims.papeis.includes("Chefe_Geral");
  const ehGestor = claims.papeis.includes("Gestor_Almoxarifado");
  const ehAcademico = claims.papeis.includes("Professor") || claims.papeis.includes("Bolsista");

  if (!ehChefe && !ehGestor && !ehAcademico) {
    throw new HttpsError("permission-denied", "Acesso não autorizado para consulta de estoque.");
  }

  const db = admin.firestore();

  if (ehGestor && !ehChefe) {
    const vinculoSnap = await db
      .collection("Gestor_Almoxarifado_x_Almoxarifado")
      .where("id_gestor_almoxarifado", "==", claims.uid)
      .where("id_almoxarifado", "==", dados.idAlmoxarifado)
      .limit(1)
      .get();
    if (vinculoSnap.empty) {
      throw new HttpsError("permission-denied", "Gestor não vinculado a este almoxarifado.");
    }
  }

  // Rate limit: 5 requisições por minuto por UID
  await verificarRateLimitDashboard(claims.uid);

  const escopo = dados.idResumoReagente ? "ESTOQUE__ALMOX__RESUMO" : "ESTOQUE__ALMOX";
  const chaveCache = dados.idResumoReagente
    ? `ESTOQUE__ALMOX__RESUMO__${dados.idAlmoxarifado}__${dados.idResumoReagente}`
    : `ESTOQUE__ALMOX__${dados.idAlmoxarifado}`;

  const cacheRef = db.collection("Sistema_Cache_Dashboard").doc(chaveCache);
  const cacheSnap = await cacheRef.get();
  const agora = Date.now();

  if (cacheSnap.exists) {
    const cData = cacheSnap.data()!;
    const calculadoEm = typeof cData.calculado_em === "number" ? cData.calculado_em : 0;
    const idadeMs = agora - calculadoEm;
    if (cData.valido === true && cData.resultado && idadeMs < 30_000) {
      return {
        ...cData.resultado,
        fonte: "CACHE",
        idadeMs,
      };
    }
  }

  const geracaoInicial = cacheSnap.exists ? (cacheSnap.data()?.geracao ?? 0) : 0;

  // Consulta e agregação canônica em Frasco_Reagente
  let query: admin.firestore.Query = db
    .collection("Frasco_Reagente")
    .where("id_almoxarifado", "==", dados.idAlmoxarifado);

  if (dados.idResumoReagente) {
    query = query.where("id_resumo_reagente", "==", dados.idResumoReagente);
  }

  const frascosSnap = await query.get();

  let qtdAptos = 0;
  let qtdTotal = 0;
  let qtdEmprestados = 0;
  let qtdSaldoDesconhecido = 0;
  let somaMassaG = 0;
  let temMassa = false;
  let somaVolumeMl = 0;
  let temVolume = false;

  for (const doc of frascosSnap.docs) {
    const f = doc.data();
    if (f.estado_fisico_frasco === "DESCARTADO") continue;

    qtdTotal += 1;
    if (f.disponibilidade === "EMPRESTADO") qtdEmprestados += 1;
    if (f.saldo_desconhecido === true) qtdSaldoDesconhecido += 1;

    if (frascoAptoParaUso(f)) {
      qtdAptos += 1;
    }

    if (typeof f.saldo_aferido_g === "number" && !f.saldo_desconhecido) {
      somaMassaG += f.saldo_aferido_g;
      temMassa = true;
    }
    if (typeof f.saldo_aferido_ml === "number" && !f.saldo_desconhecido) {
      somaVolumeMl += f.saldo_aferido_ml;
      temVolume = true;
    }
  }

  const resultado: M8Estoque = {
    qtd_aptos: qtdAptos,
    qtd_total: qtdTotal,
    qtd_emprestados: qtdEmprestados,
    qtd_saldo_desconhecido: qtdSaldoDesconhecido,
    massa_aferida_g: temMassa ? Math.round(somaMassaG * 1000) / 1000 : null,
    volume_aferido_ml: temVolume ? Math.round(somaVolumeMl * 1000) / 1000 : null,
  };

  // Publicação condicional à geração: só grava se geracao não foi incrementada durante cálculo
  await db.runTransaction(async (tx) => {
    const cDoc = await tx.get(cacheRef);
    const geracaoAtual = cDoc.exists ? (cDoc.data()?.geracao ?? 0) : 0;
    if (geracaoAtual === geracaoInicial) {
      tx.set(
        cacheRef,
        {
          escopo,
          resultado,
          calculado_em: agora,
          versao_calculo: "1.0",
          geracao: geracaoAtual,
          valido: true,
        },
        { merge: true }
      );
    }
  });

  return {
    ...resultado,
    fonte: "CALCULADO",
    idadeMs: 0,
  };
});

export const configurarLimiarEscassez = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(ConfigurarLimiarEscassezSchema, request.data);

  const configId = `${dados.idResumoReagente}__${dados.idEspecificacaoReagente}`;
  const configRef = admin
    .firestore()
    .collection("Almoxarifado")
    .doc(dados.idAlmoxarifado)
    .collection("Estoques_Configurados")
    .doc(configId);

  const identidade = construirIdentidade(claims.uid, "CONFIGURAR_ESCASSEZ", {
    idAlmoxarifado: dados.idAlmoxarifado,
    idResumoReagente: dados.idResumoReagente,
    idEspecificacaoReagente: dados.idEspecificacaoReagente,
    qtdLimiarEscassez: dados.qtdLimiarEscassez,
    ativo: dados.ativo,
    notificacaoAtiva: dados.notificacaoAtiva,
  });

  return admin.firestore().runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as any;
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação não concluída.");

    await validarGestorDoAlmoxarifadoTx(tx, claims, dados.idAlmoxarifado);

    tx.set(configRef, {
      id_almoxarifado: dados.idAlmoxarifado,
      id_resumo_reagente: dados.idResumoReagente,
      id_especificacao_reagente: dados.idEspecificacaoReagente,
      qtd_limiar_escassez: dados.qtdLimiarEscassez,
      ativo: dados.ativo,
      notificacao_ativa: dados.notificacaoAtiva,
      atualizado_em: FieldValue.serverTimestamp(),
      atualizado_por: claims.uid,
    });

    const resultado = {
      status: "OK",
      idConfiguracao: configId,
      qtdLimiarEscassez: dados.qtdLimiarEscassez,
      ativo: dados.ativo,
      notificacaoAtiva: dados.notificacaoAtiva,
    };

    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export type RateLimitEscopo =
  | "catalogo-geracao"
  | "catalogo-leitura"
  | "catalogo-resolucao"
  | "busca-usuarios-papel"
  | "detalhes-usuario-papel"
  | "busca-alunos"
  | "busca-professores"
  | "busca-gestores-almoxarifado"
  | "busca-usuarios-retirada"
  | "busca-locais-retirada";

interface RateLimitConfiguracao {
  limite: number;
  janelaMs: number;
  descricao: string;
}

interface EstadoRateLimit {
  requisicoes?: unknown;
}

const COLECAO_RATE_LIMIT = "Sistema_Rate_Limit_Callables";
const JANELA_UM_MINUTO_MS = 60_000;

export const RATE_LIMIT_CONFIG: Record<RateLimitEscopo, RateLimitConfiguracao> = {
  "catalogo-geracao": { limite: 1, janelaMs: 5 * JANELA_UM_MINUTO_MS, descricao: "regeneração do catálogo" },
  "catalogo-leitura": { limite: 30, janelaMs: JANELA_UM_MINUTO_MS, descricao: "leitura do catálogo" },
  "catalogo-resolucao": { limite: 30, janelaMs: JANELA_UM_MINUTO_MS, descricao: "resolução de item do catálogo" },
  "busca-usuarios-papel": { limite: 30, janelaMs: JANELA_UM_MINUTO_MS, descricao: "busca de usuários por papel" },
  "detalhes-usuario-papel": { limite: 20, janelaMs: JANELA_UM_MINUTO_MS, descricao: "consulta de detalhes de usuário" },
  "busca-alunos": { limite: 30, janelaMs: JANELA_UM_MINUTO_MS, descricao: "busca de alunos" },
  "busca-professores": { limite: 30, janelaMs: JANELA_UM_MINUTO_MS, descricao: "busca de professores" },
  "busca-gestores-almoxarifado": { limite: 30, janelaMs: JANELA_UM_MINUTO_MS, descricao: "busca de gestores de almoxarifado" },
  "busca-usuarios-retirada": { limite: 30, janelaMs: JANELA_UM_MINUTO_MS, descricao: "busca de usuários para retirada" },
  "busca-locais-retirada": { limite: 30, janelaMs: JANELA_UM_MINUTO_MS, descricao: "busca de locais para retirada" },
};

function requisicoesRecentes(valor: unknown): number[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

function idDocumento(escopo: RateLimitEscopo, uid: string): string {
  return `${escopo}__${uid}`;
}

/** Rate limit server-side por UID e operação, protegido contra concorrência por transação. */
export async function verificarRateLimitCallable(uid: string, escopo: RateLimitEscopo): Promise<void> {
  const configuracao = RATE_LIMIT_CONFIG[escopo];
  const db = admin.firestore();
  const ref = db.collection(COLECAO_RATE_LIMIT).doc(idDocumento(escopo, uid));
  const agora = Date.now();

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const estado = (snapshot.data() ?? {}) as EstadoRateLimit;
    const validas = requisicoesRecentes(estado.requisicoes)
      .filter((timestamp) => agora - timestamp < configuracao.janelaMs);

    if (validas.length >= configuracao.limite) {
      throw new HttpsError(
        "resource-exhausted",
        `Limite de ${configuracao.descricao} excedido (${configuracao.limite} em ${Math.round(configuracao.janelaMs / 1000)} segundos). Aguarde antes de tentar novamente.`,
      );
    }

    validas.push(agora);
    tx.set(ref, {
      escopo,
      uid,
      requisicoes: validas,
      limite: configuracao.limite,
      janela_ms: configuracao.janelaMs,
      ultimo_acesso: agora,
    });
  });
}

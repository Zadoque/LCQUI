/**
 * M7 no frontend: o `idOperacao` pertence à intenção lógica do usuário, não à
 * tentativa HTTP. Ele é criado antes da primeira tentativa mutável e
 * persistido junto da intenção local (sessão/rascunho), sendo reutilizado em
 * timeout, perda de conexão, resposta desconhecida e retry da MESMA intenção.
 * Um novo `idOperacao` só nasce quando o usuário inicia deliberadamente outra
 * intenção (campos semânticos diferentes) ou descarta a atual. Reutilizar um
 * `idOperacao` antigo com payload alterado é rejeitado pelo backend (M7); por
 * isso a assinatura faz parte da intenção.
 */

export interface IntencaoOperacao {
  idOperacao: string;
  assinatura: string;
}

export interface CamposIntencaoTurma {
  idMateria: string;
  nomeTurma: string;
  ano: number;
  semestre: number;
  capacidade: number;
  idProfessor?: string;
}

/** Chave de sessão da intenção de criação de turma. */
export const CHAVE_INTENCAO_CRIAR_TURMA = "lcqui.intencao.criarTurma";

/** Subconjunto de `Storage` suficiente e testável (sessionStorage). */
export interface ArmazenamentoIntencao {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Assinatura canônica e determinística dos campos semânticos da intenção. */
export function assinaturaIntencaoTurma(campos: CamposIntencaoTurma): string {
  return JSON.stringify([
    campos.idMateria,
    campos.nomeTurma,
    campos.ano,
    campos.semestre,
    campos.capacidade,
    campos.idProfessor ?? null,
  ]);
}

/**
 * Resolve o `idOperacao` a usar nesta tentativa:
 * - mesma assinatura → reutiliza a intenção (retry idempotente);
 * - assinatura diferente ou ausente → nova intenção e novo id.
 *
 * `gerarId` é injetado (no navegador, `crypto.randomUUID`) para manter a função
 * pura e testável, sem acoplar a um gerador global.
 */
export function resolverIdOperacao(
  atual: IntencaoOperacao | null,
  assinatura: string,
  gerarId: () => string
): IntencaoOperacao {
  if (atual !== null && atual.assinatura === assinatura) {
    return atual;
  }
  return { idOperacao: gerarId(), assinatura };
}

/** Lê a intenção persistida na sessão; dado corrompido é tratado como ausente. */
export function lerIntencao(
  storage: ArmazenamentoIntencao,
  chave: string
): IntencaoOperacao | null {
  const bruto = storage.getItem(chave);
  if (bruto === null) return null;
  try {
    const analisado: unknown = JSON.parse(bruto);
    if (analisado !== null && typeof analisado === "object") {
      const obj = analisado as Record<string, unknown>;
      if (typeof obj.idOperacao === "string" && typeof obj.assinatura === "string") {
        return { idOperacao: obj.idOperacao, assinatura: obj.assinatura };
      }
    }
  } catch {
    // Intenção corrompida é descartada; uma nova será criada no próximo envio.
  }
  return null;
}

export function gravarIntencao(
  storage: ArmazenamentoIntencao,
  chave: string,
  intencao: IntencaoOperacao
): void {
  storage.setItem(chave, JSON.stringify(intencao));
}

export function limparIntencao(storage: ArmazenamentoIntencao, chave: string): void {
  storage.removeItem(chave);
}

/** Chave/assinatura da intenção de alterar o status de uma turma (Q08/PRO-02). */
export function chaveIntencaoStatusTurma(idTurma: string, status: string): string {
  return `lcqui.intencao.turmaStatus.${idTurma}.${status}`;
}

export function assinaturaStatusTurma(idTurma: string, status: string): string {
  return JSON.stringify(["ALTERAR_STATUS_TURMA", idTurma, status]);
}

/** Chave/assinatura da intenção de ingresso em turma por código. */
export function chaveIntencaoIngressar(codigo: string): string {
  return `lcqui.intencao.ingressarTurma.${codigo}`;
}

export function assinaturaIngressar(codigo: string): string {
  return JSON.stringify(["INGRESSAR_TURMA", codigo]);
}

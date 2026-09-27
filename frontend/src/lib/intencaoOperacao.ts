/**
 * M7 no frontend: o `idOperacao` pertence à intenção lógica do usuário, não à
 * tentativa HTTP. Ele é criado antes da primeira tentativa mutável e reutilizado
 * em timeout, perda de conexão, resposta desconhecida e retry da MESMA
 * intenção. Um novo `idOperacao` só nasce quando o usuário inicia
 * deliberadamente outra intenção (campos semânticos diferentes) ou descarta a
 * atual. Reutilizar um `idOperacao` antigo com payload alterado é rejeitado
 * pelo backend (M7); por isso a assinatura faz parte da intenção.
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

/** Descarta a intenção corrente (resultado conclusivo, cancelamento ou nova sessão). */
export function descartarIntencao(): null {
  return null;
}

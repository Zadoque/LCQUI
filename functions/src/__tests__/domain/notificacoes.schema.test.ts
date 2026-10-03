import { TipoNotificacaoSchema } from "../../schemas/notificacoes.schema";

describe("TipoNotificacaoSchema", () => {
  const valoresValidos = [
    "ADICIONADO",
    "POST",
    "COMENTARIO",
    "REMOVIDO",
    "TURMA_ARQUIVADA",
    "TURMA_DESARQUIVADA",
    "CONVITE_PARA_TURMA",
    "REQUISICAO_BEM",
    "DATA_DEVOLUCAO_REAGENTE",
    "ROTEIRO_COMPARTILHADO",
    "REQUISICAO_EDICAO_BEM",
    "REQUISICAO_ADICAO_BEM",
    "BEM_INSERVIVEL",
    "ENTREGA_ATRASADA",
    "FRASCOS_VAZIOS",
    "FRASCOS_QUEBRADOS",
    "FRASCOS_VENCIDOS",
    "FRASCOS_A_SEREM_PESADOS",
    "FRASCOS_EM_QUARENTENA",
    "ESCASSEZ_ESTOQUE",
    "AUTO_ATENDIMENTO_RETIRADA"
  ];

  it("deve aceitar todos os 21 valores canônicos", () => {
    valoresValidos.forEach((valor) => {
      expect(() => TipoNotificacaoSchema.parse(valor)).not.toThrow();
    });
  });

  it("deve rejeitar um valor inválido", () => {
    expect(() => TipoNotificacaoSchema.parse("TIPO_INVALIDO")).toThrow();
  });
});

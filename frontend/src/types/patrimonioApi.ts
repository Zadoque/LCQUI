export interface CriarRequisicaoEdicaoBemInput {
  idOperacao: string;
  idBemPatrimonial: string;
  novoStatus?: "Ativo" | "Inservivel";
  novoEstadoConservacao?: "BOM" | "REGULAR" | "RUIM";
  motivo: string;
}

export interface RegistrarBaixaBemInput {
  idOperacao: string;
  idBemPatrimonial: string;
  documentoDadoBaixaPdfUrl: string;
  justificativa: string;
}

export interface CriarRequisicaoAdicaoBemInput {
  idOperacao: string;
  numeroPatrimonioProposto: string;
  estadoConservacaoProposto: "BOM" | "REGULAR" | "RUIM";
  idLocal: string;
  photoUrlProposta: string;
  nomeResponsavelProposto: string;
  nomeResumoProposto: string;
  descricaoResumoProposta: string;
  motivo: string;
}

export interface GerarRelatorioBensParams {
  predio?: string;
  andar?: string;
  sala?: string;
  status?: string;
}

export interface RelatorioPdfResponse {
  base64: string;
}

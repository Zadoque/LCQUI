import { z } from "zod";

export const FiltrosAlmoxarifadoSchema = z.object({
  idAlmoxarifado: z.string().min(1, "O ID do almoxarifado é obrigatório."),
  mes: z.number().min(1).max(12),
  ano: z.number().min(2000),
  idOperacao: z.string().optional()
});

export const FiltrosPredioSchema = z.object({
  predio: z.string().optional(),
  mes: z.number().min(1).max(12).optional(),
  ano: z.number().min(2000).optional(),
  andar: z.string().optional(),
  sala: z.string().optional(),
  estadoConservacao: z.string().optional(),
  status: z.string().optional(),
  idOperacao: z.string().optional()
});

export const FiltrosGeralEPersonalizadoSchema = z.object({
  dataInicio: z.string().min(1, "Data de início é obrigatória."),
  dataFim: z.string().min(1, "Data de fim é obrigatória."),
  entidade: z.enum(["Bens_Patrimoniais", "Reagentes"]),
  idOperacao: z.string().optional()
});

export const DadosEtiquetasVirgensSchema = z.object({
  codigoInicial: z.number().positive(),
  codigoFinal: z.number().positive(),
  idAlmoxarifado: z.string().optional(),
  startRow: z.number().min(1).max(10).optional(),
  startCol: z.number().min(1).max(3).optional(),
  idOperacao: z.string().optional()
});

export const DadosReimpressaoSchema = z.object({
  frascoIds: z.array(z.string()).min(1).max(10),
  idAlmoxarifado: z.string().optional(),
  idOperacao: z.string().optional()
});

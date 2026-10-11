import {
  validarCasNumber,
  CadastroSubstanciaQuimicaSchema,
  CadastroResumoReagenteSchema,
  ComposicaoSchema,
  CadastroEspecificacaoSchema,
} from "../../schemas/reagentes_base.schema";

describe("Schemas e Contratos de Reagentes Base (IMP-REAG-001)", () => {
  describe("validarCasNumber", () => {
    it("deve aceitar números CAS válidos com dígito verificador correto", () => {
      expect(validarCasNumber("7732-18-5")).toBe(true); // Água
      expect(validarCasNumber("64-17-5")).toBe(true);   // Etanol
      expect(validarCasNumber("50-00-0")).toBe(true);   // Formaldeído
      expect(validarCasNumber("1310-73-2")).toBe(true); // Hidróxido de Sódio
      expect(validarCasNumber("7647-01-0")).toBe(true); // Ácido Clorídrico
    });

    it("deve rejeitar números CAS com dígito verificador incorreto", () => {
      expect(validarCasNumber("7732-18-4")).toBe(false);
      expect(validarCasNumber("64-17-6")).toBe(false);
      expect(validarCasNumber("50-00-1")).toBe(false);
      expect(validarCasNumber("1310-73-0")).toBe(false);
    });

    it("deve rejeitar formatos fora do padrão CAS", () => {
      expect(validarCasNumber("7732185")).toBe(false);
      expect(validarCasNumber("7732-18")).toBe(false);
      expect(validarCasNumber("7732-1-5")).toBe(false);
      expect(validarCasNumber("abc-de-f")).toBe(false);
      expect(validarCasNumber("")).toBe(false);
    });
  });

  describe("CadastroSubstanciaQuimicaSchema", () => {
    it("deve validar substância válida com CAS", () => {
      const res = CadastroSubstanciaQuimicaSchema.safeParse({
        idOperacao: "op-subst-001",
        nome: "Água Purificada",
        casNumber: "7732-18-5",
        formulaQuimica: "H2O",
        ativo: true,
      });
      expect(res.success).toBe(true);
    });

    it("deve aceitar substância válida sem CAS (opcional)", () => {
      const res = CadastroSubstanciaQuimicaSchema.safeParse({
        idOperacao: "op-subst-002",
        nome: "Extrato Natural Composto",
        ativo: true,
      });
      expect(res.success).toBe(true);
    });

    it("deve rejeitar CAS com dígito incorreto", () => {
      const res = CadastroSubstanciaQuimicaSchema.safeParse({
        idOperacao: "op-subst-003",
        nome: "Substância Teste",
        casNumber: "7732-18-9",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("CadastroResumoReagenteSchema", () => {
    it("deve aceitar resumo válido com ehHigroscopico", () => {
      const res = CadastroResumoReagenteSchema.safeParse({
        idOperacao: "op-res-001",
        nome: "Hidróxido de Sódio",
        tipoSubstancia: "PURA",
        naturezaQuimica: "INORGANICO",
        estadoFisico: "SOLIDO",
        requerPesagemFrequente: true,
        frequenciaPesagemDias: 30,
        ehHigroscopico: true,
        qtdEmQueEConsideradoEscasso: 5,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.ehHigroscopico).toBe(true);
      }
    });

    it("deve rejeitar estadoFisico GASOSO", () => {
      const res = CadastroResumoReagenteSchema.safeParse({
        idOperacao: "op-res-002",
        nome: "Gás Cloro",
        tipoSubstancia: "PURA",
        naturezaQuimica: "INORGANICO",
        estadoFisico: "GASOSO" as any,
        requerPesagemFrequente: false,
        qtdEmQueEConsideradoEscasso: 2,
      });
      expect(res.success).toBe(false);
    });

    it("deve rejeitar pesagem frequente sem dias positivos", () => {
      const res = CadastroResumoReagenteSchema.safeParse({
        idOperacao: "op-res-003",
        nome: "Reagente",
        tipoSubstancia: "PURA",
        naturezaQuimica: "ORGANICO",
        estadoFisico: "LIQUIDO",
        requerPesagemFrequente: true,
        frequenciaPesagemDias: null,
        qtdEmQueEConsideradoEscasso: 1,
      });
      expect(res.success).toBe(false);
    });

    it("deve rejeitar dias de pesagem quando não requer pesagem frequente", () => {
      const res = CadastroResumoReagenteSchema.safeParse({
        idOperacao: "op-res-004",
        nome: "Reagente",
        tipoSubstancia: "PURA",
        naturezaQuimica: "ORGANICO",
        estadoFisico: "LIQUIDO",
        requerPesagemFrequente: false,
        frequenciaPesagemDias: 15,
        qtdEmQueEConsideradoEscasso: 1,
      });
      expect(res.success).toBe(false);
    });
  });

  describe("ComposicaoSchema", () => {
    it("deve aceitar faixa válida com valorMin <= valorMax", () => {
      const res = ComposicaoSchema.safeParse({
        idSubstanciaQuimica: "subst_1",
        valorMin: 10,
        valorMax: 20,
        tipoConcentracao: "M_M",
        notacaoOriginalFabricante: "10-20% m/m",
      });
      expect(res.success).toBe(true);
    });

    it("deve rejeitar valorMin > valorMax", () => {
      const res = ComposicaoSchema.safeParse({
        idSubstanciaQuimica: "subst_1",
        valorMin: 30,
        valorMax: 20,
        tipoConcentracao: "M_M",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("CadastroEspecificacaoSchema", () => {
    it("deve validar link FISPQ HTTPS válido", () => {
      const res = CadastroEspecificacaoSchema.safeParse({
        idOperacao: "op-esp-001",
        idResumoReagente: "resumo_1",
        descricao: "Grau Analítico P.A.",
        classeInflamabilidade: "NAO_INFLAMAVEL",
        ehControladoPf: false,
        ehControladoEb: false,
        linkFdsFispq: "https://exemplo.com/fispq.pdf",
        idSubstanciaQuimica: "subst_1",
      });
      expect(res.success).toBe(true);
    });

    it("deve rejeitar link FISPQ que não seja HTTPS", () => {
      const res = CadastroEspecificacaoSchema.safeParse({
        idOperacao: "op-esp-002",
        idResumoReagente: "resumo_1",
        descricao: "Grau Analítico",
        classeInflamabilidade: "NAO_INFLAMAVEL",
        ehControladoPf: false,
        ehControladoEb: false,
        linkFdsFispq: "http://exemplo.com/fispq.pdf",
      });
      expect(res.success).toBe(false);
    });
  });
});

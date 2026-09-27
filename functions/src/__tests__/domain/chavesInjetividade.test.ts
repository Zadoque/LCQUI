import {
  chaveLocal,
  chaveMateria,
  chaveTurmaCodigo,
  decodificarChaveLocal,
  decodificarChaveMateria,
  normalizarCodigoMateria,
} from "../../chaves";

describe("Prova de Injetividade e Segurança de Chaves_Unicas", () => {
  describe("Local — Prova Construtiva e Casos Adversariais", () => {
    it("prova de inversibilidade à esquerda: decode(encode(x)) === x", () => {
      const casos: [string, string, string][] = [
        ["A", "1", "101"],
        ["Bloco A", "2", "Sala 204"],
        ["Bloco_E", "Andar_1", "Sala_E1"],
        ["A__B", "C", "D"],
        ["A", "B__C", "D"],
        ["A", "B", "C__D"],
        ["Prédio Químico", "1º Andar", "Laboratório de Síntese"],
        ["A/B/C", "1:2", "3_4_5"],
        ["   Espaço Inicial   ", "  Meio  ", "  Fim  "],
        ["🔬", "🧪", "⚗️"],
        ["", "", ""],
      ];

      for (const [p, a, s] of casos) {
        const chave = chaveLocal(p, a, s);
        const [pDec, aDec, sDec] = decodificarChaveLocal(chave);
        expect(pDec).toBe(p.trim());
        expect(aDec).toBe(a.trim());
        expect(sDec).toBe(s.trim());
      }
    });

    it("fronteiras deslizantes (boundary bleeding) com __ produzem chaves distintas", () => {
      const chaves = new Set<string>();
      const combinacoes: [string, string, string][] = [
        ["A__B", "C", "D"],
        ["A", "B__C", "D"],
        ["A", "B", "C__D"],
        ["A__", "B", "C"],
        ["A", "__B", "C"],
        ["A", "B__", "C"],
        ["A", "B", "__C"],
      ];

      for (const [p, a, s] of combinacoes) {
        const chave = chaveLocal(p, a, s);
        expect(chaves.has(chave)).toBe(false);
        chaves.add(chave);
      }
      expect(chaves.size).toBe(combinacoes.length);
    });

    it("fronteiras deslizantes com _ simples produzem chaves distintas", () => {
      const chaves = new Set<string>();
      const combinacoes: [string, string, string][] = [
        ["A_", "_B", "C"],
        ["A", "__B", "C"],
        ["A__", "B", "C"],
        ["A", "B", "C_"],
        ["A", "B_", "C"],
        ["A_B", "C", "D"],
        ["A", "B_C", "D"],
      ];

      for (const [p, a, s] of combinacoes) {
        const chave = chaveLocal(p, a, s);
        expect(chaves.has(chave)).toBe(false);
        chaves.add(chave);
      }
      expect(chaves.size).toBe(combinacoes.length);
    });

    it("nunca contém barra '/' — seguro como document ID no Firestore", () => {
      const chave = chaveLocal("Prédio/Central", "Andar/1", "Sala/101");
      expect(chave).not.toContain("/");
    });

    it("preserva caracteres Unicode e acentos sem perda de informação", () => {
      const chave1 = chaveLocal("Laboratório", "Térreo", "Sala Ó");
      const chave2 = chaveLocal("Laboratorio", "Terreo", "Sala O");
      expect(chave1).not.toBe(chave2);

      const [p, a, s] = decodificarChaveLocal(chave1);
      expect(p).toBe("Laboratório");
      expect(a).toBe("Térreo");
      expect(s).toBe("Sala Ó");
    });
  });

  describe("Matéria — Injetividade e Firestore Safety", () => {
    it("prova de inversibilidade à esquerda para código normalizado", () => {
      const codigos = [
        "QMC101",
        "QUI_1",
        "QUI__1",
        "QUI/101",
        "QUI:101",
        "MAT-01",
        "BIO 101",
        "FÍSICA",
      ];

      for (const cod of codigos) {
        const norm = normalizarCodigoMateria(cod);
        const chave = chaveMateria(norm);
        const dec = decodificarChaveMateria(chave);
        expect(dec).toBe(norm);
      }
    });

    it("códigos com '/' geram docId sem barra no Firestore", () => {
      const chave = chaveMateria(normalizarCodigoMateria("QUI/101"));
      expect(chave).not.toContain("/");
    });

    it("códigos com '__' e '_' não colidem entre si", () => {
      const k1 = chaveMateria(normalizarCodigoMateria("QUI__1"));
      const k2 = chaveMateria(normalizarCodigoMateria("QUI_1"));
      const k3 = chaveMateria(normalizarCodigoMateria("QUI___1"));
      expect(k1).not.toBe(k2);
      expect(k2).not.toBe(k3);
      expect(k1).not.toBe(k3);
    });

    it("preserva a normalização uniforme N(s) = trim().toUpperCase()", () => {
      const k1 = chaveMateria(normalizarCodigoMateria("  qmc101  "));
      const k2 = chaveMateria(normalizarCodigoMateria("QMC101"));
      expect(k1).toBe(k2);
    });
  });

  describe("Turma — Compatibilidade Normativa Seção 5", () => {
    it("Turma__{codigo} usa código alfanumérico estrito [A-Z0-9]{6}", () => {
      const k1 = chaveTurmaCodigo("ABC123");
      const k2 = chaveTurmaCodigo("XYZ789");
      expect(k1).toBe("Turma__ABC123");
      expect(k2).toBe("Turma__XYZ789");
      expect(k1).not.toBe(k2);
      expect(k1).not.toContain("/");
    });
  });
});

import {
  normalizarEmailConvite,
  normalizarMatriculaConvite,
  serializarPendenciaConvite,
  deserializarPendenciaConvite,
  derivarChavePendenciaConvite,
  gerarTokenConvite,
  hashTokenConvite,
  compararTokenConstantTime,
  isConviteExpirado,
} from "../../domain/convites";
import {
  chaveAlunoMatricula,
  decodificarChaveAlunoMatricula,
  chaveConvitePendente,
} from "../../chaves";

describe("Domínio de Convites (M11 / PRE11-03)", () => {
  describe("Normalização de E-mail", () => {
    it("aplica trim e lowercase", () => {
      expect(normalizarEmailConvite("  ALUNO.Teste@UFSC.BR  ")).toBe("aluno.teste@ufsc.br");
    });

    it("rejeita e-mail vazio ou apenas espaços", () => {
      expect(() => normalizarEmailConvite("")).toThrow(/vazio/);
      expect(() => normalizarEmailConvite("   ")).toThrow(/vazio/);
    });

    it("rejeita e-mail acima de 150 caracteres", () => {
      const longo = "a".repeat(140) + "@ufsc.br"; // 148 chars
      expect(normalizarEmailConvite(longo)).toBe(longo);
      const muitoLongo = "a".repeat(145) + "@ufsc.br"; // 153 chars
      expect(() => normalizarEmailConvite(muitoLongo)).toThrow(/150 caracteres/);
    });

    it("rejeita e-mail com formato sintático inválido", () => {
      expect(() => normalizarEmailConvite("invalido")).toThrow(/Formato de e-mail inválido/);
      expect(() => normalizarEmailConvite("aluno@")).toThrow(/Formato de e-mail inválido/);
      expect(() => normalizarEmailConvite("@ufsc.br")).toThrow(/Formato de e-mail inválido/);
    });
  });

  describe("Normalização de Matrícula", () => {
    it("preserva zeros iniciais e tipo textual", () => {
      expect(normalizarMatriculaConvite("00012345")).toBe("00012345");
      expect(normalizarMatriculaConvite("  01234  ")).toBe("01234");
    });

    it("retorna null para valores ausentes ou vazios", () => {
      expect(normalizarMatriculaConvite(null)).toBeNull();
      expect(normalizarMatriculaConvite(undefined)).toBeNull();
      expect(normalizarMatriculaConvite("")).toBeNull();
      expect(normalizarMatriculaConvite("   ")).toBeNull();
    });

    it("rejeita matrícula acima de 20 caracteres", () => {
      const ok = "12345678901234567890"; // 20 chars
      expect(normalizarMatriculaConvite(ok)).toBe(ok);
      const excesso = "123456789012345678901"; // 21 chars
      expect(() => normalizarMatriculaConvite(excesso)).toThrow(/20 caracteres/);
    });
  });

  describe("Serialização Canônica e Injetividade da Pendência", () => {
    it("prova de inversibilidade à esquerda: decode(encode(x)) === x", () => {
      const casosGlobal = [
        "aluno@ufsc.br",
        "teste.com.pontos@dominio.org",
        "aluno+tag@sub.ufsc.br",
      ];
      for (const email of casosGlobal) {
        const serializado = serializarPendenciaConvite("GLOBAL", null, email);
        const dec = deserializarPendenciaConvite(serializado);
        expect(dec.contexto).toBe("GLOBAL");
        expect(dec.idTurma).toBeNull();
        expect(dec.emailNormalizado).toBe(email);
      }

      const casosTurma: [string, string][] = [
        ["turma_101", "aluno@ufsc.br"],
        ["turma__com__underscores", "aluno@ufsc.br"],
        ["t/1:2", "outro@dominio.com"],
        ["turma_101", "aluno__bleeding@ufsc.br"],
      ];
      for (const [idTurma, email] of casosTurma) {
        const serializado = serializarPendenciaConvite("TURMA", idTurma, email);
        const dec = deserializarPendenciaConvite(serializado);
        expect(dec.contexto).toBe("TURMA");
        expect(dec.idTurma).toBe(idTurma);
        expect(dec.emailNormalizado).toBe(email);
      }
    });

    it("fronteiras deslizantes (boundary bleeding) produzem serializações distintas", () => {
      const s1 = serializarPendenciaConvite("TURMA", "T1__T2", "aluno@ufsc.br");
      const s2 = serializarPendenciaConvite("TURMA", "T1", "T2__aluno@ufsc.br");
      expect(s1).not.toBe(s2);

      const sGlobal = serializarPendenciaConvite("GLOBAL", null, "aluno@ufsc.br");
      const sTurma = serializarPendenciaConvite("TURMA", "GLOBAL", "aluno@ufsc.br");
      expect(sGlobal).not.toBe(sTurma);
    });

    it("rejeita contexto TURMA com idTurma ausente ou vazio", () => {
      expect(() => serializarPendenciaConvite("TURMA", null, "aluno@ufsc.br")).toThrow(/idTurma é obrigatório/);
      expect(() => serializarPendenciaConvite("TURMA", "", "aluno@ufsc.br")).toThrow(/idTurma é obrigatório/);
      expect(() => serializarPendenciaConvite("TURMA", "   ", "aluno@ufsc.br")).toThrow(/idTurma é obrigatório/);
    });
  });

  describe("Derivação HMAC da Pendência", () => {
    const secret = "segredo-de-teste-32-bytes-seguro!!";

    it("é determinístico para os mesmos parâmetros", () => {
      const hmac1 = derivarChavePendenciaConvite(secret, "TURMA", "t1", "aluno@ufsc.br");
      const hmac2 = derivarChavePendenciaConvite(secret, "TURMA", "t1", "aluno@ufsc.br");
      expect(hmac1).toBe(hmac2);
      expect(hmac1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("diferentes contextos para o mesmo e-mail produzem HMACs distintos", () => {
      const hmacGlobal = derivarChavePendenciaConvite(secret, "GLOBAL", null, "aluno@ufsc.br");
      const hmacTurma = derivarChavePendenciaConvite(secret, "TURMA", "turma_1", "aluno@ufsc.br");
      expect(hmacGlobal).not.toBe(hmacTurma);
    });

    it("diferentes turmas para o mesmo e-mail produzem HMACs distintos", () => {
      const hmacT1 = derivarChavePendenciaConvite(secret, "TURMA", "turma_1", "aluno@ufsc.br");
      const hmacT2 = derivarChavePendenciaConvite(secret, "TURMA", "turma_2", "aluno@ufsc.br");
      expect(hmacT1).not.toBe(hmacT2);
    });

    it("diferentes segredos produzem HMACs distintos", () => {
      const hmacA = derivarChavePendenciaConvite("segredo-a", "GLOBAL", null, "aluno@ufsc.br");
      const hmacB = derivarChavePendenciaConvite("segredo-b", "GLOBAL", null, "aluno@ufsc.br");
      expect(hmacA).not.toBe(hmacB);
    });

    it("falha fechado se segredo estiver ausente ou vazio", () => {
      expect(() => derivarChavePendenciaConvite("", "GLOBAL", null, "aluno@ufsc.br")).toThrow(/Segredo do servidor ausente/);
      expect(() => derivarChavePendenciaConvite("   ", "GLOBAL", null, "aluno@ufsc.br")).toThrow(/Segredo do servidor ausente/);
    });
  });

  describe("Geração, Hash e Comparação Timing-Safe de Token", () => {
    it("gera token de 32 bytes CSPRNG (64 hex) e hash SHA-256 correspondente", () => {
      const { token, tokenHash } = gerarTokenConvite();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(hashTokenConvite(token)).toBe(tokenHash);
    });

    it("chamadas consecutivas geram tokens distintos", () => {
      const t1 = gerarTokenConvite();
      const t2 = gerarTokenConvite();
      expect(t1.token).not.toBe(t2.token);
      expect(t1.tokenHash).not.toBe(t2.tokenHash);
    });

    it("compararTokenConstantTime valida token correto e rejeita incorreto", () => {
      const { token, tokenHash } = gerarTokenConvite();
      expect(compararTokenConstantTime(token, tokenHash)).toBe(true);
      expect(compararTokenConstantTime(token + "a", tokenHash)).toBe(false);
      expect(compararTokenConstantTime("outro_token_errado", tokenHash)).toBe(false);
      expect(compararTokenConstantTime("", tokenHash)).toBe(false);
      expect(compararTokenConstantTime(token, "")).toBe(false);
    });
  });

  describe("Verificação de Expiração", () => {
    it("detecta convite expirado e não-expirado", () => {
      const agora = new Date("2026-09-27T12:00:00Z");
      const futuro = new Date("2026-09-28T12:00:00Z");
      const passado = new Date("2026-09-26T12:00:00Z");

      expect(isConviteExpirado(passado, agora)).toBe(true);
      expect(isConviteExpirado(futuro, agora)).toBe(false);
      expect(isConviteExpirado(agora, agora)).toBe(true); // instante exato já é expirado (>=)
    });

    it("suporta Timestamp do Firestore com método toMillis", () => {
      const agora = new Date("2026-09-27T12:00:00Z");
      const mockTimestamp = {
        toMillis: () => new Date("2026-09-20T00:00:00Z").getTime(),
      };
      expect(isConviteExpirado(mockTimestamp, agora)).toBe(true);
    });
  });

  describe("Chaves_Unicas para Aluno e ConvitePendente", () => {
    it("chaveAlunoMatricula é injetiva e inversível", () => {
      const matriculas = ["00123", "20109999", "A-99/1", "  2026.1  "];
      for (const m of matriculas) {
        const chave = chaveAlunoMatricula(m);
        expect(chave.startsWith("Aluno__")).toBe(true);
        expect(decodificarChaveAlunoMatricula(chave)).toBe(m.trim());
      }
    });

    it("chaveConvitePendente gera formato normativo ConvitePendente__<hmac>", () => {
      const chave = chaveConvitePendente("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
      expect(chave).toBe("ConvitePendente__0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
    });
  });
});

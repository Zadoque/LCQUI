import test from "node:test";
import assert from "node:assert/strict";

import {
  construirPayloadAceitarConvite,
  construirPayloadAcessoConvite,
  construirPayloadConvidarAluno,
  construirPayloadRejeitarConvite,
} from "../lib/convitesPayload.mjs";

test("convite ordinário omite matrícula e justificativa opcionais", () => {
  const payload = construirPayloadConvidarAluno({
    idOperacao: "op-convite-1",
    email: "aluno@uenf.br",
    idTurma: "turma-1",
    matricula: "  ",
    excederCapacidade: false,
    justificativaExcecao: "  ",
  });

  assert.equal(Object.hasOwn(payload, "matricula"), false);
  assert.equal(Object.hasOwn(payload, "justificativaExcecao"), false);
  assert.equal(payload.idTurma, "turma-1");
});

test("convite excepcional inclui somente valores opcionais não vazios", () => {
  const payload = construirPayloadConvidarAluno({
    idOperacao: "op-convite-2",
    email: "aluno@uenf.br",
    idTurma: "turma-1",
    matricula: " 001234 ",
    excederCapacidade: true,
    justificativaExcecao: "  Exceção nominal documentada. ",
  });

  assert.equal(payload.matricula, "001234");
  assert.equal(payload.justificativaExcecao, "Exceção nominal documentada.");
});

test("aceite externo envia token e omite marcador e dados pessoais vazios", () => {
  const payload = construirPayloadAceitarConvite({
    idOperacao: "op-aceite-1",
    idConvite: "convite-1",
    tokenConvite: " token-seguro ",
    nomeInformado: "  ",
    matriculaInformada: "  ",
  });

  assert.equal(payload.tokenConvite, "token-seguro");
  assert.equal(Object.hasOwn(payload, "viaNotificacao"), false);
  assert.equal(Object.hasOwn(payload, "nomeInformado"), false);
  assert.equal(Object.hasOwn(payload, "matriculaInformada"), false);
});

test("aceite interno envia viaNotificacao true e omite token", () => {
  const payload = construirPayloadAceitarConvite({
    idOperacao: "op-aceite-2",
    idConvite: "convite-2",
    tokenConvite: "",
    nomeInformado: " Aluno Novo ",
    matriculaInformada: " 000045 ",
  });

  assert.equal(payload.viaNotificacao, true);
  assert.equal(Object.hasOwn(payload, "tokenConvite"), false);
  assert.equal(payload.nomeInformado, "Aluno Novo");
  assert.equal(payload.matriculaInformada, "000045");
});

test("detalhes e rejeição omitem token ausente e preservam token externo", () => {
  const detalhesInterno = construirPayloadAcessoConvite("convite-3", "");
  const rejeicaoInterna = construirPayloadRejeitarConvite("op-rejeitar-1", "convite-3", "");
  const rejeicaoExterna = construirPayloadRejeitarConvite("op-rejeitar-2", "convite-4", " token ");

  assert.equal(Object.hasOwn(detalhesInterno, "tokenConvite"), false);
  assert.equal(Object.hasOwn(rejeicaoInterna, "tokenConvite"), false);
  assert.equal(rejeicaoExterna.tokenConvite, "token");
});

import test from "node:test";
import assert from "node:assert";

// Réplica da função pura buildDeepLink de NotificacoesDropdown.tsx
function buildDeepLink(notif) {
  switch (notif.entidade_alvo) {
    case "Convite_Aluno":
      return `/convite?id=${encodeURIComponent(notif.id_alvo)}&via=notificacao`;
    case "Bem_Patrimonial":
      return `/patrimonio/${encodeURIComponent(notif.id_alvo)}`;
    case "Requisicao_Bem":
      return `/patrimonio/requisicoes`;
    case "Turma":
      return `/turmas?turma=${encodeURIComponent(notif.id_alvo)}`;
    case "Post":
      return notif.id_turma
        ? `/turmas?turma=${encodeURIComponent(notif.id_turma)}`
        : null;
    case "Comentario":
      return notif.id_turma
        ? `/turmas?turma=${encodeURIComponent(notif.id_turma)}`
        : null;
    case "Roteiro":
      return "/turmas?roteiros=1";
    default:
      return null;
  }
}

// --- Convite_Aluno ---

test("DEEPLINK-001 — Convite_Aluno gera link /convite?id=...&via=notificacao", () => {
  const notif = { entidade_alvo: "Convite_Aluno", id_alvo: "conv_abc_123" };
  const link = buildDeepLink(notif);
  assert.strictEqual(link, "/convite?id=conv_abc_123&via=notificacao");
});

test("DEEPLINK-002 — Convite_Aluno escapa caracteres especiais no id_alvo", () => {
  const notif = { entidade_alvo: "Convite_Aluno", id_alvo: "conv/esp@cial" };
  const link = buildDeepLink(notif);
  assert.strictEqual(link.includes("conv%2Fesp%40cial"), true);
});

// --- Bem_Patrimonial ---

test("DEEPLINK-003 — Bem_Patrimonial gera link /patrimonio/<id>", () => {
  const notif = { entidade_alvo: "Bem_Patrimonial", id_alvo: "bem_42" };
  const link = buildDeepLink(notif);
  assert.strictEqual(link, "/patrimonio/bem_42");
});

test("DEEPLINK-004 — Bem_Patrimonial escapa caracteres especiais", () => {
  const notif = { entidade_alvo: "Bem_Patrimonial", id_alvo: "bem/1" };
  const link = buildDeepLink(notif);
  assert.strictEqual(link, "/patrimonio/bem%2F1");
});

// --- Requisicao_Bem ---

test("DEEPLINK-005 — Requisicao_Bem gera link /patrimonio/requisicoes", () => {
  const notif = { entidade_alvo: "Requisicao_Bem", id_alvo: "req_99" };
  const link = buildDeepLink(notif);
  assert.strictEqual(link, "/patrimonio/requisicoes");
});

// --- Turma ---

test("DEEPLINK-006 — Turma gera link /turmas?turma=<id>", () => {
  const notif = { entidade_alvo: "Turma", id_alvo: "turma_xyz" };
  const link = buildDeepLink(notif);
  assert.strictEqual(link, "/turmas?turma=turma_xyz");
});

// --- Post ---

test("DEEPLINK-007 — Post com id_turma gera link /turmas?turma=<id_turma>", () => {
  const notif = { entidade_alvo: "Post", id_alvo: "post_1", id_turma: "turma_abc" };
  const link = buildDeepLink(notif);
  assert.strictEqual(link, "/turmas?turma=turma_abc");
});

test("DEEPLINK-008 — Post sem id_turma retorna null", () => {
  const notif = { entidade_alvo: "Post", id_alvo: "post_1", id_turma: null };
  const link = buildDeepLink(notif);
  assert.strictEqual(link, null);
});

test("DEEPLINK-009 — Post com id_turma undefined retorna null", () => {
  const notif = { entidade_alvo: "Post", id_alvo: "post_1" };
  const link = buildDeepLink(notif);
  assert.strictEqual(link, null);
});

// --- Comentario ---

test("DEEPLINK-010 — Comentario com id_turma gera link /turmas?turma=<id_turma>", () => {
  const notif = { entidade_alvo: "Comentario", id_alvo: "coment_1", id_turma: "turma_def" };
  const link = buildDeepLink(notif);
  assert.strictEqual(link, "/turmas?turma=turma_def");
});

test("DEEPLINK-011 — Comentario sem id_turma retorna null", () => {
  const notif = { entidade_alvo: "Comentario", id_alvo: "coment_1", id_turma: null };
  const link = buildDeepLink(notif);
  assert.strictEqual(link, null);
});

// --- Entidades sem rota ---

test("DEEPLINK-012 — Roteiro gera link /turmas?roteiros=1", () => {
  const notif = { entidade_alvo: "Roteiro", id_alvo: "rot_1" };
  assert.strictEqual(buildDeepLink(notif), "/turmas?roteiros=1");
});

test("DEEPLINK-013 — Almoxarifado retorna null (sem rota implementada)", () => {
  const notif = { entidade_alvo: "Almoxarifado", id_alvo: "alm_1" };
  assert.strictEqual(buildDeepLink(notif), null);
});

test("DEEPLINK-014 — Emprestimo retorna null (sem rota implementada)", () => {
  const notif = { entidade_alvo: "Emprestimo", id_alvo: "emp_1" };
  assert.strictEqual(buildDeepLink(notif), null);
});

test("DEEPLINK-015 — Usuario retorna null (sem rota implementada)", () => {
  const notif = { entidade_alvo: "Usuario", id_alvo: "usr_1" };
  assert.strictEqual(buildDeepLink(notif), null);
});

test("DEEPLINK-016 — entidade_alvo ausente/undefined retorna null", () => {
  const notif = { id_alvo: "x" };
  assert.strictEqual(buildDeepLink(notif), null);
});

test("DEEPLINK-017 — entidade_alvo desconhecida retorna null", () => {
  const notif = { entidade_alvo: "Desconhecido", id_alvo: "x" };
  assert.strictEqual(buildDeepLink(notif), null);
});

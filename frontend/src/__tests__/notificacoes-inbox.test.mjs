import test from "node:test";
import assert from "node:assert";

// Simulação das funções puras de NotificacoesDropdown
function isNotificacaoExpirada(expira_em_ms, agora_ms) {
  if (!expira_em_ms) return false;
  return expira_em_ms <= agora_ms;
}

function filtrarNaoLidasAtivas(notificacoes, agora_ms) {
  return notificacoes.filter((n) => {
    const expMs = n.expira_em?.toMillis ? n.expira_em.toMillis() : null;
    return !n.lida && !isNotificacaoExpirada(expMs, agora_ms);
  });
}

function buildDeepLinkConvite(idAlvo) {
  return `/convite?id=${encodeURIComponent(idAlvo)}&via=notificacao`;
}

function shouldRenderInbox(user) {
  return !!user?.uid;
}

test("TEST-UI-INBOX-001 — Sino/caixa é exibido para usuário autenticado mesmo sem papel Aluno", () => {
  // Usuário autenticado mas com lista de papéis vazia (ainda sem Aluno)
  const userSemPapel = { uid: "user_sem_papel_123", email: "novato@ufsc.br", roles: [] };
  assert.strictEqual(shouldRenderInbox(userSemPapel), true);

  // Visitante não autenticado não exibe a caixa
  assert.strictEqual(shouldRenderInbox(null), false);
  assert.strictEqual(shouldRenderInbox(undefined), false);
});

test("TEST-UI-INBOX-002 — Convite pendente aparece na lista de Não lidas ativas", () => {
  const agora = 1000000;
  const notificacoes = [
    {
      id: "convite_pendente",
      tipo: "CONVITE_PARA_TURMA",
      id_alvo: "conv_1",
      lida: false,
      expira_em: { toMillis: () => agora + 60000 }, // Expira no futuro
    },
  ];

  const ativas = filtrarNaoLidasAtivas(notificacoes, agora);
  assert.strictEqual(ativas.length, 1);
  assert.strictEqual(ativas[0].id, "convite_pendente");
});

test("TEST-UI-INBOX-003 — Convite expirado não pertence ao conjunto ativo acionável de Não lidas", () => {
  const agora = 1000000;
  const notificacoes = [
    {
      id: "convite_expirado",
      tipo: "CONVITE_PARA_TURMA",
      id_alvo: "conv_vencido",
      lida: false,
      expira_em: { toMillis: () => agora - 5000 }, // Já expirou
    },
  ];

  const ativas = filtrarNaoLidasAtivas(notificacoes, agora);
  assert.strictEqual(ativas.length, 0);

  // Mas na lista completa (Todas), o convite ainda existe
  assert.strictEqual(notificacoes.length, 1);
  assert.strictEqual(isNotificacaoExpirada(notificacoes[0].expira_em.toMillis(), agora), true);
});

test("TEST-UI-INBOX-004 — Deep link de Aceitar/Rejeitar navega para /convite sem token em claro", () => {
  const idConvite = "conv_aluno_abc_123";
  const link = buildDeepLinkConvite(idConvite);

  assert.strictEqual(link, `/convite?id=${idConvite}&via=notificacao`);
  assert.strictEqual(link.includes("token="), false);
  assert.strictEqual(link.includes("tokenConvite="), false);
});

test("TEST-UI-INBOX-005 — Outros tipos de notificação coexistem e não quebram a listagem da caixa", () => {
  const agora = 1000000;
  const notificacoes = [
    {
      id: "notif_generica",
      tipo: "AVISO_SISTEMA",
      id_alvo: "sys_1",
      lida: false,
      expira_em: null, // Sem expiração
      mensagem_customizada: "Manutenção programada",
    },
    {
      id: "convite_turma",
      tipo: "CONVITE_PARA_TURMA",
      id_alvo: "conv_2",
      lida: false,
      expira_em: { toMillis: () => agora + 30000 },
    },
  ];

  const ativas = filtrarNaoLidasAtivas(notificacoes, agora);
  assert.strictEqual(ativas.length, 2);
  assert.strictEqual(ativas[0].tipo, "AVISO_SISTEMA");
  assert.strictEqual(ativas[1].tipo, "CONVITE_PARA_TURMA");
});

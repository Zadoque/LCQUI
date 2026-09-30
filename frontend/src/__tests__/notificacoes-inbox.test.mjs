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

// --- mensagemContextual (UI-12 V1) ---

const TIPOS_ACADEMICOS_V1 = new Set([
  "POST", "COMENTARIO", "ADICIONADO", "REMOVIDO",
  "TURMA_ARQUIVADA", "TURMA_DESARQUIVADA",
  "CONVITE_PARA_TURMA",
]);

const ROTULO_TIPO = {
  POST: "Nova postagem",
  COMENTARIO: "Novo comentário",
  ADICIONADO: "Adicionado à turma",
  REMOVIDO: "Removido da turma",
  TURMA_ARQUIVADA: "Turma arquivada",
  TURMA_DESARQUIVADA: "Turma desarquivada",
  ROTEIRO_COMPARTILHADO: "Roteiro compartilhado",
  CONVITE_PARA_TURMA: "Convite para turma",
  REQUISICAO_EDICAO_BEM: "Requisição de edição de bem",
  REQUISICAO_ADICAO_BEM: "Requisição de adição de bem",
  ESCASSEZ_ESTOQUE: "Escassez no estoque",
};

function mensagemContextual(notif) {
  const rotulo = ROTULO_TIPO[notif.tipo] ?? notif.tipo.replace(/_/g, " ");
  if (TIPOS_ACADEMICOS_V1.has(notif.tipo)) {
    if (notif.tipo === "CONVITE_PARA_TURMA") {
      return "Você recebeu um convite para ingressar em uma turma acadêmica.";
    }
    if (notif.mensagem_customizada) {
      return notif.mensagem_customizada;
    }
    return `${rotulo} na turma.`;
  }
  if (notif.mensagem_customizada) {
    return notif.mensagem_customizada;
  }
  return rotulo;
}

test("TEST-UI-INBOX-006 — CONVITE_PARA_TURMA sempre usa mensagem fixa", () => {
  const msg = mensagemContextual({
    tipo: "CONVITE_PARA_TURMA",
    id_alvo: "conv1",
    mensagem_customizada: "Ignorado",
  });
  assert.strictEqual(msg, "Você recebeu um convite para ingressar em uma turma acadêmica.");
});

test("TEST-UI-INBOX-007 — tipo acadêmico V1 com mensagem_customizada usa ela", () => {
  const msg = mensagemContextual({
    tipo: "POST",
    id_alvo: "post1",
    mensagem_customizada: "Novo post em Química Geral",
  });
  assert.strictEqual(msg, "Novo post em Química Geral");
});

test("TEST-UI-INBOX-008 — tipo acadêmico V1 sem customizada usa rótulo contextual", () => {
  const msg = mensagemContextual({
    tipo: "TURMA_ARQUIVADA",
    id_alvo: "turma1",
  });
  assert.strictEqual(msg, "Turma arquivada na turma.");
});

test("TEST-UI-INBOX-009 — tipo operacional com customizada usa ela", () => {
  const msg = mensagemContextual({
    tipo: "ESCASSEZ_ESTOQUE",
    id_alvo: "almo1",
    mensagem_customizada: "Estoque baixo de HCl",
  });
  assert.strictEqual(msg, "Estoque baixo de HCl");
});

test("TEST-UI-INBOX-010 — tipo operacional sem customizada usa rótulo", () => {
  const msg = mensagemContextual({
    tipo: "REQUISICAO_EDICAO_BEM",
    id_alvo: "req1",
  });
  assert.strictEqual(msg, "Requisição de edição de bem");
});

// --- construirEstadoAutenticacao (bootstrap) ---

function extrairPapeisClaims(valor) {
  if (!Array.isArray(valor)) return [];
  const PAPEIS = new Set(["Chefe_Geral", "Gestor_Almoxarifado", "Gestor_Bens_Patrimoniais", "Professor", "Aluno", "Bolsista"]);
  return [...new Set(valor.filter((p) => typeof p === "string" && PAPEIS.has(p)))];
}

function construirEstadoAutenticacao(rolesClaim, versaoPermissoes, ativoClaim) {
  const roles = extrairPapeisClaims(rolesClaim);
  const ativo = typeof ativoClaim === "boolean"
    ? ativoClaim
    : typeof versaoPermissoes === "number" && versaoPermissoes >= 1;
  return { roles, ativo };
}

test("TEST-UI-INBOX-011 — zero papéis com ativo=true no claim resulta ativo=true (bootstrap)", () => {
  const estado = construirEstadoAutenticacao([], 1, true);
  assert.deepStrictEqual(estado, { roles: [], ativo: true });
});

test("TEST-UI-INBOX-012 — zero papéis sem ativo claim mas com versao_permissoes >= 1 resulta ativo=true (fallback)", () => {
  const estado = construirEstadoAutenticacao([], 1, undefined);
  assert.deepStrictEqual(estado, { roles: [], ativo: true });
});

test("TEST-UI-INBOX-013 — com papéis e ativo=true resulta ativo=true", () => {
  const estado = construirEstadoAutenticacao(["Aluno"], 1, true);
  assert.deepStrictEqual(estado, { roles: ["Aluno"], ativo: true });
});

test("TEST-UI-INBOX-014 — conta desativada com versao_permissoes >= 1 mas ativo=false resulta ativo=false", () => {
  const estado = construirEstadoAutenticacao([], 2, false);
  assert.deepStrictEqual(estado, { roles: [], ativo: false });
});

test("TEST-UI-INBOX-015 — sem versao_permissoes e sem ativo resulta ativo=false (desativado)", () => {
  const estado = construirEstadoAutenticacao([], undefined, undefined);
  assert.deepStrictEqual(estado, { roles: [], ativo: false });
});

test("TEST-UI-INBOX-016 — ROTEIRO_COMPARTILHADO é tipo operacional, usa rótulo simples", () => {
  const msg = mensagemContextual({
    tipo: "ROTEIRO_COMPARTILHADO",
    id_alvo: "roteiro1",
  });
  assert.strictEqual(msg, "Roteiro compartilhado");
});

test("TEST-UI-INBOX-017 — ROTEIRO_COMPARTILHADO com customizada usa ela (operacional)", () => {
  const msg = mensagemContextual({
    tipo: "ROTEIRO_COMPARTILHADO",
    id_alvo: "roteiro1",
    mensagem_customizada: "Professor Beta compartilhou um roteiro",
  });
  assert.strictEqual(msg, "Professor Beta compartilhou um roteiro");
});

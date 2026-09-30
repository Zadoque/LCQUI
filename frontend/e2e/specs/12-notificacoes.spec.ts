import { test, expect } from "../fixtures";
import {
  abrirNotificacoes,
  abrirNovoAlunoModal,
  capturarCallable,
  convidarAluno,
  esperarCallable,
  lerResultadoCallable,
  login,
  logout,
} from "../helpers/ui";
import { listarColecao } from "../helpers/emulator";

/**
 * Vertical de notificações (M13, UI-12).
 *
 * Cobre: bootstrap (conta sem papel vê sino e aceita convite via notificação),
 * "Limpar tudo", marcação individual, enum e mensagens contextuais.
 *
 * Serial: NOTIF-001 torna aluno.authonly membro de seed-turma-colegas;
 * NOTIF-002 arquiva essa turma e testa "Limpar tudo";
 * NOTIF-003 desarquiva para gerar TURMA_DESARQUIVADA (não-CONVITE) e
 * exercitar o botão marcar-lida.
 */
test.describe.serial("Notificações UI-12", () => {
  test("E2E-NOTIF-001 conta sem papel vê sino e aceita convite via notificação", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(/Erro ao obter detalhes do convite/);

    // Professor convida o aluno authOnly COM matrícula (como E2E-009),
    // garantindo matricula_necessaria=false no detalhe e no aceite.
    // Usa T3 Colegas em vez de T1 Vazia, pois E2E-009 já matriculou
    // aluno.authonly em T1 Vazia.
    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "T3 Colegas");
    const conviteChamadas = capturarCallable(page, "convidarAluno");
    await convidarAluno(page, {
      turmaId: "seed-turma-colegas",
      emails: "aluno.authonly@lcqui.local",
      matricula: "2026000777",
    });
    await expect(page.getByText("Convite(s) registrado(s) com sucesso.")).toBeVisible();
    const dadosConvite = conviteChamadas[0].payload.data as Record<string, unknown>;
    expect(dadosConvite.matricula).toBe("2026000777");

    // Fechar modal antes de logout (overlay intercepta pointer events)
    await page.goto("/turmas");
    await logout(page);

    // Aluno sem papel loga — NÃO deve ir para /desativado (bootstrap fix)
    await login(page, "aluno.authonly@lcqui.local");
    // Deve ficar no layout normal (com header) e não em /desativado
    await expect(page.getByRole("banner")).toBeVisible();

    // O sino deve estar montado
    await expect(
      page.getByRole("button", { name: "Notificações", exact: true })
    ).toBeVisible();

    // Abrir a caixa de notificações
    await page.goto("/turmas");
    await abrirNotificacoes(page);
    await expect(page.getByText("Convite para Turma")).toBeVisible();
    await expect(page.getByText("Pendente")).toBeVisible();

    // Clicar em "Acessar Convite" para ir à página de aceite
    const detalhesPromise = page.waitForResponse((resposta) =>
      resposta.url().includes("obterDetalhesConviteAluno")
    );
    await page.getByRole("link", { name: "Acessar Convite" }).click();
    await page.waitForURL(/\/convite\?id=/);
    await expect(page.getByRole("heading", { name: "Convite de Aluno" })).toBeVisible();

    const detalhes = await lerResultadoCallable(await detalhesPromise);
    // Convite com matrícula ⇒ destinatário não tem perfil Aluno, mas convite
    // já traz matrícula ⇒ matricula_necessaria = false
    expect(detalhes.matricula_necessaria).toBe(false);

    // Aceitar o convite via notificação
    const aceiteChamadas = capturarCallable(page, "aceitarConviteAluno");
    const aceiteResponse = esperarCallable(page, "aceitarConviteAluno");
    await page.getByRole("button", { name: "Confirmar e Ingressar" }).click();
    await aceiteResponse;
    await expect(page.getByRole("heading", { name: "Convite Aceito!" })).toBeVisible();

    expect(aceiteChamadas).toHaveLength(1);
    const dadosAceite = aceiteChamadas[0].payload.data as Record<string, unknown>;
    expect(dadosAceite.viaNotificacao).toBe(true);

    // O refresh de claims deve publicar Aluno sem relogin
    const link = page.getByRole("link", { name: "Acessar Minhas Turmas" });
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL(/\/turmas/);
    await expect(
      page.getByRole("banner").getByText("Aluno", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Química Geral — T3 Colegas/ })
    ).toBeVisible();

    // A notificação CONVITE_PARA_TURMA foi marcada como lida pelo aceite
    const notificacoes = await listarColecao(
      "Usuarios/seed-aluno-auth-only/Notificacoes"
    );
    const conviteNotif = notificacoes.find(
      (n) => n.data.tipo === "CONVITE_PARA_TURMA"
    );
    expect(conviteNotif).toBeTruthy();
    expect(conviteNotif!.data.lida).toBe(true);
  });

  test("E2E-NOTIF-002 Limpar tudo marca não lidas como lidas", async ({
    page,
  }) => {
    // Após NOTIF-001, aluno.authonly é membro de seed-turma-colegas.
    // Arquivar a turma emite TURMA_ARQUIVADA para o membro.
    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/turmas");

    // Selecionar a turma para abrir o painel de detalhe (FeedTurma)
    await page
      .getByRole("button", { name: /Química Geral — T3 Colegas/ })
      .click();

    // Arquivar (requer confirmação no diálogo próprio)
    const arqChamada = esperarCallable(page, "alterarStatusTurma");
    await page.getByTestId("botao-arquivar-turma").click();
    await page.getByTestId("confirmar-arquivar-turma").click();
    await arqChamada;

    await logout(page);

    // Logar como aluno.authonly — deve ter notificação TURMA_ARQUIVADA
    await login(page, "aluno.authonly@lcqui.local");
    await page.goto("/turmas");
    await abrirNotificacoes(page);

    // Deve haver ao menos uma notificação não lida
    await expect(page.getByText(/novas/)).toBeVisible();

    // Clicar em "Limpar tudo"
    await page.getByTestId("botao-limpar-tudo").click();

    // Confirmar na UI própria (não usa confirm/prompt nativo)
    const limparChamada = esperarCallable(page, "limparTudoNotificacoes");
    await page.getByTestId("confirmar-limpar-tudo").click();
    await limparChamada;

    // Após limpar, não deve haver não lidas ativas
    await expect(
      page.getByText("Nenhuma notificação pendente no momento.")
    ).toBeVisible();

    // Verificar no Firestore que as notificações ativas foram marcadas como lidas
    const notificacoes = await listarColecao(
      "Usuarios/seed-aluno-auth-only/Notificacoes"
    );
    const ativasNaoLidas = notificacoes.filter((n) => {
      if (n.data.lida === true) return false;
      const expira = n.data.expira_em;
      if (!expira) return true; // sem expiração = ativo
      const expiraMs = new Date(expira as string).getTime();
      return expiraMs > Date.now();
    });
    expect(ativasNaoLidas.length).toBe(0);
  });

  test("E2E-NOTIF-003 marcar notificação individual como lida", async ({
    page,
  }) => {
    // Após NOTIF-002, seed-turma-colegas está arquivada e todas as notificações
    // de aluno.authonly foram marcadas como lidas. Desarquivar gera
    // TURMA_DESARQUIVADA (não-CONVITE), que possui o botão marcar-lida.
    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/turmas");

    // Acessar turmas arquivadas e desarquivar
    await page.getByRole("button", { name: /Turmas Arquivadas/ }).click();
    const linha = page.getByTestId("linha-turma-arquivada-seed-turma-colegas");
    await expect(linha).toBeVisible();

    const desarqChamada = esperarCallable(page, "alterarStatusTurma");
    await linha.getByTestId("botao-desarquivar-turma").click();
    await desarqChamada;

    // Fechar o modal "Turmas Arquivadas" antes de logout (overlay intercepta pointer events)
    await page.getByTestId("botao-fechar-turmas-arquivadas").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await logout(page);

    // Logar como aluno.authonly — deve ter notificação TURMA_DESARQUIVADA
    await login(page, "aluno.authonly@lcqui.local");
    await page.goto("/turmas");
    await abrirNotificacoes(page);

    // Deve haver ao menos uma notificação não lida
    await expect(page.getByText(/novas/)).toBeVisible();

    // Notificações não-CONVITE (como TURMA_DESARQUIVADA) têm o botão marcar-lida
    const marcarBtn = page.getByTestId(/marcar-lida-/).first();
    await expect(marcarBtn).toBeVisible();

    // Clicar para marcar como lida
    const marcarChamada = esperarCallable(page, "marcarNotificacaoComoLida");
    await marcarBtn.click();
    await marcarChamada;

    // Verificar no Firestore que a notificação TURMA_DESARQUIVADA foi marcada
    const notificacoes = await listarColecao(
      "Usuarios/seed-aluno-auth-only/Notificacoes"
    );
    const desarquivadaNotif = notificacoes.find(
      (n) => n.data.tipo === "TURMA_DESARQUIVADA"
    );
    expect(desarquivadaNotif).toBeTruthy();
    expect(desarquivadaNotif!.data.lida).toBe(true);
    expect(desarquivadaNotif!.data.lida_em).not.toBeNull();
  });
});

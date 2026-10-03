import { test, expect } from "../fixtures";
import {
  login,
  logout,
  abrirNotificacoes,
  esperarCallable,
} from "../helpers/ui";
import { listarColecao } from "../helpers/emulator";

// E2E-NOTIF-004 — página dedicada /notificacoes (S8 UI-12)
test.describe.serial("Notificações UI-12 — página dedicada", () => {
  let turmaArquivada = false;

  test("deve exibir a página /notificacoes com aba de não lidas e todas as notificações, permitir marcar como lida e restaurar turma arquivada", async ({
    page,
    guardaConsole,
  }) => {
    // Permite erros esperados ao ouvir notificações ou falhas de carregamento
    guardaConsole.permitir(
      /Erro ao ouvir notificações/, 
      /Failed to load resource: the server responded with a status of (?:400|403)/
    );

    // 1. Professor arquiva turma
    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/turmas");

    await page.getByRole("button", { name: /Química Geral — T3 Colegas/ }).click();

    const arq = esperarCallable(page, "alterarStatusTurma");
    await page.getByTestId("botao-arquivar-turma").click();
    await page.getByTestId("confirmar-arquivar-turma").click();
    await arq;
    turmaArquivada = true;

    await logout(page);

    // 2. Aluno acessa notificações
    await login(page, "aluno.colega.a@lcqui.local");
    await page.goto("/turmas");
    await abrirNotificacoes(page);

    await page.getByTestId("link-ver-todas").click();
    await page.waitForURL(/\/notificacoes/);

    // 3. Assertivas da página (escopadas ao container para evitar ambiguidade com Header)
    const pagina = page.getByTestId("pagina-notificacoes");
    await expect(pagina).toBeVisible();
    await expect(page.getByTestId("aba-nao-lidas")).toBeVisible();
    await expect(page.getByTestId("aba-todas")).toBeVisible();

    await expect(pagina.getByText("Turma arquivada", { exact: true })).toBeVisible();
    await expect(pagina.getByText("Aluno", { exact: true })).toBeVisible();

    await expect(pagina.getByTestId(/notif-link-/).first()).toBeVisible();

    // 4. Marcar como lida (determinístico: busca ID da notificação TURMA_ARQUIVADA no Firestore)
    const notifsAntes = await listarColecao("Usuarios/seed-aluno-colega-a/Notificacoes");
    const arqNotif = notifsAntes.find((n) => n.data.tipo === "TURMA_ARQUIVADA" && !n.data.lida);
    expect(arqNotif).toBeTruthy();

    const marcar = esperarCallable(page, "marcarNotificacaoComoLida");
    await page.getByTestId(`marcar-lida-${arqNotif!.id}`).click();
    await marcar;

    const notifsDepois = await listarColecao("Usuarios/seed-aluno-colega-a/Notificacoes");
    const arq2 = notifsDepois.find((n) => n.data.tipo === "TURMA_ARQUIVADA");
    expect(arq2).toBeTruthy();
    expect(arq2!.data.lida).toBe(true);

    // 5. Cleanup: restaurar turma
    await logout(page);
    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/turmas");
    await page.getByRole("button", { name: /Turmas Arquivadas/ }).click();

    const linha = page.getByTestId("linha-turma-arquivada-seed-turma-colegas");
    await expect(linha).toBeVisible();

    const desarq = esperarCallable(page, "alterarStatusTurma");
    await linha.getByTestId("botao-desarquivar-turma").click();
    await desarq;
    turmaArquivada = false;

    await page.getByTestId("botao-fechar-turmas-arquivadas").click();
  });

  // Garante restauração mesmo se o teste falhar antes do cleanup inline
  test.afterAll(async ({ browser }) => {
    if (!turmaArquivada) return;
    const baseURL = process.env.LCQUI_E2E_BASE_URL ?? "http://localhost:3000";
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/login`);
      await page.locator('input[type="email"]').fill("professor.alpha@lcqui.local");
      await page.locator('input[type="password"]').fill("Test123456!");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page.waitForURL((url) => !url.pathname.startsWith("/login"));

      await page.goto(`${baseURL}/turmas`);
      await page.getByRole("button", { name: /Turmas Arquivadas/ }).click();

      const linha = page.getByTestId("linha-turma-arquivada-seed-turma-colegas");
      await expect(linha).toBeVisible({ timeout: 10_000 });

      const desarq = esperarCallable(page, "alterarStatusTurma");
      await linha.getByTestId("botao-desarquivar-turma").click();
      await desarq;
    } catch {
      // Best-effort: o próximo seed corrigirá o estado
    } finally {
      await context.close();
    }
  });
});

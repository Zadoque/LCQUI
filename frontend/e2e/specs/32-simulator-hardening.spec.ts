import { test, expect } from "../fixtures";
import { login, esperarCallable, lerResultadoCallable } from "../helpers/ui";
import { criarNotificacaoEmulada, removerDocumentoEmulado } from "../helpers/emulator";

test.setTimeout(90_000);

test.describe("Validações E2E adicionais no Emulator Suite", () => {
  test("AUTH-003-E2E-003 recupera de falha de rede pelo botão de retry", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/ERR_INTERNET_DISCONNECTED/);
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("professor.alpha@lcqui.local");
    await page.context().setOffline(true);
    try {
      await page.getByRole("button", { name: "Esqueci minha senha" }).click();
      await expect(page.getByText("Erro de conexão. Verifique sua internet e tente novamente.")).toBeVisible();
      await expect(page.getByTestId("retry-button")).toBeVisible();
    } finally {
      await page.context().setOffline(false);
    }
    await page.getByTestId("retry-button").click();
    await expect(page.getByText("Se este e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.")).toBeVisible();
  });

  test("AUTH-004-E2E-002 faz upload e remoção de foto de perfil no Storage Emulator", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 400/);
    await login(page, "aluno.normal@lcqui.local");
    await page.goto("/turmas");
    await page.getByTestId("header-user-menu").click();
    await page.getByTestId("perfil-foto-input").setInputFiles({
      name: "perfil-e2e.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
    });
    await expect(page.getByAltText("Prévia da foto")).toBeVisible();
    await page.getByTestId("perfil-salvar").click();
    await expect(page.getByTestId("header-user-menu")).toBeVisible();

    await page.getByRole("button", { name: "Fechar" }).click();
    await page.getByTestId("header-user-menu").click();
    await expect(page.getByAltText("Prévia da foto")).toBeVisible();
    await page.getByTestId("perfil-remover-foto").click();
    await expect(page.getByAltText("Prévia da foto")).toHaveCount(0);
    await page.getByTestId("perfil-salvar").click();
    await expect(page.getByTestId("header-user-menu")).toBeVisible();
  });

  test("FRASC-002-E2E-002 exibe falha de referência de lote inválida pela UI", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 400/);
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
    await page.getByText("Reagente Seed", { exact: true }).first().click();
    await page.getByRole("button", { name: "+ Frasco" }).click();
    const modal = page.getByRole("heading", { name: "Cadastrar Novo Frasco" }).locator("..");
    await modal.locator('input[type="text"]').fill("lote-inexistente-e2e");
    await modal.locator('input[type="number"]').nth(0).fill("250");
    const chamada = esperarCallable(page, "cadastrarFrascoFechado");
    await page.getByRole("button", { name: "Salvar Frasco" }).click();
    expect((await chamada).status()).toBe(400);
    await expect(page.getByText("Lote inexistente ou incompatível com a especificação e o resumo.")).toBeVisible();
  });

  test("NOTIF-001-E2E-005 renderiza tipos operacionais e deep links canônicos", async ({ page }) => {
    const uid = "seed-professor-alpha";
    const ids = ["e2e-op-vencidos", "e2e-op-escassez", "e2e-op-atraso", "e2e-op-devolucao"];
    const notificacoes = [
      ["FRASCOS_VENCIDOS", "Almoxarifado", "Frascos vencidos no almoxarifado."],
      ["ESCASSEZ_ESTOQUE", "Almoxarifado", "Estoque abaixo do limiar configurado."],
      ["ENTREGA_ATRASADA", "Almoxarifado", "Há empréstimos atrasados."],
      ["DATA_DEVOLUCAO_REAGENTE", "Emprestimo", "A devolução vence hoje."],
    ] as const;
    for (let i = 0; i < ids.length; i++) {
      await criarNotificacaoEmulada(uid, ids[i], {
        tipo: notificacoes[i][0],
        entidadeAlvo: notificacoes[i][1],
        idAlvo: notificacoes[i][1] === "Almoxarifado" ? "seed-almox-frascos" : "seed-emprestimo-e2e",
        mensagem: notificacoes[i][2],
        papelDestinatario: "Professor",
      });
    }
    try {
      await login(page, "professor.alpha@lcqui.local");
      await page.goto("/notificacoes");
      await page.getByTestId("aba-todas").click();
      for (const texto of ["Frasco com validade vencida", "Alerta de escassez de estoque", "Entrega atrasada", "Devolução de reagente pendente"]) {
        await expect(page.getByText(texto, { exact: true })).toBeVisible();
      }
      await expect(page.getByTestId("notif-link-e2e-op-vencidos")).toHaveAttribute("href", /almoxarifado=seed-almox-frascos/);
      await expect(page.getByTestId("notif-link-e2e-op-atraso")).toHaveAttribute("href", /almoxarifado=seed-almox-frascos/);
      await expect(page.getByTestId("notif-link-e2e-op-devolucao")).toHaveAttribute("href", /emprestimo=seed-emprestimo-e2e/);
    } finally {
      for (const id of ids) await removerDocumentoEmulado(`Usuarios/${uid}/Notificacoes/${id}`);
    }
  });

  test("NOTIF-003-E2E-005 percorre mais de um lote de limpeza no navegador", async ({ page }) => {
    const uid = "seed-professor-alpha";
    const ids = Array.from({ length: 105 }, (_, index) => `e2e-m13-paginacao-${String(index).padStart(3, "0")}`);
    for (let inicio = 0; inicio < ids.length; inicio += 10) {
      await Promise.all(ids.slice(inicio, inicio + 10).map((id) => criarNotificacaoEmulada(uid, id, {
          tipo: "TURMA_ARQUIVADA",
          idAlvo: "seed-turma-vazia",
          entidadeAlvo: "Turma",
          mensagem: `Notificação paginada ${id}`,
        })));
    }
    try {
      await login(page, "professor.alpha@lcqui.local");
      await page.goto("/notificacoes");
      await expect(page.getByTestId("aba-nao-lidas")).toContainText("105");
      await page.getByTestId("botao-limpar-tudo").click();
      const chamada = esperarCallable(page, "limparTudoNotificacoes");
      await page.getByTestId("confirmar-limpar-tudo").click();
      await chamada;
      await expect(page.getByTestId("aba-nao-lidas")).toContainText("0");
    } finally {
      for (const id of ids) await removerDocumentoEmulado(`Usuarios/${uid}/Notificacoes/${id}`);
    }
  });

  test("REP/LABEL-E2E-004 confirmam a assinatura PDF no payload do callable", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");
    await page.getByRole("button", { name: "Relatórios" }).click();
    const chamada = esperarCallable(page, "gerarRelatorioAlmoxarifado");
    await page.getByRole("button", { name: "Gerar PDF" }).click();
    const resultado = await lerResultadoCallable(await chamada);
    expect(typeof resultado.base64).toBe("string");
    expect(Buffer.from(resultado.base64 as string, "base64").subarray(0, 5).toString()).toBe("%PDF-");

    await page.goto("/reagentes");
    await page.getByRole("button", { name: "Imprimir Etiquetas" }).click();
    const numeros = page.locator('input[type="number"]');
    await numeros.nth(0).fill("1");
    await numeros.nth(1).fill("1");
    const chamadaEtiqueta = esperarCallable(page, "gerarPdfEtiquetasVirgens");
    await page.getByRole("button", { name: "Gerar PDF" }).click();
    const resultadoEtiqueta = await lerResultadoCallable(await chamadaEtiqueta);
    expect(typeof resultadoEtiqueta.base64).toBe("string");
    expect(Buffer.from(resultadoEtiqueta.base64 as string, "base64").subarray(0, 5).toString()).toBe("%PDF-");
  });
});

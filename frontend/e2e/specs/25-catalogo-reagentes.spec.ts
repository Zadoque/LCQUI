import { test, expect } from "../fixtures";
import { login, esperarCallable } from "../helpers/ui";
import { listarColecao } from "../helpers/emulator";

test.describe("Catálogo e cadastro de reagentes", () => {
  test("BASE-004-E2E-001 e STOCK-001-E2E-001 exibem catálogo e fotografia de estoque", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");

    await expect(page.getByRole("heading", { name: "Catálogo de Reagentes" })).toBeVisible();
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
    await expect(page.getByText("Reagente Seed")).toBeVisible();
    await expect(page.getByText("Frascos Aptos")).toBeVisible();
    await expect(page.getByText("Total de Frascos")).toBeVisible();
  });

  test("REAG-001-E2E-002 filtra o catálogo por estado físico líquido e sólido", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");
    const filtroEstado = page.getByLabel("Estado Físico");
    const linhas = page.locator("tbody > tr");
    const celulasEstado = () => linhas.locator("td:nth-child(4) span");

    await filtroEstado.selectOption("LIQUIDO");
    await expect(linhas.first()).toBeVisible();
    await expect(celulasEstado().first()).toHaveText("LIQUIDO");
    await expect(celulasEstado().filter({ hasText: "SOLIDO" })).toHaveCount(0);

    await filtroEstado.selectOption("SOLIDO");
    await expect(linhas.first()).toBeVisible();
    await expect(celulasEstado().first()).toHaveText("SOLIDO");
    await expect(celulasEstado().filter({ hasText: "LIQUIDO" })).toHaveCount(0);
  });

  test("REAG-001-E2E-003 exibe especificações e densidade líquida a partir do catálogo JSON", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");

    const linha = page.locator("tbody > tr").filter({ hasText: "Reagente Seed" }).first();
    await linha.getByRole("button", { name: "Detalhes", exact: true }).click();
    await expect(page).toHaveURL(/\/reagentes\/seed-resumo-reagente-frascos$/);
    await expect(page.getByTestId("reagente-especificacoes")).toContainText("Reagente Analítico 1L");
    await expect(page.getByTestId("reagente-especificacoes")).toContainText("Densidade: 1 g/mL");
  });

  test("REAG-001-E2E-001 cadastra substância química pela UI-05", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");
    const antes = await listarColecao("Substancia_Quimica");

    await page.getByRole("button", { name: "Cadastrar Reagente" }).click();
    await page.getByRole("button", { name: /Substância Química Base/ }).click();
    await expect(page.getByRole("heading", { name: "Nova Substância Química Base" })).toBeVisible();
    const modal = page.getByRole("heading", { name: "Nova Substância Química Base" }).locator("..");
    await modal.getByRole("textbox").nth(0).fill("Substância E2E UI05");
    await modal.getByRole("textbox").nth(2).fill("C2H6O");

    const resposta = esperarCallable(page, "cadastrarSubstanciaQuimica");
    await page.getByRole("button", { name: "Salvar Substância" }).click();
    await resposta;

    const depois = await listarColecao("Substancia_Quimica");
    const nova = depois.find((doc) => !antes.some((anterior) => anterior.id === doc.id));
    expect(nova?.data).toMatchObject({ nome: "Substância E2E UI05", formula_quimica: "C2H6O", ativo: true });
  });
});

import { test, expect } from "../fixtures";
import { login, esperarCallable, lerResultadoCallable } from "../helpers/ui";
import { listarColecao } from "../helpers/emulator";

async function criarFrascoParaReimpressao(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/reagentes");
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
  await page.getByText("Reagente Seed", { exact: true }).first().click();
  await page.getByRole("button", { name: "+ Frasco S/ Lote" }).click();
  await page.getByRole("button", { name: "Já Aberto (Em Uso)" }).click();
  await page.locator('input[type="number"]').nth(0).fill("250");
  const antes = await listarColecao("Frasco_Reagente");
  const resposta = esperarCallable(page, "cadastrarFrascoAberto");
  await page.getByRole("button", { name: "Salvar Frasco" }).click();
  await resposta;
  const depois = await listarColecao("Frasco_Reagente");
  const novo = depois.find((item) => !antes.some((anterior) => anterior.id === item.id));
  if (!novo || typeof novo.data.codigo_frasco !== "string") throw new Error("Frasco E2E não materializado.");
  return novo.data.codigo_frasco;
}

test.describe("Relatórios e etiquetas do almoxarifado", () => {
  test("REP-001/002/003-E2E-001 rejeitam relatório mensal futuro", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");

    await page.getByRole("button", { name: "Relatórios" }).click();
    const modal = page.getByRole("heading", { name: "Relatórios de Reagentes" }).locator("..").locator("..").locator("..");
    await expect(modal).toBeVisible();

    await page.locator('input[type="number"]').last().fill("2999");
    await page.getByRole("button", { name: "Gerar PDF" }).click();
    await expect(page.getByText("O ano do relatório não pode ser no futuro.")).toBeVisible();
  });

  test("REP-001/002-E2E-002 rejeitam período personalizado acima de 31 dias", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");
    await page.getByRole("button", { name: "Relatórios" }).click();

    const modal = page.getByRole("heading", { name: "Relatórios de Reagentes" }).locator("..").locator("..").locator("..");
    await page.getByRole("button", { name: "Personalizado" }).click();
    const dates = page.locator('input[type="date"]');
    await dates.nth(0).fill("2025-01-01");
    await dates.nth(1).fill("2025-02-15");
    await page.getByRole("button", { name: "Gerar PDF" }).click();
    await expect(page.getByText("O período selecionado permite no máximo 31 dias corridos.")).toBeVisible();
  });

  test("LABEL-001-E2E-001 rejeita intervalo de etiquetas fora do limite", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");
    await page.getByRole("button", { name: "Imprimir Etiquetas" }).click();

    const modal = page.getByRole("heading", { name: "Imprimir Etiquetas" }).locator("..").locator("..").locator("..");
    const numbers = page.locator('input[type="number"]');
    await numbers.nth(0).fill("1");
    await numbers.nth(1).fill("51");
    await page.getByRole("button", { name: "Gerar PDF" }).click();
    await expect(page.getByText("O intervalo deve gerar entre 1 e 50 etiquetas.")).toBeVisible();
  });

  test("LABEL-002-E2E-001 exige frasco para reimpressão", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");
    await page.getByRole("button", { name: "Imprimir Etiquetas" }).click();

    const modal = page.getByRole("heading", { name: "Imprimir Etiquetas" }).locator("..").locator("..").locator("..");
    await page.getByRole("button", { name: "Reimpressão / Conferência" }).click();
    await page.getByRole("button", { name: "Gerar PDF" }).click();
    await expect(page.getByText("Adicione pelo menos um frasco.")).toBeVisible();
  });

  test("REP-001/002/003-E2E-003 gera PDF mensal e abre transporte do relatório", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");
    await page.getByRole("button", { name: "Relatórios" }).click();
    const popup = page.waitForEvent("popup");
    const chamada = esperarCallable(page, "gerarRelatorioAlmoxarifado");
    await page.getByRole("button", { name: "Gerar PDF" }).click();
    expect((await chamada).status()).toBe(200);
    const pdf = await popup;
    await expect(pdf).toBeTruthy();
  });

  test("LABEL-001-E2E-002 gera PDF de etiqueta virgem dentro do limite", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 429/);
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");
    await page.getByRole("button", { name: "Imprimir Etiquetas" }).click();
    const numbers = page.locator('input[type="number"]');
    await numbers.nth(0).fill("1");
    await numbers.nth(1).fill("1");
    const popup = page.waitForEvent("popup");
    const chamada = esperarCallable(page, "gerarPdfEtiquetasVirgens");
    await page.getByRole("button", { name: "Gerar PDF" }).click();
    expect((await chamada).status()).toBe(200);
    const pdf = await popup;
    await expect(pdf).toBeTruthy();
  });

  test("LABEL-002-E2E-002 pesquisa frasco e gera ficha de conferência", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 429/);
    await login(page, "gestor.almoxarifado@lcqui.local");
    const codigo = await criarFrascoParaReimpressao(page);
    await page.goto("/reagentes");
    await page.getByRole("button", { name: "Imprimir Etiquetas" }).click();
    await page.getByRole("button", { name: "Reimpressão / Conferência" }).click();
    const busca = page.getByPlaceholder(/LCQUI-5/);
    await busca.fill(codigo);
    await busca.locator("..").getByRole("button").click();
    await expect(page.getByText(codigo, { exact: true })).toBeVisible();
    const popup = page.waitForEvent("popup");
    const chamada = esperarCallable(page, "gerarPdfReimpressaoFrascos");
    await page.getByRole("button", { name: "Gerar PDF" }).click();
    expect((await chamada).status()).toBe(200);
    const pdf = await popup;
    await expect(pdf).toBeTruthy();
  });
});

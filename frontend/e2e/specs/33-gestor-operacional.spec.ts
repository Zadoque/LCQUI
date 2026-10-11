import { test, expect } from "../fixtures";
import { login, esperarCallable } from "../helpers/ui";

test("ALM-OPERACIONAL-E2E-001: gestor acessa movimentações, quarentena e alertas", async ({ page, guardaConsole }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");

  await page.goto("/reagentes");
  await expect(page.getByRole("heading", { name: "Catálogo de Reagentes", exact: true })).toBeVisible();
  expect(guardaConsole.erros().some((mensagem) => mensagem.includes("false for 'list'"))).toBe(false);

  await page.getByRole("link", { name: "Movimentações", exact: true }).click();
  await expect(page).toHaveURL(/\/reagentes\?aba=movimentacoes$/);
  await expect(page.getByTestId("painel-operacional-movimentacoes")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Movimentações", exact: true })).toBeVisible();
  await expect(page.getByText("Histórico físico do almoxarifado, ordenado pelo instante do servidor.")).toBeVisible();

  await page.getByRole("link", { name: "Quarentena \/ Alertas", exact: true }).click();
  await expect(page).toHaveURL(/\/reagentes\?aba=alertas$/);
  await expect(page.getByTestId("painel-operacional-alertas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quarentena", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alertas operacionais", exact: true })).toBeVisible();
  await expect(page.getByText("Notificações do próprio gestor relacionadas a estoque e movimentações.")).toBeVisible();
});

test("ALM-OPERACIONAL-E2E-002: chefe lista almoxarifados após autenticação", async ({ page, guardaConsole }) => {
  await login(page, "chefe.seed@lcqui.local");

  await page.goto("/reagentes");
  await expect(page.getByTestId("almox-lista-almoxarifados")).toBeVisible();
  await expect(page.getByTestId("almox-item-seed-almox-frascos")).toBeVisible();
  expect(guardaConsole.erros().some((mensagem) => mensagem.includes("false for 'list'"))).toBe(false);
});

test("ALM-OPERACIONAL-E2E-003: especificação herda líquido e ml do reagente selecionado", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByText("Reagente Seed", { exact: true }).click();
  await page.getByRole("button", { name: "+ Nova Especificação", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Nova Especificação Comercial" })).toBeVisible();
  await expect(page.getByTestId("especificacao-estado-fisico")).toHaveValue("LIQUIDO");
  await expect(page.getByTestId("especificacao-unidade-medida")).toHaveValue("ml");
});

test("ALM-OPERACIONAL-E2E-004: resumo cadastrado aparece com natureza no catálogo", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByRole("button", { name: /Cadastrar Reagente/ }).click();
  await page.getByRole("button", { name: /Resumo de Reagente/ }).click();

  const nome = `Reagente E2E Natureza ${Date.now()}`;
  await page.getByTestId("novo-resumo-nome").fill(nome);
  await page.getByTestId("novo-resumo-natureza").selectOption("INORGANICO");
  await page.getByTestId("novo-resumo-limiar-escassez").fill("2");
  const chamada = esperarCallable(page, "cadastrarResumoReagente");
  await page.getByRole("button", { name: "Salvar Resumo" }).click();
  expect((await chamada).status()).toBe(200);

  await expect(page.getByText(nome, { exact: true })).toBeVisible();
  const linha = page.locator("tr").filter({ hasText: nome });
  await expect(linha).toContainText("INORGANICO");
});

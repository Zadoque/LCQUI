import { test, expect } from "../fixtures";
import { login } from "../helpers/ui";

test("ALM-OPERACIONAL-E2E-001: gestor acessa movimentações, quarentena e alertas", async ({ page, guardaConsole }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");

  await page.goto("/reagentes");
  await expect(page.getByRole("heading", { name: "Catálogo de Reagentes", exact: true })).toBeVisible();
  expect(guardaConsole.erros().some((mensagem) => mensagem.includes("false for 'list'"))).toBe(false);

  await page.goto("/reagentes?aba=movimentacoes");
  await expect(page.getByTestId("painel-operacional-movimentacoes")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Movimentações", exact: true })).toBeVisible();
  await expect(page.getByText("Histórico físico do almoxarifado, ordenado pelo instante do servidor.")).toBeVisible();

  await page.goto("/reagentes?aba=alertas");
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

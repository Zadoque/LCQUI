import { test, expect } from "../fixtures";
import { login } from "../helpers/ui";

test.describe("Smoke E2E de contratos transversais", () => {
  test("AUTH-002-E2E-001 exibe a entrada Google no contrato de login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Google" })).toBeVisible();
  });

  test("ROLE-003/CACHE-001-E2E-001 carrega autoridade persistida e snapshot de estoque", async ({ page }) => {
    await login(page, "gestor.almoxarifado@lcqui.local");
    await page.goto("/reagentes");
    await expect(page.getByText(/Olá, Gestor de Almoxarifado/)).toBeVisible();
    await expect(page.getByText("Estoque atual")).toBeVisible();
    await expect(page.getByRole("button", { name: "Atualizar Estoque" })).toBeVisible();
    await expect(page.getByText("Frascos Aptos")).toBeVisible();
  });

  test("MVIEW-001-E2E-001 mantém o catálogo consultável após a carga materializada", async ({ page }) => {
    await login(page, "aluno.normal@lcqui.local");
    await page.goto("/reagentes");
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
    await expect(page.getByText("Reagente Seed", { exact: true })).toBeVisible();
  });

  test("NOTIF-005/RULES-003-E2E-001 abre a caixa de notificações autorizada", async ({ page }) => {
    await login(page, "aluno.colega.a@lcqui.local");
    await page.goto("/notificacoes");
    await expect(page.getByTestId("pagina-notificacoes")).toBeVisible();
    await expect(page.getByTestId("aba-nao-lidas")).toBeVisible();
  });
});

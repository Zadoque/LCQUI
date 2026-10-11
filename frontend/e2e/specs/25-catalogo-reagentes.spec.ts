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

import { test, expect } from "../fixtures";
import { login, esperarCallable } from "../helpers/ui";
import { listarColecao } from "../helpers/emulator";

test("LOTE-E2E-001: cadastra lote com validação e chave determinística", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.locator("select").first().selectOption("Líquido");
  await page.getByRole("button", { name: "Buscar no Banco" }).click();
  await expect(page.getByText("Reagente Seed")).toBeVisible();
  await page.getByText("Reagente Seed").click();
  await page.getByRole("button", { name: "+ Novo Lote" }).click();

  const formulario = page.locator("form").filter({ hasText: "Salvar Lote" });
  const textos = formulario.locator('input[type="text"]');
  await textos.nth(0).fill("LT-E2E-001");
  await textos.nth(1).fill("Fornecedor E2E");
  await textos.nth(2).fill("NF-E2E-001");
  await formulario.locator('input[type="number"]').fill("3");
  const datas = formulario.locator('input[type="date"]');
  await datas.nth(0).fill("2026-10-09");
  await datas.nth(1).fill("2026-01-01");
  await datas.nth(2).fill("2027-01-01");

  const resposta = esperarCallable(page, "cadastrarLote");
  await formulario.getByRole("button", { name: "Salvar Lote" }).click();
  await resposta;

  await expect(page.getByRole("heading", { name: "Estoque (Reagentes)" })).toBeVisible();
  const lotes = await listarColecao("Lote");
  expect(lotes.some((lote) => lote.data.numero_lote === "LT-E2E-001" && lote.data.nome_fornecedor === "Fornecedor E2E")).toBe(true);
});

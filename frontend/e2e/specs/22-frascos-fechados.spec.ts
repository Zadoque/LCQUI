import { test, expect } from "../fixtures";
import { login, esperarCallable } from "../helpers/ui";
import { lerDocumento } from "../helpers/emulator";

test("FRASC-E2E-001: cadastra frasco fechado com código atômico", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.locator("select").first().selectOption("Líquido");
  await page.getByRole("button", { name: "Buscar no Banco" }).click();
  await expect(page.getByText("Reagente Seed")).toBeVisible();
  await page.getByText("Reagente Seed").click();
  await page.getByRole("button", { name: "+ Frasco S/ Lote" }).click();
  const numeros = page.locator('input[type="number"]');
  await numeros.nth(0).fill("500");
  await numeros.nth(1).fill("250");
  const resposta = esperarCallable(page, "cadastrarFrascoFechado");
  await page.getByRole("button", { name: "Salvar Frasco" }).click();
  await resposta;
  await expect(page.getByRole("heading", { name: "Estoque (Reagentes)" })).toBeVisible();
  const chave = await lerDocumento("Chaves_Unicas/Frasco_Reagente__LCQUI-1");
  expect(chave?.data.tipo).toBe("Frasco_Reagente");
  const frasco = await lerDocumento(`Frasco_Reagente/${chave?.data.id_recurso}`);
  expect(frasco?.data).toMatchObject({ estado_fisico_frasco: "FECHADO", saldo_desconhecido: false, origem_tara: "REFERENCIA_TEORICA" });
});

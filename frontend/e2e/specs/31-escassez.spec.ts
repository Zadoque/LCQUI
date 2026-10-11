import { test, expect } from "../fixtures";
import { login, esperarCallable, lerResultadoCallable } from "../helpers/ui";
import { lerDocumento } from "../helpers/emulator";

test("STOCK-E2E-001: configura limiar normativo de escassez pela especificação", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
  await page.getByText("Reagente Seed", { exact: true }).click();
  await expect(page.getByText(/Reagente Analítico 1L/)).toBeVisible();
  const botaoEscassez = page.getByRole("button", { name: "Configurar escassez", exact: true });
  await expect(botaoEscassez).toBeVisible();
  await botaoEscassez.click({ force: true });
  const modal = page.getByRole("heading", { name: "Configuração de escassez" }).locator("..");
  await modal.getByLabel("Limiar de escassez").fill("2");
  const chamada = esperarCallable(page, "configurarLimiarEscassez");
  await modal.getByRole("button", { name: "Salvar configuração" }).click();
  const resposta = await chamada;
  expect(resposta.status()).toBe(200);
  const resultado = await lerResultadoCallable(resposta);
  expect(resultado.idConfiguracao).toBe("seed-resumo-reagente-frascos__seed-especificacao-frascos");
  const configuracao = await lerDocumento("Almoxarifado/seed-almox-frascos/Estoques_Configurados/seed-resumo-reagente-frascos__seed-especificacao-frascos");
  expect(configuracao?.data).toMatchObject({ qtd_limiar_escassez: 2, ativo: true, notificacao_ativa: true, id_almoxarifado: "seed-almox-frascos" });
});

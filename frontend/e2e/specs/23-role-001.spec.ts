import { test, expect } from "../fixtures";
import { capturarCallable, login } from "../helpers/ui";

test.describe("ROLE-001-E2E — UI-02 pessoas e papéis", () => {
  test("ROLE-001-E2E-001: chefe acessa diretório, detalhes e confirmação de revogação", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/pessoas");
    await expect(page.getByRole("heading", { name: "Pessoas e papéis" })).toBeVisible();
    await page.getByLabel("Primeiro escolha a letra inicial").selectOption("A");
    await expect(page.getByLabel("Filtrar resultados")).toBeVisible();
    const detalhes = page.getByRole("button", { name: "Detalhes" }).first();
    await expect(detalhes).toBeVisible();
    await detalhes.click();
    await expect(page.getByRole("region", { name: "Detalhes da pessoa" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vínculos" })).toBeVisible();
    await page.getByLabel("Justificativa para revogar").fill("Encerramento administrativo do papel");
    await page.getByRole("button", { name: "Revogar papel" }).click();
    await expect(page.getByRole("dialog", { name: "Confirmar revogação" })).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
  });

  test("ROLE-002-E2E-001: revogar Aluno de Bolsista é rejeitado pelo servidor", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/Failed to load resource: the server responded with a status of 400/);
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/pessoas");
    await page.getByLabel("Primeiro escolha a letra inicial").selectOption("B");
    await page.getByLabel("Filtrar resultados").fill("Bolsista");
    const linha = page.getByRole("row").filter({ hasText: "Bolsista" }).first();
    await expect(linha).toBeVisible();
    await linha.getByRole("button", { name: "Selecionar" }).click();
    await page.getByLabel("Papel").selectOption("Aluno");
    await page.getByLabel("Justificativa para revogar").fill("Teste de proteção do vínculo discente");
    await page.getByRole("button", { name: "Revogar papel" }).click();
    await page.getByRole("dialog", { name: "Confirmar revogação" }).getByRole("button", { name: "Confirmar revogação" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(/Bolsista|aluno/i);
  });

  test("ROLE-001-E2E-002: busca de pessoas usa debounce e cache por filtro", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/pessoas");
    const chamadas = capturarCallable(page, "buscarUsuariosParaPapel");

    await page.getByLabel("Primeiro escolha a letra inicial").selectOption("B");
    await expect(page.getByRole("row").filter({ hasText: "Bolsista" }).first()).toBeVisible();
    await expect.poll(() => chamadas.length).toBe(1);

    const filtro = page.getByLabel("Filtrar resultados");
    await filtro.fill("Bolsista");
    await page.waitForTimeout(100);
    expect(chamadas).toHaveLength(1);
    await expect(page.getByRole("row").filter({ hasText: "Bolsista" }).first()).toBeVisible();
    await expect.poll(() => chamadas.length).toBe(2);

    await filtro.fill("");
    await expect(page.getByRole("row").filter({ hasText: "Bolsista" }).first()).toBeVisible();
    await expect.poll(() => chamadas.length).toBe(2);

    await filtro.fill("Bolsista");
    await expect(page.getByRole("row").filter({ hasText: "Bolsista" }).first()).toBeVisible();
    await expect.poll(() => chamadas.length).toBe(2);
  });
});

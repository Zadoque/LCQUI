import { test, expect } from "../fixtures";
import { login } from "../helpers/ui";

test.describe("ROLE-001-E2E — UI-02 pessoas e papéis", () => {
  test("ROLE-001-E2E-001: chefe acessa diretório, detalhes e confirmação de revogação", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/pessoas");
    await expect(page.getByRole("heading", { name: "Pessoas e papéis" })).toBeVisible();
    await expect(page.getByLabel("Buscar pessoa")).toBeVisible();
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
    await page.getByLabel("Buscar pessoa").fill("Bolsista");
    const linha = page.getByRole("row").filter({ hasText: "Bolsista" }).first();
    await expect(linha).toBeVisible();
    await linha.getByRole("button", { name: "Selecionar" }).click();
    await page.getByLabel("Papel").selectOption("Aluno");
    await page.getByLabel("Justificativa para revogar").fill("Teste de proteção do vínculo discente");
    await page.getByRole("button", { name: "Revogar papel" }).click();
    await page.getByRole("dialog", { name: "Confirmar revogação" }).getByRole("button", { name: "Confirmar revogação" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(/Bolsista|aluno/i);
  });
});

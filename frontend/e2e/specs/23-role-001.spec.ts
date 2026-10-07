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
});

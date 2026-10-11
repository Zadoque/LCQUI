import { test, expect } from "../fixtures";
import { login } from "../helpers/ui";

test.describe("IMP-ROLE-004 — diretório mínimo de professores", () => {
  test("ROLE-004-E2E-001: tela de professores usa projeção mínima", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/professores");

    await expect(page.getByRole("heading", { name: "Professores" })).toBeVisible();
    await expect(page.getByText("Professor Alpha", { exact: true })).toBeVisible();
    await expect(page.getByText("professor.alpha@lcqui.local", { exact: true })).toHaveCount(0);
    await expect(page.getByText("CCT", { exact: true })).toHaveCount(0);
  });

  test("ROLE-004-E2E-002: Nova Turma consulta professores pelo endpoint", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/turmas");
    await page.getByTestId("botao-nova-turma").click();

    const seletor = page.getByLabel("Professor Responsável");
    await expect(seletor).toBeVisible();
    await expect(seletor.locator("option", { hasText: "Professor Alpha" })).toHaveCount(1);
  });
});

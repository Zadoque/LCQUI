import { test, expect } from "../fixtures";
import { login } from "../helpers/ui";

/**
 * E2E-001 — Login e bootstrap básico.
 *
 * Exercita Auth Emulator → Firebase SDK → AuthContext → ProtectedRoute/UI,
 * confirmando que os custom claims persistidos pelo backend chegam ao browser
 * e que o roteamento por papel funciona.
 */
test.describe("E2E-001 login e bootstrap", () => {
  test("professor autentica e as claims de papel governam a navegação", async ({ page }) => {
    await login(page, "professor.alpha@lcqui.local");

    await expect(page.getByText("Olá, Professor Alpha")).toBeVisible();
    const header = page.getByRole("banner");
    await expect(header.getByText("Professor", { exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "Turmas" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Alunos" })).toBeVisible();

    await page.goto("/turmas");
    await expect(page.getByRole("heading", { name: "Minhas Turmas" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Química Geral — T1 Vazia/ })).toBeVisible();
  });

  test("rota protegida sem sessão redireciona para o login", async ({ page }) => {
    await page.goto("/turmas");
    await page.waitForURL(/\/login/);
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  });
});

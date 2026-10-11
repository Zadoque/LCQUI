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

  test("AUTH-001-E2E-002 credencial inválida usa mensagem genérica", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/INVALID_LOGIN_CREDENTIALS/, /Failed to load resource: the server responded with a status of 400/);
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("professor.alpha@lcqui.local");
    await page.locator('input[type="password"]').fill("senha-incorreta");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page.getByText("Credenciais inválidas. Verifique seu e-mail e senha.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("AUTH-001-E2E-003 conta desativada é bloqueada após autenticação", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("aluno.nao.verificado@lcqui.local");
    await page.locator('input[type="password"]').fill("Test123456!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await page.waitForURL(/\/desativado/);
    await expect(page.getByRole("heading", { name: "Acesso Bloqueado" })).toBeVisible();
  });

  test("AUTH-003-E2E-001 exige e-mail antes de iniciar a recuperação", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Esqueci minha senha" }).click();

    await expect(page.getByText("Por favor, preencha o campo de e-mail antes de redefinir a senha.")).toBeVisible();
  });

  test("AUTH-003-E2E-002 mantém confirmação uniforme para e-mails existentes e inexistentes", async ({ page, guardaConsole }) => {
    const confirmation = "Se este e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.";
    guardaConsole.permitir("Failed to load resource: the server responded with a status of 400 (Bad Request)");

    await page.goto("/login");
    const email = page.locator('input[type="email"]');
    await email.fill("professor.alpha@lcqui.local");
    await page.getByRole("button", { name: "Esqueci minha senha" }).click();
    await expect(page.getByText(confirmation)).toBeVisible();

    await email.fill("nao-cadastrado-auth-003@lcqui.local");
    await page.getByRole("button", { name: "Esqueci minha senha" }).click();
    await expect(page.getByText(confirmation)).toBeVisible();
  });
});

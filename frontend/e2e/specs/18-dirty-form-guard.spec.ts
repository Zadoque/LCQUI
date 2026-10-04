import { test, expect } from "../fixtures";
import { login } from "../helpers/ui";

test.describe("GUARD-E2E-001: Guarda de formulário modificado na troca de papel", () => {
  test("guarda formulário modificado na troca de papel", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/Failed to load resource: the server responded with a status of (?:400|403)/);
    await login(page, "bolsista.seed@lcqui.local");
    await page.goto("/turmas");
    await page.getByTestId("header-user-menu").click();
    await expect(page.getByTestId("perfil-nome")).toBeVisible();
    await page.getByTestId("perfil-nome").fill("Nome Sujo Temporario");
    await page.getByTestId("papel-opcao-Bolsista").click();
    await expect(page.getByTestId("dirty-form-dialog")).toBeVisible();
    // Continuar editando: mantém o papel Aluno
    await page.getByTestId("dirty-continuar").click();
    await expect(page.getByTestId("dirty-form-dialog")).toHaveCount(0);
    await expect(page.getByTestId("papel-opcao-Aluno")).toHaveAttribute("aria-pressed", "true");
    // Descartar: troca para Bolsista e fecha a gaveta
    await page.getByTestId("papel-opcao-Bolsista").click();
    await expect(page.getByTestId("dirty-form-dialog")).toBeVisible();
    await page.getByTestId("dirty-descartar").click();
    await expect(page.getByTestId("papel-opcao-Bolsista")).toHaveAttribute("aria-pressed", "true");
  });
});

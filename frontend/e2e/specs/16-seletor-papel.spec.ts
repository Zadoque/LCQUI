import { test, expect } from "../fixtures";
import { login } from "../helpers/ui";

test.describe('AUTH-SEL-E2E-001: Seletor de papel ativo', () => {
  test('deve permitir troca de papel e persistir escolha', async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/Failed to load resource: the server responded with a status of (?:400|403)/);

    // 1. Logar como bolsista.seed@lcqui.local (tem Aluno e Bolsista)
    await login(page, "bolsista.seed@lcqui.local");

    // 2. Navegar para /turmas
    await page.goto("/turmas");

    // 3. Verificar se o seletor de papel está visível
    await expect(page.getByTestId("seletor-papel")).toBeVisible();

    // 4. Verificar se ambas as opções de papel estão visíveis
    await expect(page.getByTestId("papel-opcao-Aluno")).toBeVisible();
    await expect(page.getByTestId("papel-opcao-Bolsista")).toBeVisible();

    // 5. Default = primeiro papel (Aluno)
    await expect(page.getByTestId("papel-opcao-Aluno")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("papel-opcao-Bolsista")).toHaveAttribute("aria-pressed", "false");

    // 6. Sidebar do Aluno NÃO tem "Reagentes"
    await expect(page.locator("aside").getByRole("link", { name: "Reagentes" })).toHaveCount(0);

    // 7. Clicar em "Bolsista"
    await page.getByTestId("papel-opcao-Bolsista").click();

    // 8. Verificar que Bolsista está ativo e Aluno não
    await expect(page.getByTestId("papel-opcao-Bolsista")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("papel-opcao-Aluno")).toHaveAttribute("aria-pressed", "false");

    // 9. Sidebar do Bolsista TEM "Reagentes"
    await expect(page.locator("aside").getByRole("link", { name: "Reagentes" })).toBeVisible();

    // 10. Recarregar e confirmar persistência
    await page.reload();
    await page.goto("/turmas");
    await expect(page.getByTestId("papel-opcao-Bolsista")).toHaveAttribute("aria-pressed", "true");
  });
});

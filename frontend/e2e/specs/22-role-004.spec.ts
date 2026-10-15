import { test, expect } from "../fixtures";
import { capturarCallable, esperarCallable, login, lerResultadoCallable } from "../helpers/ui";
import { ultimoOobPara } from "../helpers/emulator";

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

  test("ROLE-004-E2E-003: novo professor recebe convite por e-mail sem token na interface", async ({ page }) => {
    const email = `professor.convite.e2e.${Date.now()}@lcqui.local`;

    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/professores");
    await page.getByRole("button", { name: "Novo Professor" }).click();

    await page.getByLabel("Nome Completo").fill("Professor Convite E2E");
    await page.getByLabel("E-mail (UFSC)").fill(email);
    await page.getByLabel("Laboratório").fill("Laboratório E2E");

    const resposta = esperarCallable(page, "convidarUsuario");
    await page.getByRole("button", { name: "Convidar", exact: true }).click();
    const dados = await lerResultadoCallable(await resposta);

    expect(dados.emailEnviado).toBe(true);
    expect(dados).not.toHaveProperty("resetLink");
    await expect(
      page.getByText("As instruções de acesso foram enviadas por e-mail.")
    ).toBeVisible();
    await expect(page.getByText(/Link de Configuração de Senha|oobCode|token=/i)).toHaveCount(0);

    // O transporte real do e-mail é verificável no Auth Emulator, fora da UI.
    const oob = await ultimoOobPara(email, "PASSWORD_RESET");
    expect(oob.oobLink).toContain("oobCode=");
  });

  test("ROLE-004-E2E-004: seletor de novo professor exclui Chefe Geral e reutiliza a projeção em cache", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/professores");

    const chamadas = capturarCallable(page, "buscarUsuariosParaPapel");
    const abrirModal = async () => {
      await page.getByRole("button", { name: "Novo Professor" }).click();
      const seletor = page.getByLabel("Usuário existente (opcional)");
      await expect(seletor).toBeVisible();
      await expect(seletor.locator('option[value="seed-professor-alpha"]')).toHaveCount(1);
      await expect(seletor.locator('option[value="seed-chefe-geral"]')).toHaveCount(0);
    };

    await abrirModal();
    await expect.poll(() => chamadas.length).toBe(1);
    expect(chamadas[0].payload).toMatchObject({ data: { papel: "Professor" } });
    await page.getByRole("button", { name: "Fechar novo professor" }).click();

    await abrirModal();
    await expect.poll(() => chamadas.length).toBe(1);
  });
});

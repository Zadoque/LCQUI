import { test, expect } from "../fixtures";
import { login, esperarCallable } from "../helpers/ui";
import { lerDocumento } from "../helpers/emulator";

test.describe("PERFIL-E2E-001: Gaveta de perfil", () => {
  test("exibe dados do usuário e atualiza nome via callable", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(
      /Failed to load resource: the server responded with a status of (?:400|403)/,
    );

    // 1. Login como aluno normal
    await login(page, "aluno.normal@lcqui.local");
    await page.goto("/turmas");

    // 2. Abrir gaveta de perfil
    await page.getByTestId("header-user-menu").click();

    // 3. Verificar dados exibidos
    await expect(page.getByTestId("perfil-nome")).toBeVisible();
    await expect(page.getByTestId("perfil-email")).toContainText(
      "aluno.normal@lcqui.local",
    );

    // 4. Alterar nome
    await page.getByTestId("perfil-nome").fill("Nome E2E Atualizado");

    // 5. Salvar e aguardar callable
    const resp = esperarCallable(page, "atualizarPerfil");
    await page.getByTestId("perfil-salvar").click();
    await resp;

    // 6. Verificar Firestore — documento do Usuário
    const u = await lerDocumento("Usuarios/seed-aluno-normal");
    expect(u!.data.nome).toBe("Nome E2E Atualizado");

    // 7. Verificar Firestore — documento do Aluno
    const a = await lerDocumento("Aluno/seed-aluno-normal");
    expect(a!.data.nome).toBe("Nome E2E Atualizado");
    expect(a!.data.letra_inicial).toBe("N");

    // 8. Cleanup — restaurar estado original
    await page.getByTestId("header-user-menu").click();
    await page.getByTestId("perfil-nome").fill("Aluno Normal");
    const respClean = esperarCallable(page, "atualizarPerfil");
    await page.getByTestId("perfil-salvar").click();
    await respClean;
  });
});

import { test, expect } from "../fixtures";
import { login } from "../helpers/ui";
import { listarColecao } from "../helpers/emulator";

/**
 * Turma arquivada (M11/M12.1/Q08).
 *
 * A UI do professor lista apenas turmas `Ativo` no painel principal; turmas
 * `Arquivada` são acessíveis somente pelo modal "Turmas Arquivadas", que expõe
 * apenas "Desarquivar". Não há superfície de escrita acadêmica (Post/Comentário)
 * para turma arquivada. A rejeição autoritativa dos callables é provada na
 * camada de integração backend (`posts.integration.test.ts`).
 */

const TURMA_ARQUIVADA = "Química Analítica — T2 Arquivada";
const TURMA_ARQUIVADA_ID = "seed-turma-arquivada";

test.describe("Turma arquivada nega escrita acadêmica de Posts/Comentários", () => {
  test("ARQ-POST-E2E-001 turma arquivada não oferece superfície de escrita acadêmica", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(/Erro ao ouvir notificações/);

    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/turmas");

    // O painel principal só lista turmas Ativo; a arquivada não aparece com
    // formulário de criação.
    await expect(
      page.getByRole("button", { name: /Química Analítica — T2 Arquivada/ })
    ).toHaveCount(0);

    // A turma arquivada é acessível apenas pelo modal de arquivadas.
    await page.getByRole("button", { name: /Turmas Arquivadas/ }).click();
    await expect(
      page.getByRole("heading", { name: /Turmas Arquivadas/ })
    ).toBeVisible();
    await expect(page.getByText(TURMA_ARQUIVADA)).toBeVisible();
    // No modal, a única ação é "Desarquivar": não há criar/editar/comentar.
    await expect(page.getByRole("button", { name: "Desarquivar" })).toBeVisible();
    await expect(page.getByPlaceholder("Título da postagem...")).toHaveCount(0);
    await expect(page.getByPlaceholder("Escreva um comentário...")).toHaveCount(0);

    // Nenhum Post foi criado na turma arquivada.
    const posts = await listarColecao(`Turma/${TURMA_ARQUIVADA_ID}/Posts`);
    expect(posts).toHaveLength(0);
  });
});

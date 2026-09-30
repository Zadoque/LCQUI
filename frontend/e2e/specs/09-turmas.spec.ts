import { test, expect } from "../fixtures";
import { login, criarTurma, esperarCallable } from "../helpers/ui";
import { lerDocumento, listarColecao } from "../helpers/emulator";

/**
 * Vertical de turmas (M11 / UI-10 / Seção 9).
 *
 * Exercita a criação, arquivamento e desarquivamento de turmas pelo professor
 * dono, verificando o contrato canônico persistido no Firestore Emulator.
 */

test.describe.serial("Turmas", () => {
  test("TURMA-E2E-001 professor cria turma e documento canônico é persistido", async ({ page }) => {
    await login(page, "professor.alpha@lcqui.local");
    await criarTurma(page, {
      idMateria: "materia-quimica-geral",
      nome: "Turma E2E-001",
      ano: 2026,
      semestre: 1,
      capacidade: 30,
    });

    await expect(page.getByRole("button", { name: /Turma E2E-001/ })).toBeVisible();

    const turmas = await listarColecao("Turma");
    const turma = turmas.find((t) => t.data.nome_turma === "Turma E2E-001");
    expect(turma, "a turma criada deve existir no Firestore").toBeTruthy();
    expect(turma!.data.status).toBe("Ativo");
    expect(turma!.data.versao).toBe(1);
    expect(turma!.data.qtd_alunos).toBe(0);
    expect(typeof turma!.data.codigo_turma).toBe("string");
    expect(turma!.data.codigo_turma).toMatch(/^[A-Z0-9]{6}$/);

    const chave = await lerDocumento(`Chaves_Unicas/Turma__${turma!.data.codigo_turma}`);
    expect(chave, "a chave única da turma deve existir").not.toBeNull();
    expect(chave!.data.tipo).toBe("Turma");
    expect(chave!.data.id_recurso).toBe(turma!.id);
  });

  test("TURMA-E2E-005 arquivar turma dedicada altera status e incrementa versao", async ({ page }) => {
    await login(page, "professor.alpha@lcqui.local");
    await criarTurma(page, {
      idMateria: "materia-quimica-geral",
      nome: "Turma E2E-005",
      ano: 2026,
      semestre: 1,
      capacidade: 30,
    });

    const turmasAntes = await listarColecao("Turma");
    const turma = turmasAntes.find((t) => t.data.nome_turma === "Turma E2E-005");
    expect(turma).toBeTruthy();
    const idTurma = turma!.id;

    await page.goto("/turmas");
    await page.getByRole("button", { name: /Turma E2E-005/ }).click();
    await page.getByTestId("botao-arquivar-turma").click();
    const resposta = esperarCallable(page, "alterarStatusTurma");
    await page.getByTestId("confirmar-arquivar-turma").click();
    await resposta;

    await expect(page.getByRole("button", { name: /Turma E2E-005/ })).toHaveCount(0);

    const turmaDoc = await lerDocumento(`Turma/${idTurma}`);
    expect(turmaDoc!.data.status).toBe("Arquivada");
    expect(turmaDoc!.data.versao).toBe(2);

    await page.getByRole("button", { name: /Turmas Arquivadas/ }).click();
    await expect(page.getByTestId(`linha-turma-arquivada-${idTurma}`)).toBeVisible();
  });

  test("TURMA-E2E-006 desarquivar turma restaura status e incrementa versao", async ({ page }) => {
    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/turmas");
    const turmas = await listarColecao("Turma");
    const turma = turmas.find((t) => t.data.nome_turma === "Turma E2E-005");
    expect(turma).toBeTruthy();
    const idTurma = turma!.id;

    await page.getByRole("button", { name: /Turmas Arquivadas/ }).click();
    await expect(page.getByTestId(`linha-turma-arquivada-${idTurma}`)).toBeVisible();

    const linha = page.getByTestId(`linha-turma-arquivada-${idTurma}`);
    const resposta = esperarCallable(page, "alterarStatusTurma");
    await linha.getByTestId("botao-desarquivar-turma").click();
    await resposta;

    await expect(page.getByRole("button", { name: /Turma E2E-005/ })).toBeVisible();

    const turmasDepois = await listarColecao("Turma");
    const turmaDepois = turmasDepois.find((t) => t.data.nome_turma === "Turma E2E-005");
    expect(turmaDepois!.data.status).toBe("Ativo");
    expect(turmaDepois!.data.versao).toBe(3);
  });

  test("TURMA-E2E-007 turma arquivada é somente leitura", async () => {
    // Coberto por 07-turma-arquivada-posts.spec.ts.
    test.skip();
  });
});

import { test, expect } from "../fixtures";
import { login, ingressarPorCodigo, esperarCallable } from "../helpers/ui";
import { lerDocumento, listarColecao } from "../helpers/emulator";

/**
 * Vertical de ingresso por código (M11 / ALU-01 / Seção 9).
 *
 * Exercita o fluxo do aluno ingressando em turma via código, com validação de
 * capacidade, duplicação, histórico de remoção e arquivamento.
 */

const TURMA_VAZIA_ID = "seed-turma-vazia";
const TURMA_CHEIA_ID = "seed-turma-cheia";
const TURMA_ARQUIVADA_ID = "seed-turma-arquivada";

test.describe.serial("Ingresso por código", () => {
  test("ALU-E2E-001 aluno ingressa em turma vazia por código", async ({ page }) => {
    await login(page, "aluno.normal@lcqui.local");
    await ingressarPorCodigo(page, "QGV101");

    await expect(page.getByRole("button", { name: /Química Geral — T1 Vazia/ })).toBeVisible();

    const vinculo = await lerDocumento(`Turma/${TURMA_VAZIA_ID}/Alunos/seed-aluno-normal`);
    expect(vinculo).not.toBeNull();
    expect(vinculo!.data.id_aluno).toBe("seed-aluno-normal");
    expect(vinculo!.data.id_turma).toBe(TURMA_VAZIA_ID);

    const espelho = await lerDocumento(`Usuarios/seed-aluno-normal/Turmas/${TURMA_VAZIA_ID}`);
    expect(espelho).not.toBeNull();

    const turma = await lerDocumento(`Turma/${TURMA_VAZIA_ID}`);
    expect(turma!.data.qtd_alunos).toBe(1);
  });

  test("ALU-E2E-002 repetir ingresso não duplica nem incrementa", async ({ page }) => {
    await login(page, "aluno.normal@lcqui.local");
    await page.goto("/turmas");
    await page.getByTestId("botao-ingressar-turma").click();
    await page.getByTestId("input-codigo-turma").fill("QGV101");
    const resposta = esperarCallable(page, "ingressarEmTurmaPorCodigo");
    await page.getByTestId("botao-confirmar-ingressar").click();
    await resposta;

    const turma = await lerDocumento(`Turma/${TURMA_VAZIA_ID}`);
    expect(turma!.data.qtd_alunos).toBe(1);

    const alunos = await listarColecao(`Turma/${TURMA_VAZIA_ID}/Alunos`);
    expect(alunos).toHaveLength(1);
  });

  test("ALU-E2E-003 turma cheia bloqueia ingresso ordinário", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(
      /capacidade máxima/,
      /Failed to load resource: the server responded with a status of 400/
    );
    await login(page, "aluno.normal@lcqui.local");
    await page.goto("/turmas");
    await page.getByTestId("botao-ingressar-turma").click();
    await page.getByTestId("input-codigo-turma").fill("QAN201");
    const resposta = esperarCallable(page, "ingressarEmTurmaPorCodigo");
    await page.getByTestId("botao-confirmar-ingressar").click();
    await resposta;

    await expect(page.getByText(/capacidade máxima/)).toBeVisible();
    const turma = await lerDocumento(`Turma/${TURMA_CHEIA_ID}`);
    expect(turma!.data.qtd_alunos).toBe(1);
  });

  test("ALU-E2E-004 aluno removido não reingressa pelo código", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(
      /removido pelo professor/,
      /failed-precondition/,
      /reingress/,
      /removid/i,
      /Forbidden/i,
      /Failed to load resource: the server responded with a status of (?:400|403)/
    );
    await login(page, "aluno.removido@lcqui.local");
    await page.goto("/turmas");
    await page.getByTestId("botao-ingressar-turma").click();
    await page.getByTestId("input-codigo-turma").fill("QGV101");
    const resposta = esperarCallable(page, "ingressarEmTurmaPorCodigo");
    await page.getByTestId("botao-confirmar-ingressar").click();
    await resposta;

    await expect(page.getByText(/removido pelo professor/)).toBeVisible();
    const vinculo = await lerDocumento(`Turma/${TURMA_VAZIA_ID}/Alunos/seed-aluno-removed`);
    expect(vinculo).toBeNull();
  });

  test("ALU-E2E-005 turma arquivada bloqueia ingresso", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(
      /arquivada/,
      /Failed to load resource: the server responded with a status of 400/
    );
    await login(page, "aluno.normal@lcqui.local");
    await page.goto("/turmas");
    await page.getByTestId("botao-ingressar-turma").click();
    await page.getByTestId("input-codigo-turma").fill("QAN202");
    const resposta = esperarCallable(page, "ingressarEmTurmaPorCodigo");
    await page.getByTestId("botao-confirmar-ingressar").click();
    await resposta;

    await expect(page.getByText(/arquivada/)).toBeVisible();
    const turma = await lerDocumento(`Turma/${TURMA_ARQUIVADA_ID}`);
    expect(turma!.data.qtd_alunos).toBe(0);
  });
});

import { test, expect } from "../fixtures";
import { login, criarTurma, abrirMembrosTurma, adicionarAlunoExistente, removerAluno } from "../helpers/ui";
import { lerDocumento, listarColecao } from "../helpers/emulator";

/**
 * Vertical de gestão de membros pelo professor (M11 / PRO-04 / Seção 9).
 *
 * Exercita a adição e remoção de alunos existentes pela UI do professor,
 * verificando vínculo, espelho, contador e histórico no Firestore Emulator.
 */

const ALUNO_NORMAL_UID = "seed-aluno-normal";

test.describe.serial("Membros da turma", () => {
  test("PRO-E2E-003-001 professor adiciona aluno existente à turma", async ({ page }) => {
    await login(page, "professor.alpha@lcqui.local");
    await criarTurma(page, {
      idMateria: "materia-quimica-geral",
      nome: "Turma Membros E2E",
      ano: 2026,
      semestre: 1,
      capacidade: 30,
    });

    const turmas = await listarColecao("Turma");
    const turma = turmas.find((t) => t.data.nome_turma === "Turma Membros E2E");
    expect(turma).toBeTruthy();
    const idTurma = turma!.id;

    await page.goto("/turmas");
    await page.getByRole("button", { name: /Turma Membros E2E/ }).click();
    await page.getByRole("button", { name: "Ações", exact: true }).click();
    await page.getByRole("button", { name: /Novo Aluno na Turma/ }).click();
    await adicionarAlunoExistente(page, ALUNO_NORMAL_UID);

    const vinculo = await lerDocumento(`Turma/${idTurma}/Alunos/${ALUNO_NORMAL_UID}`);
    expect(vinculo).not.toBeNull();
    expect(vinculo!.data.id_aluno).toBe(ALUNO_NORMAL_UID);
    expect(vinculo!.data.id_turma).toBe(idTurma);

    const espelho = await lerDocumento(`Usuarios/${ALUNO_NORMAL_UID}/Turmas/${idTurma}`);
    expect(espelho).not.toBeNull();

    const turmaDoc = await lerDocumento(`Turma/${idTurma}`);
    expect(turmaDoc!.data.qtd_alunos).toBe(1);
  });

  test("PRO-E2E-003-002 professor remove aluno e histórico é persistido", async ({ page }) => {
    const turmas = await listarColecao("Turma");
    const turma = turmas.find((t) => t.data.nome_turma === "Turma Membros E2E");
    expect(turma).toBeTruthy();
    const idTurma = turma!.id;

    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/turmas");
    await page.getByRole("button", { name: /Turma Membros E2E/ }).click();
    await abrirMembrosTurma(page);
    await removerAluno(page, ALUNO_NORMAL_UID);

    const alunos = await listarColecao(`Turma/${idTurma}/Alunos`);
    expect(alunos).toHaveLength(0);

    const espelho = await lerDocumento(`Usuarios/${ALUNO_NORMAL_UID}/Turmas/${idTurma}`);
    expect(espelho).toBeNull();

    const turmaDoc = await lerDocumento(`Turma/${idTurma}`);
    expect(turmaDoc!.data.qtd_alunos).toBe(0);

    const historico = await listarColecao(`Turma/${idTurma}/HistoricoAlunos`);
    const exclusao = historico.find(
      (h) => h.data.tipo === "exclusao_aluno" && h.data.id_aluno === ALUNO_NORMAL_UID
    );
    expect(exclusao).toBeTruthy();
  });
});

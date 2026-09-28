import { test, expect } from "../fixtures";
import { abrirNovoAlunoModal, capturarCallable, convidarAluno, login } from "../helpers/ui";
import { listarColecao } from "../helpers/emulator";

/**
 * Capacidade da turma (P1). O primeiro bug real de payload desta vertical foi
 * `justificativaExcecao: null`; aqui o payload do navegador é observado
 * diretamente nos dois ramos (exceção e não-exceção).
 */
test.describe.serial("Capacidade da turma", () => {
  test("E2E-CAP-1 turma cheia sem exceção falha e não envia justificativa nula", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(
      /Erro ao registrar convite/,
      /Failed to load resource: the server responded with a status of 400/
    );

    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "T1 Cheia");
    const chamadas = capturarCallable(page, "convidarAluno");
    await convidarAluno(page, {
      turmaId: "seed-turma-cheia",
      emails: "aluno.removido@lcqui.local",
    });

    await expect(page.getByText(/capacidade máxima/)).toBeVisible();
    await expect(page.getByText("Convite(s) registrado(s) com sucesso.")).toHaveCount(0);

    const dados = chamadas[0].payload.data as Record<string, unknown>;
    expect(dados.excederCapacidade).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(dados, "justificativaExcecao")).toBe(false);
  });

  test("E2E-CAP-2 turma cheia com exceção justificada registra o convite", async ({ page }) => {
    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "T1 Cheia");
    const chamadas = capturarCallable(page, "convidarAluno");
    const justificativa = "Vaga extraordinária aprovada pela coordenação.";
    await convidarAluno(page, {
      turmaId: "seed-turma-cheia",
      emails: "aluno.removido@lcqui.local",
      excederCapacidade: true,
      justificativa,
    });

    await expect(page.getByText("Convite(s) registrado(s) com sucesso.")).toBeVisible();

    const dados = chamadas[0].payload.data as Record<string, unknown>;
    expect(dados.excederCapacidade).toBe(true);
    expect(dados.justificativaExcecao).toBe(justificativa);

    const convites = await listarColecao("Convite_Aluno");
    const convite = convites.find((item) => item.data.email === "aluno.removido@lcqui.local");
    expect(convite).toBeTruthy();
    expect(convite!.data.exceder_capacidade).toBe(true);
    expect(convite!.data.justificativa_excecao).toBe(justificativa);
  });
});

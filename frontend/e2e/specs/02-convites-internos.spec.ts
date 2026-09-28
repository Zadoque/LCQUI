import { test, expect } from "../fixtures";
import {
  abrirNotificacoes,
  abrirNovoAlunoModal,
  capturarCallable,
  convidarAluno,
  idConviteDaNotificacao,
  lerResultadoCallable,
  login,
  logout,
} from "../helpers/ui";
import { lerDocumento, listarColecao } from "../helpers/emulator";

/**
 * Vertical de convites internos (destinatário já possui conta Auth).
 *
 * Regressões cobertas:
 * - 228aae5 (inbox restrita ao destinatário);
 * - e23ede1/ef4f577/df6b3da (refresh forçado de claims no cliente);
 * - 96c25bc/977ee75/feca32a (projeção segura de matrícula necessária).
 */
test.describe.serial("Convites internos", () => {
  test("E2E-002 professor convida aluno existente sem campos opcionais", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(/Erro ao registrar convite/);
    const chamadas = capturarCallable(page, "convidarAluno");

    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "T1 Vazia");
    await convidarAluno(page, {
      turmaId: "seed-turma-vazia",
      emails: "aluno.normal@lcqui.local",
    });

    await expect(page.getByText("Convite(s) registrado(s) com sucesso.")).toBeVisible();
    await expect(page.getByText("Convite registrado via notificação interna do aluno.")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Invalid input");

    expect(chamadas).toHaveLength(1);
    const dados = chamadas[0].payload.data as Record<string, unknown>;
    expect(dados.excederCapacidade).toBe(false);
    expect(dados.idTurma).toBe("seed-turma-vazia");
    // O produtor não deve enviar `justificativaExcecao: null` (bug de payload real).
    expect(Object.prototype.hasOwnProperty.call(dados, "justificativaExcecao")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(dados, "matricula")).toBe(false);

    const convites = await listarColecao("Convite_Aluno");
    const convite = convites.find((item) => item.data.email === "aluno.normal@lcqui.local");
    expect(convite).toBeTruthy();
    expect(convite!.data.status).toBe("pendente");
    expect(convite!.data.justificativa_excecao).toBeNull();
    expect(convite!.data.numero_matricula).toBeNull();
  });

  test("E2E-003 inbox mostra o convite do destinatário e nada de outros usuários", async ({
    page,
  }) => {
    await login(page, "aluno.normal@lcqui.local");
    await page.goto("/turmas");
    await abrirNotificacoes(page);

    await expect(page.getByText("Convite para Turma")).toBeVisible();
    await expect(page.getByText("Pendente")).toBeVisible();
    await expect(page.getByText(/1 novas/)).toBeVisible();

    // Um usuário sem convites não enxerga a caixa alheia.
    await logout(page);
    await login(page, "aluno.matriculado@lcqui.local");
    await page.goto("/turmas");
    await abrirNotificacoes(page);
    await expect(page.getByText("Nenhuma notificação pendente no momento.")).toBeVisible();
    await expect(page.getByText("Todas (0)")).toBeVisible();
  });

  test("E2E-004/008 aluno existente aceita via notificação, sem matrícula", async ({ page }) => {
    await login(page, "aluno.normal@lcqui.local");
    await page.goto("/turmas");
    await abrirNotificacoes(page);

    const detalhesPromise = page.waitForResponse((resposta) =>
      resposta.url().includes("obterDetalhesConviteAluno")
    );
    await page.getByRole("link", { name: "Acessar Convite" }).click();
    await page.waitForURL(/\/convite\?id=/);
    await expect(page.getByRole("heading", { name: "Convite de Aluno" })).toBeVisible();

    const detalhes = await lerResultadoCallable(await detalhesPromise);
    expect(detalhes.matricula_necessaria).toBe(false);
    await expect(page.getByLabel("Número de Matrícula")).toHaveCount(0);

    const chamadas = capturarCallable(page, "aceitarConviteAluno");
    await page.getByRole("button", { name: "Confirmar e Ingressar" }).click();
    await expect(page.getByRole("heading", { name: "Convite Aceito!" })).toBeVisible();

    expect(chamadas).toHaveLength(1);
    const dados = chamadas[0].payload.data as Record<string, unknown>;
    expect(dados.viaNotificacao).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(dados, "tokenConvite")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(dados, "matriculaInformada")).toBe(false);

    const vinculo = await lerDocumento(
      "Turma/seed-turma-vazia/Alunos/seed-aluno-normal"
    );
    expect(vinculo).not.toBeNull();
    expect(vinculo!.data.id_aluno).toBe("seed-aluno-normal");

    const notificacoes = await listarColecao("Usuarios/seed-aluno-normal/Notificacoes");
    expect(notificacoes.some((item) => item.data.lida === true)).toBe(true);

    const convites = await listarColecao("Convite_Aluno");
    const convite = convites.find((item) => item.data.email === "aluno.normal@lcqui.local");
    expect(convite!.data.status).toBe("aceitado");
    expect(convite!.data.aceitado_por).toBe("seed-aluno-normal");
  });

  test("E2E-009 aluno sem papel aceita convite e a sessão publica Aluno sem relogin", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(/Erro ao obter detalhes do convite/);

    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "T1 Vazia");
    const conviteChamadas = capturarCallable(page, "convidarAluno");
    await convidarAluno(page, {
      turmaId: "seed-turma-vazia",
      emails: "aluno.authonly@lcqui.local",
      matricula: "2026000777",
    });
    await expect(page.getByText("Convite(s) registrado(s) com sucesso.")).toBeVisible();
    const dadosConvite = conviteChamadas[0].payload.data as Record<string, unknown>;
    expect(dadosConvite.matricula).toBe("2026000777");
    expect(Object.prototype.hasOwnProperty.call(dadosConvite, "justificativaExcecao")).toBe(false);
    await page.goto("/turmas");
    await logout(page);

    await login(page, "aluno.authonly@lcqui.local");
    await page.waitForURL(/\/desativado/);

    // DIVERGÊNCIA CONHECIDA (registrada em documentation/testes/24-...):
    // uma conta Auth autenticada sem nenhum papel é redirecionada para
    // `/desativado` pelo ProtectedRoute, então o sino (UI-12) não é montado e
    // a notificação interna CONVITE_PARA_TURMA fica inalcançável pela UI,
    // apesar de a Rule já permitir a leitura de bootstrap. Para exercitar o
    // aceite real (viaNotificacao) sem inventar token, o deep link é lido do
    // próprio documento de notificação persistido pelo backend.
    const idConvite = await idConviteDaNotificacao("seed-aluno-auth-only");
    const detalhesPromise = page.waitForResponse((resposta) =>
      resposta.url().includes("obterDetalhesConviteAluno")
    );
    await page.goto(`/convite?id=${idConvite}&via=notificacao`);
    const detalhes = await lerResultadoCallable(await detalhesPromise);
    expect(detalhes.matricula_necessaria).toBe(false);
    await expect(page.getByLabel("Número de Matrícula")).toHaveCount(0);

    const aceiteChamadas = capturarCallable(page, "aceitarConviteAluno");
    await page.getByRole("button", { name: "Confirmar e Ingressar" }).click();
    await expect(page.getByRole("heading", { name: "Convite Aceito!" })).toBeVisible();
    const dadosAceite = aceiteChamadas[0].payload.data as Record<string, unknown>;
    expect(dadosAceite.viaNotificacao).toBe(true);

    // O refresh forçado de claims deve publicar Aluno sem logout/login.
    const link = page.getByRole("link", { name: "Acessar Minhas Turmas" });
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL(/\/turmas/);
    await expect(page.getByRole("banner").getByText("Aluno", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Química Geral — T1 Vazia/ })).toBeVisible();
  });

  test("E2E-010 recusa via notificação libera a pendência", async ({ page }) => {
    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "T1 Vazia");
    await convidarAluno(page, {
      turmaId: "seed-turma-vazia",
      emails: "aluno.matriculado@lcqui.local",
    });
    await expect(page.getByText("Convite registrado via notificação interna do aluno.")).toBeVisible();

    await page.goto("/turmas");
    await logout(page);

    const idConvite = await idConviteDaNotificacao("seed-aluno-enrolled");
    await login(page, "aluno.matriculado@lcqui.local");
    await page.goto("/turmas");
    await abrirNotificacoes(page);
    await page.getByRole("link", { name: "Acessar Convite" }).click();
    await page.waitForURL(/\/convite\?id=/);

    page.once("dialog", (dialogo) => dialogo.accept());
    await page.getByRole("button", { name: "Recusar" }).click();
    await expect(page.getByRole("heading", { name: "Convite Recusado" })).toBeVisible();

    const convite = await lerDocumento(`Convite_Aluno/${idConvite}`);
    expect(convite!.data.status).toBe("rejeitado");
    expect(convite!.data.rejeitado_por).toBe("seed-aluno-enrolled");

    const notificacoes = await listarColecao("Usuarios/seed-aluno-enrolled/Notificacoes");
    expect(notificacoes.every((item) => item.data.lida === true)).toBe(true);

    // A pendência determinística em Chaves_Unicas deve ter sido liberada.
    const chaves = await listarColecao("Chaves_Unicas");
    expect(chaves.some((chave) => chave.data.id_recurso === idConvite)).toBe(false);
  });
});

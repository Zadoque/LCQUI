import { test, expect } from "../fixtures";
import {
  abrirNovoAlunoModal,
  capturarCallable,
  convidarAluno,
  idConviteDaNotificacao,
  lerResultadoCallable,
  login,
  logout,
  SENHA_SEED,
} from "../helpers/ui";
import {
  FIRESTORE_EMULATOR,
  PROJECT_ID,
  definirSenhaViaOob,
  extrairContinueUrl,
  lerDocumento,
  listarColecao,
  ultimoOobPara,
} from "../helpers/emulator";

const EMAIL_EXTERNO = "novo.aluno@seed.local";

/**
 * Estado compartilhado explicitamente pela jornada serial: o OOB é consumido
 * ao definir a credencial e deixa de ser listável no emulador, então a
 * `continueUrl` real obtida em E2E-005 é reutilizada em E2E-007.
 */
let continueUrlExterno: string | null = null;

async function entrarPeloRedirectConvite(
  page: import("@playwright/test").Page,
  redirect: string
): Promise<void> {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
  await page.locator('input[type="email"]').fill(EMAIL_EXTERNO);
  await page.locator('input[type="password"]').fill(SENHA_SEED);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/convite\?id=/);
}

test.describe.serial("Convites externos", () => {
  test("E2E-005 convite externo provisiona Auth e preserva continueUrl/token", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(/Erro ao registrar convite/);

    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "T1 Vazia");
    const chamadas = capturarCallable(page, "convidarAluno");
    await convidarAluno(page, { turmaId: "seed-turma-vazia", emails: EMAIL_EXTERNO });

    await expect(
      page.getByText("Convite registrado; fluxo de acesso enviado via Firebase Auth.")
    ).toBeVisible();

    const dados = chamadas[0].payload.data as Record<string, unknown>;
    expect(dados.excederCapacidade).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(dados, "justificativaExcecao")).toBe(false);

    const convites = await listarColecao("Convite_Aluno");
    const convite = convites.find((item) => item.data.email === EMAIL_EXTERNO);
    expect(convite).toBeTruthy();
    expect(convite!.data.status).toBe("pendente");
    expect(convite!.data.numero_matricula).toBeNull();

    // O OOB real emitido pelo Auth Emulator é o transporte do e-mail. O token
    // do convite vem dele, nunca fabricado pelo teste.
    const oob = await ultimoOobPara(EMAIL_EXTERNO, "PASSWORD_RESET");
    const continueUrl = extrairContinueUrl(oob.oobLink);
    continueUrlExterno = continueUrl;
    const url = new URL(continueUrl);
    expect(url.pathname).toBe("/convite");
    expect(url.searchParams.get("id")).toBeTruthy();
    expect(url.searchParams.get("token")).toBeTruthy();
    await definirSenhaViaOob(oob.oobLink, SENHA_SEED);

    await page.goto("/turmas");
    await logout(page);

    await page.goto(continueUrl);
    await expect(page.getByRole("button", { name: "Entrar com minha conta" })).toBeVisible();
    await page.getByRole("button", { name: "Entrar com minha conta" }).click();
    await page.waitForURL(/\/login/);
    await page.locator('input[type="email"]').fill(EMAIL_EXTERNO);
    await page.locator('input[type="password"]').fill(SENHA_SEED);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/\/convite\?id=/);

    await expect(page.getByRole("heading", { name: "Convite de Aluno" })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("token")).toBeTruthy();
  });

  test("E2E-007 matrícula obrigatória quando convite não a carrega", async ({ page }) => {
    if (!continueUrlExterno) {
      throw new Error("E2E-005 deve definir a continueUrl externa antes de E2E-007.");
    }
    const continueUrl = continueUrlExterno;
    const idConvite = new URL(continueUrl).searchParams.get("id")!;
    const redirect = new URL(continueUrl).pathname + new URL(continueUrl).search;

    const detalhesPromise = page.waitForResponse((resposta) =>
      resposta.url().includes("obterDetalhesConviteAluno")
    );
    await entrarPeloRedirectConvite(page, redirect);
    const detalhes = await lerResultadoCallable(await detalhesPromise);
    expect(detalhes.matricula_necessaria).toBe(true);

    const campo = page.getByLabel("Número de Matrícula");
    await expect(campo).toBeVisible();
    await expect(campo).toHaveAttribute("required", "");
    await expect(campo).toHaveAttribute("maxlength", "20");

    // Sem matrícula, o formulário não pode concluir.
    await page.getByRole("button", { name: "Confirmar e Ingressar" }).click();
    await expect(page.getByRole("heading", { name: "Convite Aceito!" })).toHaveCount(0);
    expect(
      await campo.evaluate((elemento) => (elemento as HTMLInputElement).checkValidity())
    ).toBe(false);

    // Zeros iniciais precisam ser preservados como texto.
    await page.getByLabel("Nome Completo (caso ainda não cadastrado)").fill("Aluno Externo E2E");
    await campo.fill("0020261234");
    await page.getByRole("button", { name: "Confirmar e Ingressar" }).click();
    await expect(page.getByRole("heading", { name: "Convite Aceito!" })).toBeVisible();

    const convite = await lerDocumento(`Convite_Aluno/${idConvite}`);
    expect(convite!.data.status).toBe("aceitado");
    const uid = convite!.data.aceitado_por as string;
    const aluno = await lerDocumento(`Aluno/${uid}`);
    expect(aluno?.data.numero_matricula).toBe("0020261234");

    const vinculo = await lerDocumento(`Turma/seed-turma-vazia/Alunos/${uid}`);
    expect(vinculo).not.toBeNull();
  });

  test("E2E-006 e-mail não verificado não pode aceitar o convite", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(
      /Erro ao obter detalhes do convite/,
      /Failed to load resource: the server responded with a status of 400/
    );

    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "T1 Vazia");
    await convidarAluno(page, {
      turmaId: "seed-turma-vazia",
      emails: "aluno.nao.verificado@lcqui.local",
    });
    await expect(page.getByText("Convite registrado via notificação interna do aluno.")).toBeVisible();

    await page.goto("/turmas");
    await logout(page);

    const idConvite = await idConviteDaNotificacao("seed-aluno-unverified");
    await login(page, "aluno.nao.verificado@lcqui.local");
    await page.waitForURL(/\/desativado/);

    await page.goto(`/convite?id=${idConvite}&via=notificacao`);
    await expect(page.getByRole("heading", { name: "E-mail Não Verificado" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar e Ingressar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Já verifiquei (Atualizar)" })).toBeVisible();
  });

  test("E2E-011 convite expirado exibe aviso e não permite aceite", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(/Erro ao obter detalhes do convite/);

    // Professor envia convite para aluno existente
    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "T1 Vazia");
    await convidarAluno(page, {
      turmaId: "seed-turma-vazia",
      emails: "aluno.removido@lcqui.local",
    });
    await expect(page.getByText(/Convite registrado/)).toBeVisible();
    await page.goto("/turmas");
    await logout(page);

    // Forçar expiração: atualizar expira_em para o passado no Firestore Emulator
    const convites = await listarColecao("Convite_Aluno");
    const convite = convites.find((item) => item.data.email === "aluno.removido@lcqui.local");
    expect(convite).toBeTruthy();
    const idConvite = convite!.id;

    const firestoreUrl = `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/Convite_Aluno/${idConvite}?updateMask.fieldPaths=expira_em`;
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    await fetch(firestoreUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
      body: JSON.stringify({
        fields: {
          expira_em: { timestampValue: pastDate },
        },
      }),
    });

    // Aluno tenta acessar o convite expirado
    await login(page, "aluno.removido@lcqui.local");
    await page.goto(`/convite?id=${idConvite}&via=notificacao`);

    // A página deve exibir aviso de expiração
    await expect(page.getByText(/expirad/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar e Ingressar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Recusar" })).toHaveCount(0);
  });
});

import { test, expect } from "../fixtures";
import {
  abrirTurma,
  capturarCallable,
  criarPost,
  login,
  observarConsole,
} from "../helpers/ui";
import { listarColecao } from "../helpers/emulator";

/**
 * Vertical Posts (M12.1 / UI-11 / Seção 9).
 *
 * Exercita a fronteira real: React/UI -> callable `criarPost` -> Firestore
 * Emulator, com o vínculo canônico (M11) e as Security Rules. Fixtures vêm do
 * seed canônico; a turma `seed-turma-ultima-vaga` tem o Professor Alpha como
 * dono e o Aluno Matriculado como único membro.
 */

const TURMA = "Química Geral — T2 Última Vaga";
const TURMA_ID = "seed-turma-ultima-vaga";
const PROFESSOR_UID = "seed-professor-alpha";

test.describe("Posts", () => {
  test("POST-E2E-001 professor dono cria post e o estado persistido corresponde ao contrato", async ({
    page,
  }) => {
    const titulo = "Post E2E-001 — Estequiometria";
    const descricao = "Roteiro de estudo publicado pelo professor dono (E2E-001).";

    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    const chamadas = capturarCallable(page, "criarPost");
    await criarPost(page, titulo, descricao);

    // O produtor não deve enviar `idRoteiroExperimento: null` quando não há
    // roteiro (bug real que quebrava a criação sem anexo).
    expect(chamadas).toHaveLength(1);
    const dados = chamadas[0].payload.data as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(dados, "idRoteiroExperimento")).toBe(false);

    const posts = await listarColecao(`Turma/${TURMA_ID}/Posts`);
    const post = posts.find((item) => item.data.titulo === titulo);
    expect(post, "o Post persistido deve existir no emulator").toBeTruthy();
    expect(post!.data.descricao).toBe(descricao);
    expect(post!.data.id_professor).toBe(PROFESSOR_UID);
    expect(post!.data.id_turma).toBe(TURMA_ID);
    expect(typeof post!.data.nome_professor).toBe("string");
    expect(post!.data.id_roteiro_experimento).toBeNull();
    expect(post!.data.criado_em).toBeTruthy();
  });

  test("POST-E2E-002 aluno participante vê o post em contexto independente", async ({
    page,
    browser,
  }) => {
    const titulo = "Post E2E-002 — Segurança no laboratório";
    const descricao = "Orientações de segurança publicadas pelo professor dono (E2E-002).";

    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    await criarPost(page, titulo, descricao);

    const contextoAluno = await browser.newContext();
    const paginaAluno = await contextoAluno.newPage();
    const consoleAluno = observarConsole(paginaAluno);
    try {
      await login(paginaAluno, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAluno, TURMA);

      await expect(
        paginaAluno.getByRole("heading", { name: titulo, level: 3 })
      ).toBeVisible();
      await expect(paginaAluno.getByText(descricao)).toBeVisible();
      consoleAluno.verificar();
    } finally {
      await contextoAluno.close();
    }
  });

  test("POST-E2E-003 Chefe Geral não cria post em turma alheia e nada é persistido", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(/Erro ao criar post/, /status of 403/);
    const titulo = "Post E2E-003 — Tentativa sem ownership";
    const descricao = "Tentativa de criação por usuário sem ownership (E2E-003).";

    await login(page, "chefe.seed@lcqui.local");
    await abrirTurma(page, TURMA);

    const chamadas = capturarCallable(page, "criarPost");
    await page.getByPlaceholder("Título da postagem...").fill(titulo);
    await page
      .getByPlaceholder("Escreva as instruções ou recados para a turma...")
      .fill(descricao);

    const dialogoPromise = page.waitForEvent("dialog");
    await page.getByRole("button", { name: "Postar", exact: true }).click();
    const dialogo = await dialogoPromise;
    expect(dialogo.message()).toContain("Apenas o professor responsável");
    await dialogo.accept();

    // O callable foi realmente invocado e rejeitado pelo backend.
    expect(chamadas).toHaveLength(1);

    const posts = await listarColecao(`Turma/${TURMA_ID}/Posts`);
    expect(
      posts.some((item) => item.data.id_professor === "seed-chefe-geral")
    ).toBe(false);
    await expect(page.getByRole("heading", { name: titulo, level: 3 })).toHaveCount(0);
  });

  test("POST-E2E-004 professor terceiro e aluno sem vínculo não alcançam a turma", async ({
    page,
    browser,
  }) => {
    await login(page, "professor.beta@lcqui.local");
    await page.goto("/turmas");
    await expect(page.getByRole("button", { name: /Química Geral — Beta/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Química Geral — T2 Última Vaga/ })
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Postar", exact: true })).toHaveCount(0);

    const contextoAluno = await browser.newContext();
    const paginaAluno = await contextoAluno.newPage();
    const consoleAluno = observarConsole(paginaAluno);
    try {
      await login(paginaAluno, "aluno.normal@lcqui.local");
      await paginaAluno.goto("/turmas");
      await expect(paginaAluno.getByText("Minhas Turmas")).toBeVisible();
      await expect(
        paginaAluno.getByRole("button", { name: /Química Geral — T2 Última Vaga/ })
      ).toHaveCount(0);
      await expect(
        paginaAluno.getByRole("button", { name: "Postar", exact: true })
      ).toHaveCount(0);
      consoleAluno.verificar();
    } finally {
      await contextoAluno.close();
    }

    const posts = await listarColecao(`Turma/${TURMA_ID}/Posts`);
    expect(
      posts.some((item) => item.data.id_professor === "seed-professor-beta")
    ).toBe(false);
  });
});

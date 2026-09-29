import { test, expect } from "../fixtures";
import {
  abrirTurma,
  capturarCallable,
  cartaoDoPost,
  criarPost,
  editarPost,
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
  test("POST-E2E-005 professor dono remove post e aluno não vê mais", async ({
    page,
    browser,
  }) => {
    const titulo = "Post E2E-005 — Remoção";
    const descricao = "Post para testar remoção lógica.";

    // 1. Professor dono cria post
    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    await criarPost(page, titulo, descricao);
    const postsCriados = await listarColecao(`Turma/${TURMA_ID}/Posts`);
    const post = postsCriados.find((p) => p.data.titulo === titulo);
    expect(post).toBeTruthy();
    const postId = post!.id;

    // 2. Aluno participante vê o post em contexto independente
    const contextoAluno = await browser.newContext();
    const paginaAluno = await contextoAluno.newPage();
   observarConsole(paginaAluno);
    try {
      await login(paginaAluno, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAluno, TURMA);
      await expect(paginaAluno.getByRole("heading", { name: titulo, level: 3 })).toBeVisible();
    } finally {
      await contextoAluno.close();
    }

    // 3. Professor dono remove o post (com motivo).
    // `prompt()` é síncrono no onclick; registrar o handler ANTES do click evita
    // deadlock entre a ação de click e o diálogo modal.
    const card = cartaoDoPost(page, titulo);
    await card.hover();
    page.once("dialog", (dialog) => {
      void dialog.accept("Motivo da remoção E2E-005");
    });
    await card.getByRole("button", { name: "Remover Postagem", exact: true }).click();

    // 4. Aluno participante não vê mais o post
    const contextoAluno2 = await browser.newContext();
    const paginaAluno2 = await contextoAluno2.newPage();
    const consoleAluno2 = observarConsole(paginaAluno2);
    try {
      await login(paginaAluno2, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAluno2, TURMA);
      await expect(paginaAluno2.getByRole("heading", { name: titulo, level: 3 })).toHaveCount(0);
      consoleAluno2.verificar();
    } finally {
      await contextoAluno2.close();
    }

    // 5. Verificar que o documento ainda existe com removido_da_apresentacao=true
    const postsAposRemocao = await listarColecao(`Turma/${TURMA_ID}/Posts`);
    const postApos = postsAposRemocao.find((p) => p.id === postId);
    expect(postApos).toBeTruthy();
    expect(postApos!.data.removido_da_apresentacao).toBe(true);
    expect(postApos!.data.motivo_remocao).toBe("Motivo da remoção E2E-005");
  });

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

  test("POST-E2E-006 professor dono edita post e indicador (editado) aparece", async ({
    page,
    browser,
  }) => {
    const tituloOriginal = "Post E2E-006 — Original";
    const descricaoOriginal = "Descrição original do post para edição.";
    const tituloEditado = "Post E2E-006 — Editado";
    const descricaoEditada = "Descrição editada do post após modificação.";

    // 1. Professor dono cria post
    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    await criarPost(page, tituloOriginal, descricaoOriginal);
    
    // 2. Verificar que o post foi criado e não tem indicador (editado)
    await expect(page.getByRole("heading", { name: tituloOriginal, level: 3 })).toBeVisible();
    const cardOriginal = cartaoDoPost(page, tituloOriginal);
    await expect(cardOriginal.getByText("(editado)")).toHaveCount(0);

    // 3. Professor dono edita o post
    await editarPost(page, tituloOriginal, tituloEditado, descricaoEditada);

    // 4. Verificar que o novo título está visível e tem indicador (editado)
    await expect(page.getByRole("heading", { name: tituloEditado, level: 3 })).toBeVisible();
    const cardEditado = cartaoDoPost(page, tituloEditado);
    await expect(cardEditado.getByText("(editado)")).toBeVisible();

    // 5. Aluno participante vê o post editado em contexto independente
    const contextoAluno = await browser.newContext();
    const paginaAluno = await contextoAluno.newPage();
    const consoleAluno = observarConsole(paginaAluno);
    try {
      await login(paginaAluno, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAluno, TURMA);
      await expect(paginaAluno.getByRole("heading", { name: tituloEditado, level: 3 })).toBeVisible();
      await expect(paginaAluno.getByText(descricaoEditada)).toBeVisible();
      await expect(paginaAluno.getByText("(editado)")).toBeVisible();
      consoleAluno.verificar();
    } finally {
      await contextoAluno.close();
    }

    // 6. Verificar persistência no Firestore
    const posts = await listarColecao(`Turma/${TURMA_ID}/Posts`);
    const postEditado = posts.find((p) => p.data.titulo === tituloEditado);
    expect(postEditado).toBeTruthy();
    expect(postEditado!.data.editado).toBe(true);
    expect(postEditado!.data.editado_em).toBeTruthy();
    expect(postEditado!.data.descricao).toBe(descricaoEditada);
  });
});

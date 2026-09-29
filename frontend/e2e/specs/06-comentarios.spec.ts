import { test, expect } from "../fixtures";
import {
  abrirComentarios,
  abrirTurma,
  cartaoDoPost,
  comentar,
  criarPost,
  editarComentario,
  login,
  observarConsole,
} from "../helpers/ui";
import { listarColecao } from "../helpers/emulator";

/**
 * Vertical Comentários (M12.1 / UI-11 / Seção 9).
 *
 * Prova a fronteira real: React/UI -> callable `adicionarComentario` ->
 * Firestore Emulator, com validação de participação (vínculo canônico M11) no
 * backend. Cada teste cria seu próprio Post para não depender de outro teste.
 */

const TURMA = "Química Geral — T2 Última Vaga";
const TURMA_ID = "seed-turma-ultima-vaga";
const TURMA_COLEGAS = "Química Geral — T3 Colegas";
const TURMA_COLEGAS_ID = "seed-turma-colegas";

async function idDoPost(titulo: string): Promise<string> {
  const posts = await listarColecao(`Turma/${TURMA_ID}/Posts`);
  const post = posts.find((item) => item.data.titulo === titulo);
  if (!post) throw new Error(`Post não encontrado no emulator: ${titulo}`);
  return post.id;
}

test.describe("Comentários", () => {
  test("COMMENT-E2E-004 professor dono modera comentário e projeções distintas são observadas", async ({
    page,
    browser,
  }) => {
    const titulo = "Post C-E2E-004 — Moderação";
    const texto = "Comentário a ser moderado (COMMENT-E2E-004).";
    const motivo = "Conteúdo impróprio.";

    // 1. Professor dono cria post
    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    await criarPost(page, titulo, "Post para testar moderação.");
    const posts = await listarColecao(`Turma/${TURMA_ID}/Posts`);
    const postId = posts.find((p) => p.data.titulo === titulo)!.id;

    // 2. Aluno comenta
    const contextoAluno = await browser.newContext();
    const paginaAluno = await contextoAluno.newPage();
    observarConsole(paginaAluno);
    try {
      await login(paginaAluno, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAluno, TURMA);
      await abrirComentarios(paginaAluno, titulo);
      await comentar(paginaAluno, titulo, texto);
    } finally {
      await contextoAluno.close();
    }

    const comentarios = await listarColecao(`Turma/${TURMA_ID}/Posts/${postId}/Comentarios`);
    const comentario = comentarios.find((c) => c.data.texto === texto);
    expect(comentario).toBeTruthy();

    // 3. Professor dono modera o comentário.
    await abrirComentarios(page, titulo);
    const cardComentario = cartaoDoPost(page, titulo);
    await cardComentario.hover();
    await cardComentario.getByRole("button", { name: "Moderar comentário" }).first().click();
    await cardComentario.getByPlaceholder("Motivo da moderação...").fill(motivo);
    await cardComentario.getByRole("button", { name: "Confirmar moderação" }).click();

    // 4. O AUTOR (aluno que comentou) vê o original marcado como moderado.
    //    A projeção COLEGA (aviso institucional) é provada na camada de
    //    integração backend, onde é possível semear um segundo membro.
    const contextoAluno2 = await browser.newContext();
    const paginaAluno2 = await contextoAluno2.newPage();
    const consoleAluno2 = observarConsole(paginaAluno2);
    try {
      await login(paginaAluno2, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAluno2, TURMA);
      await abrirComentarios(paginaAluno2, titulo);
      await expect(paginaAluno2.getByText(texto)).toBeVisible();
      await expect(paginaAluno2.getByText("(moderado)")).toBeVisible();
      consoleAluno2.verificar();
    } finally {
      await contextoAluno2.close();
    }

    // 5. Professor dono (auditor) vê o original e o motivo da moderação.
    // Barreira de sincronização: recarrega a turma e reabre os comentários para
    // garantir que o estado moderado seja renderizado após o commit no Firestore.
    await abrirTurma(page, TURMA);
    await abrirComentarios(page, titulo);
    await expect(cartaoDoPost(page, titulo).getByText(texto)).toBeVisible();
    await expect(
      cartaoDoPost(page, titulo).getByText(new RegExp(`Motivo:\\s*${motivo}`))
    ).toBeVisible();
  });

  test("COMMENT-E2E-001 aluno participante comenta no post e o comentário persiste", async ({
    page,
    browser,
  }) => {
    const titulo = "Post C-E2E-001 — Comentários";
    const texto = "Comentário do aluno participante (COMMENT-E2E-001).";

    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    await criarPost(page, titulo, "Post para a vertical de comentários.");
    const postId = await idDoPost(titulo);

    const contextoAluno = await browser.newContext();
    const paginaAluno = await contextoAluno.newPage();
    const consoleAluno = observarConsole(paginaAluno);
    try {
      await login(paginaAluno, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAluno, TURMA);
      await abrirComentarios(paginaAluno, titulo);
      await comentar(paginaAluno, titulo, texto);
      consoleAluno.verificar();
    } finally {
      await contextoAluno.close();
    }

    const comentarios = await listarColecao(
      `Turma/${TURMA_ID}/Posts/${postId}/Comentarios`
    );
    const comentario = comentarios.find((item) => item.data.texto === texto);
    expect(comentario, "o comentário deve existir no emulator").toBeTruthy();
    expect(comentario!.data.id_post).toBe(postId);
    expect(comentario!.data.id_usuario).toBe("seed-aluno-enrolled");
    expect(typeof comentario!.data.nome_usuario).toBe("string");
    expect(comentario!.data.criado_em).toBeTruthy();
  });

  test("COMMENT-E2E-002 professor dono vê o comentário do aluno", async ({
    page,
    browser,
  }) => {
    const titulo = "Post C-E2E-002 — Comentários";
    const texto = "Comentário visível ao professor dono (COMMENT-E2E-002).";

    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    await criarPost(page, titulo, "Post para a vertical de comentários (2).");

    const contextoAluno = await browser.newContext();
    const paginaAluno = await contextoAluno.newPage();
    const consoleAluno = observarConsole(paginaAluno);
    try {
      await login(paginaAluno, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAluno, TURMA);
      await abrirComentarios(paginaAluno, titulo);
      await comentar(paginaAluno, titulo, texto);
      consoleAluno.verificar();
    } finally {
      await contextoAluno.close();
    }

    // O professor dono reabre a seção de comentários e observa o texto do aluno.
    await abrirComentarios(page, titulo);
    await expect(cartaoDoPost(page, titulo).getByText(texto)).toBeVisible();
  });

  test("COMMENT-E2E-003 Chefe Geral sem vínculo não comenta e nada é persistido", async ({
    page,
    browser,
    guardaConsole,
  }) => {
    guardaConsole.permitir(/Erro ao comentar/, /status of 403/);
    const titulo = "Post C-E2E-003 — Comentários";
    const texto = "Tentativa de comentário sem autorização (COMMENT-E2E-003).";

    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    await criarPost(page, titulo, "Post para a vertical de comentários (3).");
    const postId = await idDoPost(titulo);

    const contextoChefe = await browser.newContext();
    const paginaChefe = await contextoChefe.newPage();
    const consoleChefe = observarConsole(paginaChefe);
    consoleChefe.permitir(/Erro ao comentar/, /status of 403/);
    try {
      await login(paginaChefe, "chefe.seed@lcqui.local");
      await abrirTurma(paginaChefe, TURMA);
      await abrirComentarios(paginaChefe, titulo);
      await cartaoDoPost(paginaChefe, titulo)
        .getByPlaceholder("Escreva um comentário...")
        .fill(texto);

      const dialogoPromise = paginaChefe.waitForEvent("dialog");
      await cartaoDoPost(paginaChefe, titulo)
        .getByRole("button", { name: "Comentar", exact: true })
        .click();
      const dialogo = await dialogoPromise;
      expect(dialogo.message()).toContain("professor responsável");
      await dialogo.accept();
      consoleChefe.verificar();
    } finally {
      await contextoChefe.close();
    }

    const comentarios = await listarColecao(
      `Turma/${TURMA_ID}/Posts/${postId}/Comentarios`
    );
    expect(comentarios.some((item) => item.data.id_usuario === "seed-chefe-geral")).toBe(
      false
    );
    expect(comentarios.some((item) => item.data.texto === texto)).toBe(false);
  });

  test("COMMENT-E2E-005 colega de turma vê aviso institucional, nunca o texto do comentário moderado", async ({
    page,
    browser,
  }) => {
    const titulo = "Post C-E2E-005 — Projeção Colega";
    const texto = "Comentário a ser moderado (COMMENT-E2E-005).";
    const motivo = "Conteúdo impróprio.";

    // 1. Professor dono cria o Post na turma com 3 membros (autor + 2 colegas).
    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA_COLEGAS);
    await criarPost(page, titulo, "Post para projeção colega.");
    const posts = await listarColecao(`Turma/${TURMA_COLEGAS_ID}/Posts`);
    const postId = posts.find((p) => p.data.titulo === titulo)!.id;

    // 2. O autor (aluno matriculado) comenta.
    const contextoAutor = await browser.newContext();
    const paginaAutor = await contextoAutor.newPage();
    observarConsole(paginaAutor);
    try {
      await login(paginaAutor, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAutor, TURMA_COLEGAS);
      await abrirComentarios(paginaAutor, titulo);
      await comentar(paginaAutor, titulo, texto);
    } finally {
      await contextoAutor.close();
    }

    // 3. O comentário persiste com o texto original no Firestore Emulator.
    const comentarios = await listarColecao(
      `Turma/${TURMA_COLEGAS_ID}/Posts/${postId}/Comentarios`
    );
    const comentario = comentarios.find((c) => c.data.texto === texto);
    expect(comentario).toBeTruthy();

    // 4. Professor dono modera o comentário.
    await abrirComentarios(page, titulo);
    const cardComentario = cartaoDoPost(page, titulo);
    await cardComentario.hover();
    await cardComentario.getByRole("button", { name: "Moderar comentário" }).first().click();
    await cardComentario.getByPlaceholder("Motivo da moderação...").fill(motivo);
    await cardComentario.getByRole("button", { name: "Confirmar moderação" }).click();

    // Barreira de sincronização: a visão AUDITOR do professor revela o motivo
    // somente após o reload pós-moderação, garantindo que o commit chegou ao
    // Firestore antes de abrir os contextos dos colegas.
    await expect(
      cardComentario.getByText(new RegExp(`Motivo:\\s*${motivo}`))
    ).toBeVisible();

    // 5–6. Cada colega (nem autor, nem moderador) recebe a projeção COLEGA:
    //     texto nulo + aviso institucional — nunca o original.
    for (const email of ["aluno.colega.a@lcqui.local", "aluno.colega.b@lcqui.local"]) {
      const contextoColega = await browser.newContext();
      const paginaColega = await contextoColega.newPage();
      const consoleColega = observarConsole(paginaColega);
      try {
        await login(paginaColega, email);
        await abrirTurma(paginaColega, TURMA_COLEGAS);
        await abrirComentarios(paginaColega, titulo);
        // Ordem intencional: o aviso prova que a listagem retornou; contar o
        // texto depois evita falso-positivo sobre estado ainda não carregado.
        await expect(paginaColega.getByText(/moderado pelo professor/i)).toBeVisible();
        await expect(paginaColega.getByText(texto)).toHaveCount(0);
        consoleColega.verificar();
      } finally {
        await contextoColega.close();
      }
    }

    // 7. O moderador (auditor) vê o original preservado e o motivo.
    await expect(cartaoDoPost(page, titulo).getByText(texto)).toBeVisible();
    await expect(
      cartaoDoPost(page, titulo).getByText(new RegExp(`Motivo:\\s*${motivo}`))
    ).toBeVisible();

    // 8. Persistência: moderação marcada e texto original preservado.
    const comentariosFinais = await listarColecao(
      `Turma/${TURMA_COLEGAS_ID}/Posts/${postId}/Comentarios`
    );
    const comentarioFinal = comentariosFinais.find((c) => c.data.texto === texto);
    expect(comentarioFinal).toBeTruthy();
    expect(comentarioFinal!.data.moderado).toBe(true);
    expect(comentarioFinal!.data.texto).toBe(texto);
  });

  test("COMMENT-E2E-006 autor edita seu comentário e indicador (editado) aparece", async ({
    page,
    browser,
  }) => {
    const titulo = "Post C-E2E-006 — Edição de Comentário";
    const textoOriginal = "Comentário original do autor (COMMENT-E2E-006).";
    const textoEditado = "Comentário editado do autor (COMMENT-E2E-006).";

    // 1. Professor dono cria o Post na turma com o autor (aluno.matriculado@lcqui.local).
    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    await criarPost(page, titulo, "Post para testar edição de comentário.");

    // 2. O autor comenta. O contexto NÃO é fechado: apenas o autor (isOwner na
    //    UI e autoria validada no callable) enxerga "Editar comentário".
    const contextoAutor = await browser.newContext();
    const paginaAutor = await contextoAutor.newPage();
    const consoleAutor = observarConsole(paginaAutor);
    try {
      await login(paginaAutor, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAutor, TURMA);
      await abrirComentarios(paginaAutor, titulo);
      await comentar(paginaAutor, titulo, textoOriginal);
      consoleAutor.verificar();

      // 3. O autor edita o próprio comentário. A seção permanece expandida
      //    desde `comentar` (o toggle exibe "Ocultar comentários"); recolher
      //    antes evita clicar no botão "Ver comentários" inexistente.
      await cartaoDoPost(paginaAutor, titulo)
        .getByRole("button", { name: /Ocultar comentários/ })
        .click();
      await abrirComentarios(paginaAutor, titulo);
      await editarComentario(paginaAutor, titulo, textoOriginal, textoEditado);

      // 4. O autor vê o texto editado e o indicador (editado).
      await expect(
        cartaoDoPost(paginaAutor, titulo).getByText(textoEditado)
      ).toBeVisible();
      const comentarioEditado = cartaoDoPost(paginaAutor, titulo)
        .getByText(textoEditado)
        .locator("../..");
      await expect(comentarioEditado.getByText("(editado)")).toBeVisible();
      consoleAutor.verificar();

      // 5. Persistência: a edição fica registrada no Firestore Emulator.
      const posts = await listarColecao(`Turma/${TURMA_ID}/Posts`);
      const postId = posts.find((p) => p.data.titulo === titulo)!.id;
      const comentarios = await listarColecao(
        `Turma/${TURMA_ID}/Posts/${postId}/Comentarios`
      );
      const comentarioEditadoFirestore = comentarios.find(
        (c) => c.data.texto === textoEditado
      );
      expect(comentarioEditadoFirestore).toBeTruthy();
      expect(comentarioEditadoFirestore!.data.editado).toBe(true);
      expect(comentarioEditadoFirestore!.data.editado_em).toBeTruthy();
    } finally {
      // 6. Todos os contextos são encerrados somente ao final do teste.
      await contextoAutor.close();
    }
  });

  test("COMMENT-E2E-007 edição do autor não desfaz moderação", async ({
    page,
    browser,
  }) => {
    const titulo = "Post C-E2E-007 — Edição não desfaz moderação";
    const textoOriginal = "Comentário original do aluno (COMMENT-E2E-007).";
    const textoEditado = "Comentário editado pelo autor (COMMENT-E2E-007).";
    const motivo = "Conteúdo impróprio.";

    // 1. Professor dono cria o Post na turma com o autor e os colegas; a
    //    projeção COLEGA é verificada no passo 8.
    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA_COLEGAS);
    await criarPost(page, titulo, "Post para testar edição após moderação.");

    // 2–6. O autor comenta e depois edita o comentário moderado. O contexto
    // permanece aberto até a edição e as verificações da visão AUTOR.
    const contextoAluno = await browser.newContext();
    const paginaAluno = await contextoAluno.newPage();
    const consoleAluno = observarConsole(paginaAluno);
    try {
      await login(paginaAluno, "aluno.colega.a@lcqui.local");
      await abrirTurma(paginaAluno, TURMA_COLEGAS);
      await abrirComentarios(paginaAluno, titulo);
      await comentar(paginaAluno, titulo, textoOriginal);
      consoleAluno.verificar();

      // 3. Professor dono modera o comentário.
      await abrirComentarios(page, titulo);
      const cardPost = cartaoDoPost(page, titulo);
      await cardPost.hover();
      await cardPost.getByRole("button", { name: "Moderar comentário" }).first().click();
      await cardPost.getByPlaceholder("Motivo da moderação...").fill(motivo);
      await cardPost.getByRole("button", { name: "Confirmar moderação" }).click();

      // Barreira: a visão AUDITOR só revela o motivo após o reload pós-
      // moderação, garantindo o commit antes de o autor reabrir os comentários.
      await expect(
        cardPost.getByText(new RegExp(`Motivo:\\s*${motivo}`))
      ).toBeVisible();

      // 4. O autor (ainda na página original) recolhe e reabre os comentários
      //    para ler o estado moderado e edita o próprio comentário.
      await cartaoDoPost(paginaAluno, titulo)
        .getByRole("button", { name: /Ocultar comentários/ })
        .click();
      await abrirComentarios(paginaAluno, titulo);
      await editarComentario(paginaAluno, titulo, textoOriginal, textoEditado);

      // 5. Persistência: texto editado com `editado = true` e moderação intacta.
      const posts = await listarColecao(`Turma/${TURMA_COLEGAS_ID}/Posts`);
      const postId = posts.find((p) => p.data.titulo === titulo)!.id;
      const comentariosPost = await listarColecao(
        `Turma/${TURMA_COLEGAS_ID}/Posts/${postId}/Comentarios`
      );
      const comentario = comentariosPost.find((c) => c.data.texto === textoEditado);
      expect(comentario).toBeTruthy();
      expect(comentario!.data.editado).toBe(true);
      expect(comentario!.data.texto).toBe(textoEditado);
      expect(comentario!.data.moderado).toBe(true);

      // 6. Visão AUTOR: o autor vê o texto editado marcado como moderado.
      await expect(paginaAluno.getByText(textoEditado)).toBeVisible();
      await expect(paginaAluno.getByText("(moderado)")).toBeVisible();
      consoleAluno.verificar();
    } finally {
      await contextoAluno.close();
    }

    // 7. Visão AUDITOR: o professor dono recarrega o feed (comentários não são
    //    realtime) e vê o texto editado e o motivo da moderação.
    await abrirTurma(page, TURMA_COLEGAS);
    await abrirComentarios(page, titulo);
    await expect(cartaoDoPost(page, titulo).getByText(textoEditado)).toBeVisible();
    await expect(
      cartaoDoPost(page, titulo).getByText(new RegExp(`Motivo:\\s*${motivo}`))
    ).toBeVisible();

    // 8. Visão COLEGA: aviso institucional, nunca o texto (editado ou original).
    const contextoColegaB = await browser.newContext();
    const paginaColegaB = await contextoColegaB.newPage();
    const consoleColegaB = observarConsole(paginaColegaB);
    try {
      await login(paginaColegaB, "aluno.colega.b@lcqui.local");
      await abrirTurma(paginaColegaB, TURMA_COLEGAS);
      await abrirComentarios(paginaColegaB, titulo);
      await expect(paginaColegaB.getByText(/moderado pelo professor/i)).toBeVisible();
      await expect(paginaColegaB.getByText(textoEditado)).toHaveCount(0);
      await expect(paginaColegaB.getByText(textoOriginal)).toHaveCount(0);
      consoleColegaB.verificar();
    } finally {
      await contextoColegaB.close();
    }
  });
});

import { test, expect } from "../fixtures";
import {
  abrirComentarios,
  abrirTurma,
  cartaoDoPost,
  comentar,
  criarPost,
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

async function idDoPost(titulo: string): Promise<string> {
  const posts = await listarColecao(`Turma/${TURMA_ID}/Posts`);
  const post = posts.find((item) => item.data.titulo === titulo);
  if (!post) throw new Error(`Post não encontrado no emulator: ${titulo}`);
  return post.id;
}

test.describe("Comentários", () => {
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
});

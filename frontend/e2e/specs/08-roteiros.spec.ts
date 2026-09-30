import { expect } from "../fixtures";
import { test } from "../fixtures";
import {
  login,
  abrirTurma,
  criarPost,
  cartaoDoPost,
  observarConsole,
  esperarCallable,
  lerResultadoCallable,
} from "../helpers/ui";
import { lerDocumento, listarColecao } from "../helpers/emulator";

/**
 * Vertical Roteiros em Posts (M12.2 / UI-11 / Seção 9).
 *
 * Exercita o fluxo canônico: professor anexa um `Roteiro_Experimento` público
 * ao criar um Post; aluno matriculado solicita URL de download autorizada;
 * professor pode desvincular o anexo na edição.
 */

const TURMA = "Química Geral — T2 Última Vaga";
const TURMA_ID = "seed-turma-ultima-vaga";
const ROTEIRO_ID = "seed-roteiro-m12";

test.describe("Roteiros em Posts", () => {
  test("RTR-E2E-001 professor dono anexa roteiro publicável ao criar Post", async ({ page }) => {
    const titulo = "Post RTR-E2E-001 — Anexo de roteiro";
    const descricao = "Post criado com roteiro anexado no E2E-001.";

    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);

    await criarPost(page, titulo, descricao, ROTEIRO_ID);

    const card = cartaoDoPost(page, titulo);
    await expect(card.getByText(/Anexo: seed-roteiro-m12\.pdf/)).toBeVisible();

    const posts = await listarColecao(`Turma/${TURMA_ID}/Posts`);
    const post = posts.find((p) => p.data.titulo === titulo);
    expect(post, "o Post persistido deve existir").toBeTruthy();

    const anexo = post!.data.roteiro_anexo as Record<string, unknown> | null;
    expect(anexo, "roteiro_anexo deve estar presente").toBeTruthy();
    expect(Object.keys(anexo!)).toHaveLength(5);
    expect(anexo).toHaveProperty("id_roteiro", ROTEIRO_ID);
    expect(anexo).toHaveProperty("nome_arquivo", "seed-roteiro-m12.pdf");
    expect(anexo).toHaveProperty("storage_path", `roteiros/seed-professor-alpha/${ROTEIRO_ID}.pdf`);
    expect(typeof anexo!.geracao).toBe("string");

    const roteiro = await lerDocumento(`Roteiro_Experimento/${ROTEIRO_ID}`);
    const referencia = roteiro!.data.referencia as { geracao: string; tamanho_bytes: number };
    expect(anexo!.geracao).toBe(referencia.geracao);
    expect(anexo!.tamanho_bytes).toBe(referencia.tamanho_bytes);
  });

  test("RTR-E2E-002 aluno matriculado solicita URL de download do anexo", async ({ page, browser }) => {
    const titulo = "Post RTR-E2E-002 — Download de roteiro";
    const descricao = "Post com roteiro para exercitar download pelo aluno.";

    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    await criarPost(page, titulo, descricao, ROTEIRO_ID);

    const contextoAluno = await browser.newContext();
    const paginaAluno = await contextoAluno.newPage();
    const consoleAluno = observarConsole(paginaAluno);

    try {
      await login(paginaAluno, "aluno.matriculado@lcqui.local");
      await abrirTurma(paginaAluno, TURMA);

      const card = cartaoDoPost(paginaAluno, titulo);
      await expect(card.getByText(/Anexo: seed-roteiro-m12\.pdf/)).toBeVisible();

      const respostaPromise = esperarCallable(paginaAluno, "emitirUrlDownloadRoteiro");
      // `window.open` pode abrir uma nova aba com a URL assinada.
      const popupPromise = paginaAluno.waitForEvent("popup", { timeout: 5000 }).catch(() => null);

      await card.getByTestId("botao-download-roteiro").click();

      const resposta = await respostaPromise;
      expect(resposta.status()).toBe(200);
      const corpo = await lerResultadoCallable(resposta);
      expect(typeof corpo.url).toBe("string");
      expect(corpo.url).toMatch(/^https?:\/\//);

      const popup = await popupPromise;
      if (popup) {
        // O emulador pode ou não servir o binário assinado; fechamos a aba
        // para não acumular contexto. A validação principal é a callable.
        await popup.close();
      }

      consoleAluno.verificar();
    } finally {
      await contextoAluno.close();
    }
  });

  test("RTR-E2E-003 professor desvincula anexo na edição do Post", async ({ page }) => {
    const titulo = "Post RTR-E2E-003 — Desvínculo de anexo";
    const descricao = "Post com roteiro que será desvinculado.";

    await login(page, "professor.alpha@lcqui.local");
    await abrirTurma(page, TURMA);
    await criarPost(page, titulo, descricao, ROTEIRO_ID);

    const card = cartaoDoPost(page, titulo);
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await card.getByRole("button", { name: "Editar Postagem", exact: true }).click();

    await page.getByTestId("seletor-roteiro-edicao").selectOption("");
    const resposta = esperarCallable(page, "editarPost");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await resposta;

    await expect(card.getByTestId("roteiro-anexo-card")).toHaveCount(0);

    const posts = await listarColecao(`Turma/${TURMA_ID}/Posts`);
    const post = posts.find((p) => p.data.titulo === titulo);
    expect(post, "o Post persistido deve existir").toBeTruthy();
    expect(post!.data.roteiro_anexo).toBeNull();
    expect(post!.data.id_roteiro_experimento).toBeNull();
  });
});

import { test, expect } from "../fixtures";
import { login, esperarCallable, lerResultadoCallable } from "../helpers/ui";
import {
  listarColecao,
  lerDocumento,
  FIRESTORE_EMULATOR,
  PROJECT_ID,
} from "../helpers/emulator";

/**
 * Locais e propagação — IMP-BASE-002 / UI-03 (Seção 8).
 *
 * Exercita criação, edição, duplicidade, trim, validação de campos
 * (maxLength e obrigatórios), estados da lista e controle de acesso
 * via UI do gestor patrimonial e do chefe, validando o contrato
 * canônico persistido no Firestore Emulator.
 *
 * Cada teste é independente: cria seus próprios dados e limpa ao final.
 */

const DOCS = `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function deletarColecao(nome: string): Promise<void> {
  const docs = await listarColecao(nome);
  for (const doc of docs) {
    await fetch(`${DOCS}/${nome}/${doc.id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer owner" },
    });
  }
}

async function deletarChavesLocal(): Promise<void> {
  const chaves = await listarColecao("Chaves_Unicas");
  const chavesLocal = chaves.filter((c) => c.data.tipo === "Local");
  for (const chave of chavesLocal) {
    await fetch(`${DOCS}/Chaves_Unicas/${chave.id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer owner" },
    });
  }
}

test.describe("LOCAL-E2E — Gestão de Locais", () => {
  test("LOCAL-E2E-001: gestor cria local com trim e maxLength", async ({
    page,
  }) => {
    await login(page, "gestor.patrimonial@lcqui.local");
    await page.goto("/patrimonio");

    // Seção "Gestão de Locais" deve estar visível para gestor
    await expect(page.getByText("Gestão de Locais")).toBeVisible();
    await expect(page.getByTestId("lista-locais")).toBeVisible();

    // Abrir modal de novo local
    await page.getByTestId("btn-novo-local").click();
    await expect(page.getByTestId("modal-local")).toBeVisible();

    // Preencher campos com espaços (trim deve atuar no backend/frontend)
    await page.getByTestId("input-predio").fill(" P5 ");
    await page.getByTestId("input-andar").fill(" Térreo ");
    await page.getByTestId("input-sala").fill(" 101 ");

    // Salvar e aguardar callable
    const resposta = esperarCallable(page, "gerenciarLocal");
    await page.getByTestId("btn-salvar-local").click();
    await resposta;

    // Modal fecha após sucesso
    await expect(page.getByTestId("modal-local")).toHaveCount(0);

    // Verificar persistência no Firestore — campos trimmed
    const resultado = await lerResultadoCallable(await resposta);
    const idLocal = (resultado as { id?: string }).id;
    expect(idLocal, "callable deve retornar id do local criado").toBeTruthy();

    const doc = await lerDocumento(`Local/${idLocal}`);
    expect(doc, "local deve existir no Firestore").toBeTruthy();
    expect(doc!.data.predio).toBe("P5");
    expect(doc!.data.andar).toBe("Térreo");
    expect(doc!.data.sala).toBe("101");

    // Verificar que aparece na listagem (via onSnapshot)
    await expect(page.getByTestId(`local-item-${idLocal}`)).toBeVisible();
  });

  test("LOCAL-E2E-002: chefe edita local mantendo ID do documento", async ({
    page,
  }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/patrimonio");

    // Seção "Gestão de Locais" visível para chefe
    await expect(page.getByText("Gestão de Locais")).toBeVisible();

    // Criar local temporário para editar
    await page.getByTestId("btn-novo-local").click();
    await expect(page.getByTestId("modal-local")).toBeVisible();
    await page.getByTestId("input-predio").fill("EditTest");
    await page.getByTestId("input-andar").fill("1");
    await page.getByTestId("input-sala").fill("201");

    const respostaCriar = esperarCallable(page, "gerenciarLocal");
    await page.getByTestId("btn-salvar-local").click();
    await respostaCriar;
    await expect(page.getByTestId("modal-local")).toHaveCount(0);

    const resultadoCriar = await lerResultadoCallable(await respostaCriar);
    const idLocal = (resultadoCriar as { id?: string }).id;
    expect(idLocal, "ID do local criado deve ser retornado").toBeTruthy();

    // Verificar que o item aparece na lista
    await expect(page.getByTestId(`local-item-${idLocal}`)).toBeVisible();

    // Clicar em editar no item criado
    await page.getByTestId(`btn-editar-local-${idLocal}`).click();
    await expect(page.getByTestId("modal-local")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Editar Local" })).toBeVisible();

    // Verificar campos pré-preenchidos
    await expect(page.getByTestId("input-predio")).toHaveValue("EditTest");
    await expect(page.getByTestId("input-andar")).toHaveValue("1");
    await expect(page.getByTestId("input-sala")).toHaveValue("201");

    // Alterar sala
    await page.getByTestId("input-sala").fill("202");

    // Salvar edição
    const respostaEditar = esperarCallable(page, "gerenciarLocal");
    await page.getByTestId("btn-salvar-local").click();
    await respostaEditar;
    await expect(page.getByTestId("modal-local")).toHaveCount(0);

    // Verificar que o ID do documento se manteve e a sala mudou
    const doc = await lerDocumento(`Local/${idLocal}`);
    expect(doc, "documento deve continuar com o mesmo ID").toBeTruthy();
    expect(doc!.data.predio).toBe("EditTest");
    expect(doc!.data.andar).toBe("1");
    expect(doc!.data.sala).toBe("202");
  });

  test("LOCAL-E2E-003: duplicata normalizada exibe erro already-exists", async ({
    page,
    guardaConsole,
  }) => {
    await login(page, "gestor.patrimonial@lcqui.local");
    await page.goto("/patrimonio");

    // Permitir erro ALREADY_EXISTS esperado ao tentar duplicata
    guardaConsole.permitir(/already-exists|ALREADY_EXISTS|409/i);

    // Criar local pela primeira vez
    await page.getByTestId("btn-novo-local").click();
    await expect(page.getByTestId("modal-local")).toBeVisible();
    await page.getByTestId("input-predio").fill("DupTest");
    await page.getByTestId("input-andar").fill("1");
    await page.getByTestId("input-sala").fill("301");

    const resposta1 = esperarCallable(page, "gerenciarLocal");
    await page.getByTestId("btn-salvar-local").click();
    await resposta1;
    await expect(page.getByTestId("modal-local")).toHaveCount(0);

    // Tentar criar o mesmo local (mesmos valores normalizados)
    await page.getByTestId("btn-novo-local").click();
    await expect(page.getByTestId("modal-local")).toBeVisible();
    await page.getByTestId("input-predio").fill("DupTest");
    await page.getByTestId("input-andar").fill("1");
    await page.getByTestId("input-sala").fill("301");

    const resposta2 = esperarCallable(page, "gerenciarLocal");
    await page.getByTestId("btn-salvar-local").click();
    await resposta2;

    // Erro de unicidade deve aparecer
    await expect(page.getByTestId("erro-campo-local")).toBeVisible();
    await expect(page.getByTestId("erro-campo-local")).toContainText(
      "já cadastrado"
    );

    // Modal continua aberto (não fecha em caso de erro)
    await expect(page.getByTestId("modal-local")).toBeVisible();
  });

  test("LOCAL-E2E-004: estados da lista — vazio desaparece após criar local", async ({
    page,
  }) => {
    await login(page, "gestor.patrimonial@lcqui.local");

    // Limpar Locais e Chaves_Unicas (tipo=Local) para forçar estado vazio
    await deletarColecao("Local");
    await deletarChavesLocal();

    try {
      // Navegar para página de patrimônio
      await page.goto("/patrimonio");
      await expect(page.getByText("Gestão de Locais")).toBeVisible();

      // Deve mostrar estado vazio
      await expect(page.getByTestId("estado-vazio")).toBeVisible({
        timeout: 5000,
      });

      // Criar um local para que o estado vazio desapareça
      await page.getByTestId("btn-novo-local").click();
      await expect(page.getByTestId("modal-local")).toBeVisible();
      await page.getByTestId("input-predio").fill("VazioTest");
      await page.getByTestId("input-andar").fill("1");
      await page.getByTestId("input-sala").fill("401");

      const resposta = esperarCallable(page, "gerenciarLocal");
      await page.getByTestId("btn-salvar-local").click();
      await resposta;
      await expect(page.getByTestId("modal-local")).toHaveCount(0);

      // Estado vazio desaparece após criar
      await expect(page.getByTestId("estado-vazio")).toHaveCount(0, {
        timeout: 5000,
      });

      // A tabela de locais deve estar visível
      await expect(
        page.getByTestId("lista-locais").locator("table")
      ).toBeVisible();
    } finally {
      // Limpar dados criados pelo teste para não afetar outros testes
      await deletarColecao("Local");
      await deletarChavesLocal();
    }
  });

  test("LOCAL-E2E-005: criar local via ModalNovoBem seleciona o local retornado", async ({
    page,
  }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/patrimonio");

    // Garantir que há pelo menos um local para que ListaLocais em modo
    // seleção mostre o botão "+ Novo Local"
    // (se o seed não tiver locais, criar um)
    const locaisExistentes = await listarColecao("Local");
    if (locaisExistentes.length === 0) {
      await page.getByTestId("btn-novo-local").click();
      await expect(page.getByTestId("modal-local")).toBeVisible();
      await page.getByTestId("input-predio").fill("SeedLocal");
      await page.getByTestId("input-andar").fill("1");
      await page.getByTestId("input-sala").fill("001");
      const respostaSeed = esperarCallable(page, "gerenciarLocal");
      await page.getByTestId("btn-salvar-local").click();
      await respostaSeed;
      await expect(page.getByTestId("modal-local")).toHaveCount(0);
    }

    // Abrir modal "Adicionar Bem" — botão visível apenas a gestores
    await page
      .getByRole("button", { name: /Adicionar Bem/ })
      .click();

    // Modal de novo bem abre — verificar pelo heading
    await expect(
      page.getByRole("heading", { name: "Adicionar Bem Patrimonial" })
    ).toBeVisible();

    // ListaLocais em modo seleção deve aparecer dentro do modal
    await expect(page.getByTestId("seletor-local-lista-locais")).toBeVisible();

    // Clicar em "+ Novo Local" dentro do seletor
    await page.getByTestId("seletor-local-btn-novo-local").click();

    // Modal de novo local abre (sobreposto ao modal de bem)
    await expect(page.getByTestId("modal-local")).toBeVisible();
    await page.getByTestId("input-predio").fill("ModalTest");
    await page.getByTestId("input-andar").fill("2");
    await page.getByTestId("input-sala").fill("501");

    const respostaLocal = esperarCallable(page, "gerenciarLocal");
    await page.getByTestId("btn-salvar-local").click();
    await respostaLocal;

    // Modal de local fecha
    await expect(page.getByTestId("modal-local")).toHaveCount(0);

    // O local recém-criado deve ficar selecionado no form do bem
    // (onSucesso => setSelectedLocalId) — o botão "Salvar Bem" deve
    // estar habilitado (não disabled) pois selectedLocalId foi definido
    const btnSalvarBem = page.getByRole("button", { name: "Salvar Bem" });
    await expect(btnSalvarBem).toBeEnabled();

    // Verificar que o local aparece selecionado (destaque visual) na
    // lista de seleção: o item selecionado recebe bg-primary/10
    const resultado = await lerResultadoCallable(await respostaLocal);
    const idNovoLocal = (resultado as { id?: string }).id;
    expect(
      idNovoLocal,
      "callable deve retornar id do local criado via modal de bem"
    ).toBeTruthy();

    // O item selecionado deve ter a classe de destaque (border-l-primary)
    const itemSelecionado = page.getByTestId(`seletor-local-local-item-${idNovoLocal}`);
    await expect(itemSelecionado).toBeVisible();
    await expect(itemSelecionado).toHaveClass(/border-l-primary/);
  });

  test("LOCAL-E2E-006: professor não acessa gestão de locais", async ({
    page,
  }) => {
    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/patrimonio");

    // Seção "Gestão de Locais" NÃO deve aparecer (hasManagementAccess = false)
    await expect(page.getByText("Gestão de Locais")).toHaveCount(0);

    // Botão "+ Novo Local" NÃO deve estar visível
    await expect(page.getByTestId("btn-novo-local")).toHaveCount(0);

    // Barra de ações de gestor (Adicionar Bem, Gerar Relatórios etc.) não aparece
    await expect(
      page.getByRole("button", { name: /Adicionar Bem/ })
    ).toHaveCount(0);
  });

  test("LOCAL-E2E-007: maxLength impede exceder limites de prédio, andar e sala", async ({
    page,
  }) => {
    await login(page, "gestor.patrimonial@lcqui.local");
    await page.goto("/patrimonio");

    // Abrir modal de novo local
    await page.getByTestId("btn-novo-local").click();
    await expect(page.getByTestId("modal-local")).toBeVisible();

    // UI-03: prédio ≤ 30 caracteres (maxLength=30)
    await page.getByTestId("input-predio").fill("A".repeat(35));
    const predioValue = await page.getByTestId("input-predio").inputValue();
    expect(
      predioValue.length,
      "prédio deve respeitar maxLength=30"
    ).toBeLessThanOrEqual(30);

    // UI-03: andar ≤ 10 caracteres (maxLength=10)
    await page.getByTestId("input-andar").fill("B".repeat(15));
    const andarValue = await page.getByTestId("input-andar").inputValue();
    expect(
      andarValue.length,
      "andar deve respeitar maxLength=10"
    ).toBeLessThanOrEqual(10);

    // UI-03: sala ≤ 30 caracteres (maxLength=30)
    await page.getByTestId("input-sala").fill("C".repeat(35));
    const salaValue = await page.getByTestId("input-sala").inputValue();
    expect(
      salaValue.length,
      "sala deve respeitar maxLength=30"
    ).toBeLessThanOrEqual(30);
  });

  test("LOCAL-E2E-008: campos vazios (apenas espaços) são rejeitados", async ({
    page,
  }) => {
    await login(page, "gestor.patrimonial@lcqui.local");
    await page.goto("/patrimonio");

    // Abrir modal de novo local
    await page.getByTestId("btn-novo-local").click();
    await expect(page.getByTestId("modal-local")).toBeVisible();

    // Preencher todos os campos com apenas espaços (trim => vazio)
    await page.getByTestId("input-predio").fill("   ");
    await page.getByTestId("input-andar").fill("   ");
    await page.getByTestId("input-sala").fill("   ");

    // Clicar em salvar — o callable NÃO deve ser chamado
    await page.getByTestId("btn-salvar-local").click();

    // UI-03: erro genérico aparece com texto "obrigatórios"
    await expect(page.getByTestId("erro-campo-local")).toBeVisible();
    await expect(page.getByTestId("erro-campo-local")).toContainText(
      "obrigatórios"
    );

    // Modal NÃO fecha (callable não foi chamado, early return no handleSubmit)
    await expect(page.getByTestId("modal-local")).toBeVisible();
  });
});

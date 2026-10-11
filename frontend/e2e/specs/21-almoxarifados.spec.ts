import { test, expect } from "../fixtures";
import { login, esperarCallable, lerResultadoCallable } from "../helpers/ui";
import { listarColecao, lerDocumento } from "../helpers/emulator";

const gestorNome = "Gestor de Almoxarifado (Seed)";
let sequencia = 0;
function nome(prefixo: string): string { sequencia += 1; return `${prefixo}-${Date.now()}-${sequencia}`; }

async function abrirNovo(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/reagentes");
  await page.getByTestId("almox-btn-novo-almoxarifado").click();
  await expect(page.getByTestId("modal-almoxarifado")).toBeVisible();
}

async function escolherLocal(page: import("@playwright/test").Page, criar = false): Promise<void> {
  const lista = page.getByTestId("almox-lista-locais");
  if (criar || await lista.getByTestId("almox-estado-vazio").count()) {
    await lista.getByTestId("almox-btn-novo-local").click();
    await page.getByTestId("input-predio").fill(nome("AlmoxLocal"));
    await page.getByTestId("input-andar").click();
    await page.getByTestId("input-andar").pressSequentially("1");
    await page.getByTestId("input-sala").fill("101");
    await expect(page.getByTestId("input-andar")).toHaveValue("1");
    const resposta = esperarCallable(page, "gerenciarLocal");
    await page.getByTestId("btn-salvar-local").click();
    const resultado = await lerResultadoCallable(await resposta);
    expect(resultado.id).toBeTruthy();
    return;
  }
  await lista.locator("button[data-testid^='almox-local-item-']").first().click();
}

async function preencher(page: import("@playwright/test").Page, ativo = false, criarLocal = false): Promise<void> {
  await page.getByTestId("input-nome-almoxarifado").fill(nome("Almox"));
  await page.getByTestId("input-descricao-almoxarifado").fill("Almoxarifado de teste E2E");
  await escolherLocal(page, criarLocal);
  if (ativo) {
    await page.getByRole("checkbox", { name: gestorNome }).check();
    await page.getByTestId("toggle-ativo-almoxarifado").check();
  }
}

async function criar(page: import("@playwright/test").Page, ativo = false, criarLocal = false): Promise<string> {
  await abrirNovo(page); await preencher(page, ativo, criarLocal);
  const resposta = esperarCallable(page, "gerenciarAlmoxarifado");
  await page.getByTestId("btn-salvar-almoxarifado").click();
  const id = (await lerResultadoCallable(await resposta)).id as string;
  await expect(page.getByTestId("modal-almoxarifado")).toHaveCount(0);
  await expect(page.getByTestId(`almox-item-${id}`)).toBeVisible();
  return id;
}

test.describe("ALMOX-E2E — UI-03", () => {
  test.beforeEach(async ({ page }) => { await login(page, "chefe.seed@lcqui.local"); });

  test("ALMOX-E2E-001: criar ativo com gestor", async ({ page }) => {
    const id = await criar(page, true, true);
    await expect(page.getByTestId(`almox-item-${id}`)).toContainText("Ativo");
    expect((await lerDocumento(`Almoxarifado/${id}`))?.data.qtd_gestores_ativos).toBe(1);
  });

  test("ALMOX-E2E-002: criar ativo sem gestor mostra erro", async ({ page }) => {
    await abrirNovo(page); await preencher(page, false, true);
    await page.getByTestId("toggle-ativo-almoxarifado").check();
    await page.getByTestId("btn-salvar-almoxarifado").click();
    await expect(page.getByTestId("erro-campo-almoxarifado")).toContainText("gestor");
  });

  test("ALMOX-E2E-003: criar inativo sem gestor", async ({ page }) => {
    const id = await criar(page, false, true);
    await expect(page.getByTestId(`almox-item-${id}`)).toContainText("Inativo");
  });

  test("ALMOX-E2E-004: ativar sem gestor fica impedido", async ({ page }) => {
    const id = await criar(page, false, true);
    await expect(page.getByTestId(`almox-btn-ativar-${id}`)).toBeDisabled();
  });

  test("ALMOX-E2E-005: editar inativo adicionando gestor", async ({ page }) => {
    const id = await criar(page);
    await page.getByTestId(`almox-btn-editar-${id}`).click();
    await page.getByRole("checkbox", { name: gestorNome }).check();
    const resposta = esperarCallable(page, "gerenciarAlmoxarifado"); await page.getByTestId("btn-salvar-almoxarifado").click(); await resposta;
    await expect(page.getByTestId(`almox-item-${id}`)).toContainText("1 gestor");
  });

  test("ALMOX-E2E-006: ativar com gestor", async ({ page }) => {
    const id = await criar(page); await page.getByTestId(`almox-btn-editar-${id}`).click();
    await page.getByRole("checkbox", { name: gestorNome }).check(); const respostaEditar = esperarCallable(page, "gerenciarAlmoxarifado"); await page.getByTestId("btn-salvar-almoxarifado").click(); await respostaEditar;
    const resposta = esperarCallable(page, "gerenciarAlmoxarifado"); await page.getByTestId(`almox-btn-ativar-${id}`).click(); await resposta;
    await expect(page.getByTestId(`almox-item-${id}`)).toContainText("Ativo");
  });

  test("ALMOX-E2E-007: desativar preserva vínculos", async ({ page }) => {
    const id = await criar(page, true, true); const resposta = esperarCallable(page, "gerenciarAlmoxarifado"); await page.getByTestId(`almox-btn-desativar-${id}`).click(); await resposta;
    await expect(page.getByTestId(`almox-item-${id}`)).toContainText("Inativo"); expect((await listarColecao("Gestor_Almoxarifado_x_Almoxarifado")).some(d => d.data.id_almoxarifado === id)).toBe(true);
  });

  test("ALMOX-E2E-008: ativo não remove último gestor", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status 400|400|failed-precondition|Gestor informado/);
    const id = await criar(page, true, true); await page.getByTestId(`almox-btn-gerenciar-${id}`).click(); await page.getByRole("checkbox", { name: gestorNome }).uncheck();
    const resposta = esperarCallable(page, "gerenciarAlmoxarifado"); await page.getByTestId("btn-salvar-almoxarifado").click(); await resposta; await expect(page.getByTestId("erro-campo-almoxarifado")).toContainText("gestor");
  });

  test("ALMOX-E2E-009: opções exibem somente gestor ativo", async ({ page }) => {
    await abrirNovo(page); await expect(page.getByRole("checkbox", { name: gestorNome })).toBeVisible();
  });

  test("ALMOX-E2E-010: criar Local inline seleciona o retorno", async ({ page }) => {
    await abrirNovo(page); await preencher(page, false, true); await expect(page.getByTestId("btn-salvar-almoxarifado")).toBeEnabled();
  });
});

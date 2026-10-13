import { test, expect } from "../fixtures";
import { capturarCallable, login, esperarCallable } from "../helpers/ui";

test("ALM-OPERACIONAL-E2E-001: gestor acessa movimentações, quarentena e alertas", async ({ page, guardaConsole }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");

  await page.goto("/reagentes");
  await expect(page.getByRole("heading", { name: "Catálogo de Reagentes", exact: true })).toBeVisible();
  expect(guardaConsole.erros().some((mensagem) => mensagem.includes("false for 'list'"))).toBe(false);
  await expect(page.locator("aside").getByRole("link", { name: "Movimentações", exact: true })).toHaveCount(0);
  await expect(page.locator("aside").getByRole("link", { name: "Quarentena / Alertas", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Movimentações", exact: true }).click();
  await expect(page).toHaveURL(/\/reagentes$/);
  await expect(page.getByTestId("painel-operacional-movimentacoes")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Movimentações", exact: true })).toBeVisible();
  await expect(page.getByText("Histórico físico do almoxarifado, ordenado pelo instante do servidor.")).toBeVisible();

  await page.getByRole("button", { name: "Quarentena \/ Alertas", exact: true }).click();
  await expect(page).toHaveURL(/\/reagentes$/);
  await expect(page.getByTestId("painel-operacional-alertas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quarentena", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alertas operacionais", exact: true })).toBeVisible();
  await expect(page.getByText("Notificações do próprio gestor relacionadas a estoque e movimentações.")).toBeVisible();
});

test("ALM-OPERACIONAL-E2E-002: chefe lista almoxarifados após autenticação", async ({ page, guardaConsole }) => {
  await login(page, "chefe.seed@lcqui.local");

  await page.goto("/reagentes");
  await expect(page.getByTestId("almox-lista-almoxarifados")).toBeVisible();
  await expect(page.getByTestId("almox-item-seed-almox-frascos")).toBeVisible();
  expect(guardaConsole.erros().some((mensagem) => mensagem.includes("false for 'list'"))).toBe(false);
});

test("ALM-OPERACIONAL-E2E-003: especificação herda líquido e ml do reagente selecionado", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
  await page.getByText("Reagente Seed", { exact: true }).click();
  await page.getByRole("button", { name: "+ Nova Especificação", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Nova Especificação Comercial" })).toBeVisible();
  await expect(page.getByTestId("especificacao-estado-fisico")).toHaveValue("LIQUIDO");
  await expect(page.getByTestId("especificacao-unidade-medida")).toHaveValue("ml");
});

test("ALM-OPERACIONAL-E2E-006: especificação pesquisa resumo por texto no catálogo JSON", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByRole("button", { name: "Cadastrar Reagente" }).click();
  await page.getByText("Especificação Comercial", { exact: true }).click();

  await expect(page.getByRole("heading", { name: "Nova Especificação Comercial" })).toBeVisible();
  const busca = page.getByLabel("Buscar no catálogo por texto");
  await expect(busca).toBeVisible();
  await busca.fill("Reagente Seed");
  const resultados = page.getByTestId("especificacao-resumo-catalogo");
  await expect(resultados).toContainText("Reagente Seed");
  await resultados.selectOption("seed-resumo-reagente-frascos");
  await expect(page.getByTestId("especificacao-estado-fisico")).toHaveValue("LIQUIDO");
});

test("ALM-OPERACIONAL-E2E-008: substância pura é pesquisada localmente por nome e CAS", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByRole("button", { name: "Cadastrar Reagente" }).click();
  await page.getByText("Especificação Comercial", { exact: true }).click();
  await page.getByTestId("especificacao-resumo-catalogo").selectOption("seed-resumo-reagente-frascos");

  const busca = page.getByTestId("busca-substancia-especificacao");
  const seletor = page.getByTestId("substancia-pura-especificacao");
  await expect(seletor).toBeVisible();
  await busca.fill("Substância Seed");
  await expect(seletor).toContainText("Substância Seed");
  await busca.fill("7732-18-5");
  await expect(seletor).toContainText("Substância Seed");
});

test("ALM-OPERACIONAL-E2E-009: composição de mistura pesquisa componente por nome e CAS", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByRole("button", { name: "Cadastrar Reagente" }).click();
  await page.getByText("Especificação Comercial", { exact: true }).click();
  await page.getByTestId("especificacao-resumo-catalogo").selectOption("importado-agar-poder");

  const busca = page.getByTestId("busca-substancia-especificacao");
  const seletor = page.getByTestId("substancia-mistura-0");
  await busca.fill("Substância Seed");
  await expect(seletor).toContainText("Substância Seed");
  await busca.fill("7732-18-5");
  await expect(seletor).toContainText("Substância Seed");
});

test("ALM-OPERACIONAL-E2E-010: especificação não pode ser enviada sem substância efetiva", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByRole("button", { name: "Cadastrar Reagente" }).click();
  await page.getByText("Especificação Comercial", { exact: true }).click();
  await page.getByTestId("especificacao-resumo-catalogo").selectOption("seed-resumo-reagente-frascos");
  await page.getByLabel("Descrição Comercial").fill("Tentativa sem substância");

  await expect(page.getByRole("button", { name: "Salvar Especificação" })).toBeDisabled();
});

test("ALM-OPERACIONAL-E2E-011: estado sólido herda unidade g", async ({ page, guardaConsole }) => {
  guardaConsole.permitir(/Failed to load resource: the server responded with a status of 429/);
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Acetato de amônio");
  const linha = page.locator("tr").filter({ hasText: "Acetato de amônio" });
  await linha.getByRole("button", { name: "+ Nova Especificação", exact: true }).click();

  await expect(page.getByTestId("especificacao-estado-fisico")).toHaveValue("SOLIDO");
  await expect(page.getByTestId("especificacao-unidade-medida")).toHaveValue("g");
  await expect(page.getByLabel("Densidade (g/ml)")).toBeDisabled();
});

test("ALM-OPERACIONAL-E2E-012: cadastro envia os IDs de resumo e especificação selecionados", async ({ page, guardaConsole }) => {
  guardaConsole.permitir(/Failed to load resource: the server responded with a status of 429/);
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
  const linha = page.locator("tr").filter({ hasText: "Reagente Seed" });
  await linha.getByRole("button", { name: "+ Nova Especificação", exact: true }).click();

  await page.getByLabel("Descrição Comercial").fill("Especificação E2E com referências");
  await page.getByLabel("Fabricante (Opcional)").fill("Fabricante E2E");
  await expect(page.getByTestId("especificacao-estado-fisico")).toHaveValue("LIQUIDO");
  await page.getByLabel("Densidade (g/ml)").fill("1");
  await page.getByTestId("busca-substancia-especificacao").fill("7732-18-5");
  await page.getByTestId("substancia-pura-especificacao").selectOption("seed-substancia-reagente");

  const chamadas = capturarCallable(page, "cadastrarEspecificacao");
  const resposta = esperarCallable(page, "cadastrarEspecificacao");
  await page.getByRole("button", { name: "Salvar Especificação" }).click();
  expect((await resposta).status()).toBe(200);
  await expect.poll(() => chamadas.length).toBe(1);
  expect(chamadas[0].payload.data).toMatchObject({
    idResumoReagente: "seed-resumo-reagente-frascos",
    idSubstanciaQuimica: "seed-substancia-reagente",
  });
});

test("ALM-OPERACIONAL-E2E-004: resumo cadastrado aparece com natureza no catálogo", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByRole("button", { name: /Cadastrar Reagente/ }).click();
  await page.getByRole("button", { name: /Resumo de Reagente/ }).click();

  const nome = `Reagente E2E Natureza ${Date.now()}`;
  await page.getByTestId("novo-resumo-nome").fill(nome);
  await page.getByTestId("novo-resumo-natureza").selectOption("INORGANICO");
  await page.getByTestId("novo-resumo-limiar-escassez").fill("2");
  const chamada = esperarCallable(page, "cadastrarResumoReagente");
  await page.getByRole("button", { name: "Salvar Resumo" }).click();
  expect((await chamada).status()).toBe(200);

  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill(nome);
  await expect(page.getByText(nome, { exact: true })).toBeVisible();
  const linha = page.locator("tr").filter({ hasText: nome });
  await expect(linha).toContainText("INORGANICO");
});

test("ALM-OPERACIONAL-E2E-005: gestor acessa a caixa completa de notificações", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByRole("button", { name: "Notificações" }).click();
  await page.getByTestId("link-ver-todas").click();

  await expect(page).toHaveURL(/\/notificacoes$/);
  await expect(page.getByTestId("pagina-notificacoes")).toBeVisible();
  await expect(page.getByText("Acesso restrito", { exact: true })).toHaveCount(0);
});

test("ALM-OPERACIONAL-E2E-007: professor consulta somente seus empréstimos no detalhe do reagente", async ({ page, guardaConsole }) => {
  await login(page, "professor.alpha@lcqui.local");
  await page.goto("/reagentes/seed-resumo-reagente-frascos");

  await expect(page.getByRole("heading", { name: "Reagente Seed", exact: true })).toBeVisible();
  await expect(page.getByTestId("frasco-row-seed-frasco-historico-professor")).toBeVisible();
  await expect(page.getByTestId("meus-reagentes-historico")).toContainText("LCQUI-9001");
  await expect(page.getByTestId("meus-reagentes-historico")).not.toContainText("LCQUI-9002");
  expect(guardaConsole.erros().some((mensagem) => mensagem.includes("false for 'list'"))).toBe(false);
});

test("PAT-E2E-009: requisições não ativa simultaneamente Patrimônio Geral", async ({ page }) => {
  await login(page, "gestor.patrimonial@lcqui.local");
  await page.goto("/patrimonio/requisicoes");

  const patrimonioGeral = page.locator('aside a[href="/patrimonio"]');
  const requisicoes = page.locator('aside a[href="/patrimonio/requisicoes"]');
  await expect(patrimonioGeral).toHaveCount(1);
  await expect(requisicoes).toHaveCount(1);
  await expect(requisicoes).toHaveClass(/bg-primary\/10/);
  await expect(patrimonioGeral).not.toHaveClass(/bg-primary\/10/);
});

test("PAT-E2E-010: alerta de inservíveis abre o patrimônio já filtrado", async ({ page }) => {
  await login(page, "gestor.patrimonial@lcqui.local");
  await page.goto("/patrimonio?status=Inservivel");

  await expect(page.getByRole("heading", { name: "Bens Patrimoniais", exact: true })).toBeVisible();
  await expect(page.getByTestId("filtro-status-patrimonio")).toHaveValue("Inservivel");
  await expect(page.getByText("PAT-SEED-004", { exact: true })).toBeVisible();
  await expect(page.locator("aside").getByRole("link", { name: "Alertas (Inservíveis)", exact: true })).toHaveCount(0);
});

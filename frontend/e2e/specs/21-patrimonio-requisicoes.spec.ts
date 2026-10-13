import { test, expect } from "../fixtures";
import { login, esperarCallable } from "../helpers/ui";
import { lerDocumento } from "../helpers/emulator";

const REQUISICOES = {
  aprovacao: "seed-req-edicao-aprovacao",
  rejeicao: "seed-req-edicao-rejeicao",
  conflito: "seed-req-edicao-conflito",
} as const;

const BENS = {
  aprovacao: "seed-bem-edicao-aprovacao",
  rejeicao: "seed-bem-edicao-rejeicao",
  conflito: "seed-bem-edicao-conflito",
} as const;

async function abrirInbox(page: import("@playwright/test").Page): Promise<void> {
  await login(page, "gestor.patrimonial@lcqui.local");
  await page.goto("/patrimonio/requisicoes");
  await expect(page.getByRole("heading", { name: "Caixa de Entrada Patrimonial" })).toBeVisible();
}

async function responder(
  page: import("@playwright/test").Page,
  idRequisicao: string,
  decisao: "aprovar" | "rejeitar",
  justificativa: string,
): Promise<void> {
  const card = page.getByTestId(`requisicao-edicao-${idRequisicao}`);
  await expect(card).toBeVisible();
  await card.getByTestId(`justificativa-requisicao-${idRequisicao}`).fill(justificativa);
  const resposta = esperarCallable(page, "responderRequisicaoEdicaoBem");
  await card.getByTestId(`${decisao}-requisicao-${idRequisicao}`).click();
  await resposta;
}

test.describe.serial("PAT-EDIT-E2E — UI-09 / IMP-PAT-004", () => {
  test("PAT-EDIT-E2E-001: gestor aprova reclassificação e libera o lock", async ({ page }) => {
    await abrirInbox(page);
    const card = page.getByTestId(`requisicao-edicao-${REQUISICOES.aprovacao}`);
    await expect(card).toContainText("Balança Analítica Seed");
    await expect(card.getByTestId("comparacao-requisicao")).toContainText("versão 1");

    await responder(page, REQUISICOES.aprovacao, "aprovar", "Aprovada após conferência patrimonial.");
    await expect(page.getByTestId(`requisicao-edicao-${REQUISICOES.aprovacao}`)).toHaveCount(0);
    await expect(page.getByTestId("feedback-requisicoes")).toContainText("aprovada");

    const requisicao = await lerDocumento(`Requisicao_Edicao_Bem_Patrimonial/${REQUISICOES.aprovacao}`);
    const bem = await lerDocumento(`Bem_Patrimonial/${BENS.aprovacao}`);
    const lock = await lerDocumento("Locks_Requisicao_Patrimonio/bem_edicao_seed-bem-edicao-aprovacao");
    expect(requisicao?.data.status).toBe("aprovada");
    expect(requisicao?.data.novo_id_resumo_bem_patrimonial).toBe("seed-resumo-bem-aprovacao-alvo");
    expect(bem?.data.versao).toBe(2);
    expect(bem?.data.id_resumo_bem_patrimonial).toBe("seed-resumo-bem-aprovacao-alvo");
    expect(lock).toBeNull();
  });

  test("PAT-EDIT-E2E-002: gestor rejeita com justificativa e preserva o bem", async ({ page }) => {
    await abrirInbox(page);
    await responder(page, REQUISICOES.rejeicao, "rejeitar", "Rejeitada após conferência documental.");
    await expect(page.getByTestId(`requisicao-edicao-${REQUISICOES.rejeicao}`)).toHaveCount(0);
    await expect(page.getByTestId("feedback-requisicoes")).toContainText("rejeitada");

    const requisicao = await lerDocumento(`Requisicao_Edicao_Bem_Patrimonial/${REQUISICOES.rejeicao}`);
    const bem = await lerDocumento(`Bem_Patrimonial/${BENS.rejeicao}`);
    const lock = await lerDocumento("Locks_Requisicao_Patrimonio/bem_edicao_seed-bem-edicao-rejeicao");
    expect(requisicao?.data.status).toBe("rejeitada");
    expect(bem?.data.versao).toBe(1);
    expect(lock).toBeNull();
  });

  test("PAT-EDIT-E2E-003: conflito informa que o bem não foi sobrescrito", async ({ page }) => {
    await abrirInbox(page);
    await responder(page, REQUISICOES.conflito, "aprovar", "Revisão da requisição com versão obsoleta.");
    await expect(page.getByTestId(`requisicao-edicao-${REQUISICOES.conflito}`)).toHaveCount(0);
    await expect(page.getByTestId("feedback-requisicoes")).toContainText("não foi sobrescrito");

    const requisicao = await lerDocumento(`Requisicao_Edicao_Bem_Patrimonial/${REQUISICOES.conflito}`);
    const bem = await lerDocumento(`Bem_Patrimonial/${BENS.conflito}`);
    const lock = await lerDocumento("Locks_Requisicao_Patrimonio/bem_edicao_seed-bem-edicao-conflito");
    expect(requisicao?.data.status).toBe("rejeitada");
    expect(requisicao?.data.justificativa_resposta).toContain("Conflito de versão");
    expect(bem?.data.versao).toBe(2);
    expect(lock).toBeNull();
  });
});

test("PAT-UI-E2E-001: ações de gestão patrimonial levam ao diretório de papéis", async ({ page }) => {
  await login(page, "chefe.seed@lcqui.local");
  await page.goto("/patrimonio");

  await page.getByRole("button", { name: "Novo Gestor de Bens Patrimoniais", exact: true }).click();
  await expect(page).toHaveURL(/\/pessoas\?papel=Gestor_Bens_Patrimoniais&acao=conceder/);
  await expect(page.getByRole("heading", { name: "Pessoas e papéis" })).toBeVisible();
  await expect(page.getByLabel("Papel")).toHaveValue("Gestor_Bens_Patrimoniais");

  await page.goto("/patrimonio");
  await page.getByRole("button", { name: "Gerenciar Gestores de Bens", exact: true }).click();
  await expect(page).toHaveURL(/\/pessoas\?papel=Gestor_Bens_Patrimoniais&acao=gerenciar/);
  await expect(page.getByLabel("Papel")).toHaveValue("Gestor_Bens_Patrimoniais");
});

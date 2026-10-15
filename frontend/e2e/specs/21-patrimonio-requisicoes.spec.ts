import { test, expect } from "../fixtures";
import { capturarCallable, login, esperarCallable, lerResultadoCallable } from "../helpers/ui";
import { lerDocumento, ultimoOobPara } from "../helpers/emulator";

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

test("PAT-UI-E2E-001: ações de gestão patrimonial abrem os modais próprios", async ({ page }) => {
  await login(page, "chefe.seed@lcqui.local");
  await page.goto("/patrimonio");
  const chamadas = capturarCallable(page, "buscarUsuariosParaPapel");

  await page.getByRole("button", { name: "Novo Gestor de Bens Patrimoniais", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAttribute("data-testid", "modal-novo-gestor-patrimonio");
  await expect(page.getByRole("heading", { name: "Novo Gestor de Bens Patrimoniais" })).toBeVisible();
  await expect(page.getByTestId("gestor-patrimonio-opcao-seed-gestor-patrimonio")).toBeVisible();
  await expect.poll(() => chamadas.length).toBe(1);
  await page.getByRole("button", { name: "Fechar novo gestor patrimonial" }).click();

  await page.getByRole("button", { name: "Gerenciar Gestores de Bens", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAttribute("data-testid", "modal-gerenciar-gestores-patrimonio");
  await expect(page.getByRole("heading", { name: "Gerenciar Gestores de Bens Patrimoniais" })).toBeVisible();
  await expect(page.getByTestId("selecionar-gestor-patrimonio-seed-gestor-patrimonio")).toBeVisible();
  await expect.poll(() => chamadas.length).toBe(1);
  await page.getByTestId("selecionar-gestor-patrimonio-seed-gestor-patrimonio").click();
  await expect(page.getByText(/Histórico de Gestor Patrimonial \(Seed\)/)).toBeVisible();
});

test.describe("PAT-UI-E2E — M9/UI-02/UI-13", () => {
  test("PAT-UI-E2E-002: busca filtra por termo, não expõe e-mail e exclui Chefe Geral", async ({ page }) => {
    // CUE #M9Usuario + Alloy PapelRevogadoRemoveAutorizacao/M9: a UI não
    // pode oferecer uma combinação de papéis incompatível ao conceder outro papel.
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/patrimonio");
    const chamadas = capturarCallable(page, "buscarUsuariosParaPapel");
    const modal = page.getByRole("dialog");

    await page.getByRole("button", { name: "Novo Gestor de Bens Patrimoniais", exact: true }).click();
    await expect(modal).toHaveAttribute("data-testid", "modal-novo-gestor-patrimonio");
    await expect(modal.getByText("Gestor Patrimonial (Seed)", { exact: true })).toBeVisible();
    await expect(modal.getByText("gestor.patrimonial@lcqui.local", { exact: true })).toHaveCount(0);
    await expect(modal.getByText("Chefe Geral (Seed)", { exact: true })).toHaveCount(0);

    const busca = page.getByTestId("buscar-gestor-patrimonio");
    await busca.fill("Chefe Geral");
    await expect(modal.getByText("Nenhum usuário elegível encontrado.", { exact: true })).toBeVisible();
    await expect.poll(() => chamadas.length).toBe(2);
    expect(chamadas.at(-1)?.payload).toMatchObject({ data: { papel: "Gestor_Bens_Patrimoniais", termo: "Chefe Geral" } });

    await busca.fill("Gestor Patrimonial");
    await expect(modal.getByText("Gestor Patrimonial (Seed)", { exact: true })).toBeVisible();
    await expect.poll(() => chamadas.length).toBe(3);
    expect(chamadas.at(-1)?.payload).toMatchObject({ data: { papel: "Gestor_Bens_Patrimoniais", termo: "Gestor Patrimonial" } });
  });

  test("PAT-UI-E2E-003: convite rejeita e-mail já pertencente a outra identidade", async ({ page, guardaConsole }) => {
    // Alloy: papel/claim não criam uma segunda identidade nem bypassam a
    // precondição de identidade já existente; a callable é a autoridade final.
    guardaConsole.permitir(/status 400|status 409|status of 409|already-exists|já pertence/);
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/patrimonio");
    await page.getByRole("button", { name: "Novo Gestor de Bens Patrimoniais", exact: true }).click();
    await page.getByTestId("gestor-patrimonio-novo-tab").click();
    await page.getByLabel("Nome").fill("Tentativa Patrimonial Duplicada");
    await page.getByLabel("E-mail").fill("chefe.seed@lcqui.local");

    const resposta = esperarCallable(page, "convidarUsuario");
    await page.getByTestId("btn-salvar-novo-gestor-patrimonio").click();
    await resposta;
    await expect(page.locator('p[role="alert"]').filter({ hasText: "já pertence" })).toBeVisible();
    await expect(lerDocumento("Gestor_Bens_Patrimoniais/seed-chefe-geral")).resolves.toBeNull();
  });

  test("PAT-UI-E2E-004: convite novo cria papel, envia OOB e permite consultar histórico por mês", async ({ page }) => {
    // M7: idempotência/efeito único é exercitado pela callable; M9: o papel
    // persistido deve existir antes da UI consultar o histórico autorizado.
    const email = `gestor-patrimonio-e2e-${Date.now()}@lcqui.local`;
    const nomeGestor = "Gestor Patrimonial E2E";
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/patrimonio");
    await page.getByRole("button", { name: "Novo Gestor de Bens Patrimoniais", exact: true }).click();
    await page.getByTestId("gestor-patrimonio-novo-tab").click();
    await page.getByLabel("Nome").fill(nomeGestor);
    await page.getByLabel("E-mail").fill(email);

    const resposta = esperarCallable(page, "convidarUsuario");
    await page.getByTestId("btn-salvar-novo-gestor-patrimonio").click();
    const resultado = await lerResultadoCallable(await resposta);
    expect(resultado.contaAuthCriada).toBe(true);
    expect(resultado.emailEnviado).toBe(true);
    expect(resultado).not.toHaveProperty("resetLink");
    const uid = resultado.uid as string;
    expect((await lerDocumento(`Gestor_Bens_Patrimoniais/${uid}`))?.data.id_usuario).toBe(uid);
    await expect(page.getByRole("status")).toContainText("instruções de acesso foram enviadas por e-mail");
    expect((await ultimoOobPara(email, "PASSWORD_RESET")).oobLink).toContain("oobCode=");

    await page.getByRole("button", { name: "Fechar novo gestor patrimonial" }).click();
    await page.getByRole("button", { name: "Gerenciar Gestores de Bens", exact: true }).click();
    await page.getByTestId("buscar-gestores-patrimonio").fill(nomeGestor);
    await expect(page.getByTestId(`selecionar-gestor-patrimonio-${uid}`)).toBeVisible();
    await page.getByTestId(`selecionar-gestor-patrimonio-${uid}`).click();
    await expect(page.getByText(`Histórico de ${nomeGestor}`, { exact: true })).toBeVisible();

    const agora = new Date();
    await page.getByLabel("Período do histórico").selectOption("mes");
    await page.getByLabel("Mês do histórico").fill(String(agora.getMonth() + 1));
    await page.getByLabel("Ano do histórico").fill(String(agora.getFullYear()));
    await expect(page.getByText("Informe o mês e o ano para consultar o período.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("CONCEDER_PAPEL", { exact: true })).toBeVisible();
  });

  test("PAT-UI-E2E-005: papel patrimonial não recebe ações administrativas de Chefe Geral", async ({ page }) => {
    // Alloy M9: Gestor_Bens_Patrimoniais opera patrimônio, mas não GERIR_USUARIOS.
    await login(page, "gestor.patrimonial@lcqui.local");
    await page.goto("/patrimonio");
    await expect(page.getByRole("button", { name: "Novo Gestor de Bens Patrimoniais", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Gerenciar Gestores de Bens", exact: true })).toHaveCount(0);
  });
});

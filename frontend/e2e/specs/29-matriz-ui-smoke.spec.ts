import { test, expect } from "../fixtures";
import { login, esperarCallable, lerResultadoCallable } from "../helpers/ui";
import { lerDocumento } from "../helpers/emulator";

test.describe("Cobertura transversal da matriz", () => {
  test("IMP-UI-001/IMP-INDEX-001 consulta catálogo e renderiza fotografia de estoque", async ({ page }) => {
    // Usa a identidade de Chefia para não consumir o rate-limit do gestor
    // compartilhado com os cenários anteriores da suíte; o contrato M8
    // permite a consulta para ambos os papéis.
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/reagentes");
    await expect(page.getByRole("heading", { name: "Catálogo de Reagentes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Estoque atual/i })).toBeVisible();
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
    await expect(page.getByText("Reagente Seed", { exact: true })).toBeVisible();
    await expect(page.getByText("Frascos Aptos", { exact: true })).toBeVisible();
    await expect(page.getByText("Total de Frascos", { exact: true })).toBeVisible();
  });

  test("IMP-UI-002 abre o catálogo patrimonial, filtros normativos e relatórios", async ({ page }) => {
    await login(page, "gestor.patrimonial@lcqui.local");
    await page.goto("/patrimonio");
    await expect(page.getByRole("heading", { name: "Bens Patrimoniais" })).toBeVisible();
    await expect(page.getByText("Prédio", { exact: true })).toBeVisible();
    await expect(page.getByText("Letra Inicial", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Gerar Relatórios" }).click();
    await expect(page.getByRole("heading", { name: "Relatórios de Patrimônio" })).toBeVisible();
  });

  test("IMP-UI-003 abre os fluxos acadêmicos e a gestão de roteiros", async ({ page }) => {
    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/turmas");
    await expect(page.getByRole("button", { name: "Gerenciar Roteiros" })).toBeVisible();
    await page.getByRole("button", { name: /Química Geral — T2 Última Vaga/ }).click();
    await expect(page.getByRole("heading", { name: "Química Geral — T2 Última Vaga", level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder("Título da postagem...")).toBeVisible();
  });

  test("IMP-PAT-006/PAT-005 baixa bem inservível com comprovante PDF", async ({ page }) => {
    await login(page, "gestor.patrimonial@lcqui.local");
    await page.goto("/patrimonio/seed-bem-baixa-terminal");
    await expect(page.getByRole("heading", { name: "Banho-Maria Inservível Seed" })).toBeVisible();
    await expect(page.getByText("Status: Inservivel")).toBeVisible();
    await page.getByRole("button", { name: "Registrar Baixa Patrimonial (Processo SEI)" }).click();
    await expect(page.getByRole("heading", { name: /Registrar baixa patrimonial definitiva/i })).toBeVisible();
    await page.getByPlaceholder(/número do processo SEI/).fill("Processo SEI 2026.0001.004");
    const chamada = esperarCallable(page, "registrarBaixaBemPatrimonial");
    await page.getByRole("button", { name: "Confirmar Baixa Definitiva" }).click();
    const resposta = await chamada;
    expect(resposta.status()).toBe(200);
    await expect.poll(async () => (await lerDocumento("Bem_Patrimonial/seed-bem-baixa-terminal"))?.data.status).toBe("Ja_dado_baixa");
    await expect(page.getByText(/Processo de baixa patrimonial concluído/)).toBeVisible();
  });

  test("IMP-PAT-003/PAT-001 requisita adição patrimonial com foto e lock canônico", async ({ page }) => {
    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/patrimonio");
    await page.getByRole("button", { name: "Requisitar Adição de Bem" }).click();
    await expect(page.getByRole("heading", { name: "Adicionar Bem Patrimonial" })).toBeVisible();
    await page.getByLabel("Nome do Equipamento").fill("Microscópio E2E Normativo");
    await page.getByLabel("Nº Patrimônio").fill(" E2E-PAT-001 ");
    await page.getByTestId("seletor-local-local-item-seed-local-patrimonio-aprovacao").click();
    await page.getByLabel("Responsável proposto").fill("Responsável E2E");
    await page.getByLabel("Motivo da requisição").fill("Aquisição institucional para laboratório.");
    await page.getByLabel("Foto do bem").setInputFiles({
      name: "bem-e2e.png",
      mimeType: "image/png",
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    });
    const chamada = esperarCallable(page, "criarRequisicaoAdicaoBem");
    await page.getByRole("button", { name: "Salvar Bem" }).click();
    const resposta = await chamada;
    expect(resposta.status()).toBe(200);
    const resultado = await lerResultadoCallable(resposta);
    const idRequisicao = resultado.idRequisicao as string;
    expect(idRequisicao).toBeTruthy();
    await expect.poll(async () => (await lerDocumento(`Requisicao_Adicao_Bem_Patrimonial/${idRequisicao}`))?.data.status).toBe("pendente");
    const requisicao = await lerDocumento(`Requisicao_Adicao_Bem_Patrimonial/${idRequisicao}`);
    expect(requisicao?.data.numero_patrimonio_normalizado).toBe("E2E-PAT-001");
    expect(requisicao?.data.id_local).toBe("seed-local-patrimonio-aprovacao");
    expect(await lerDocumento("Locks_Requisicao_Patrimonio/bem_adicao_E2E-PAT-001")).not.toBeNull();
  });
});

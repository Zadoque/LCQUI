import { test, expect } from "../fixtures";
import { login, esperarCallable, lerResultadoCallable } from "../helpers/ui";
import { lerDocumento, listarColecao } from "../helpers/emulator";

test.setTimeout(60_000);

async function abrirFrascoSeed(page: import("@playwright/test").Page): Promise<{ id: string; codigo: string }> {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
  await page.getByText("Reagente Seed", { exact: true }).first().click();
  await page.getByRole("button", { name: "+ Frasco" }).click();
  await page.getByRole("button", { name: "Já Aberto (Em Uso)" }).click();
  const numeros = page.locator('input[type="number"]');
  await numeros.nth(0).fill("250");
  const resposta = esperarCallable(page, "cadastrarFrascoAberto");
  await page.getByRole("button", { name: "Salvar Frasco" }).click();
  const resultado = await lerResultadoCallable(await resposta);
  const idCriado = resultado.idFrasco as string;
  if (!idCriado) throw new Error("A callable não retornou idFrasco.");
  await expect(page.getByTestId("frasco-cadastro-sucesso")).toBeVisible();
  await page.getByRole("button", { name: "Concluir" }).click();
  await page.reload();
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
  await page.locator("tbody tr").filter({ hasText: "Reagente Seed" }).first().locator("td").first().click();
  const especificacao = page.getByText("Reagente Analítico 1L (Fabricante Seed)", { exact: true });
  await expect(especificacao).toBeVisible();
  await especificacao.click();
  await expect(page.getByText("Frascos Avulsos (Sem Lote)")).toBeVisible();
  const frascos = await listarColecao("Frasco_Reagente");
  const criado = frascos.find((item) => item.id === idCriado);
  if (!criado || typeof criado.data.codigo_frasco !== "string") {
    throw new Error("O frasco criado pelo cenário não foi materializado no Emulator.");
  }
  return { id: criado.id, codigo: criado.data.codigo_frasco };
}

function cardDoFrasco(page: import("@playwright/test").Page, codigo: string) {
  return page.getByText(codigo, { exact: true }).locator("..").locator("..").locator("..");
}

test.describe("Operações de frascos UI-06/07/14/16/17/18", () => {
  test("DEV-001-E2E-001 exige dupla digitação independente na devolução", async ({ page }) => {
    await abrirFrascoSeed(page);
    await page.getByRole("button", { name: "Registrar Devolução" }).click();
    await page.locator('input[type="number"]').nth(0).fill("10");
    await page.locator('input[type="number"]').nth(1).fill("11");
    await page.getByRole("button", { name: "Confirmar Devolução" }).click();
    await expect(page.getByText(/2ª pesagem não confere/)).toBeVisible();
  });

  test("M5-001/002-E2E-001 exige justificativa mínima para extravio", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 429/);
    const frasco = await abrirFrascoSeed(page);
    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Extraviar" }).click();
    await expect(page.getByRole("heading", { name: /Registrar extravio/i })).toBeVisible();
    await page.getByPlaceholder(/mínimo 5 caracteres/).fill("x");
    await page.getByRole("button", { name: "Confirmar Extravio" }).click();
    await expect(page.getByText("O motivo deve conter pelo menos 5 caracteres.")).toBeVisible();
  });

  test("M5-003-E2E-001 exige laudo mínimo para entrada em quarentena", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 429/);
    const frasco = await abrirFrascoSeed(page);
    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Quarentena", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Colocar frasco em quarentena/i })).toBeVisible();
    await page.getByPlaceholder(/mínimo 10 caracteres/).fill("curto");
    await page.getByRole("button", { name: "Colocar em Quarentena" }).click();
    await expect(page.getByText("A justificativa/laudo deve conter pelo menos 10 caracteres.")).toBeVisible();
  });

  test("MET-001/002-E2E-001 exige justificativa técnica na resolução metrológica", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 429/);
    const frasco = await abrirFrascoSeed(page);
    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Pesar", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Pesagem de rotina \/ inventário/ })).toBeVisible();
    await page.locator('input[type="number"]').nth(0).fill("10");
    await page.locator('input[type="number"]').nth(1).fill("11");
    await page.getByRole("button", { name: "Salvar Pesagem" }).click();
    await expect(page.getByText(/2ª pesagem não confere/)).toBeVisible();
  });

  test("MET-002-E2E-002 registra pesagem de rotina com dupla leitura", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 429/);
  const frasco = await abrirFrascoSeed(page);

    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Pesar", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Pesagem de rotina \/ inventário/ })).toBeVisible();
    const leituras = page.locator('input[type="number"]');
    await leituras.nth(0).fill("225");
    await leituras.nth(1).fill("225");
    await page.getByPlaceholder("Inventário rotina...").fill("Conferência periódica do estoque");
    const chamada = esperarCallable(page, "registrarPesagemRotina");
    await page.getByRole("button", { name: "Salvar Pesagem" }).click();
    const resposta = await chamada;
    expect(resposta.status()).toBe(200);
    await expect.poll(async () => (await lerDocumento(`Frasco_Reagente/${frasco.id}`))?.data.peso_atual).toBe(225);
    await expect(page.getByRole("heading", { name: "Catálogo de Reagentes" })).toBeVisible();
  });

  test("TERM-001-E2E-001 exige laudo mínimo para descarte terminal", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 429/);
    const frasco = await abrirFrascoSeed(page);
    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Descartar", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Descarte definitivo de frasco/ })).toBeVisible();
    await page.getByPlaceholder(/motivo do descarte/).fill("curto");
    await page.getByRole("button", { name: "Confirmar Descarte" }).click();
    await expect(page.getByText("O laudo/motivo do descarte deve conter pelo menos 20 caracteres.")).toBeVisible();
  });

  test("M5-001/M5-002/M5-003/TERM-001-E2E-002 percorre extravio, reencontro, quarentena e descarte", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 429/);
    const frasco = await abrirFrascoSeed(page);

    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Extraviar" }).click();
    await page.getByPlaceholder(/mínimo 5 caracteres/).fill("Extravio confirmado no inventário");
    const extravio = esperarCallable(page, "registrarExtravioOuReencontro");
    await page.getByRole("button", { name: "Confirmar Extravio" }).click();
    await extravio;
    await expect.poll(async () => (await lerDocumento(`Frasco_Reagente/${frasco.id}`))?.data.situacao_localizacao).toBe("EXTRAVIADO");

    await page.reload();
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
    await page.locator("tbody tr").filter({ hasText: "Reagente Seed" }).first().locator("td").first().click();
    await page.getByText("Reagente Analítico 1L (Fabricante Seed)", { exact: true }).click();
    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Reencontrar" }).click();
    await page.getByPlaceholder(/mínimo 5 caracteres/).fill("Reencontro com inspeção física");
    const reencontro = esperarCallable(page, "registrarExtravioOuReencontro");
    await page.getByRole("button", { name: "Confirmar Reencontro" }).click();
    await reencontro;
    await expect.poll(async () => (await lerDocumento(`Frasco_Reagente/${frasco.id}`))?.data.em_quarentena).toBe(true);

    await page.reload();
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
    await page.locator("tbody tr").filter({ hasText: "Reagente Seed" }).first().locator("td").first().click();
    await page.getByText("Reagente Analítico 1L (Fabricante Seed)", { exact: true }).click();
    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Decisão Quarentena" }).click();
    await page.locator("select").last().selectOption("PENDENTE_DE_DESCARTE");
    await page.getByPlaceholder(/mínimo 10 caracteres/).fill("Laudo autoriza descarte terminal");
    const decisao = esperarCallable(page, "resolverQuarentenaFrasco");
    await page.getByRole("button", { name: "Registrar Decisão" }).click();
    await decisao;
    await expect.poll(async () => (await lerDocumento(`Pendencias_Descarte_Frasco/${frasco.id}`))?.data.id_frasco).toBe(frasco.id);

    await page.reload();
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
    await page.locator("tbody tr").filter({ hasText: "Reagente Seed" }).first().locator("td").first().click();
    await page.getByText("Reagente Analítico 1L (Fabricante Seed)", { exact: true }).click();
    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Descartar", exact: true }).click();
    await page.getByPlaceholder(/motivo do descarte/).fill("Descarte terminal autorizado pelo laudo");
    const descarte = esperarCallable(page, "descartarFrasco");
    await page.getByRole("button", { name: "Confirmar Descarte" }).click();
    await descarte;
    await expect.poll(async () => (await lerDocumento(`Frasco_Reagente/${frasco.id}`))?.data.estado_fisico_frasco).toBe("DESCARTADO");
  });

  test("M5-003-E2E-002 resolve quarentena pela rota de retorno a disponível", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 429/);
    const frasco = await abrirFrascoSeed(page);

    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Quarentena", exact: true }).click();
    await page.getByPlaceholder(/mínimo 10 caracteres/).fill("Inspeção técnica concluída sem anomalia.");
    const entrada = esperarCallable(page, "colocarFrascoEmQuarentena");
    await page.getByRole("button", { name: "Colocar em Quarentena" }).click();
    await entrada;
    await expect.poll(async () => (await lerDocumento(`Frasco_Reagente/${frasco.id}`))?.data.em_quarentena).toBe(true);

    await page.reload();
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
    await page.locator("tbody tr").filter({ hasText: "Reagente Seed" }).first().locator("td").first().click();
    await page.getByText("Reagente Analítico 1L (Fabricante Seed)", { exact: true }).click();
    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Decisão Quarentena" }).click();
    await page.locator("select").last().selectOption("VOLTAR_A_DISPONIVEL");
    await page.getByPlaceholder(/mínimo 10 caracteres/).fill("Laudo técnico libera o frasco para uso.");
    const decisao = esperarCallable(page, "resolverQuarentenaFrasco");
    await page.getByRole("button", { name: "Registrar Decisão" }).click();
    await decisao;
    await expect.poll(async () => {
      const documento = await lerDocumento(`Frasco_Reagente/${frasco.id}`);
      return [documento?.data.em_quarentena, documento?.data.disponibilidade];
    }).toEqual([false, "DISPONIVEL"]);
  });

  test("M5-FORMAL-E2E-001 preserva dimensões e estados na trajetória extravio-reencontro-quarentena", async ({ page, guardaConsole }) => {
    guardaConsole.permitir(/status of 429/);
    const frasco = await abrirFrascoSeed(page);

    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Extraviar" }).click();
    await page.getByPlaceholder(/mínimo 5 caracteres/).fill("Extravio formal para auditoria");
    const chamadaExtravio = esperarCallable(page, "registrarExtravioOuReencontro");
    await page.getByRole("button", { name: "Confirmar Extravio" }).click();
    await chamadaExtravio;

    const aposExtravio = await lerDocumento(`Frasco_Reagente/${frasco.id}`);
    expect(aposExtravio?.data.situacao_localizacao).toBe("EXTRAVIADO");
    expect(aposExtravio?.data.disponibilidade).toBe("INDISPONIVEL");
    expect(aposExtravio?.data.estado_fisico_frasco).toBe("ABERTO");

    await page.reload();
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
    await page.locator("tbody tr").filter({ hasText: "Reagente Seed" }).first().locator("td").first().click();
    await page.getByText("Reagente Analítico 1L (Fabricante Seed)", { exact: true }).click();
    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Reencontrar" }).click();
    await page.getByPlaceholder(/mínimo 5 caracteres/).fill("Reencontro formal com inspeção");
    const chamadaReencontro = esperarCallable(page, "registrarExtravioOuReencontro");
    await page.getByRole("button", { name: "Confirmar Reencontro" }).click();
    await chamadaReencontro;

    const aposReencontro = await lerDocumento(`Frasco_Reagente/${frasco.id}`);
    expect(aposReencontro?.data.situacao_localizacao).toBe("LOCALIZADO");
    expect(aposReencontro?.data.em_quarentena).toBe(true);
    expect(aposReencontro?.data.disponibilidade).toBe("INDISPONIVEL");
    expect(aposReencontro?.data.estado_fisico_frasco).toBe("ABERTO");

    await page.reload();
    await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
    await page.locator("tbody tr").filter({ hasText: "Reagente Seed" }).first().locator("td").first().click();
    await page.getByText("Reagente Analítico 1L (Fabricante Seed)", { exact: true }).click();
    await cardDoFrasco(page, frasco.codigo).getByRole("button", { name: "Decisão Quarentena" }).click();
    await page.locator("select").last().selectOption("VOLTAR_A_DISPONIVEL");
    await page.getByPlaceholder(/mínimo 10 caracteres/).fill("Laudo formal libera o frasco");
    const chamadaDecisao = esperarCallable(page, "resolverQuarentenaFrasco");
    await page.getByRole("button", { name: "Registrar Decisão" }).click();
    await chamadaDecisao;

    const aposDecisao = await lerDocumento(`Frasco_Reagente/${frasco.id}`);
    expect(aposDecisao?.data.em_quarentena).toBe(false);
    expect(aposDecisao?.data.disponibilidade).toBe("DISPONIVEL");
    expect(aposDecisao?.data.situacao_localizacao).toBe("LOCALIZADO");

    const historico = await listarColecao("Historico_Frasco_Reagente");
    const tipos = historico
      .filter((evento) => evento.data.id_frasco_reagente === frasco.id)
      .map((evento) => evento.data.tipo);
    expect(tipos).toEqual(expect.arrayContaining(["EXTRAVIO", "REENCONTRO", "LIBERADO_QUARENTENA"]));
  });
});

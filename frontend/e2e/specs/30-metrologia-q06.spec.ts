import { test, expect } from "../fixtures";
import { login, esperarCallable, lerResultadoCallable } from "../helpers/ui";
import { lerDocumento, listarColecao } from "../helpers/emulator";

async function criarPendenciaQ06(page: any) {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
  await page.getByText("Reagente Seed", { exact: true }).first().click();
  await page.getByRole("button", { name: "+ Frasco S/ Lote" }).click();
  const entrada = page.locator("form").filter({ hasText: "Salvar Frasco" });
  const numeros = entrada.locator('input[type="number"]');
  await numeros.nth(0).fill("500");
  await numeros.nth(1).fill("250");
  const criar = esperarCallable(page, "cadastrarFrascoFechado");
  await entrada.getByRole("button", { name: "Salvar Frasco" }).click();
  const criado = await lerResultadoCallable(await criar);
  const frascoId = criado.idFrasco as string;
  expect(frascoId).toBeTruthy();
  const frasco = await expect.poll(async () => {
    const docs = await listarColecao("Frasco_Reagente");
    return docs.find((doc) => doc.id === frascoId) ?? null;
  }).not.toBeNull();
  const frascoDoc = await lerDocumento(`Frasco_Reagente/${frascoId}`);
  const codigo = frascoDoc!.data.codigo_frasco as string;

  await page.getByRole("button", { name: "Registrar Retirada" }).click();
  const retirada = page.locator("form").filter({ has: page.getByRole("button", { name: "Confirmar" }) });
  const textos = retirada.locator('input[type="text"]');
  await textos.nth(0).fill(frascoId);
  await textos.nth(1).fill("seed-professor-alpha");
  await textos.nth(2).fill("local1");
  await retirada.locator('input[type="number"]').fill("500");
  await retirada.locator('input[type="date"]').fill("2099-01-01");
  await retirada.getByLabel("Abrir o frasco no empréstimo").check();
  const retiradaCall = esperarCallable(page, "registrarRetirada");
  await retirada.getByRole("button", { name: "Confirmar" }).click();
  await retiradaCall;

  await page.goto("/reagentes/seed-resumo-reagente-frascos");
  const linha = page.getByTestId(`frasco-row-${frascoId}`);
  await expect(linha.getByRole("button", { name: "Devolver" })).toBeVisible();
  await linha.getByRole("button", { name: "Devolver" }).click();
  const devolucao = page.getByRole("heading", { name: "Registrar Devolução" }).locator("..");
  const pesos = devolucao.locator('input[type="number"]');
  await pesos.nth(0).fill("510");
  await pesos.nth(1).fill("510");
  const devolucaoCall = esperarCallable(page, "registrarDevolucao");
  await devolucao.getByRole("button", { name: "Confirmar Devolução" }).click();
  const resposta = await devolucaoCall;
  expect(resposta.status()).toBe(200);
  await expect.poll(async () => (await listarColecao("Emprestimo_Reagente")).some((item) => item.data.id_frasco_reagente === frascoId && item.data.status === "DEVOLVIDO_COM_ANOMALIA")).toBe(true);
  return { frascoId, codigo };
}

test("DEV-001-E2E-003: devolução anômala Q06 cria pendência real e retém o frasco", async ({ page }) => {
  const { frascoId } = await criarPendenciaQ06(page);
  const frasco = await lerDocumento(`Frasco_Reagente/${frascoId}`);
  const emprestimo = (await listarColecao("Emprestimo_Reagente")).find((item) => item.data.id_frasco_reagente === frascoId && item.data.status === "DEVOLVIDO_COM_ANOMALIA");
  expect(emprestimo?.data.status).toBe("DEVOLVIDO_COM_ANOMALIA");
  expect(emprestimo?.data.consumo_validado).toBe(false);
  expect(emprestimo?.data.anomalia_metrologica).toBeTruthy();
  expect(frasco?.data.em_quarentena).toBe(true);
  expect(frasco?.data.disponibilidade).toBe("INDISPONIVEL");
  await expect(page.getByTestId(`frasco-row-${frascoId}`).getByRole("button", { name: "Resolver Metrologia" })).toBeVisible();
});

test("MET-E2E-001: repetir pesagem resolve pendência Q06 com justificativa", async ({ page }) => {
  const { frascoId } = await criarPendenciaQ06(page);
  const linha = page.getByTestId(`frasco-row-${frascoId}`);
  await linha.getByRole("button", { name: "Resolver Metrologia" }).click();
  const modal = page.getByRole("heading", { name: "Resolver pendência de pesagem" }).locator("..");
  await modal.locator("select").selectOption("REPETIR");
  await modal.locator('input[type="number"]').fill("500");
  await modal.locator("textarea").fill("Repetição conferida em balança homologada com evidência técnica.");
  const chamada = esperarCallable(page, "repetirPesagemDevolucaoAnomala");
  await modal.getByRole("button", { name: "Confirmar Resolução" }).click();
  await chamada;
  const frasco = await lerDocumento(`Frasco_Reagente/${frascoId}`);
  const emprestimo = (await listarColecao("Emprestimo_Reagente")).find((item) => item.data.id_frasco_reagente === frascoId);
  expect(emprestimo?.data.consumo_validado).toBe(true);
  expect(emprestimo?.data.id_resolucao_metrologica).toBeTruthy();
});

test("MET-E2E-002/003: confirmar esgotamento e recalibrar tara após pendência real", async ({ page }) => {
  const { frascoId } = await criarPendenciaQ06(page);
  let linha = page.getByTestId(`frasco-row-${frascoId}`);
  await linha.getByRole("button", { name: "Resolver Metrologia" }).click();
  let modal = page.getByRole("heading", { name: "Resolver pendência de pesagem" }).locator("..");
  await modal.locator("select").selectOption("ESGOTAMENTO");
  await modal.locator('input[type="number"]').fill("250");
  await modal.locator("textarea").fill("Inspeção física confirmou esgotamento e tara real do recipiente.");
  const esgotamento = esperarCallable(page, "confirmarEsgotamentoAposInspecao");
  await modal.getByRole("button", { name: "Confirmar Resolução" }).click();
  await esgotamento;
  await expect.poll(async () => (await lerDocumento(`Frasco_Reagente/${frascoId}`))?.data.estado_fisico_frasco).toBe("VAZIO");

  await page.reload();
  linha = page.getByTestId(`frasco-row-${frascoId}`);
  await linha.getByRole("button", { name: "Resolver Metrologia" }).click();
  modal = page.getByRole("heading", { name: "Resolver pendência de pesagem" }).locator("..");
  await modal.locator("select").selectOption("RECALIBRAR");
  await modal.locator('input[type="number"]').fill("251");
  await modal.locator("textarea").fill("Nova tara aferida em balança calibrada após esgotamento confirmado.");
  const recalibrar = esperarCallable(page, "recalibrarTaraFrascoEsgotado");
  await modal.getByRole("button", { name: "Confirmar Resolução" }).click();
  await recalibrar;
  expect((await lerDocumento(`Frasco_Reagente/${frascoId}`))?.data.peso_frasco_vazio).toBe(251);
});

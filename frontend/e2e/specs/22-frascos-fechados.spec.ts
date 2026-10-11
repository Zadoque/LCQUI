import { test, expect } from "../fixtures";
import { login, esperarCallable, lerResultadoCallable } from "../helpers/ui";
import { lerDocumento, listarColecao } from "../helpers/emulator";

test("FRASC-E2E-001: cadastra frasco fechado com código atômico", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
  await expect(page.getByText("Reagente Seed")).toBeVisible();
  await page.getByText("Reagente Seed").click();
  await page.getByRole("button", { name: "+ Frasco S/ Lote" }).click();
  const antes = await listarColecao("Frasco_Reagente");
  const numeros = page.locator('input[type="number"]');
  await numeros.nth(0).fill("500");
  await numeros.nth(1).fill("250");
  const resposta = esperarCallable(page, "cadastrarFrascoFechado");
  await page.getByRole("button", { name: "Salvar Frasco" }).click();
  const respostaReal = await resposta;
  expect(respostaReal.status()).toBe(200);
  const depois = await listarColecao("Frasco_Reagente");
  const novo = depois.find((doc) => !antes.some((anterior) => anterior.id === doc.id));
  expect(novo).toBeTruthy();
  const frasco = novo!;
  expect(frasco?.data).toMatchObject({ estado_fisico_frasco: "FECHADO", saldo_desconhecido: false, origem_tara: "REFERENCIA_TEORICA" });
});

test("FRASC-E2E-002: cadastra frasco já aberto sem inventar tara ou saldo", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
  await page.getByText("Reagente Seed").click();
  await page.getByRole("button", { name: "+ Frasco S/ Lote" }).click();
  await page.getByRole("button", { name: "Já Aberto (Em Uso)" }).click();
  const antes = await listarColecao("Frasco_Reagente");
  const numeros = page.locator('input[type="number"]');
  await numeros.nth(0).fill("250");
  const resposta = esperarCallable(page, "cadastrarFrascoAberto");
  await page.getByRole("button", { name: "Salvar Frasco" }).click();
  await resposta;

  const depois = await listarColecao("Frasco_Reagente");
  const novo = depois.find((doc) => !antes.some((anterior) => anterior.id === doc.id));
  expect(novo?.data).toMatchObject({
    estado_fisico_frasco: "ABERTO",
    condicao_inicial_cadastro: "JA_ABERTO",
    saldo_desconhecido: true,
    data_abertura: null,
  });
  expect(novo?.data.tara_g ?? null).toBeNull();
});

test("FRASC-E2E-003: cadastro de frasco vencido exige destino e persiste quarentena", async ({ page }) => {
  await login(page, "gestor.almoxarifado@lcqui.local");
  await page.goto("/reagentes");
  await page.getByPlaceholder("Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)...").fill("Reagente Seed");
  await page.getByText("Reagente Seed", { exact: true }).click();
  await page.getByRole("button", { name: "+ Frasco S/ Lote" }).click();
  await page.getByRole("button", { name: "Já Aberto (Em Uso)" }).click();
  await page.locator('input[type="number"]').nth(0).fill("250");
  await page.getByLabel("Validade do frasco").fill("2020-01-01");
  await page.getByLabel("Destino do frasco vencido").selectOption("QUARENTENA");
  await page.getByLabel("Detalhe da decisão de validade").fill("Laudo técnico retém frasco vencido em quarentena.");
  const chamada = esperarCallable(page, "cadastrarFrascoAberto");
  await page.getByRole("button", { name: "Salvar Frasco" }).click();
  const resposta = await chamada;
  expect(resposta.status()).toBe(200);
  const resultado = await lerResultadoCallable(resposta);
  const frascoId = resultado.idFrasco as string;
  expect(frascoId).toBeTruthy();
  await expect.poll(async () => {
    const documento = await lerDocumento(`Frasco_Reagente/${frascoId}`);
    return [documento?.data.vencido, documento?.data.em_quarentena, String(documento?.data.validade_efetiva ?? "").startsWith("2020-01-01")];
  }).toEqual([true, true, true]);
});

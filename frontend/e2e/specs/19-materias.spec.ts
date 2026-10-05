import { test, expect } from "../fixtures";
import { login, esperarCallable } from "../helpers/ui";
import { listarColecao, lerDocumento, FIRESTORE_EMULATOR, PROJECT_ID } from "../helpers/emulator";

/**
 * Vertical de matérias (IMP-BASE-003 / Seção 8).
 *
 * Exercita criação, edição, duplicidade e uppercase via UI do professor e
 * do chefe, validando o contrato canônico persistido no Firestore Emulator.
 */

test.describe.serial("Matérias", () => {
  test("MAT-E2E-001 professor cria matéria via overlay em /turmas", async ({ page }) => {
    await login(page, "professor.alpha@lcqui.local");
    await page.goto("/turmas");

    // Abrir dropdown de ações e clicar em "Gerenciar Matérias"
    await page.getByRole("button", { name: "Ações", exact: true }).click();
    await page.getByRole("button", { name: /Gerenciar Matérias/ }).click();

    // Overlay abre com ListaMaterias exibindo as matérias do seed
    await expect(page.getByTestId("lista-materias")).toBeVisible();
    await expect(page.getByTestId("materia-item-materia-quimica-geral")).toBeVisible();
    await expect(page.getByTestId("materia-item-materia-quimica-analitica")).toBeVisible();

    // Criar nova matéria via overlay
    await page.getByTestId("btn-nova-materia").click();
    await expect(page.getByTestId("modal-materia")).toBeVisible();
    await page.getByTestId("input-codigo-materia").fill("QUI110");
    await page.getByTestId("input-nome-materia").fill("Química Inorgânica");

    const resposta = esperarCallable(page, "gerenciarMateria");
    await page.getByTestId("btn-salvar-materia").click();
    await resposta;
    await expect(page.getByTestId("modal-materia")).toHaveCount(0);

    // Verificar persistência no Firestore Emulator
    const materias = await listarColecao("Materia");
    const nova = materias.find((m) => m.data.codigo_materia === "QUI110");
    expect(nova, "matéria QUI110 deve existir no Firestore").toBeTruthy();
    expect(nova!.data.nome).toBe("Química Inorgânica");

    // Verificar que aparece na listagem (via onSnapshot)
    await expect(page.getByTestId(`materia-item-${nova!.id}`)).toBeVisible();
  });

  test("MAT-E2E-002 chefe cria matéria via /professores", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/professores");

    // Abrir modal "Novo Professor"
    await page.getByRole("button", { name: "Novo Professor" }).click();

    // No modal, o ListaMaterias em modo selecao deve aparecer
    await expect(page.getByTestId("lista-materias")).toBeVisible();

    // Clicar em "+ Nova Matéria" (botão do ListaMaterias em modo selecao)
    await page.getByRole("button", { name: "Nova Matéria" }).click();

    // Modal de Nova Matéria abre
    await expect(page.getByTestId("modal-materia")).toBeVisible();

    // Preencher código e nome
    await page.getByTestId("input-codigo-materia").fill("QUI303");
    await page.getByTestId("input-nome-materia").fill("Físico-Química I");

    // Salvar
    const resposta = esperarCallable(page, "gerenciarMateria");
    await page.getByTestId("btn-salvar-materia").click();
    await resposta;

    // Modal fecha
    await expect(page.getByTestId("modal-materia")).toHaveCount(0);

    // Verificar no Firestore
    const materias = await listarColecao("Materia");
    const nova = materias.find((m) => m.data.codigo_materia === "QUI303");
    expect(nova, "matéria QUI303 deve existir no Firestore").toBeTruthy();
    expect(nova!.data.nome).toBe("Físico-Química I");

    // Chave única: verificar que existe um documento em Chaves_Unicas com tipo Materia e id_recurso correspondente
    const chaves = await listarColecao("Chaves_Unicas");
    const chave = chaves.find(c => c.data.tipo === "Materia" && c.data.id_recurso === nova!.id);
    expect(chave, "chave única da matéria deve existir").not.toBeNull();
    expect(chave!.data.id_recurso).toBe(nova!.id);
  });

  test("MAT-E2E-003 chefe edita QUI101 mantendo ID do documento", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/turmas");

    // Abrir overlay de matérias
    await page.getByRole("button", { name: "Ações", exact: true }).click();
    await page.getByRole("button", { name: /Gerenciar Matérias/ }).click();
    await expect(page.getByTestId("lista-materias")).toBeVisible();

    // Clicar em "Editar" na matéria QUI101
    await page.getByTestId("btn-editar-materia-materia-quimica-geral").click();

    // Modal de edição abre
    await expect(page.getByTestId("modal-materia")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Editar Matéria" })).toBeVisible();

    // Verificar que os campos estão pré-preenchidos
    await expect(page.getByTestId("input-codigo-materia")).toHaveValue("QUI101");
    await expect(page.getByTestId("input-nome-materia")).toHaveValue("Química Geral");

    // Alterar nome
    await page.getByTestId("input-nome-materia").fill("Química Geral I");

    // Salvar
    const resposta = esperarCallable(page, "gerenciarMateria");
    await page.getByTestId("btn-salvar-materia").click();
    await resposta;

    // Modal fecha
    await expect(page.getByTestId("modal-materia")).toHaveCount(0);

    // Verificar que o ID se manteve e o nome mudou
    const doc = await lerDocumento("Materia/materia-quimica-geral");
    expect(doc, "documento deve continuar com o mesmo ID").toBeTruthy();
    expect(doc!.data.nome).toBe("Química Geral I");
    expect(doc!.data.codigo_materia).toBe("QUI101");
  });

  test("MAT-E2E-004 código duplicado exibe erro no campo", async ({ page, guardaConsole }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/professores");

    // Permitir erro 409/Conflict esperado ao tentar salvar código duplicado
    guardaConsole.permitir(/409|Conflict/i);

    // Abrir modal "Novo Professor" para acessar o seletor de matérias
    await page.getByRole("button", { name: "Novo Professor" }).click();
    await expect(page.getByTestId("lista-materias")).toBeVisible();

    // Abrir modal de nova matéria
    await page.getByRole("button", { name: "Nova Matéria" }).click();
    await expect(page.getByTestId("modal-materia")).toBeVisible();

    // Tentar criar com código QUI202 (já existe)
    await page.getByTestId("input-codigo-materia").fill("QUI202");
    await page.getByTestId("input-nome-materia").fill("Duplicada");

    // Salvar — esperamos erro
    const resposta = esperarCallable(page, "gerenciarMateria");
    await page.getByTestId("btn-salvar-materia").click();
    await resposta;

    // Erro deve aparecer no campo de código
    await expect(page.getByTestId("erro-campo-codigo")).toBeVisible();
    await expect(page.getByTestId("erro-campo-codigo")).toContainText("já cadastrado");

    // Modal continua aberto
    await expect(page.getByTestId("modal-materia")).toBeVisible();
  });

  test("MAT-E2E-005 código lowercase é normalizado para uppercase", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/professores");

    await page.getByRole("button", { name: "Novo Professor" }).click();
    await expect(page.getByTestId("lista-materias")).toBeVisible();

    await page.getByRole("button", { name: "Nova Matéria" }).click();
    await expect(page.getByTestId("modal-materia")).toBeVisible();

    // Digitar lowercase
    await page.getByTestId("input-codigo-materia").fill("qui505");
    await page.getByTestId("input-nome-materia").fill("Bioquímica Experimental");

    const resposta = esperarCallable(page, "gerenciarMateria");
    await page.getByTestId("btn-salvar-materia").click();
    await resposta;

    // Modal fecha
    await expect(page.getByTestId("modal-materia")).toHaveCount(0);

    // Verificar que foi salvo como QUI505
    const materias = await listarColecao("Materia");
    const nova = materias.find((m) => m.data.codigo_materia === "QUI505");
    expect(nova, "matéria deve ser salva com código uppercase QUI505").toBeTruthy();
  });

  test("MAT-E2E-006 aluno não vê botão de gerenciar matérias", async ({ page }) => {
    await login(page, "aluno.normal@lcqui.local");
    await page.goto("/turmas");

    // O aluno não deve ver o ProfessorDashboardBar
    await expect(page.getByRole("button", { name: "Ações", exact: true })).toHaveCount(0);
  });

  test("MAT-E2E-009 chefe seleciona matéria existente no convite de professor (UI-03)", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");
    await page.goto("/professores");

    // Contar matérias existentes ANTES (seed canônico: QUI101 + QUI202)
    const materiasAntes = await listarColecao("Materia");
    const countAntes = materiasAntes.length;

    // Abrir modal "Novo Professor"
    await page.getByRole("button", { name: "Novo Professor" }).click();

    // O ListaMaterias em modo selecao deve mostrar as matérias do seed
    await expect(page.getByTestId("lista-materias")).toBeVisible();
    await expect(page.getByTestId("materia-item-materia-quimica-geral")).toBeVisible();
    await expect(page.getByTestId("materia-item-materia-quimica-analitica")).toBeVisible();

    // Marcar o checkbox da matéria existente QUI101
    await page.getByTestId("materia-item-materia-quimica-geral").click();

    // Verificar que o checkbox ficou marcado
    const checkbox = page.getByTestId("materia-item-materia-quimica-geral").locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();

    // NENHUMA nova matéria foi criada apenas por selecionar (UI-03: "selecionar matéria existente não exige cadastrar novamente")
    const materiasDepois = await listarColecao("Materia");
    expect(materiasDepois.length, "selecionar matéria existente não deve criar novo documento").toBe(countAntes);
  });

  test("MAT-E2E-007 estado de carregamento ao abrir gerenciamento de matérias", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");

    // Atrasar chamadas ao Firestore Emulator para forçar estado de carregamento
    await page.route("**/v1/projects/*/databases/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });

    // Navegar para turmas (Firestore queries ficarão pendentes durante o atraso)
    await page.goto("/turmas");

    // Abrir dropdown de ações e clicar em "Gerenciar Matérias"
    await page.getByRole("button", { name: "Ações", exact: true }).click();
    await page.getByRole("button", { name: /Gerenciar Matérias/ }).click();

    // Deve mostrar spinner de carregamento enquanto dados não chegam
    await expect(page.getByTestId("estado-carregando")).toBeVisible({ timeout: 2000 });

    // Após o atraso, os dados carregam e o spinner desaparece
    await expect(page.getByTestId("estado-carregando")).toHaveCount(0, { timeout: 6000 });
    await expect(page.getByTestId("materia-item-materia-quimica-geral")).toBeVisible({ timeout: 3000 });
  });

  test("MAT-E2E-008 estado vazio quando não há matérias cadastradas", async ({ page }) => {
    await login(page, "chefe.seed@lcqui.local");

    // Deletar todas as matérias do emulador para forçar estado vazio
    const materias = await listarColecao("Materia");
    for (const materia of materias) {
      await fetch(
        `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/Materia/${materia.id}`,
        { method: "DELETE", headers: { Authorization: "Bearer owner" } }
      );
    }

    // Navegar para turmas e abrir overlay de matérias
    await page.goto("/turmas");
    await page.getByRole("button", { name: "Ações", exact: true }).click();
    await page.getByRole("button", { name: /Gerenciar Matérias/ }).click();

    // Deve mostrar estado vazio
    await expect(page.getByTestId("estado-vazio")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Nenhuma matéria cadastrada")).toBeVisible();

    // Botão de nova matéria deve aparecer no estado vazio
    await expect(page.getByTestId("btn-nova-materia")).toBeVisible();
  });
});

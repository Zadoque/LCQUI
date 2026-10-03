import { test, expect } from "../fixtures";
import {
  login,
  logout,
  abrirNovoAlunoModal,
  convidarAluno,
  abrirNotificacoes,
  esperarCallable,
} from "../helpers/ui";
import {
  FIRESTORE_EMULATOR,
  PROJECT_ID,
  lerDocumento,
  listarColecao,
} from "../helpers/emulator";

const TURMA_ID = "seed-turma-vazia";

async function arquivarTurma(): Promise<void> {
  const url = `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/Turma/${TURMA_ID}?updateMask.fieldPaths=status`;
  await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ fields: { status: { stringValue: "Arquivada" } } }),
  });
}

async function restaurarTurma(): Promise<void> {
  const url = `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/Turma/${TURMA_ID}?updateMask.fieldPaths=status`;
  await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ fields: { status: { stringValue: "Ativo" } } }),
  });
}

test.describe("Aceitar convite em turma arquivada", () => {
  test("CONV-ARQ-E2E-001 turma arquivada após convite bloqueia aceite", async ({
    page,
    guardaConsole,
  }) => {
    guardaConsole.permitir(
      /Erro ao aceitar convite/,
      /failed-precondition/,
      /não está mais ativa/,
      /Failed to load resource: the server responded with a status of (?:400|403)/
    );

    // 1. Professor emite convite interno
    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "Química Geral — T1 Vazia");
    await convidarAluno(page, { turmaId: TURMA_ID, emails: "aluno.normal@lcqui.local" });
    await expect(page.getByText(/Convite registrado/)).toBeVisible();
    await page.goto("/turmas");
    await logout(page);

    // 2. Arquivar turma via Firestore Emulator REST
    await arquivarTurma();

    // 3. Aluno tenta aceitar convite
    await login(page, "aluno.normal@lcqui.local");
    await page.goto("/turmas");
    await abrirNotificacoes(page);
    await page.getByRole("link", { name: "Acessar Convite" }).click();
    await page.waitForURL(/\/convite\?id=/);

    const resposta = esperarCallable(page, "aceitarConviteAluno");
    await page.getByRole("button", { name: "Confirmar e Ingressar" }).click();
    await resposta;

    // 4. Erro visível — backend rejeita turma não ativa
    await expect(page.getByText(/não está mais ativa/)).toBeVisible();

    // 5. Firestore: nenhum vínculo criado
    const vinculo = await lerDocumento(`Turma/${TURMA_ID}/Alunos/seed-aluno-normal`);
    expect(vinculo).toBeNull();

    const turma = await lerDocumento(`Turma/${TURMA_ID}`);
    expect(turma!.data.qtd_alunos).toBe(0);

    // 6. Restaurar turma para não quebrar outros testes
    await restaurarTurma();
  });
});

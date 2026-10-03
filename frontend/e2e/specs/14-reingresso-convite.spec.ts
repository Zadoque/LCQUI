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
const ALUNO_UID = "seed-aluno-removed";

async function limparVinculoCriado(): Promise<void> {
  // Remove vínculo criado pelo teste
  await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/Turma/${TURMA_ID}/Alunos/${ALUNO_UID}`,
    { method: "DELETE", headers: { Authorization: "Bearer owner" } }
  );
  // Remove espelho
  await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/Usuarios/${ALUNO_UID}/Turmas/${TURMA_ID}`,
    { method: "DELETE", headers: { Authorization: "Bearer owner" } }
  );
  // Restaura qtd_alunos para 0
  const url = `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/Turma/${TURMA_ID}?updateMask.fieldPaths=qtd_alunos`;
  await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ fields: { qtd_alunos: { integerValue: "0" } } }),
  });
}

test.describe("Reingresso de aluno removido via convite", () => {
  test("REINGRESSO-E2E-001 aluno removido aceita convite e reingressa", async ({
    page,
  }) => {
    // 1. Professor emite convite para aluno removido
    await login(page, "professor.alpha@lcqui.local");
    await abrirNovoAlunoModal(page, "Química Geral — T1 Vazia");
    await convidarAluno(page, { turmaId: TURMA_ID, emails: "aluno.removido@lcqui.local" });
    await expect(page.getByText(/Convite registrado/)).toBeVisible();
    await page.goto("/turmas");
    await logout(page);

    // 2. Aluno removido aceita convite
    await login(page, "aluno.removido@lcqui.local");
    await page.goto("/turmas");
    await abrirNotificacoes(page);
    await page.getByRole("link", { name: "Acessar Convite" }).click();
    await page.waitForURL(/\/convite\?id=/);

    const resposta = esperarCallable(page, "aceitarConviteAluno");
    await page.getByRole("button", { name: "Confirmar e Ingressar" }).click();
    await resposta;

    // 3. Sucesso
    await expect(page.getByRole("heading", { name: "Convite Aceito!" })).toBeVisible();

    // 4. Firestore: vínculo criado
    const vinculo = await lerDocumento(`Turma/${TURMA_ID}/Alunos/${ALUNO_UID}`);
    expect(vinculo).not.toBeNull();
    expect(vinculo!.data.id_aluno).toBe(ALUNO_UID);
    expect(vinculo!.data.id_turma).toBe(TURMA_ID);

    // 5. Contador incrementado
    const turma = await lerDocumento(`Turma/${TURMA_ID}`);
    expect(turma!.data.qtd_alunos).toBe(1);

    // 6. Histórico contém inclusao_aluno com modo_ingresso CONVITE
    const historico = await listarColecao(`Turma/${TURMA_ID}/HistoricoAlunos`);
    const inclusoes = historico.filter(
      (h) => h.data.id_aluno === ALUNO_UID && h.data.tipo === "inclusao_aluno"
    );
    expect(inclusoes.length).toBeGreaterThanOrEqual(1);
    expect(inclusoes[0].data.modo_ingresso).toBe("CONVITE");

    // 7. Evento de exclusao_aluno permanece
    const exclusoes = historico.filter(
      (h) => h.data.id_aluno === ALUNO_UID && h.data.tipo === "exclusao_aluno"
    );
    expect(exclusoes.length).toBe(1);

    // 8. Limpeza: restaurar estado do seed
    await limparVinculoCriado();
  });
});

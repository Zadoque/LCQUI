import type { Page, Response } from "@playwright/test";
import { expect } from "@playwright/test";
import { listarColecao } from "./emulator";

export const SENHA_SEED = "Test123456!";

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function login(page: Page, email: string, senha = SENHA_SEED): Promise<void> {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function logout(page: Page): Promise<void> {
  await page.getByTestId("header-user-menu").click();
  await page.getByTestId("logout-button").click();
  await page.waitForURL(/\/login/);
}

export async function abrirNovoAlunoModal(page: Page, turmaNome: string): Promise<void> {
  await page.goto("/turmas");
  await page.getByRole("button", { name: new RegExp(escaparRegex(turmaNome)) }).click();
  await page.getByRole("button", { name: "Ações", exact: true }).click();
  await page.getByRole("button", { name: /Novo Aluno na Turma/ }).click();
  await expect(page.getByRole("heading", { name: "Novo Aluno" })).toBeVisible();
}

export interface OpcoesConvite {
  turmaId: string;
  emails: string;
  matricula?: string;
  excederCapacidade?: boolean;
  justificativa?: string;
}

export async function convidarAluno(page: Page, opcoes: OpcoesConvite): Promise<void> {
  await page.getByRole("button", { name: "Convidar por E-mail" }).click();
  await page.getByLabel(/^Turma\b/).selectOption(opcoes.turmaId);
  await page.getByLabel("E-mail(s) do(s) Aluno(s)").fill(opcoes.emails);
  if (opcoes.matricula) {
    await page.getByLabel("Matrícula Institucional (opcional)").fill(opcoes.matricula);
  }
  if (opcoes.excederCapacidade) {
    await page.getByRole("checkbox", { name: /Exceder capacidade/ }).check();
    await page.getByLabel(/Justificativa da Exceção/).fill(opcoes.justificativa ?? "");
  }
  await page.getByRole("button", { name: "Registrar Convite(s)" }).click();
}

export interface ChamadaCallable {
  url: string;
  payload: Record<string, unknown>;
}

/** Captura o payload real enviado pelo SDK do Firebase para um callable. */
export function capturarCallable(page: Page, nome: string): ChamadaCallable[] {
  const chamadas: ChamadaCallable[] = [];
  page.on("request", (requisicao) => {
    if (requisicao.method() !== "POST" || !requisicao.url().includes(nome)) return;
    const corpo = requisicao.postData();
    if (!corpo) return;
    try {
      chamadas.push({ url: requisicao.url(), payload: JSON.parse(corpo) as Record<string, unknown> });
    } catch {
      // corpo não-JSON não é um callable do SDK; ignora.
    }
  });
  return chamadas;
}

export function esperarCallable(page: Page, nome: string): Promise<Response> {
  return page.waitForResponse(
    (resposta) => resposta.request().method() === "POST" && resposta.url().includes(nome),
    { timeout: 20_000 }
  );
}

export async function lerResultadoCallable(resposta: Response): Promise<Record<string, unknown>> {
  const corpo = (await resposta.json()) as Record<string, unknown>;
  return (corpo.result ?? corpo.data ?? corpo) as Record<string, unknown>;
}

export async function idConviteDaNotificacao(uid: string): Promise<string> {
  const notificacoes = await listarColecao(`Usuarios/${uid}/Notificacoes`);
  const convites = notificacoes.filter(
    (notificacao) => notificacao.data.tipo === "CONVITE_PARA_TURMA"
  );
  if (convites.length === 0) {
    throw new Error(`Nenhuma notificação CONVITE_PARA_TURMA para ${uid}.`);
  }
  return convites[convites.length - 1].data.id_alvo as string;
}

export async function abrirNotificacoes(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Notificações", exact: true }).click();
}

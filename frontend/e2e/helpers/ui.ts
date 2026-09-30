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

export interface DadosCriarTurma {
  idMateria: string;
  nome: string;
  ano?: number;
  semestre?: number;
  capacidade?: number;
}

export async function criarTurma(page: Page, opcoes: DadosCriarTurma): Promise<void> {
  await page.goto("/turmas");
  await page.getByTestId("botao-nova-turma").click();
  await expect(page.getByRole("heading", { name: "Nova Turma" })).toBeVisible();

  await page.getByLabel("Matéria").selectOption(opcoes.idMateria);
  await page.getByLabel("Nome da Turma").fill(opcoes.nome);
  if (opcoes.ano !== undefined) {
    await page.getByLabel("Ano").fill(String(opcoes.ano));
  }
  if (opcoes.semestre !== undefined) {
    await page.getByLabel("Semestre").selectOption(String(opcoes.semestre));
  }
  if (opcoes.capacidade !== undefined) {
    await page.getByLabel("Capacidade de Alunos").fill(String(opcoes.capacidade));
  }

  const resposta = esperarCallable(page, "criarTurma");
  await page.getByRole("button", { name: "Criar Turma" }).click();
  await resposta;
  await expect(page.getByRole("heading", { name: "Nova Turma" })).toHaveCount(0);
}

export async function ingressarPorCodigo(page: Page, codigo: string): Promise<void> {
  await page.goto("/turmas");
  await page.getByTestId("botao-ingressar-turma").click();
  await page.getByTestId("input-codigo-turma").fill(codigo);
  const resposta = esperarCallable(page, "ingressarEmTurmaPorCodigo");
  await page.getByTestId("botao-confirmar-ingressar").click();
  await resposta;
}

export async function abrirMembrosTurma(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Ações", exact: true }).click();
  await page.getByTestId("botao-membros-turma").click();
  await expect(page.getByRole("heading", { name: "Membros da Turma" })).toBeVisible();
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

/** Abre `/turmas` e seleciona a turma pelo nome no painel lateral. */
export async function abrirTurma(page: Page, nomeTurma: string): Promise<void> {
  await page.goto("/turmas");
  await page.getByRole("button", { name: new RegExp(escaparRegex(nomeTurma)) }).click();
  await expect(page.getByRole("heading", { name: nomeTurma, level: 1 })).toBeVisible();
}

/** Publica um Post pela interface do professor dono, com roteiro opcional. */
export async function criarPost(page: Page, titulo: string, descricao: string, idRoteiro?: string): Promise<void> {
  await page.getByPlaceholder("Título da postagem...").fill(titulo);
  await page.getByPlaceholder("Escreva as instruções ou recados para a turma...").fill(descricao);
  if (idRoteiro) {
    await page.getByTestId("seletor-roteiro-post").selectOption(idRoteiro);
  }
  await page.getByRole("button", { name: "Postar", exact: true }).click();
  await expect(page.getByRole("heading", { name: titulo, level: 3 })).toBeVisible();
}

/**
 * Cartão do Post identificado pelo título, sem depender de estrutura CSS: sobe
 * do heading para o contêiner que hospeda o feed e os comentários daquele post.
 */
export function cartaoDoPost(page: Page, titulo: string) {
  return page.getByRole("heading", { name: titulo, level: 3 }).locator("../..");
}

/** Expande a seção de comentários do Post indicado. */
export async function abrirComentarios(page: Page, tituloPost: string): Promise<void> {
  const card = cartaoDoPost(page, tituloPost);
  await card.scrollIntoViewIfNeeded();
  await card.getByRole("button", { name: /Ver comentários/ }).click();
}

/** Comenta no Post indicado e confirma a renderização do texto. */
export async function comentar(page: Page, tituloPost: string, texto: string): Promise<void> {
  const card = cartaoDoPost(page, tituloPost);
  await card.scrollIntoViewIfNeeded();
  await card.getByPlaceholder("Escreva um comentário...").fill(texto);
  const resposta = esperarCallable(page, "adicionarComentario");
  await card.getByRole("button", { name: "Comentar", exact: true }).click();
  await resposta;
  await expect(card.getByText(texto)).toBeVisible();
}

/** Edita um Post pela interface do professor dono. */
export async function editarPost(page: Page, tituloAntigo: string, novoTitulo: string, novaDescricao: string): Promise<void> {
  const card = cartaoDoPost(page, tituloAntigo);
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  await card.getByRole("button", { name: "Editar Postagem", exact: true }).click();
  
  // O formulário de criação usa os mesmos placeholders; os data-testid do modo
  // de edição desambiguam os campos (o heading antigo é substituído por inputs).
  const tituloEdicao = page.getByTestId("editar-titulo-post");
  await expect(tituloEdicao).toBeVisible();
  
  // Preenche novos valores
  await tituloEdicao.fill(novoTitulo);
  await page.getByTestId("editar-descricao-post").fill(novaDescricao);
  
  // Salva
  const resposta = esperarCallable(page, "editarPost");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await resposta;
  await expect(page.getByRole("heading", { name: novoTitulo, level: 3 })).toBeVisible();
}

/** Edita um comentário pela interface do autor. */
export async function editarComentario(page: Page, tituloPost: string, textoAntigo: string, novoTexto: string): Promise<void> {
  const card = cartaoDoPost(page, tituloPost);
  await card.scrollIntoViewIfNeeded();
  const comentario = card.getByTestId("comentario-item").filter({ hasText: textoAntigo });
  await comentario.hover();
  await comentario.getByRole("button", { name: "Editar comentário", exact: true }).click({ force: true });
  const textarea = page.getByTestId("editar-texto-comentario");
  await expect(textarea).toBeVisible();
  await textarea.fill(novoTexto);
  const resposta = esperarCallable(page, "editarComentario");
  await page.getByTestId("salvar-edicao-comentario").click();
  await resposta;
  await expect(card.getByText(novoTexto)).toBeVisible();
}

export interface ObservadorConsole {
  permitir: (...padroes: (string | RegExp)[]) => void;
  verificar: () => void;
}

/**
 * Observa `console.error`/`pageerror` de uma página adicional (ex.: segundo
 * contexto), espelhando a guarda da fixture. A exceção por padrão é o aviso de
 * reconexão do SDK Firestore em cold start.
 */
export async function adicionarAlunoExistente(page: Page, uidAluno: string): Promise<void> {
  await expect(page.getByRole("heading", { name: "Novo Aluno" })).toBeVisible();
  await page.getByTestId("aba-buscar-aluno").click();

  await page.getByRole("button", { name: "Buscar", exact: true }).click();

  const linha = page.getByTestId(`linha-aluno-${uidAluno}`);
  await expect(linha).toBeVisible();

  const resposta = esperarCallable(page, "adicionarAlunoExistenteTurma");
  await linha.getByTestId("botao-adicionar-existente").click();
  await resposta;
}

export async function removerAluno(page: Page, uidAluno: string): Promise<void> {
  await expect(page.getByRole("heading", { name: "Membros da Turma" })).toBeVisible();
  const resposta = esperarCallable(page, "removerAlunoTurma");
  await page.getByTestId(`remover-aluno-${uidAluno}`).click();
  await page.getByTestId("confirmar-remover-aluno").click();
  await resposta;
}

export function observarConsole(page: Page): ObservadorConsole {
  const erros: string[] = [];
  const permitidos: RegExp[] = [
    /@firebase\/firestore: Firestore \([\d.]+\): Could not reach Cloud Firestore backend/,
  ];
  page.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(mensagem.text());
  });
  page.on("pageerror", (erro) => erros.push(erro.message));
  return {
    permitir: (...padroes) => {
      for (const padrao of padroes) {
        permitidos.push(
          typeof padrao === "string" ? new RegExp(escaparRegex(padrao)) : padrao
        );
      }
    },
    verificar: () => {
      const inesperados = erros.filter(
        (texto) => !permitidos.some((regex) => regex.test(texto))
      );
      expect(
        inesperados,
        `Erros de console/page inesperados:\n${inesperados.join("\n")}`
      ).toEqual([]);
    },
  };
}

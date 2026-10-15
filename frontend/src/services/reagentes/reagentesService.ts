/**
 * Serviço de Reagentes — UI-04 / UI-19 / M1–M8
 *
 * Centraliza todas as chamadas Firebase do domínio de reagentes:
 * - Catálogo de reagentes (httpsCallable + fallback Firestore)
 * - Snapshot de Estoque Atual (UI-19 / M8)
 * - Busca do almoxarifado vinculado ao gestor
 *
 * Nunca chame httpsCallable ou Firestore diretamente em componentes — use este serviço.
 */

import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/lib/firebase/config";
import type { CatalogoSubstancia, FrascoOperacional, ResumoReagente, EstoqueSnapshot } from "@/types/reagentes";
import type {
  AcaoFrascoInput,
  CadastroEspecificacaoInput,
  CadastroFrascoAbertoInput,
  CadastroFrascoFechadoInput,
  CadastroFrascoResult,
  CadastroLoteInput,
  CadastroResumoReagenteInput,
  CadastroSubstanciaInput,
  ConfigurarEscassezInput,
  ConfirmarEsgotamentoInput,
  ObterCatalogoReagentesResponse,
  ObterCatalogoSubstanciasResponse,
  ObterEstoqueResponse,
  RecalibrarTaraInput,
  RegistrarDevolucaoInput,
  RegistrarExtravioOuReencontroInput,
  RegistrarPesagemRotinaInput,
  RegistrarRetiradaInput,
  RepetirPesagemInput,
  ResolverQuarentenaInput,
  FrascoCatalogo,
  GerarEtiquetasVirgensInput,
  GerarReimpressaoFrascosInput,
  LoteCatalogo,
  RelatorioReagentesMensalInput,
  RelatorioReagentesPersonalizadoInput,
  AlertaOperacional,
  HistoricoOperacional,
  ObterEstoqueParams,
  ObterEstoqueResult,
  PainelOperacionalData,
} from "@/types/reagentesApi";
import type { LocalRetirada } from "@/types/reagentesApi";
import type { NotificacaoItem } from "@/types/notificacoes";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de payload / resposta
// ─────────────────────────────────────────────────────────────────────────────

export type { LocalRetirada } from "@/types/reagentesApi";

const DURACAO_CACHE_LOOKUP_MS = 30_000;
const locaisRetiradaCache = new Map<string, { data: LocalRetirada[]; expiraEmMs: number }>();
const locaisRetiradaEmCarregamento = new Map<string, Promise<LocalRetirada[]>>();
const almoxarifadoDoGestorCache = new Map<string, { idAlmoxarifado?: string; expiraEmMs: number }>();
const almoxarifadoDoGestorEmCarregamento = new Map<string, Promise<string | undefined>>();
const lotesCache = new Map<string, { data: LoteCatalogo[]; expiraEmMs: number }>();
const lotesEmCarregamento = new Map<string, Promise<LoteCatalogo[]>>();
const frascosSemLoteCache = new Map<string, { data: FrascoOperacional[]; expiraEmMs: number }>();
const frascosSemLoteEmCarregamento = new Map<string, Promise<FrascoOperacional[]>>();
const frascosDoLoteCache = new Map<string, { data: FrascoOperacional[]; expiraEmMs: number }>();
const frascosDoLoteEmCarregamento = new Map<string, Promise<FrascoOperacional[]>>();
const frascoPorCodigoCache = new Map<string, { data: FrascoCatalogo | null; expiraEmMs: number }>();
const frascoPorCodigoEmCarregamento = new Map<string, Promise<FrascoCatalogo | null>>();

export async function buscarLocaisParaRetirada(params: { predio?: string; andar?: string; sala?: string }): Promise<LocalRetirada[]> {
  const payload = Object.fromEntries(Object.entries(params).filter(([, valor]) => valor !== undefined && valor !== ""));
  const chave = JSON.stringify({ uid: auth.currentUser?.uid ?? "anonymous", payload });
  const cacheado = locaisRetiradaCache.get(chave);
  if (cacheado && cacheado.expiraEmMs > Date.now()) return cacheado.data;
  const emCarregamento = locaisRetiradaEmCarregamento.get(chave);
  if (emCarregamento) return emCarregamento;
  const fn = httpsCallable<typeof params, { locais: LocalRetirada[] }>(functions, "buscarLocaisParaRetirada");
  const carregamento = fn(payload).then((res) => {
    locaisRetiradaCache.set(chave, { data: res.data.locais, expiraEmMs: Date.now() + DURACAO_CACHE_LOOKUP_MS });
    return res.data.locais;
  }).finally(() => {
    if (locaisRetiradaEmCarregamento.get(chave) === carregamento) locaisRetiradaEmCarregamento.delete(chave);
  });
  locaisRetiradaEmCarregamento.set(chave, carregamento);
  return carregamento;
}

export async function gerarCatalogoReagentes(): Promise<void> {
  const fn = httpsCallable(functions, "gerarCatalogoReagentes");
  await fn({});
  invalidarCacheCatalogos();
}

export type { AlertaOperacional, EstoqueRateError, HistoricoOperacional, ObterEstoqueParams, ObterEstoqueResult, PainelOperacionalData } from "@/types/reagentesApi";

interface EstoqueCacheItem {
  params: ObterEstoqueParams;
  data: EstoqueSnapshot;
  expiraEmMs: number;
}

// UI-19/UI-13: cache curto em memória reduz remounts sem transformar o cliente
// em fonte de autoridade. O backend continua validando escopo, limite e versão.
let estoqueCache: EstoqueCacheItem[] = [];

interface CatalogoCacheItem<T> {
  data: T;
  expiraEmMs: number;
}

const DURACAO_CACHE_CATALOGO_MS = 60_000;
const catalogoReagentesCache = new Map<string, CatalogoCacheItem<ResumoReagente[]>>();
const catalogoReagentesEmCarregamento = new Map<string, Promise<ResumoReagente[]>>();
const catalogoSubstanciasCache = new Map<string, CatalogoCacheItem<CatalogoSubstancia[]>>();
const catalogoSubstanciasEmCarregamento = new Map<string, Promise<CatalogoSubstancia[]>>();

function chaveSessao(): string {
  return auth.currentUser?.uid ?? "anonymous";
}

/** Invalida as projeções locais depois de uma mutação que publica catálogo. */
export function invalidarCacheCatalogos(): void {
  catalogoReagentesCache.clear();
  catalogoSubstanciasCache.clear();
  locaisRetiradaCache.clear();
  almoxarifadoDoGestorCache.clear();
  lotesCache.clear();
  frascosSemLoteCache.clear();
  frascosDoLoteCache.clear();
  frascoPorCodigoCache.clear();
}

function mesmaChaveEstoque(a: ObterEstoqueParams, b: ObterEstoqueParams): boolean {
  return a.idAlmoxarifado === b.idAlmoxarifado;
}

export function invalidarCacheEstoqueFrontend(): void {
  estoqueCache = [];
  lotesCache.clear();
  frascosSemLoteCache.clear();
  frascosDoLoteCache.clear();
  frascoPorCodigoCache.clear();
}

function registro(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function texto(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numeroOuNulo(value: unknown): number | null | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : value === null ? null : undefined;
}

function timestampOuNulo(value: unknown): HistoricoOperacional["timestamp"] {
  if (value instanceof Date) return value;
  const data = registro(value);
  return data && (typeof data.toDate === "function" || typeof data.toMillis === "function")
    ? value as HistoricoOperacional["timestamp"]
    : null;
}

function normalizarFrascoOperacional(id: string, value: unknown): FrascoOperacional | null {
  const data = registro(value);
  const codigo = texto(data?.codigo_frasco);
  const estado = data?.estado_fisico_frasco;
  if (!codigo || !["FECHADO", "ABERTO", "VAZIO", "QUEBRADO", "DESCARTADO"].includes(String(estado))) return null;
  if (typeof data?.em_quarentena !== "boolean" || typeof data?.vencido !== "boolean") return null;
  const disponibilidade = data.disponibilidade;
  return {
    id,
    codigo_frasco: codigo,
    estado_fisico_frasco: estado as FrascoOperacional["estado_fisico_frasco"],
    peso_atual: numeroOuNulo(data.peso_atual),
    peso_no_cadastrado: numeroOuNulo(data.peso_no_cadastrado),
    em_quarentena: data.em_quarentena,
    situacao_localizacao: texto(data.situacao_localizacao),
    disponibilidade: typeof disponibilidade === "string" ? disponibilidade : null,
    vencido: data.vencido,
  };
}

function normalizarAlertaOperacional(id: string, value: unknown): AlertaOperacional | null {
  const data = registro(value);
  const tipo = texto(data?.tipo);
  if (!tipo) return null;
  return {
    id,
    tipo,
    quantidade: typeof data?.quantidade === "number" ? data.quantidade : undefined,
    mensagem_customizada: texto(data?.mensagem_customizada) ?? undefined,
    emitida_em: timestampOuNulo(data?.emitida_em),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementação
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca o catálogo de reagentes.
 * A Cloud Function é a única porta de leitura do catálogo: ela aplica M9,
 * publica somente a versão autorizada e preserva Firestore como fonte canônica.
 */
export async function obterCatalogoReagentes(): Promise<ResumoReagente[]> {
  const chave = chaveSessao();
  const agora = Date.now();
  const cacheado = catalogoReagentesCache.get(chave);
  if (cacheado && cacheado.expiraEmMs > agora) {
    return cacheado.data;
  }
  const emCarregamento = catalogoReagentesEmCarregamento.get(chave);
  if (emCarregamento) return emCarregamento;

  const fn = httpsCallable<
    Record<string, never>,
    ObterCatalogoReagentesResponse
  >(functions, "obterCatalogoReagentes");
  const carregamento = fn({}).then((res) => {
    const especificacoes = res.data.catalogo?.especificacoes ?? {};
    const lista = Object.values(res.data.catalogo?.resumos ?? {}).map((resumo) => ({
      ...resumo,
      especificacoes: Object.fromEntries(
        Object.entries(especificacoes)
          .filter(([, especificacao]) => especificacao.id_resumo_reagente === resumo.id)
          .map(([id, especificacao]) => [id, especificacao]),
      ),
    })).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    catalogoReagentesCache.set(chave, { data: lista, expiraEmMs: Date.now() + DURACAO_CACHE_CATALOGO_MS });
    return lista;
  }).finally(() => {
    if (catalogoReagentesEmCarregamento.get(chave) === carregamento) catalogoReagentesEmCarregamento.delete(chave);
  });
  catalogoReagentesEmCarregamento.set(chave, carregamento);
  return carregamento;
}

/** O catálogo de substâncias é uma projeção independente; não consulta Firestore. */
export async function obterCatalogoSubstancias(): Promise<CatalogoSubstancia[]> {
  const chave = chaveSessao();
  const agora = Date.now();
  const cacheado = catalogoSubstanciasCache.get(chave);
  if (cacheado && cacheado.expiraEmMs > agora) {
    return cacheado.data;
  }
  const emCarregamento = catalogoSubstanciasEmCarregamento.get(chave);
  if (emCarregamento) return emCarregamento;

  const fn = httpsCallable<Record<string, never>, ObterCatalogoSubstanciasResponse>(functions, "obterCatalogoSubstancias");
  const carregamento = fn({}).then((res) => {
    const lista = Object.values(res.data.catalogo?.substancias ?? {}).filter((substancia) => substancia.ativo !== false);
    catalogoSubstanciasCache.set(chave, { data: lista, expiraEmMs: Date.now() + DURACAO_CACHE_CATALOGO_MS });
    return lista;
  }).finally(() => {
    if (catalogoSubstanciasEmCarregamento.get(chave) === carregamento) catalogoSubstanciasEmCarregamento.delete(chave);
  });
  catalogoSubstanciasEmCarregamento.set(chave, carregamento);
  return carregamento;
}

async function chamarSemResposta<T>(nome: string, payload: T): Promise<void> {
  const fn = httpsCallable<T, Record<string, never>>(functions, nome);
  await fn(payload);
}

export async function cadastrarResumoReagente(payload: CadastroResumoReagenteInput): Promise<void> {
  await chamarSemResposta("cadastrarResumoReagente", payload);
  invalidarCacheCatalogos();
}

export async function cadastrarSubstanciaQuimica(payload: CadastroSubstanciaInput): Promise<void> {
  await chamarSemResposta("cadastrarSubstanciaQuimica", payload);
  invalidarCacheCatalogos();
}

export async function cadastrarEspecificacao(payload: CadastroEspecificacaoInput): Promise<void> {
  await chamarSemResposta("cadastrarEspecificacao", payload);
  invalidarCacheCatalogos();
}

export async function cadastrarLote(payload: CadastroLoteInput): Promise<void> {
  await chamarSemResposta("cadastrarLote", payload);
  invalidarCacheEstoqueFrontend();
}

export async function cadastrarFrascoFechado(payload: CadastroFrascoFechadoInput): Promise<CadastroFrascoResult> {
  const fn = httpsCallable<CadastroFrascoFechadoInput, CadastroFrascoResult>(functions, "cadastrarFrascoFechado");
  const resultado = (await fn(payload)).data;
  invalidarCacheEstoqueFrontend();
  return resultado;
}

export async function cadastrarFrascoAberto(payload: CadastroFrascoAbertoInput): Promise<CadastroFrascoResult> {
  const fn = httpsCallable<CadastroFrascoAbertoInput, CadastroFrascoResult>(functions, "cadastrarFrascoAberto");
  const resultado = (await fn(payload)).data;
  invalidarCacheEstoqueFrontend();
  return resultado;
}

export async function registrarRetirada(payload: RegistrarRetiradaInput): Promise<void> {
  await chamarSemResposta("registrarRetirada", payload);
  invalidarCacheEstoqueFrontend();
}

export async function registrarDevolucao(payload: RegistrarDevolucaoInput): Promise<void> {
  await chamarSemResposta("registrarDevolucao", payload);
  invalidarCacheEstoqueFrontend();
}

export async function configurarLimiarEscassez(payload: ConfigurarEscassezInput): Promise<void> {
  await chamarSemResposta("configurarLimiarEscassez", payload);
}

export async function descartarFrasco(payload: AcaoFrascoInput): Promise<void> {
  await chamarSemResposta("descartarFrasco", payload);
  invalidarCacheEstoqueFrontend();
}

export async function registrarExtravioOuReencontro(payload: RegistrarExtravioOuReencontroInput): Promise<void> {
  await chamarSemResposta("registrarExtravioOuReencontro", payload);
  invalidarCacheEstoqueFrontend();
}

export async function colocarFrascoEmQuarentena(payload: AcaoFrascoInput): Promise<void> {
  await chamarSemResposta("colocarFrascoEmQuarentena", payload);
  invalidarCacheEstoqueFrontend();
}

export async function resolverQuarentenaFrasco(payload: ResolverQuarentenaInput): Promise<void> {
  await chamarSemResposta("resolverQuarentenaFrasco", payload);
  invalidarCacheEstoqueFrontend();
}

export async function repetirPesagemDevolucaoAnomala(payload: RepetirPesagemInput): Promise<void> {
  await chamarSemResposta("repetirPesagemDevolucaoAnomala", payload);
  invalidarCacheEstoqueFrontend();
}

export async function confirmarEsgotamentoAposInspecao(payload: ConfirmarEsgotamentoInput): Promise<void> {
  await chamarSemResposta("confirmarEsgotamentoAposInspecao", payload);
  invalidarCacheEstoqueFrontend();
}

export async function recalibrarTaraFrascoEsgotado(payload: RecalibrarTaraInput): Promise<void> {
  await chamarSemResposta("recalibrarTaraFrascoEsgotado", payload);
  invalidarCacheEstoqueFrontend();
}

export async function registrarPesagemRotina(payload: RegistrarPesagemRotinaInput): Promise<void> {
  await chamarSemResposta("registrarPesagemRotina", payload);
  invalidarCacheEstoqueFrontend();
}

export async function buscarLotesDaEspecificacao(idEspecificacao: string): Promise<LoteCatalogo[]> {
  const chave = `${chaveSessao()}:${idEspecificacao}`;
  const cacheado = lotesCache.get(chave);
  if (cacheado && cacheado.expiraEmMs > Date.now()) return cacheado.data;
  const emCarregamento = lotesEmCarregamento.get(chave);
  if (emCarregamento) return emCarregamento;
  const carregamento = getDocs(query(collection(db, "Lote"), where("id_especificacao_reagente", "==", idEspecificacao)))
    .then((snap) => {
      const data = snap.docs.map((item) => ({ id: item.id, ...item.data() } as LoteCatalogo));
      lotesCache.set(chave, { data, expiraEmMs: Date.now() + DURACAO_CACHE_LOOKUP_MS });
      return data;
    }).finally(() => {
      if (lotesEmCarregamento.get(chave) === carregamento) lotesEmCarregamento.delete(chave);
    });
  lotesEmCarregamento.set(chave, carregamento);
  return carregamento;
}

export async function buscarFrascosDaEspecificacaoSemLote(idEspecificacao: string): Promise<FrascoOperacional[]> {
  const chave = `${chaveSessao()}:${idEspecificacao}`;
  const cacheado = frascosSemLoteCache.get(chave);
  if (cacheado && cacheado.expiraEmMs > Date.now()) return cacheado.data;
  const emCarregamento = frascosSemLoteEmCarregamento.get(chave);
  if (emCarregamento) return emCarregamento;
  const carregamento = getDocs(query(
    collection(db, "Frasco_Reagente"),
    where("id_especificacao_reagente", "==", idEspecificacao),
    where("id_lote", "==", null),
  )).then((snap) => {
    const data = snap.docs.map((item) => normalizarFrascoOperacional(item.id, item.data())).filter((item): item is FrascoOperacional => item !== null);
    frascosSemLoteCache.set(chave, { data, expiraEmMs: Date.now() + DURACAO_CACHE_LOOKUP_MS });
    return data;
  }).finally(() => {
    if (frascosSemLoteEmCarregamento.get(chave) === carregamento) frascosSemLoteEmCarregamento.delete(chave);
  });
  frascosSemLoteEmCarregamento.set(chave, carregamento);
  return carregamento;
}

export async function buscarFrascosDoLote(idLote: string): Promise<FrascoOperacional[]> {
  const chave = `${chaveSessao()}:${idLote}`;
  const cacheado = frascosDoLoteCache.get(chave);
  if (cacheado && cacheado.expiraEmMs > Date.now()) return cacheado.data;
  const emCarregamento = frascosDoLoteEmCarregamento.get(chave);
  if (emCarregamento) return emCarregamento;
  const carregamento = getDocs(query(collection(db, "Frasco_Reagente"), where("id_lote", "==", idLote))).then((snap) => {
    const data = snap.docs.map((item) => normalizarFrascoOperacional(item.id, item.data())).filter((item): item is FrascoOperacional => item !== null);
    frascosDoLoteCache.set(chave, { data, expiraEmMs: Date.now() + DURACAO_CACHE_LOOKUP_MS });
    return data;
  }).finally(() => {
    if (frascosDoLoteEmCarregamento.get(chave) === carregamento) frascosDoLoteEmCarregamento.delete(chave);
  });
  frascosDoLoteEmCarregamento.set(chave, carregamento);
  return carregamento;
}

export async function buscarFrascoPorCodigo(codigo: string): Promise<FrascoCatalogo | null> {
  const chave = `${chaveSessao()}:${codigo.trim().toUpperCase()}`;
  const cacheado = frascoPorCodigoCache.get(chave);
  if (cacheado && cacheado.expiraEmMs > Date.now()) return cacheado.data;
  const emCarregamento = frascoPorCodigoEmCarregamento.get(chave);
  if (emCarregamento) return emCarregamento;
  const carregamento = getDocs(query(collection(db, "Frasco_Reagente"), where("codigo_frasco", "==", codigo))).then((snap) => {
    const item = snap.docs[0];
    const data = item ? ({ id: item.id, ...item.data() } as FrascoCatalogo) : null;
    frascoPorCodigoCache.set(chave, { data, expiraEmMs: Date.now() + DURACAO_CACHE_LOOKUP_MS });
    return data;
  }).finally(() => {
    if (frascoPorCodigoEmCarregamento.get(chave) === carregamento) frascoPorCodigoEmCarregamento.delete(chave);
  });
  frascoPorCodigoEmCarregamento.set(chave, carregamento);
  return carregamento;
}

export async function gerarRelatorioAlmoxarifado(payload: RelatorioReagentesMensalInput): Promise<string> {
  const fn = httpsCallable<RelatorioReagentesMensalInput, { base64: string }>(functions, "gerarRelatorioAlmoxarifado");
  return (await fn(payload)).data.base64;
}

export async function gerarRelatorioPersonalizado(payload: RelatorioReagentesPersonalizadoInput): Promise<string> {
  const fn = httpsCallable<RelatorioReagentesPersonalizadoInput, { base64: string }>(functions, "gerarRelatorioPersonalizado");
  return (await fn(payload)).data.base64;
}

export async function gerarPdfEtiquetasVirgens(payload: GerarEtiquetasVirgensInput): Promise<string> {
  const fn = httpsCallable<GerarEtiquetasVirgensInput, { base64: string }>(functions, "gerarPdfEtiquetasVirgens");
  return (await fn(payload)).data.base64;
}

export async function gerarPdfReimpressaoFrascos(payload: GerarReimpressaoFrascosInput): Promise<string> {
  const fn = httpsCallable<GerarReimpressaoFrascosInput, { base64: string }>(functions, "gerarPdfReimpressaoFrascos");
  return (await fn(payload)).data.base64;
}

/**
 * Obtém o snapshot de estoque atual do almoxarifado (UI-19 / M8).
 * Encapsula o tratamento de rate-limit (resource-exhausted).
 */
export async function obterEstoqueAtual(
  params: ObterEstoqueParams,
  opcoes: { ignorarCache?: boolean } = {},
): Promise<ObterEstoqueResult> {
  if (!opcoes.ignorarCache) {
    const agora = Date.now();
    const item = estoqueCache.find((candidato) => mesmaChaveEstoque(candidato.params, params));
    if (item && item.expiraEmMs > agora) {
      return {
        ok: true,
        data: {
          ...item.data,
          idadeMs: Math.max(0, agora - (item.data.calculadoEm?.getTime() ?? agora)),
        },
      };
    }
    estoqueCache = estoqueCache.filter((candidato) => candidato.expiraEmMs > agora);
  }
  try {
    const fn = httpsCallable<ObterEstoqueParams, ObterEstoqueResponse>(
      functions,
      "obterEstoqueAtual"
    );
    const res = await fn(params);
    const data = res.data;
    const calculadoEm = typeof data.calculado_em_ms === "number"
      ? new Date(data.calculado_em_ms)
      : new Date();
    const expiraEm = typeof data.expira_em_ms === "number"
      ? new Date(data.expira_em_ms)
      : new Date(calculadoEm.getTime() + 30_000);
    const resultado: EstoqueSnapshot = {
      qtd_aptos: data.qtd_aptos ?? 0,
      qtd_total: data.qtd_total ?? 0,
      qtd_emprestados: data.qtd_emprestados ?? 0,
      qtd_saldo_desconhecido: data.qtd_saldo_desconhecido ?? 0,
      massa_aferida_g: data.massa_aferida_g ?? null,
      volume_aferido_ml: data.volume_aferido_ml ?? null,
      idadeMs: data.idadeMs,
      fonte: data.fonte === "CACHE" ? "cache" : "recalculado",
      calculadoEm,
      expiraEm,
    };
    estoqueCache = [
      ...estoqueCache.filter((item) => !mesmaChaveEstoque(item.params, params)),
      { params, data: resultado, expiraEmMs: expiraEm.getTime() },
    ];
    return {
      ok: true,
      data: resultado,
    };
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string };
    const isRateLimit =
      errObj?.code === "resource-exhausted" ||
      Boolean(errObj?.message?.includes("Rate limit"));
    return {
      ok: false,
      rateLimit: isRateLimit,
      // UI-19: o limite protege a consulta do estoque contra abuso.
      message: isRateLimit
        ? "Você atingiu o limite de consultas por minuto. Aguarde um instante e tente novamente."
        : (errObj?.message ?? "Não foi possível calcular o estoque atual."),
    };
  }
}

/**
 * Busca o id do almoxarifado vinculado a um gestor via Firestore.
 */
export async function buscarAlmoxarifadoDoGestor(
  uidGestor: string
): Promise<string | undefined> {
  const chave = `${auth.currentUser?.uid ?? "anonymous"}:${uidGestor}`;
  const cacheado = almoxarifadoDoGestorCache.get(chave);
  if (cacheado && cacheado.expiraEmMs > Date.now()) return cacheado.idAlmoxarifado;
  const emCarregamento = almoxarifadoDoGestorEmCarregamento.get(chave);
  if (emCarregamento) return emCarregamento;
  const q = query(
    collection(db, "Gestor_Almoxarifado_x_Almoxarifado"),
    where("id_gestor_almoxarifado", "==", uidGestor),
    limit(1)
  );
  const carregamento = getDocs(q).then((snap) => {
    const idAlmoxarifado = snap.docs[0]?.data().id_almoxarifado as string | undefined;
    almoxarifadoDoGestorCache.set(chave, { idAlmoxarifado, expiraEmMs: Date.now() + DURACAO_CACHE_LOOKUP_MS });
    return idAlmoxarifado;
  }).finally(() => {
    if (almoxarifadoDoGestorEmCarregamento.get(chave) === carregamento) almoxarifadoDoGestorEmCarregamento.delete(chave);
  });
  almoxarifadoDoGestorEmCarregamento.set(chave, carregamento);
  return carregamento;
}

/**
 * Carrega as três visões operacionais do gestor no escopo do almoxarifado
 * vinculado. As coleções server-owned são somente leitura no cliente; as
 * mutações continuam exclusivamente nos callables normativos.
 */
export async function obterPainelOperacional(
  idAlmoxarifado: string,
  opcoes: { ignorarCache?: boolean } = {},
): Promise<PainelOperacionalData> {
  const chaveCache = `${auth.currentUser?.uid ?? "anonymous"}:${idAlmoxarifado}`;
  const agora = Date.now();
  const cacheado = painelOperacionalCache.get(chaveCache);
  if (!opcoes.ignorarCache && cacheado && cacheado.expiraEmMs > agora) return cacheado.data;
  if (!opcoes.ignorarCache) {
    const carregamento = painelOperacionalEmCarregamento.get(chaveCache);
    if (carregamento) return carregamento;
  }

  const carregar = async (): Promise<PainelOperacionalData> => {
  const historicoQuery = query(
    collection(db, "Historico_Frasco_Reagente"),
    where("id_almoxarifado", "==", idAlmoxarifado),
    limit(100),
  );
  const frascosQuery = query(
    collection(db, "Frasco_Reagente"),
    where("id_almoxarifado", "==", idAlmoxarifado),
    limit(200),
  );
  const [historico, frascos] = await Promise.all([
    getDocs(historicoQuery),
    getDocs(frascosQuery),
  ]);

  const timestampMillis = (value: HistoricoOperacional["timestamp"]): number => {
    if (value && typeof (value as { toMillis?: () => number }).toMillis === "function") {
      return (value as { toMillis: () => number }).toMillis();
    }
    if (value instanceof Date) return value.getTime();
    return 0;
  };

  const movimentacoes = historico.docs
    .map((doc) => {
      const data = registro(doc.data());
      const tipo = texto(data?.tipo);
      return tipo ? { id: doc.id, ...data, tipo } as HistoricoOperacional : null;
    })
    .filter((item): item is HistoricoOperacional => item !== null)
    .sort((a, b) => timestampMillis(b.timestamp) - timestampMillis(a.timestamp));

  const quarentena = frascos.docs
    .map((doc) => normalizarFrascoOperacional(doc.id, doc.data()))
    .filter((frasco): frasco is FrascoOperacional => frasco?.em_quarentena === true);

  return { movimentacoes, quarentena, alertas: [] };
  };

  const promessa = carregar().then((data) => {
    painelOperacionalCache.set(chaveCache, { data, expiraEmMs: Date.now() + 10_000 });
    return data;
  }).finally(() => {
    painelOperacionalEmCarregamento.delete(chaveCache);
  });
  painelOperacionalEmCarregamento.set(chaveCache, promessa);
  return promessa;
}

interface PainelOperacionalCacheItem {
  data: PainelOperacionalData;
  expiraEmMs: number;
}

const painelOperacionalCache = new Map<string, PainelOperacionalCacheItem>();
const painelOperacionalEmCarregamento = new Map<string, Promise<PainelOperacionalData>>();

export function invalidarCachePainelOperacional(): void {
  painelOperacionalCache.clear();
}

const TIPOS_ALERTA_OPERACIONAL = new Set([
  "DATA_DEVOLUCAO_REAGENTE",
  "ENTREGA_ATRASADA",
  "ESCASSEZ_ESTOQUE",
  "FRASCOS_A_SEREM_PESADOS",
  "FRASCOS_EM_QUARENTENA",
  "FRASCOS_VENCIDOS",
  "FRASCOS_VAZIOS",
  "FRASCOS_QUEBRADOS",
  "AUTO_ATENDIMENTO_RETIRADA",
]);

/** Projeta a caixa já assinada pelo contexto para a visão operacional. */
export function alertasOperacionaisDeNotificacoes(notificacoes: NotificacaoItem[]): AlertaOperacional[] {
  const timestampMillis = (value: HistoricoOperacional["timestamp"]): number => {
    if (value && typeof (value as { toMillis?: () => number }).toMillis === "function") {
      return (value as { toMillis: () => number }).toMillis();
    }
    if (value instanceof Date) return value.getTime();
    return 0;
  };
  return notificacoes
    .map((item) => normalizarAlertaOperacional(item.id, item))
    .filter((alerta): alerta is AlertaOperacional => alerta !== null)
    .filter((alerta) => TIPOS_ALERTA_OPERACIONAL.has(alerta.tipo))
    .sort((a, b) => timestampMillis(b.emitida_em) - timestampMillis(a.emitida_em));
}

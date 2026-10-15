import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/config";
import type { AlmoxarifadoItem, GestorAlmoxarifado, MateriaItem } from "@/types/cadastros";
import type {
  BuscarGestoresAlmoxarifadoResponse,
  GerenciarAlmoxarifadoInput,
  GerenciarLocalInput,
  GerenciarLocalResponse,
  GerenciarMateriaInput,
  VínculoGestorAlmoxarifado,
} from "@/types/cadastrosApi";

const CACHE_TTL_MS = 30_000;
interface CacheItem<T> { data: T; expiraEmMs: number; }
let gestoresCache: CacheItem<GestorAlmoxarifado[]> | null = null;
let gestoresEmCarregamento: Promise<GestorAlmoxarifado[]> | null = null;
let almoxarifadosCache: CacheItem<AlmoxarifadoItem[]> | null = null;
let almoxarifadosEmCarregamento: Promise<AlmoxarifadoItem[]> | null = null;
let materiasCache: CacheItem<MateriaItem[]> | null = null;
let materiasEmCarregamento: Promise<MateriaItem[]> | null = null;
const vinculosCache = new Map<string, CacheItem<string[]>>();
const vinculosEmCarregamento = new Map<string, Promise<string[]>>();
const almoxarifadosDoGestorCache = new Map<string, CacheItem<string[]>>();
const almoxarifadosDoGestorEmCarregamento = new Map<string, Promise<string[]>>();
const almoxarifadosPorIdsCache = new Map<string, CacheItem<AlmoxarifadoItem[]>>();

export function invalidarCacheCadastros(): void {
  gestoresCache = null;
  almoxarifadosCache = null;
  materiasCache = null;
  vinculosCache.clear();
  almoxarifadosDoGestorCache.clear();
  almoxarifadosDoGestorEmCarregamento.clear();
  almoxarifadosPorIdsCache.clear();
}

export async function gerenciarMateria(payload: GerenciarMateriaInput): Promise<void> {
  const fn = httpsCallable<GerenciarMateriaInput, Record<string, never>>(functions, "gerenciarMateria");
  await fn(payload);
  invalidarCacheCadastros();
}

export async function gerenciarLocal(payload: GerenciarLocalInput): Promise<GerenciarLocalResponse> {
  const fn = httpsCallable<GerenciarLocalInput, GerenciarLocalResponse>(functions, "gerenciarLocal");
  const resultado = (await fn(payload)).data;
  invalidarCacheCadastros();
  return resultado;
}

export async function buscarGestoresAlmoxarifado(): Promise<GestorAlmoxarifado[]> {
  if (gestoresCache && gestoresCache.expiraEmMs > Date.now()) return gestoresCache.data;
  if (gestoresEmCarregamento) return gestoresEmCarregamento;
  const fn = httpsCallable<Record<string, never>, BuscarGestoresAlmoxarifadoResponse>(functions, "buscarGestoresAlmoxarifado");
  gestoresEmCarregamento = fn({}).then((res) => {
    gestoresCache = { data: res.data.gestores, expiraEmMs: Date.now() + CACHE_TTL_MS };
    return res.data.gestores;
  }).finally(() => { gestoresEmCarregamento = null; });
  return gestoresEmCarregamento;
}

export async function listarAlmoxarifados(): Promise<AlmoxarifadoItem[]> {
  if (almoxarifadosCache && almoxarifadosCache.expiraEmMs > Date.now()) return almoxarifadosCache.data;
  if (almoxarifadosEmCarregamento) return almoxarifadosEmCarregamento;
  almoxarifadosEmCarregamento = getDocs(collection(db, "Almoxarifado")).then((snap) => {
    const data = snap.docs.map((item) => ({ id: item.id, ...item.data() } as AlmoxarifadoItem));
    almoxarifadosCache = { data, expiraEmMs: Date.now() + CACHE_TTL_MS };
    return data;
  }).finally(() => { almoxarifadosEmCarregamento = null; });
  return almoxarifadosEmCarregamento;
}

export async function listarAlmoxarifadosPorIds(ids: string[]): Promise<AlmoxarifadoItem[]> {
  const chave = [...new Set(ids)].sort().join(",");
  const cacheado = almoxarifadosPorIdsCache.get(chave);
  if (cacheado && cacheado.expiraEmMs > Date.now()) return cacheado.data;
  const resultados: AlmoxarifadoItem[] = [];
  for (let inicio = 0; inicio < ids.length; inicio += 30) {
    const lote = ids.slice(inicio, inicio + 30);
    if (lote.length === 0) continue;
    const snap = await getDocs(query(collection(db, "Almoxarifado"), where(documentId(), "in", lote)));
    resultados.push(...snap.docs.map((item) => ({ id: item.id, ...item.data() } as AlmoxarifadoItem)));
  }
  almoxarifadosPorIdsCache.set(chave, { data: resultados, expiraEmMs: Date.now() + CACHE_TTL_MS });
  return resultados;
}

export async function buscarVinculosGestoresAlmoxarifado(idAlmoxarifado: string): Promise<string[]> {
  const cacheado = vinculosCache.get(idAlmoxarifado);
  if (cacheado && cacheado.expiraEmMs > Date.now()) return cacheado.data;
  const carregamentoExistente = vinculosEmCarregamento.get(idAlmoxarifado);
  if (carregamentoExistente) return carregamentoExistente;
  const carregamento = getDocs(query(
    collection(db, "Gestor_Almoxarifado_x_Almoxarifado"),
    where("id_almoxarifado", "==", idAlmoxarifado),
  )).then((snap) => {
    const data = snap.docs
      .map((item) => (item.data() as Partial<VínculoGestorAlmoxarifado>).id_gestor_almoxarifado)
      .filter((id): id is string => typeof id === "string");
    vinculosCache.set(idAlmoxarifado, { data, expiraEmMs: Date.now() + CACHE_TTL_MS });
    return data;
  }).finally(() => { vinculosEmCarregamento.delete(idAlmoxarifado); });
  vinculosEmCarregamento.set(idAlmoxarifado, carregamento);
  return carregamento;
}

export async function buscarAlmoxarifadosDoGestor(uidGestor: string): Promise<string[]> {
  const cacheado = almoxarifadosDoGestorCache.get(uidGestor);
  if (cacheado && cacheado.expiraEmMs > Date.now()) return cacheado.data;
  const carregamentoExistente = almoxarifadosDoGestorEmCarregamento.get(uidGestor);
  if (carregamentoExistente) return carregamentoExistente;
  const carregamento = getDocs(query(
    collection(db, "Gestor_Almoxarifado_x_Almoxarifado"),
    where("id_gestor_almoxarifado", "==", uidGestor),
  )).then((snap) => {
    const data = snap.docs
      .map((item) => (item.data() as Partial<VínculoGestorAlmoxarifado>).id_almoxarifado)
      .filter((id): id is string => typeof id === "string");
    almoxarifadosDoGestorCache.set(uidGestor, { data, expiraEmMs: Date.now() + CACHE_TTL_MS });
    return data;
  }).finally(() => { almoxarifadosDoGestorEmCarregamento.delete(uidGestor); });
  almoxarifadosDoGestorEmCarregamento.set(uidGestor, carregamento);
  return carregamento;
}

export async function gerenciarAlmoxarifado(payload: GerenciarAlmoxarifadoInput): Promise<void> {
  const fn = httpsCallable<GerenciarAlmoxarifadoInput, Record<string, never>>(functions, "gerenciarAlmoxarifado");
  await fn(payload);
  invalidarCacheCadastros();
}

export async function listarMaterias(): Promise<MateriaItem[]> {
  if (materiasCache && materiasCache.expiraEmMs > Date.now()) return materiasCache.data;
  if (materiasEmCarregamento) return materiasEmCarregamento;
  materiasEmCarregamento = getDocs(collection(db, "Materia")).then((snap) => {
    const data = snap.docs.map((item) => ({ id: item.id, ...item.data() } as MateriaItem));
    materiasCache = { data, expiraEmMs: Date.now() + CACHE_TTL_MS };
    return data;
  }).finally(() => { materiasEmCarregamento = null; });
  return materiasEmCarregamento;
}

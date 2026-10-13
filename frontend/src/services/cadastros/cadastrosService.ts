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

export async function gerenciarMateria(payload: GerenciarMateriaInput): Promise<void> {
  const fn = httpsCallable<GerenciarMateriaInput, Record<string, never>>(functions, "gerenciarMateria");
  await fn(payload);
}

export async function gerenciarLocal(payload: GerenciarLocalInput): Promise<GerenciarLocalResponse> {
  const fn = httpsCallable<GerenciarLocalInput, GerenciarLocalResponse>(functions, "gerenciarLocal");
  return (await fn(payload)).data;
}

export async function buscarGestoresAlmoxarifado(): Promise<GestorAlmoxarifado[]> {
  const fn = httpsCallable<Record<string, never>, BuscarGestoresAlmoxarifadoResponse>(functions, "buscarGestoresAlmoxarifado");
  return (await fn({})).data.gestores;
}

export async function listarAlmoxarifados(): Promise<AlmoxarifadoItem[]> {
  const snap = await getDocs(collection(db, "Almoxarifado"));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as AlmoxarifadoItem));
}

export async function listarAlmoxarifadosPorIds(ids: string[]): Promise<AlmoxarifadoItem[]> {
  const resultados: AlmoxarifadoItem[] = [];
  for (let inicio = 0; inicio < ids.length; inicio += 30) {
    const lote = ids.slice(inicio, inicio + 30);
    if (lote.length === 0) continue;
    const snap = await getDocs(query(collection(db, "Almoxarifado"), where(documentId(), "in", lote)));
    resultados.push(...snap.docs.map((item) => ({ id: item.id, ...item.data() } as AlmoxarifadoItem)));
  }
  return resultados;
}

export async function buscarVinculosGestoresAlmoxarifado(idAlmoxarifado: string): Promise<string[]> {
  const snap = await getDocs(query(
    collection(db, "Gestor_Almoxarifado_x_Almoxarifado"),
    where("id_almoxarifado", "==", idAlmoxarifado),
  ));
  return snap.docs
    .map((item) => (item.data() as Partial<VínculoGestorAlmoxarifado>).id_gestor_almoxarifado)
    .filter((id): id is string => typeof id === "string");
}

export async function buscarAlmoxarifadosDoGestor(uidGestor: string): Promise<string[]> {
  const snap = await getDocs(query(
    collection(db, "Gestor_Almoxarifado_x_Almoxarifado"),
    where("id_gestor_almoxarifado", "==", uidGestor),
  ));
  return snap.docs
    .map((item) => (item.data() as Partial<VínculoGestorAlmoxarifado>).id_almoxarifado)
    .filter((id): id is string => typeof id === "string");
}

export async function gerenciarAlmoxarifado(payload: GerenciarAlmoxarifadoInput): Promise<void> {
  const fn = httpsCallable<GerenciarAlmoxarifadoInput, Record<string, never>>(functions, "gerenciarAlmoxarifado");
  await fn(payload);
}

export async function listarMaterias(): Promise<MateriaItem[]> {
  const snap = await getDocs(collection(db, "Materia"));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as MateriaItem));
}

"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/config";
import { obterIntencaoPersistida, limparIntencao, chaveIntencaoAlmoxarifado, assinaturaIntencaoAlmoxarifado, type AcaoAlmoxarifado } from "@/lib/intencaoOperacao";

export interface AlmoxarifadoItem { id: string; id_local: string; nome: string; descricao: string; ativo: boolean; qtd_gestores_ativos: number; }
interface Props { onNovo: () => void; onEditar: (item: AlmoxarifadoItem) => void; onGerenciar: (item: AlmoxarifadoItem) => void; }

export function ListaAlmoxarifados({ onNovo, onEditar, onGerenciar }: Props) {
  const [items, setItems] = useState<AlmoxarifadoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => onSnapshot(query(collection(db, "Almoxarifado"), orderBy("nome")), s => {
    setItems(s.docs.map(d => ({ id: d.id, ...d.data() } as AlmoxarifadoItem))); setLoading(false);
  }, e => { setError(e.message); setLoading(false); }), []);
  async function alterar(item: AlmoxarifadoItem, acao: AcaoAlmoxarifado) {
    const campos = { acao, idAlmoxarifado: item.id } as const;
    const chave = chaveIntencaoAlmoxarifado(acao, item.id);
    const intencao = obterIntencaoPersistida(sessionStorage, chave, assinaturaIntencaoAlmoxarifado(campos), () => crypto.randomUUID());
    try { await httpsCallable(functions, "gerenciarAlmoxarifado")({ ...campos, idOperacao: intencao.idOperacao }); limparIntencao(sessionStorage, chave); } catch (e) { setError((e as { message?: string }).message ?? "Não foi possível alterar o status."); }
  }
  return <section data-testid="almox-lista-almoxarifados" className="space-y-3">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Almoxarifados</h2><button data-testid="almox-btn-novo-almoxarifado" onClick={onNovo} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">Novo Almoxarifado</button></div>
    {loading && <p>Carregando almoxarifados...</p>}{error && <p role="alert" className="text-red-500">{error}</p>}{!loading && !error && items.length === 0 && <p>Nenhum almoxarifado cadastrado.</p>}
    {items.map((item, indice) => <article key={`almox-lista-${indice}-${item.id}`} data-testid={`almox-item-${item.id}`} className="rounded-xl border border-foreground/10 p-4 flex flex-wrap gap-3 justify-between"><div><h3 className="font-bold">{item.nome}</h3><p className="text-sm text-foreground/60">{item.descricao}</p><span className="text-xs">{item.ativo ? "Ativo" : "Inativo"} · {item.qtd_gestores_ativos} gestor(es)</span></div><div className="flex gap-2"><button data-testid={`almox-btn-editar-${item.id}`} onClick={() => onEditar(item)}>Editar</button><button data-testid={`almox-btn-gerenciar-${item.id}`} onClick={() => onGerenciar(item)}>Gerenciar Gestores</button>{item.ativo ? <button data-testid={`almox-btn-desativar-${item.id}`} onClick={() => alterar(item, "DESATIVAR")}>Desativar</button> : <button data-testid={`almox-btn-ativar-${item.id}`} disabled={item.qtd_gestores_ativos < 1} onClick={() => alterar(item, "ATIVAR")}>Ativar</button>}</div></article>)}
  </section>;
}

"use client";

import React, { useState } from "react";
import { buscarLocaisParaRetirada } from "@/services/reagentes/reagentesService";
import type { LocalRetirada } from "@/types/reagentesApi";

interface SeletorLocalReagenteProps {
  value: string;
  local: LocalRetirada | null;
  onAbrir: () => void;
}

interface ModalBuscaLocalReagenteProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (local: LocalRetirada | null) => void;
}

export function SeletorLocalReagente({ value, local, onAbrir }: SeletorLocalReagenteProps) {
  return (
    <div className="rounded-lg border border-foreground/10 p-3">
      <span className="block px-1 text-sm font-medium">Local de uso</span>
      <button type="button" onClick={onAbrir} data-testid="retirada-abrir-local" aria-label="Selecionar local de uso" className="mt-2 w-full rounded-lg border border-primary/30 bg-background px-3 py-2 text-left text-sm hover:border-primary focus:ring-2 focus:ring-primary">
        {local && value ? <><span className="font-medium">{local.predio}</span><span className="ml-2 text-foreground/70">andar {local.andar}, sala {local.sala}</span></> : <span className="text-foreground/60">Pesquisar local de uso…</span>}
      </button>
      <p className="mt-1 text-xs text-foreground/50">Selecione prédio, andar e sala cadastrados.</p>
    </div>
  );
}

export function ModalBuscaLocalReagente({ isOpen, onClose, value, onChange }: ModalBuscaLocalReagenteProps) {
  const [predio, setPredio] = useState("");
  const [andar, setAndar] = useState("");
  const [sala, setSala] = useState("");
  const [resultados, setResultados] = useState<LocalRetirada[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const buscar = async () => {
    if (!predio.trim() && !andar.trim() && !sala.trim()) {
      setError("Informe prédio, andar ou sala para pesquisar.");
      setResultados([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResultados(await buscarLocaisParaRetirada({ predio: predio.trim() || undefined, andar: andar.trim() || undefined, sala: sala.trim() || undefined }));
    } catch (err: unknown) {
      setResultados([]);
      setError(err instanceof Error ? err.message : "Não foi possível pesquisar os locais cadastrados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-testid="retirada-modal-local">
      <div className="glass-panel w-full max-w-lg overflow-hidden rounded-2xl border border-primary/20 p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-primary">Selecionar local de uso</h2><p className="text-xs text-foreground/60">Pesquise pelo prédio, andar ou sala e selecione um local existente.</p></div><button type="button" onClick={onClose} aria-label="Fechar pesquisa de local" className="rounded px-2 py-1 text-xl hover:bg-foreground/10">×</button></div>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_minmax(8rem,12rem)_auto]">
          <input aria-label="Prédio do local" value={predio} onChange={(e) => setPredio(e.target.value)} placeholder="Prédio" className="min-w-0 w-full rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2" />
          <input aria-label="Andar do local" value={andar} onChange={(e) => setAndar(e.target.value)} placeholder="Andar" className="min-w-0 w-full rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2" />
          <input aria-label="Sala do local" value={sala} onChange={(e) => setSala(e.target.value)} placeholder="Sala" className="min-w-0 w-full max-w-full rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2" />
          <button type="button" onClick={buscar} disabled={loading} data-testid="retirada-buscar-local" className="w-full whitespace-nowrap rounded-lg bg-foreground/10 px-3 py-2 text-sm">{loading ? "Buscando…" : "Buscar"}</button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500" role="alert">{error}</p>}
        {resultados.length > 0 && <div className="mt-4 max-h-72 space-y-1 overflow-y-auto" role="radiogroup" aria-label="Locais cadastrados">{resultados.map((local) => <button type="button" key={local.id} role="radio" aria-checked={value === local.id} data-testid={`retirada-local-${local.id}`} onClick={() => { onChange(local); onClose(); }} className={`block w-full rounded-md px-3 py-2 text-left text-sm ${value === local.id ? "bg-primary/20 ring-1 ring-primary" : "bg-foreground/5 hover:bg-foreground/10"}`}><span className="font-medium">{local.predio}</span><span className="ml-2 text-foreground/70">andar {local.andar}, sala {local.sala}</span></button>)}</div>}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { buscarUsuariosParaRetirada, type UsuarioRetirada } from "@/services/usuarios/usuariosService";

interface SeletorUsuarioReagenteProps {
  label: string;
  value: string;
  usuario: UsuarioRetirada | null;
  onAbrir: () => void;
  testIdPrefix: string;
}

interface ModalBuscaUsuarioReagenteProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  value: string;
  onChange: (usuario: UsuarioRetirada | null) => void;
  testIdPrefix: string;
}

/** UI-07: pesquisa autorizada por inicial; o UID nunca é digitado pelo operador. */
export function SeletorUsuarioReagente({ label, value, usuario, onAbrir, testIdPrefix }: SeletorUsuarioReagenteProps) {
  return (
    <div className="rounded-lg border border-foreground/10 p-3" data-testid={`${testIdPrefix}-seletor`}>
      <span className="block px-1 text-sm font-medium">{label}</span>
      <button type="button" onClick={onAbrir} data-testid={`${testIdPrefix}-abrir-seletor`} aria-label={`Selecionar ${label.toLowerCase()}`} className="mt-2 w-full rounded-lg border border-primary/30 bg-background px-3 py-2 text-left text-sm hover:border-primary focus:ring-2 focus:ring-primary">
        {usuario && value ? <><span className="font-medium">{usuario.nome}</span><span className="ml-2 text-xs text-foreground/60">{usuario.papeis.join(" / ")}</span></> : <span className="text-foreground/60">Pesquisar usuário autorizado…</span>}
      </button>
      <p className="mt-1 text-xs text-foreground/50">Professor ou Bolsista ativo.</p>
    </div>
  );
}

export function ModalBuscaUsuarioReagente({ isOpen, onClose, label, value, onChange, testIdPrefix }: ModalBuscaUsuarioReagenteProps) {
  const [letra, setLetra] = useState("");
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<UsuarioRetirada[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const buscar = async () => {
    const inicial = letra.trim().toUpperCase();
    if (!/^[A-Z]$/.test(inicial)) { setError("Informe uma letra inicial de A a Z."); setResultados([]); return; }
    setLoading(true); setError("");
    try { setResultados(await buscarUsuariosParaRetirada({ letra: inicial, termo: termo.trim() || undefined })); }
    catch (err: unknown) { setResultados([]); setError(err instanceof Error ? err.message : "Não foi possível pesquisar os usuários autorizados."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-testid={`${testIdPrefix}-modal-seletor`}>
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-primary/20 p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-primary">{label}</h2><p className="text-xs text-foreground/60">Pesquise por letra inicial e, opcionalmente, por parte do nome.</p></div><button type="button" onClick={onClose} aria-label="Fechar pesquisa de usuário" className="rounded px-2 py-1 text-xl hover:bg-foreground/10">×</button></div>
        <div className="grid grid-cols-[5rem_1fr_auto] gap-2">
          <input aria-label="Letra inicial do nome" data-testid={`${testIdPrefix}-letra`} maxLength={1} placeholder="A" value={letra} onChange={(e) => setLetra(e.target.value.toUpperCase())} className="w-full rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2" />
          <input aria-label="Nome do retirante" data-testid={`${testIdPrefix}-termo`} placeholder="Nome contém (opcional)" value={termo} onChange={(e) => setTermo(e.target.value)} className="w-full rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2" />
          <button type="button" onClick={buscar} disabled={loading} data-testid={`${testIdPrefix}-buscar`} className="rounded-lg bg-foreground/10 px-3 py-2 text-sm">{loading ? "Buscando…" : "Buscar"}</button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500" role="alert">{error}</p>}
        {resultados.length > 0 && <div className="mt-4 max-h-72 space-y-1 overflow-y-auto" role="radiogroup" aria-label={label}>{resultados.map((usuario) => <button type="button" key={usuario.id} role="radio" aria-checked={value === usuario.id} data-testid={`${testIdPrefix}-usuario-${usuario.id}`} onClick={() => { onChange(usuario); onClose(); }} className={`block w-full rounded-md px-3 py-2 text-left text-sm ${value === usuario.id ? "bg-orange-500/20 ring-1 ring-orange-500" : "bg-foreground/5 hover:bg-foreground/10"}`}><span className="font-medium">{usuario.nome}</span><span className="ml-2 text-xs text-foreground/60">{usuario.papeis.join(" / ")}</span></button>)}</div>}
      </div>
    </div>
  );
}

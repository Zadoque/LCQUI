"use client";

import React from "react";

export interface ReagentesFiltrosProps {
  abaAtiva: "catalogo" | "movimentacoes" | "alertas";
  onSelectAba: (aba: "catalogo" | "movimentacoes" | "alertas") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filtroEstado: string;
  onEstadoChange: (estado: string) => void;
  filtroNatureza: string;
  onNaturezaChange: (natureza: string) => void;
  filtroLetra: string;
  onLetraChange: (letra: string) => void;
  onLimparFiltros: () => void;
  mostrarOperacional?: boolean;
}

export function ReagentesFiltros({
  abaAtiva,
  onSelectAba,
  searchQuery,
  onSearchChange,
  filtroEstado,
  onEstadoChange,
  filtroNatureza,
  onNaturezaChange,
  filtroLetra,
  onLetraChange,
  onLimparFiltros,
  mostrarOperacional = false,
}: ReagentesFiltrosProps) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4 border border-foreground/10">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-foreground/10 pb-4">
        <div>
          <h2 className="text-lg font-bold">Catálogo de Reagentes</h2>
          <p className="text-xs text-foreground/60">
            Pesquise por nome ou use os filtros opcionais.
          </p>
        </div>

        {/* Seletor de Abas de Apoio à Navegação */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSelectAba("catalogo")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${abaAtiva === "catalogo" ? "bg-primary text-primary-foreground border-primary" : "bg-foreground/5 border-foreground/10"}`}
          >
            Catálogo
          </button>
          {mostrarOperacional && (
            <>
              <button
                type="button"
                onClick={() => onSelectAba("movimentacoes")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${abaAtiva === "movimentacoes" ? "bg-primary text-primary-foreground border-primary" : "bg-foreground/5 border-foreground/10"}`}
              >
                Movimentações
              </button>
              <button
                type="button"
                onClick={() => onSelectAba("alertas")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${abaAtiva === "alertas" ? "bg-primary text-primary-foreground border-primary" : "bg-foreground/5 border-foreground/10"}`}
              >
                Quarentena / Alertas
              </button>
            </>
          )}
        </div>
      </div>

      {/* Input de Pesquisa Local Imediata (UI-04) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Pesquisar reagente por nome ou tipo químico (começa no 1º caractere)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
          />
        </div>
        <button
          type="button"
          onClick={onLimparFiltros}
          className="px-4 py-2 rounded-xl bg-foreground/5 text-xs font-semibold hover:bg-foreground/10 border border-foreground/10"
        >
          Limpar Filtros
        </button>
      </div>

      {/* Filtros Opcionais de UX (UI-04) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold mb-1 text-foreground/70">Estado Físico (opcional)</label>
          <select aria-label="Estado Físico" className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-2 text-xs outline-none" value={filtroEstado} onChange={(e) => onEstadoChange(e.target.value)}>
            <option value="">Todos os estados</option>
            <option value="SOLIDO">Sólido</option>
            <option value="LIQUIDO">Líquido</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold mb-1 text-foreground/70">Natureza Química (opcional)</label>
          <select className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-2 text-xs outline-none" value={filtroNatureza} onChange={(e) => onNaturezaChange(e.target.value)}>
            <option value="">Todas as naturezas</option>
            <option value="ORGANICO">Orgânico</option>
            <option value="INORGANICO">Inorgânico</option>
            <option value="ELEMENTO">Elemento</option>
            <option value="HIBRIDO">Híbrido</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold mb-1 text-foreground/70">Letra Inicial (opcional)</label>
          <select className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-2 text-xs outline-none" value={filtroLetra} onChange={(e) => onLetraChange(e.target.value)}>
            <option value="">Todas as letras</option>
            {alphabet.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

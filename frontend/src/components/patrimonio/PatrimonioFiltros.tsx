import React from "react";

interface PatrimonioFiltrosProps {
  filtroPredio: string;
  onPredioChange: (v: string) => void;
  filtroAndar: string;
  onAndarChange: (v: string) => void;
  filtroSala: string;
  onSalaChange: (v: string) => void;
  filtroStatus: string;
  onStatusChange: (v: string) => void;
  filtroConservacao: string;
  onConservacaoChange: (v: string) => void;
  filtroLetraInicial: string;
  onLetraChange: (v: string) => void;
  searchError: string;
  onBuscar: () => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  hasSearched: boolean;
  bensCount: number;
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function PatrimonioFiltros({
  filtroPredio,
  onPredioChange,
  filtroAndar,
  onAndarChange,
  filtroSala,
  onSalaChange,
  filtroStatus,
  onStatusChange,
  filtroConservacao,
  onConservacaoChange,
  filtroLetraInicial,
  onLetraChange,
  searchError,
  onBuscar,
  searchQuery,
  onSearchQueryChange,
  hasSearched,
  bensCount,
}: PatrimonioFiltrosProps) {
  return (
    <div className="space-y-4">
      {/* Passo 1: Filtros de Banco de Dados (Seção 5.2) */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 border-2 border-primary/20 bg-primary/5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          Passo 1: Filtros de Banco de Dados (ao menos Prédio, Letra ou Status)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="w-full">
            <label className="block text-xs font-semibold mb-1 text-foreground/70">Prédio</label>
            <input
              type="text"
              placeholder="Ex: P5, CCT..."
              className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
              value={filtroPredio}
              onChange={(e) => onPredioChange(e.target.value)}
            />
          </div>

          <div className="w-full">
            <label className="block text-xs font-semibold mb-1 text-foreground/70">Andar</label>
            <input
              type="text"
              placeholder="Ex: Térreo, 1, 2..."
              className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
              value={filtroAndar}
              onChange={(e) => onAndarChange(e.target.value)}
            />
          </div>

          <div className="w-full">
            <label className="block text-xs font-semibold mb-1 text-foreground/70">Sala</label>
            <input
              type="text"
              placeholder="Ex: 101, Lab. Orgânica..."
              className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
              value={filtroSala}
              onChange={(e) => onSalaChange(e.target.value)}
            />
          </div>

          <div className="w-full">
            <label className="block text-xs font-semibold mb-1 text-foreground/70">Status</label>
            <select
              className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
              value={filtroStatus}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="">(Nenhum)</option>
              <option value="Ativo">Ativo</option>
              <option value="Inservivel">Inservível</option>
              <option value="Ja_dado_baixa">Já dado baixa</option>
            </select>
          </div>

          <div className="w-full">
            <label className="block text-xs font-semibold mb-1 text-foreground/70">Estado de Conservação</label>
            <select
              className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
              value={filtroConservacao}
              onChange={(e) => onConservacaoChange(e.target.value)}
            >
              <option value="">(Nenhum)</option>
              <option value="BOM">Bom</option>
              <option value="REGULAR">Regular</option>
              <option value="RUIM">Ruim</option>
            </select>
          </div>

          <div className="w-full">
            <label className="block text-xs font-semibold mb-1 text-foreground/70">Letra Inicial</label>
            <select
              className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
              value={filtroLetraInicial}
              onChange={(e) => onLetraChange(e.target.value)}
            >
              <option value="">(Nenhuma)</option>
              {alphabet.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {searchError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs mt-2">
            {searchError}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={onBuscar}
            className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 flex justify-center items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar no Banco
          </button>
        </div>
      </div>

      {/* Passo 2: Filtro local de substring (Seção 5.2) */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-foreground/5 p-4 rounded-xl border border-foreground/10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/60 flex items-center gap-2 whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Passo 2: Filtrar Resultados
        </h2>
        <div className="w-full sm:w-1/2">
          <input
            type="text"
            disabled={!hasSearched || bensCount === 0}
            placeholder={hasSearched ? "Nome do equipamento ou Nº de patrimônio..." : "Busque no banco primeiro..."}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}

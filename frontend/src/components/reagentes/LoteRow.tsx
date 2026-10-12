"use client";

import React, { useState } from "react";
import { buscarFrascosDoLote } from "@/services/reagentes/reagentesService";
import type { CatalogoEspecificacao, FrascoOperacional, ResumoReagente } from "@/types/reagentes";
import type { LoteCatalogo } from "@/types/reagentesApi";
import { FrascoCard } from "./FrascoCard";

export interface LoteRowProps {
  lote: LoteCatalogo;
  espec: CatalogoEspecificacao;
  reagente: ResumoReagente;
  onAction: (action: string, payload: { reagente: ResumoReagente; espec: CatalogoEspecificacao; lote?: LoteCatalogo } | FrascoOperacional) => void;
  readOnly?: boolean;
}

export function LoteRow({ lote, espec, reagente, onAction, readOnly }: LoteRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [frascos, setFrascos] = useState<FrascoOperacional[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!expanded) {
      setLoading(true);
      try {
        setFrascos(await buscarFrascosDoLote(lote.id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className="bg-foreground/5 rounded-lg border border-foreground/10 p-3">
      <div className="flex justify-between items-center cursor-pointer" onClick={toggleExpand}>
        <div className="flex items-center gap-2">
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-xs">Lote: {lote.numero_lote} (Forn: {lote.nome_fornecedor})</span>
        </div>
        {!readOnly && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction("novo_frasco", { reagente, espec, lote }); }}
            className="text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded border border-primary/20"
          >
            + Frasco
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-2 pl-5">
          {loading ? (
            <div className="text-xs text-foreground/50">Carregando frascos...</div>
          ) : frascos.length === 0 ? (
            <div className="text-xs text-foreground/50">Nenhum frasco neste lote.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {frascos.map(f => (
                <FrascoCard key={f.id} frasco={f} onAction={onAction} readOnly={readOnly} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

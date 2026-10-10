"use client";

import React, { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ResumoReagente } from "@/types/reagentes";
import { LoteRow } from "./LoteRow";
import { FrascoCard } from "./FrascoCard";

export interface EspecificacaoRowProps {
  espec: any;
  reagente: ResumoReagente;
  onAction: (action: string, payload: any) => void;
  readOnly?: boolean;
}

export function EspecificacaoRow({ espec, reagente, onAction, readOnly }: EspecificacaoRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [lotesEFrascos, setLotesEFrascos] = useState<{ lotes: any[]; frascosAvulsos: any[] }>({ lotes: [], frascosAvulsos: [] });
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!expanded) {
      setLoading(true);
      try {
        const lotesSnap = await getDocs(query(collection(db, "Lote"), where("id_especificacao_reagente", "==", espec.id)));
        const lotes = lotesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const frascosAvulsosSnap = await getDocs(query(collection(db, "Frasco_Reagente"), where("id_especificacao_reagente", "==", espec.id), where("id_lote", "==", null)));
        const frascosAvulsos = frascosAvulsosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setLotesEFrascos({ lotes, frascosAvulsos });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className="bg-background rounded-lg border border-foreground/10 p-3">
      <div className="flex justify-between items-center cursor-pointer" onClick={toggleExpand}>
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-sm">{espec.descricao} {espec.fabricante ? `(${espec.fabricante})` : ''}</span>
          <span className="text-xs text-foreground/50 border border-foreground/10 px-2 rounded">{espec.estado_fisico}</span>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onAction("novo_lote", { reagente, espec }); }}
              className="text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded border border-primary/20"
            >
              + Novo Lote
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAction("novo_frasco", { reagente, espec, lote: null }); }}
              className="text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded border border-primary/20"
            >
              + Frasco S/ Lote
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <div className="mt-3 pl-6 space-y-3">
          {loading ? (
            <div className="text-xs text-foreground/50">Carregando...</div>
          ) : (
            <>
              {lotesEFrascos.lotes.map(lote => (
                <LoteRow key={lote.id} lote={lote} espec={espec} reagente={reagente} onAction={onAction} readOnly={readOnly} />
              ))}
              {lotesEFrascos.frascosAvulsos.length > 0 && (
                <div className="p-3 bg-foreground/5 rounded-lg">
                  <h4 className="text-xs font-bold mb-2">Frascos Avulsos (Sem Lote)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {lotesEFrascos.frascosAvulsos.map(f => (
                      <FrascoCard key={f.id} frasco={f} onAction={onAction} readOnly={readOnly} />
                    ))}
                  </div>
                </div>
              )}
              {lotesEFrascos.lotes.length === 0 && lotesEFrascos.frascosAvulsos.length === 0 && (
                <div className="text-xs text-foreground/50">Nenhum lote ou frasco encontrado.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

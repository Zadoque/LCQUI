"use client";

import React, { useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ResumoReagente } from "@/types/reagentes";
import { EspecificacaoRow } from "./EspecificacaoRow";

export interface AccordionRowProps {
  reagente: ResumoReagente;
  onAction: (action: string, payload: any) => void;
  readOnly?: boolean;
}

export function AccordionRow({ reagente, onAction, readOnly }: AccordionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [especificacoes, setEspecificacoes] = useState<any[]>([]);
  const [loadingEspec, setLoadingEspec] = useState(false);

  const toggleExpand = async () => {
    if (!expanded) {
      setLoadingEspec(true);
      try {
        const snap = await getDocs(collection(db, "Resumo_Reagente", reagente.id, "Especificacoes"));
        setEspecificacoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingEspec(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <>
      <tr className="hover:bg-foreground/5 transition-colors cursor-pointer" onClick={toggleExpand}>
        <td className="px-6 py-4 font-semibold flex items-center gap-2">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          {reagente.nome}
        </td>
        <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-foreground/10 text-xs">{reagente.tipo_substancia || "N/A"}</span></td>
        <td className="px-6 py-4">{reagente.natureza_quimica}</td>
        <td className="px-6 py-4">
          <span className={`px-2 py-1 rounded text-xs ${reagente.estado_fisico === 'Líquido' ? 'bg-blue-500/20 text-blue-500' : 'bg-amber-500/20 text-amber-500'}`}>
            {reagente.estado_fisico || "N/A"}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          {!readOnly && (
            <button
              onClick={(e) => { e.stopPropagation(); onAction("nova_especificacao", reagente); }}
              className="text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1 rounded border border-primary/20 mr-2"
            >
              + Nova Especificação
            </button>
          )}
          <Link href={`/reagentes/${reagente.id}`}>
            <button className="text-primary hover:underline text-sm font-medium" onClick={(e) => e.stopPropagation()}>
              Detalhes
            </button>
          </Link>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0 bg-foreground/5">
            <div className="p-4 pl-12">
              {loadingEspec ? (
                <div className="text-sm text-foreground/50">Carregando especificações...</div>
              ) : especificacoes.length === 0 ? (
                <div className="text-sm text-foreground/50">Nenhuma especificação cadastrada.</div>
              ) : (
                <div className="space-y-4">
                  {especificacoes.map(espec => (
                    <EspecificacaoRow key={espec.id} espec={espec} reagente={reagente} onAction={onAction} readOnly={readOnly} />
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

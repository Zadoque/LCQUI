"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { ResumoReagente, CatalogoEspecificacao } from "@/types/reagentes";
import { EspecificacaoRow } from "./EspecificacaoRow";

export interface AccordionRowProps {
  reagente: ResumoReagente;
  onAction: (action: string, payload: unknown) => void;
  readOnly?: boolean;
}

export function AccordionRow({ reagente, onAction, readOnly }: AccordionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const especificacoes = Object.values(reagente.especificacoes ?? {});

  const toggleExpand = () => {
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
          <span className={`px-2 py-1 rounded text-xs ${reagente.estado_fisico === 'LIQUIDO' || reagente.estado_fisico === 'Líquido' ? 'bg-blue-500/20 text-blue-500' : 'bg-amber-500/20 text-amber-500'}`}>
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
              {especificacoes.length === 0 ? (
                <div className="text-sm text-foreground/50">Nenhuma especificação cadastrada.</div>
              ) : (
                <div className="space-y-4">
                  {especificacoes.map((espec: CatalogoEspecificacao) => (
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

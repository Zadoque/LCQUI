"use client";

import React from "react";

export interface FrascoCardProps {
  frasco: any;
  onAction?: (action: string, payload: any) => void;
  readOnly?: boolean;
}

export function FrascoCard({ frasco, onAction, readOnly }: FrascoCardProps) {
  return (
    <div className="bg-background rounded border border-foreground/10 p-2.5 text-xs flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start">
          <div className="font-bold">{frasco.codigo_frasco}</div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            frasco.estado_fisico_frasco === 'FECHADO' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
          }`}>
            {frasco.estado_fisico_frasco}
          </span>
        </div>
        <div className="text-foreground/60 text-[11px] mt-1">
          Peso: {frasco.peso_atual ?? "Desconhecido"} / {frasco.peso_no_cadastrado ?? "N/A"} g
        </div>
        <div className="flex gap-1 flex-wrap mt-1">
          {frasco.em_quarentena && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500">
              Quarentena
            </span>
          )}
          {frasco.situacao_localizacao === 'EXTRAVIADO' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-500">
              Extraviado
            </span>
          )}
          {frasco.disponibilidade === 'EMPRESTADO' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500">
              Em Uso
            </span>
          )}
          {frasco.vencido && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500">
              Vencido
            </span>
          )}
        </div>
      </div>
      {!readOnly && onAction && (
        <div className="flex gap-1 flex-wrap mt-2 pt-2 border-t border-foreground/10">
          <button onClick={() => onAction("quarentena", frasco)} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20">
            {frasco.em_quarentena ? "Decisão Quarentena" : "Quarentena"}
          </button>
          <button onClick={() => onAction("extravio", frasco)} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 hover:bg-purple-500/20">
            {frasco.situacao_localizacao === "EXTRAVIADO" ? "Reencontrar" : "Extraviar"}
          </button>
          <button onClick={() => onAction("pesagem_rotina", frasco)} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20">
            Pesar
          </button>
          <button onClick={() => onAction("descarte", frasco)} className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/10 text-red-600 hover:bg-red-600/20">
            Descartar
          </button>
        </div>
      )}
    </div>
  );
}

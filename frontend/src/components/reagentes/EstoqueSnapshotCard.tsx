"use client";

import React from "react";

import type { EstoqueSnapshot } from "@/types/reagentes";

export type { EstoqueSnapshot };

export interface EstoqueSnapshotCardProps {
  snapshot: EstoqueSnapshot | null;
  loading: boolean;
  rateLimited: boolean;
  errorMsg: string;
  onRefresh: () => void;
}

export function EstoqueSnapshotCard({
  snapshot,
  loading,
  rateLimited,
  errorMsg,
  onRefresh,
}: EstoqueSnapshotCardProps) {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            Estoque Atual (Fotografia Corrente — M8)
          </h2>
          <p className="text-xs text-foreground/60">
            Cálculo transacional protegido sobre Frasco_Reagente. Não é resumo diário nem posição histórica.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {snapshot?.calculadoEm && (
            <span className="text-xs text-foreground/50">
              Atualizado às {snapshot.calculadoEm.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 border border-primary/20 transition-colors disabled:opacity-50"
          >
            {loading ? "Atualizando..." : "Atualizar Estoque"}
          </button>
        </div>
      </div>

      {rateLimited ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-xs">
          {errorMsg}
        </div>
      ) : snapshot ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3 bg-background rounded-xl border border-foreground/10 text-center">
            <div className="text-xl font-bold text-green-500">{snapshot.qtd_aptos}</div>
            <div className="text-[11px] text-foreground/60">Frascos Aptos</div>
          </div>
          <div className="p-3 bg-background rounded-xl border border-foreground/10 text-center">
            <div className="text-xl font-bold">{snapshot.qtd_total}</div>
            <div className="text-[11px] text-foreground/60">Total de Frascos</div>
          </div>
          <div className="p-3 bg-background rounded-xl border border-foreground/10 text-center">
            <div className="text-xl font-bold text-blue-500">{snapshot.qtd_emprestados}</div>
            <div className="text-[11px] text-foreground/60">Empréstimos Ativos</div>
          </div>
          <div className="p-3 bg-background rounded-xl border border-foreground/10 text-center">
            <div className="text-xl font-bold text-amber-500">{snapshot.qtd_saldo_desconhecido}</div>
            <div className="text-[11px] text-foreground/60">Saldo Desconhecido</div>
          </div>
          <div className="p-3 bg-background rounded-xl border border-foreground/10 text-center">
            <div className="text-lg font-bold">
              {snapshot.massa_aferida_g !== null ? `${snapshot.massa_aferida_g} g` : "—"}
            </div>
            <div className="text-[11px] text-foreground/60">Massa Aferida (g)</div>
          </div>
          <div className="p-3 bg-background rounded-xl border border-foreground/10 text-center">
            <div className="text-lg font-bold">
              {snapshot.volume_aferido_ml !== null ? `${snapshot.volume_aferido_ml} mL` : "—"}
            </div>
            <div className="text-[11px] text-foreground/60">Volume Aferido (mL)</div>
          </div>
        </div>
      ) : loading ? (
        <div className="text-xs text-foreground/50 py-2">Calculando agregado de estoque...</div>
      ) : null}
    </div>
  );
}

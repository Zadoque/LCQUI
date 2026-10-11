"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FrascoCard } from "@/components/reagentes/FrascoCard";
import {
  obterPainelOperacional,
  type HistoricoOperacional,
  type PainelOperacionalData,
} from "@/services/reagentes/reagentesService";
import type { FrascoOperacional } from "@/types/reagentes";
import { ROTULO_TIPO_NOTIFICACAO } from "@/types/notificacoes";

type AbaOperacional = "movimentacoes" | "alertas";
type AcaoOperacional = "quarentena" | "extravio" | "pesagem_rotina" | "descarte";

interface PainelOperacionalReagentesProps {
  aba: AbaOperacional;
  idAlmoxarifado?: string;
  uid?: string;
  onAction: (action: AcaoOperacional, payload: FrascoOperacional) => void;
  refreshToken: number;
}

function formatarData(value: HistoricoOperacional["timestamp"]): string {
  const data = value && typeof (value as { toDate?: () => Date }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate()
    : value instanceof Date ? value : null;
  return data ? data.toLocaleString("pt-BR") : "aguardando servidor";
}

function estadoVazio(aba: AbaOperacional): string {
  return aba === "movimentacoes"
    ? "Nenhuma movimentação registrada neste almoxarifado."
    : "Nenhuma quarentena ou alerta operacional pendente.";
}

export function PainelOperacionalReagentes({
  aba,
  idAlmoxarifado,
  uid,
  onAction,
  refreshToken,
}: PainelOperacionalReagentesProps) {
  const [dados, setDados] = useState<PainelOperacionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!idAlmoxarifado || !uid) {
      setDados(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro("");
    try {
      setDados(await obterPainelOperacional(idAlmoxarifado, uid));
    } catch (error) {
      console.error("Erro ao carregar painel operacional:", error);
      setErro("Não foi possível carregar os dados operacionais deste almoxarifado.");
    } finally {
      setLoading(false);
    }
  }, [idAlmoxarifado, uid]);

  useEffect(() => {
    const carregamento = window.setTimeout(() => void carregar(), 0);
    return () => window.clearTimeout(carregamento);
  }, [carregar, refreshToken]);

  if (!idAlmoxarifado || !uid) {
    return (
      <section className="glass-panel p-6 rounded-2xl border border-foreground/10" data-testid={`painel-operacional-${aba}`}>
        <p className="text-sm text-foreground/60">Aguardando o almoxarifado vinculado e a sessão autorizada.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="glass-panel p-6 rounded-2xl border border-foreground/10" data-testid={`painel-operacional-${aba}`}>
        <p className="text-sm text-foreground/60">Carregando dados operacionais...</p>
      </section>
    );
  }

  if (erro || !dados) {
    return (
      <section className="glass-panel p-6 rounded-2xl border border-red-500/20" data-testid={`painel-operacional-${aba}`}>
        <p className="text-sm text-red-600">{erro || "Dados operacionais indisponíveis."}</p>
        <button type="button" onClick={() => void carregar()} className="mt-3 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
          Tentar novamente
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4" data-testid={`painel-operacional-${aba}`}>
      {aba === "movimentacoes" ? (
        <div className="glass-panel p-6 rounded-2xl border border-foreground/10">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold">Movimentações</h2>
              <p className="text-xs text-foreground/60">Histórico físico do almoxarifado, ordenado pelo instante do servidor.</p>
            </div>
            <button type="button" onClick={() => void carregar()} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">Atualizar</button>
          </div>
          {dados.movimentacoes.length === 0 ? (
            <p className="text-sm text-foreground/60">{estadoVazio(aba)}</p>
          ) : (
            <div className="space-y-2" data-testid="lista-movimentacoes">
              {dados.movimentacoes.map((movimentacao) => (
                <article key={movimentacao.id} className="p-3 rounded-xl border border-foreground/10 bg-background text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>{movimentacao.tipo}</strong>
                    <span className="text-xs text-foreground/50">{formatarData(movimentacao.timestamp)}</span>
                  </div>
                  <p className="text-xs text-foreground/60 mt-1">Frasco: {movimentacao.id_frasco_reagente ?? "não informado"}</p>
                  {movimentacao.motivo && <p className="text-xs mt-1">Motivo: {movimentacao.motivo}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="glass-panel p-6 rounded-2xl border border-red-500/20">
            <h2 className="text-lg font-bold">Quarentena</h2>
            {/* M5/Q06: frascos indisponíveis aguardando decisão humana. */}
            <p className="text-xs text-foreground/60 mb-4">Frascos indisponíveis que precisam de uma decisão.</p>
            {dados.quarentena.length === 0 ? (
              <p className="text-sm text-foreground/60">{estadoVazio(aba)}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="lista-quarentena">
                {dados.quarentena.map((frasco) => <FrascoCard key={frasco.id} frasco={frasco} onAction={onAction} />)}
              </div>
            )}
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-amber-500/20">
            <h2 className="text-lg font-bold">Alertas operacionais</h2>
            <p className="text-xs text-foreground/60 mb-4">Notificações do próprio gestor relacionadas a estoque e movimentações.</p>
            {dados.alertas.length === 0 ? (
              <p className="text-sm text-foreground/60">Nenhum alerta operacional pendente.</p>
            ) : (
              <div className="space-y-2" data-testid="lista-alertas-operacionais">
                {dados.alertas.map((alerta) => (
                  <article key={alerta.id} className="p-3 rounded-xl border border-foreground/10 bg-background">
                    <strong className="text-sm">{ROTULO_TIPO_NOTIFICACAO[alerta.tipo] ?? alerta.tipo}</strong>
                    {typeof alerta.quantidade === "number" && <span className="ml-2 text-xs text-foreground/60">Quantidade: {alerta.quantidade}</span>}
                    <p className="text-xs text-foreground/60 mt-1">{typeof alerta.mensagem_customizada === "string" && alerta.mensagem_customizada.length > 0 ? alerta.mensagem_customizada : "Alerta gerado pelo fluxo operacional."}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

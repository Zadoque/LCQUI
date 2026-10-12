"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

import type { HistoricoPatrimonioItem as HistoricoItem } from "@/types/patrimonio";

export type { HistoricoItem };

export function HistoricoPatrimonioList({ idBemPatrimonial }: { idBemPatrimonial: string }) {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarHistorico() {
      try {
        const q = query(
          collection(db, "Bem_Patrimonial", idBemPatrimonial, "Historico_Patrimonio"),
          orderBy("timestamp", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        setHistorico(snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoricoItem)));
      } catch (err) {
        console.error("Erro ao carregar histórico patrimonial:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarHistorico();
  }, [idBemPatrimonial]);

  if (loading) {
    return <div className="text-xs text-foreground/50 py-3">Carregando histórico de versões...</div>;
  }

  if (historico.length === 0) {
    return <div className="text-xs text-foreground/50 py-3">Nenhum evento registrado no histórico até o momento.</div>;
  }

  return (
    <div className="space-y-3">
      {historico.map((item) => (
        <div key={item.id} className="p-3 bg-foreground/5 rounded-xl border border-foreground/10 text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-bold uppercase tracking-wider text-[10px] text-primary">
              {item.tipo || "Alteração"}
            </span>
            <span className="text-[10px] text-foreground/50">
              {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : "Data recente"}
            </span>
          </div>
          {item.justificativa && (
            <p className="text-foreground/80 italic">&quot;{item.justificativa}&quot;</p>
          )}
          {item.documento_dado_baixa_pdf_url && (
            <div className="text-[10px] text-red-400 font-mono">
              Doc SEI: {item.documento_dado_baixa_pdf_url}
            </div>
          )}
          {item.alteracoes && item.alteracoes.length > 0 && (
            <div className="mt-1 space-y-0.5 border-t border-foreground/10 pt-1">
              {item.alteracoes.map((alt, idx) => (
                <div key={idx} className="text-[11px] text-foreground/70">
                  <span className="font-semibold">{alt.campo}:</span>{" "}
                  <span className="line-through text-foreground/40">{String(alt.valor_anterior || "—")}</span> &rarr;{" "}
                  <span className="font-bold text-foreground">{String(alt.valor_novo || "—")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

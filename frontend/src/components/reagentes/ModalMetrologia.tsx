"use client";

import React, { useState } from "react";
import { confirmarEsgotamentoAposInspecao, recalibrarTaraFrascoEsgotado, repetirPesagemDevolucaoAnomala } from "@/services/reagentes/reagentesService";

export interface ModalMetrologiaProps {
  isOpen: boolean;
  onClose: () => void;
  idEmprestimo?: string;
  idFrasco?: string;
  pesoRetornoOriginal?: number;
  pesoSaidaOriginal?: number;
  tara?: number | null;
  onSuccess?: () => void;
}

export function ModalMetrologia({
  isOpen,
  onClose,
  idEmprestimo,
  idFrasco,
  pesoRetornoOriginal,
  pesoSaidaOriginal,
  tara,
  onSuccess,
}: ModalMetrologiaProps) {
  const [rota, setRota] = useState<"REPETIR" | "ESGOTAMENTO" | "RECALIBRAR">("REPETIR");
  const [novoPeso, setNovoPeso] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (motivo.trim().length < 20) {
      setErrorMsg("Explique a decisão com pelo menos 20 caracteres.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      if (rota === "REPETIR") {
        if (!idEmprestimo) throw new Error("Não foi possível identificar o empréstimo para repetir a pesagem.");
        await repetirPesagemDevolucaoAnomala({
          idOperacao: crypto.randomUUID(),
          idEmprestimo,
          pesoNovaMedicao: Number(novoPeso),
          motivo: motivo.trim(),
        });
      } else if (rota === "ESGOTAMENTO") {
        if (!idEmprestimo) throw new Error("Não foi possível identificar o empréstimo para confirmar o esgotamento.");
        await confirmarEsgotamentoAposInspecao({
          idOperacao: crypto.randomUUID(),
          idEmprestimo,
          pesoVazioRealMedido: Number(novoPeso),
          motivo: motivo.trim(),
        });
      } else {
        if (!idFrasco) throw new Error("Não foi possível identificar o frasco para recalibrar a tara.");
        await recalibrarTaraFrascoEsgotado({
          idOperacao: crypto.randomUUID(),
          idFrasco,
          pesoVazioReal: Number(novoPeso),
          motivo: motivo.trim(),
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro na resolução metrológica.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl border-blue-500/20">
        {/* UI-17/M6: três ações tipadas para resolver uma pendência de pesagem. */}
        <h2 className="text-xl font-bold mb-2 text-blue-500">Resolver pendência de pesagem</h2>
        <div className="mb-4 text-xs text-foreground/60 bg-foreground/5 p-3 rounded-lg border border-foreground/10 space-y-1">
          <div><span className="font-semibold">Peso Saída Original:</span> {pesoSaidaOriginal ?? "N/A"} g</div>
          <div><span className="font-semibold">Leitura Retorno Original:</span> {pesoRetornoOriginal ?? "N/A"} g (preservada)</div>
          <div><span className="font-semibold">Tara de Referência:</span> {tara ?? "Não informada"} g</div>
          <div className="text-amber-500 font-semibold mt-1">
            Escolha uma ação para resolver a pendência. Resolver a diferença de peso não libera automaticamente o frasco da quarentena.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ação para resolver a pendência *</label>
            <select
              value={rota}
              onChange={(e) => setRota(e.target.value as typeof rota)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none"
            >
              <option value="REPETIR">1. Repetir Pesagem da Devolução Anômala</option>
              <option value="ESGOTAMENTO">2. Confirmar Esgotamento Após Inspeção</option>
              <option value="RECALIBRAR">3. Recalibrar Tara de Frasco Esgotado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {rota === "REPETIR" ? "Nova Medição na Balança (g) *" : rota === "ESGOTAMENTO" ? "Peso Vazio Real Medido (g) *" : "Peso Vazio Real do Recipiente (g) *"}
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={novoPeso}
              onChange={(e) => setNovoPeso(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Justificativa Técnica (mínimo 20 caracteres) *</label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique o motivo da decisão..."
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none"
            />
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50">
              {loading ? "Resolvendo..." : "Confirmar Resolução"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

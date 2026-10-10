"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { ModalProps } from "./types";

export function ModalDevolucaoFrasco({
  isOpen,
  onClose,
  frascoId,
  idEmprestimo,
  onSuccess,
}: ModalProps & { frascoId: string; idEmprestimo?: string }) {
  const [pesoRetorno1, setPesoRetorno1] = useState("");
  const [pesoRetorno2, setPesoRetorno2] = useState("");
  const [evaporacao, setEvaporacao] = useState("");
  const [ficouVazio, setFicouVazio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(pesoRetorno1) !== Number(pesoRetorno2)) {
      setErrorMsg("A 2ª pesagem não confere com a 1ª (Dupla digitação independente exigida por UI-18).");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const registrarDevolucao = httpsCallable(functions, "registrarDevolucao");
      await registrarDevolucao({
        idOperacao: crypto.randomUUID(),
        idEmprestimo: idEmprestimo || frascoId,
        pesoRetorno: Number(pesoRetorno1),
        pesoPerdaEvaporacao: evaporacao ? Number(evaporacao) : undefined,
        confirmarEsgotamento: ficouVazio,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro na validação da devolução.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-xl border-amber-500/20">
        <h2 className="text-xl font-bold mb-4 text-amber-500">Registrar Devolução</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
            UI-18: Prevenção de erro em pesagens exige dupla digitação independente da massa em gramas (g).
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">1ª Leitura da Balança (g) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={pesoRetorno1}
              onChange={(e) => setPesoRetorno1(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">2ª Leitura da Balança (g) — Confirmação *</label>
            <input
              type="number"
              step="0.01"
              required
              value={pesoRetorno2}
              onChange={(e) => setPesoRetorno2(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Perda por Evaporação Declarada (g, opcional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={evaporacao}
              onChange={(e) => setEvaporacao(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div className="p-3 rounded-lg bg-foreground/5 border border-foreground/10">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={ficouVazio} onChange={(e) => setFicouVazio(e.target.checked)} className="rounded" />
              O frasco ficou vazio nesta devolução? (Esgotamento)
            </label>
            <p className="text-xs text-foreground/50 mt-1">
              Conforme UI-07: a confirmação do gestor é a autoridade do esgotamento; o retorno vira a tara real e o saldo torna-se 0.
            </p>
          </div>
          {errorMsg && <div className="text-amber-500 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50">
              {loading ? "Validando..." : "Confirmar Devolução"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

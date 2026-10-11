"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

export interface ModalPesagemRotinaProps {
  isOpen: boolean;
  onClose: () => void;
  frascoId: string;
  onSuccess?: () => void;
}

export function ModalPesagemRotina({
  isOpen,
  onClose,
  frascoId,
  onSuccess,
}: ModalPesagemRotinaProps) {
  const [peso1, setPeso1] = useState("");
  const [peso2, setPeso2] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(peso1) !== Number(peso2)) {
      setErrorMsg("As duas pesagens precisam ser iguais. Confira os valores digitados.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const registrar = httpsCallable(functions, "registrarPesagemRotina");
      await registrar({
        idOperacao: crypto.randomUUID(),
        idFrasco: frascoId,
        pesoAtual: Number(peso1),
        motivo: motivo.trim() || undefined,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao registrar pesagem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-xl border-cyan-500/20">
        {/* UI-06/UI-18: pesagem de rotina com dupla conferência independente. */}
        <h2 className="text-xl font-bold mb-4 text-cyan-500">Pesagem de rotina / inventário</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-600 dark:text-cyan-400">
            Digite o peso duas vezes para confirmar o valor.
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">1ª Leitura da Balança (g) *</label>
            <input type="number" step="0.01" required value={peso1} onChange={(e) => setPeso1(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">2ª Leitura da Balança (g) — Confirmação *</label>
            <input type="number" step="0.01" required value={peso2} onChange={(e) => setPeso2(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observação (opcional)</label>
            <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} 
              placeholder="Inventário rotina..."
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none" />
          </div>
          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-600 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Pesagem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

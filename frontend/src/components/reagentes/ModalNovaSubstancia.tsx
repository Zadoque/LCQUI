"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { ModalProps } from "./types";

export function ModalNovaSubstancia({ isOpen, onClose, onSuccess }: ModalProps) {
  const [nome, setNome] = useState("");
  const [casNumber, setCasNumber] = useState("");
  const [formulaQuimica, setFormulaQuimica] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const cadastrarSubstanciaQuimica = httpsCallable(functions, "cadastrarSubstanciaQuimica");
      await cadastrarSubstanciaQuimica({
        idOperacao: crypto.randomUUID(),
        nome,
        casNumber: casNumber ? casNumber.trim() : undefined,
        formulaQuimica: formulaQuimica ? formulaQuimica.trim() : undefined,
        ativo,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro interno ao cadastrar substância.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl my-8">
        <h2 className="text-xl font-bold mb-4">Nova Substância Química Base</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Substância *</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Número CAS (Opcional)</label>
              <input
                type="text"
                value={casNumber}
                onChange={(e) => setCasNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fórmula Química (Opcional)</label>
              <input
                type="text"
                value={formulaQuimica}
                onChange={(e) => setFormulaQuimica(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium">Ativo (visível para uso)</span>
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Substância"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

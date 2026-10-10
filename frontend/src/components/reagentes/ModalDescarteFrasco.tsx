"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

export interface ModalDescarteFrascoProps {
  isOpen: boolean;
  onClose: () => void;
  frascoId: string;
  onSuccess?: () => void;
}

export function ModalDescarteFrasco({
  isOpen,
  onClose,
  frascoId,
  onSuccess,
}: ModalDescarteFrascoProps) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (motivo.trim().length < 20) {
      setErrorMsg("O laudo/motivo do descarte deve conter pelo menos 20 caracteres.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const descartar = httpsCallable(functions, "descartarFrasco");
      await descartar({
        idOperacao: crypto.randomUUID(),
        idFrasco: frascoId,
        motivo: motivo.trim(),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao descartar frasco.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-xl border-red-500/30">
        <h2 className="text-xl font-bold mb-2 text-red-500">Descarte Terminal de Frasco (UI-07)</h2>
        <p className="text-xs text-foreground/60 mb-4">
          Atenção: o descarte físico é estritamente terminal e absorvente. O frasco ficará indisponível permanentemente.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Motivo / Laudo do Descarte (mínimo 20 caracteres) *</label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo do descarte..."
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none"
            />
          </div>
          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50">
              {loading ? "Descartando..." : "Confirmar Descarte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

export interface ModalQuarentenaProps {
  isOpen: boolean;
  onClose: () => void;
  frascoId: string;
  emQuarentena?: boolean;
  onSuccess?: () => void;
}

export function ModalQuarentena({
  isOpen,
  onClose,
  frascoId,
  emQuarentena,
  onSuccess,
}: ModalQuarentenaProps) {
  const [decisao, setDecisao] = useState<"VOLTAR_A_DISPONIVEL" | "PENDENTE_DE_DESCARTE">("VOLTAR_A_DISPONIVEL");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (motivo.trim().length < 10) {
      setErrorMsg("A justificativa/laudo deve conter pelo menos 10 caracteres.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      if (emQuarentena) {
        const resolver = httpsCallable(functions, "resolverQuarentenaFrasco");
        await resolver({
          idOperacao: crypto.randomUUID(),
          idFrasco: frascoId,
          decisao,
          motivo: motivo.trim(),
        });
      } else {
        const colocar = httpsCallable(functions, "colocarFrascoEmQuarentena");
        await colocar({
          idOperacao: crypto.randomUUID(),
          idFrasco: frascoId,
          motivo: motivo.trim(),
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro na operação de quarentena.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-xl border-red-500/20">
        {/* UI-14: entrada e decisão de saída da quarentena. */}
        <h2 className="text-xl font-bold mb-4 text-red-500">
          {emQuarentena ? "Decidir saída da quarentena" : "Colocar frasco em quarentena"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {emQuarentena ? (
            <div>
              <label className="block text-sm font-medium mb-1">Decisão Técnica</label>
              <select
                value={decisao}
                onChange={(e) => setDecisao(e.target.value as typeof decisao)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none"
              >
                <option value="VOLTAR_A_DISPONIVEL">Voltar a Disponível (Apenas ABERTO/FECHADO apto)</option>
                <option value="PENDENTE_DE_DESCARTE">Pendente de Descarte (Autoriza descarte futuro)</option>
              </select>
            </div>
          ) : (
            <p className="text-xs text-foreground/60">
              O frasco passará para INDISPONÍVEL com retenção em quarentena. Não altera validade nem saldo.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              {emQuarentena ? "Laudo Técnico / Motivo da Decisão *" : "Motivo da Quarentena *"}
            </label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo/laudo (mínimo 10 caracteres)..."
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none"
            />
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50">
              {loading ? "Processando..." : emQuarentena ? "Registrar Decisão" : "Colocar em Quarentena"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

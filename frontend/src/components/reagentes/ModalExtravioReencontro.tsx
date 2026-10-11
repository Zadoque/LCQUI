"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

export interface ModalExtravioReencontroProps {
  isOpen: boolean;
  onClose: () => void;
  frascoId: string;
  isExtraviado?: boolean;
  onSuccess?: () => void;
}

export function ModalExtravioReencontro({
  isOpen,
  onClose,
  frascoId,
  isExtraviado,
  onSuccess,
}: ModalExtravioReencontroProps) {
  const [tipoAcao] = useState<"EXTRAVIAR" | "REENCONTRAR">(isExtraviado ? "REENCONTRAR" : "EXTRAVIAR");
  const [estadoConstatado, setEstadoConstatado] = useState<"ABERTO" | "FECHADO" | "VAZIO" | "QUEBRADO">("ABERTO");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (motivo.trim().length < 5) {
      setErrorMsg("O motivo deve conter pelo menos 5 caracteres.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const registrar = httpsCallable(functions, "registrarExtravioOuReencontro");
      if (tipoAcao === "EXTRAVIAR") {
        await registrar({
          idOperacao: crypto.randomUUID(),
          idFrasco: frascoId,
          tipoAcao: "EXTRAVIAR",
          motivo: motivo.trim(),
        });
      } else {
        await registrar({
          idOperacao: crypto.randomUUID(),
          idFrasco: frascoId,
          tipoAcao: "REENCONTRAR",
          estadoFisicoConstatado: estadoConstatado,
          motivo: motivo.trim(),
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao registrar extravio/reencontro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-xl border-purple-500/20">
        {/* UI-16: registro de extravio e reencontro de frasco. */}
        <h2 className="text-xl font-bold mb-4 text-purple-500">
          {tipoAcao === "EXTRAVIAR" ? "Registrar extravio" : "Registrar reencontro"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {tipoAcao === "EXTRAVIAR" ? (
            <p className="text-xs text-foreground/60">
              O frasco sairá do estoque disponível (INDISPONÍVEL). Empréstimo ativo será encerrado como sinistro sem peso de retorno. Nenhum consumo é inventado.
            </p>
          ) : (
            <>
              <p className="text-xs text-foreground/60">
                O frasco irá para QUARENTENA compulsória (INDISPONÍVEL). Não volta automaticamente a disponível e não reabre empréstimo.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">Estado Físico Constatado *</label>
                <select
                  value={estadoConstatado}
                  onChange={(e) => setEstadoConstatado(e.target.value as typeof estadoConstatado)}
                  className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none"
                >
                  <option value="ABERTO">Aberto</option>
                  <option value="FECHADO">Fechado</option>
                  <option value="VAZIO">Vazio</option>
                  <option value="QUEBRADO">Quebrado</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Motivo / Justificativa *</label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo (mínimo 5 caracteres)..."
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none"
            />
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-50">
              {loading ? "Processando..." : tipoAcao === "EXTRAVIAR" ? "Confirmar Extravio" : "Confirmar Reencontro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

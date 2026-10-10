"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

export interface ModalBaixaPatrimonialProps {
  isOpen: boolean;
  onClose: () => void;
  idBemPatrimonial: string;
  nomeEquipamento?: string;
  numeroPatrimonio: string;
  onSuccess?: () => void;
}

export function ModalBaixaPatrimonial({
  isOpen,
  onClose,
  idBemPatrimonial,
  nomeEquipamento,
  numeroPatrimonio,
  onSuccess,
}: ModalBaixaPatrimonialProps) {
  const [justificativa, setJustificativa] = useState("");
  const [pdfPath, setPdfPath] = useState(`baixas_patrimoniais/${idBemPatrimonial}/termo_baixa.pdf`);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (justificativa.trim().length < 10) {
      setErrorMsg("A justificativa de baixa deve conter pelo menos 10 caracteres.");
      return;
    }
    if (!pdfPath.trim()) {
      setErrorMsg("O caminho do comprovante PDF no Storage é obrigatório.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const registrarBaixa = httpsCallable(functions, "registrarBaixaBemPatrimonial");
      await registrarBaixa({
        idOperacao: crypto.randomUUID(),
        idBemPatrimonial,
        documentoDadoBaixaPdfUrl: pdfPath.trim(),
        justificativa: justificativa.trim(),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao registrar baixa patrimonial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg p-6 rounded-3xl shadow-2xl border border-red-500/30">
        <h2 className="text-xl font-bold text-red-500 mb-1">
          Registrar Baixa Patrimonial Definitiva (SEI)
        </h2>
        <p className="text-xs text-foreground/60 mb-4">
          Equipamento: <span className="font-semibold text-foreground">{nomeEquipamento}</span> (Plaqueta: {numeroPatrimonio}).
          Esta operação é terminal e irreversível conforme a norma M10 (UI-12).
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Caminho do Termo de Baixa (PDF &le; 10 MiB) *
            </label>
            <input
              type="text"
              required
              value={pdfPath}
              onChange={(e) => setPdfPath(e.target.value)}
              placeholder={`baixas_patrimoniais/${idBemPatrimonial}/termo_baixa.pdf`}
              className="w-full px-3 py-2 rounded-xl bg-foreground/5 border border-foreground/10 text-xs font-mono outline-none"
            />
            <p className="text-[10px] text-foreground/50 mt-1">
              O arquivo deve estar previamente enviado ao Storage no namespace normativo do bem.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Justificativa / Número do Processo SEI *
            </label>
            <textarea
              required
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o número do processo SEI e o motivo do descarte..."
              className="w-full px-3 py-2 rounded-xl bg-foreground/5 border border-foreground/10 outline-none text-sm"
            />
          </div>

          {errorMsg && (
            <div className="text-red-500 text-xs bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl hover:bg-foreground/5 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg shadow-red-600/20"
            >
              {loading ? "Registrando..." : "Confirmar Baixa Definitiva"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

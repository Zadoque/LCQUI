"use client";

import React, { useState } from "react";
import { ModalProps } from "./types";
import { cadastrarResumoReagente } from "@/services/reagentes/reagentesService";

export function ModalNovoReagente({ isOpen, onClose, onSuccess }: ModalProps) {
  const [nome, setNome] = useState("");
  const [tipoSubstancia, setTipoSubstancia] = useState<"PURA" | "MISTURA">("PURA");
  const [naturezaQuimica, setNaturezaQuimica] = useState<"ORGANICO" | "INORGANICO" | "ELEMENTO" | "HIBRIDO">("ORGANICO");
  const [estadoFisico, setEstadoFisico] = useState<"SOLIDO" | "LIQUIDO">("SOLIDO");
  const [requerPesagemFrequente, setRequerPesagemFrequente] = useState(false);
  const [ehHigroscopico, setEhHigroscopico] = useState(false);
  const [frequenciaPesagemDias, setFrequenciaPesagemDias] = useState("");
  const [qtdEscasso, setQtdEscasso] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      await cadastrarResumoReagente({
        idOperacao: crypto.randomUUID(),
        nome,
        tipoSubstancia,
        naturezaQuimica,
        estadoFisico,
        requerPesagemFrequente,
        frequenciaPesagemDias: requerPesagemFrequente && frequenciaPesagemDias ? Number(frequenciaPesagemDias) : null,
        ehHigroscopico,
        qtdEmQueEConsideradoEscasso: Number(qtdEscasso),
      });
      if (onSuccess) await onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro interno ao cadastrar resumo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl my-8">
        <h2 className="text-xl font-bold mb-4">Novo Resumo de Reagente (Catálogo)</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Reagente *</label>
            <input
              data-testid="novo-resumo-nome"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Substância</label>
              <select
                value={tipoSubstancia}
                onChange={(e) => setTipoSubstancia(e.target.value as typeof tipoSubstancia)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="PURA">Pura</option>
                <option value="MISTURA">Mistura</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Natureza Química</label>
              <select
                data-testid="novo-resumo-natureza"
                value={naturezaQuimica}
                onChange={(e) => setNaturezaQuimica(e.target.value as typeof naturezaQuimica)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="ORGANICO">Orgânico</option>
                <option value="INORGANICO">Inorgânico</option>
                <option value="ELEMENTO">Elemento</option>
                <option value="HIBRIDO">Híbrido</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estado Físico</label>
            <select
              value={estadoFisico}
              onChange={(e) => setEstadoFisico(e.target.value as typeof estadoFisico)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="SOLIDO">Sólido</option>
              <option value="LIQUIDO">Líquido</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requerPesagemFrequente}
                  onChange={(e) => setRequerPesagemFrequente(e.target.checked)}
                  className="rounded text-primary focus:ring-primary bg-foreground/5 border-foreground/10"
                />
                <span className="text-sm font-medium">Requer pesagem frequente?</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dias p/ Pesagem (se req.)</label>
              <input
                type="number"
                required={requerPesagemFrequente}
                disabled={!requerPesagemFrequente}
                value={frequenciaPesagemDias}
                onChange={(e) => setFrequenciaPesagemDias(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ehHigroscopico}
              onChange={(e) => setEhHigroscopico(e.target.checked)}
              className="rounded text-primary focus:ring-primary bg-foreground/5 border-foreground/10"
            />
            <span className="text-sm font-medium">É higroscópico?</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Limiar de Escassez (frascos aptos) *</label>
            <input
              data-testid="novo-resumo-limiar-escassez"
              type="number"
              required
              value={qtdEscasso}
              onChange={(e) => setQtdEscasso(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Resumo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { ModalProps } from "./types";

export function ModalEntradaFrasco({
  isOpen,
  onClose,
  idResumoReagente,
  idEspecificacaoReagente,
  idAlmoxarifado,
  onSuccess,
}: ModalProps) {
  const [condicaoInicial, setCondicaoInicial] = useState<"FECHADO" | "JA_ABERTO">("FECHADO");
  const [lote, setLote] = useState("");
  const [pesoCheio, setPesoCheio] = useState("");
  const [volumeNominal, setVolumeNominal] = useState("");
  const [unidade] = useState<"mg" | "ml">("mg");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (!idAlmoxarifado) throw new Error("Nenhum almoxarifado ativo está vinculado ao gestor.");
      if (condicaoInicial === "FECHADO") {
        const cadastrarFrascoFechado = httpsCallable(functions, "cadastrarFrascoFechado");
        await cadastrarFrascoFechado({
          idOperacao: crypto.randomUUID(),
          idResumoReagente,
          idEspecificacaoReagente,
          idAlmoxarifado,
          idLote: lote || undefined,
          pesoTotal: Number(pesoCheio),
          volumeNominal: volumeNominal ? Number(volumeNominal) : null,
        });
      } else {
        const cadastrarFrascoAberto = httpsCallable(functions, "cadastrarFrascoAberto");
        await cadastrarFrascoAberto({
          idOperacao: crypto.randomUUID(),
          idResumoReagente,
          idEspecificacaoReagente,
          idAlmoxarifado,
          idLote: lote || undefined,
          pesoTotalBalanca: Number(pesoCheio),
          volumeNominal: volumeNominal ? Number(volumeNominal) : null,
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro interno ao cadastrar o frasco.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-bold mb-4">Cadastrar Novo Frasco</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Condição Física Inicial</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCondicaoInicial("FECHADO")}
                className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${condicaoInicial === "FECHADO" ? "bg-primary text-primary-foreground border-primary" : "bg-foreground/5 border-foreground/10 text-foreground/70"}`}
              >
                Fechado (Original)
              </button>
              <button
                type="button"
                onClick={() => setCondicaoInicial("JA_ABERTO")}
                className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${condicaoInicial === "JA_ABERTO" ? "bg-primary text-primary-foreground border-primary" : "bg-foreground/5 border-foreground/10 text-foreground/70"}`}
              >
                Já Aberto (Em Uso)
              </button>
            </div>
            {condicaoInicial === "JA_ABERTO" && (
              <p className="text-xs text-foreground/60 mt-1">
                Conforme UI-06: tara não conhecida e saldo inicial desconhecido até esgotamento.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ID do Lote (opcional)</label>
            <input
              type="text"
              value={lote}
              onChange={(e) => setLote(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Peso Total (Balança) - g *</label>
              <input
                type="number"
                step="0.01"
                required
                value={pesoCheio}
                onChange={(e) => setPesoCheio(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Conteúdo Nominal do Rótulo ({unidade})</label>
              <input
                type="number"
                step="0.01"
                value={volumeNominal}
                onChange={(e) => setVolumeNominal(e.target.value)} 
                placeholder="Opcional se ilegível"
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Frasco"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

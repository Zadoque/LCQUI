"use client";

import React, { useState } from "react";
import { ModalProps } from "./types";
import { cadastrarLote } from "@/services/reagentes/reagentesService";

export function ModalNovoLote({ isOpen, onClose, idResumoReagente, idEspecificacaoReagente, onSuccess }: ModalProps) {
  const [numeroLote, setNumeroLote] = useState("");
  const [nomeFornecedor, setNomeFornecedor] = useState("");
  const [qtdFrascosComprados, setQtdFrascosComprados] = useState("");
  const [dataAquisicao, setDataAquisicao] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [dataFabricacao, setDataFabricacao] = useState("");
  const [dataValidade, setDataValidade] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      if (!idResumoReagente || !idEspecificacaoReagente) {
        throw new Error("O resumo e a especificação do reagente são obrigatórios.");
      }
      await cadastrarLote({
        idOperacao: crypto.randomUUID(),
        idResumoReagente,
        idEspecificacaoReagente,
        numeroLote,
        nomeFornecedor,
        qtdFrascosComprados: Number(qtdFrascosComprados),
        dataAquisicao,
        notaFiscal,
        dataFabricacao,
        dataValidade
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro interno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl my-8">
        <h2 className="text-xl font-bold mb-4">Cadastrar Lote</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Número do Lote</label>
              <input type="text" required value={numeroLote} onChange={(e) => setNumeroLote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fornecedor</label>
              <input type="text" required value={nomeFornecedor} onChange={(e) => setNomeFornecedor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nota Fiscal</label>
              <input type="text" required value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Qtd. Comprada (Frascos)</label>
              <input type="number" required value={qtdFrascosComprados} onChange={(e) => setQtdFrascosComprados(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data Aquisição</label>
              <input type="date" required value={dataAquisicao} onChange={(e) => setDataAquisicao(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fabricação</label>
              <input type="date" required value={dataFabricacao} onChange={(e) => setDataFabricacao(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Validade</label>
              <input type="date" required value={dataValidade} onChange={(e) => setDataValidade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none text-sm" />
            </div>
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Lote"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

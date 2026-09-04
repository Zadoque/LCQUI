"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  idResumoReagente?: string;
  onSuccess?: () => void;
}

export function ModalEntradaFrasco({ isOpen, onClose, idResumoReagente, onSuccess }: ModalProps) {
  const [lote, setLote] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [pesoCheio, setPesoCheio] = useState("");
  const [unidade, setUnidade] = useState<"mg" | "ml">("mg");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const cadastrarFrascoFechado = httpsCallable(functions, 'cadastrarFrascoFechado');
      await cadastrarFrascoFechado({
        lote,
        fornecedor,
        peso_cheio: Number(pesoCheio),
        unidade_medida: unidade,
        id_especificacao_reagente: idResumoReagente // simplificado para o escopo do modal
      });
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
        <h2 className="text-xl font-bold mb-4">Cadastrar Novo Frasco (Fechado)</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lote</label>
              <input type="text" required value={lote} onChange={(e) => setLote(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fornecedor</label>
              <input type="text" required value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Peso / Volume Inicial</label>
              <input type="number" step="0.01" required value={pesoCheio} onChange={(e) => setPesoCheio(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unidade</label>
              <select value={unidade} onChange={(e) => setUnidade(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none">
                <option value="mg">mg (Massa)</option>
                <option value="ml">ml (Volume)</option>
              </select>
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

export function ModalDevolucaoFrasco({ isOpen, onClose, frascoId, onSuccess }: ModalProps & { frascoId: string }) {
  const [quantidadeDevolvida, setQuantidadeDevolvida] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const registrarDevolucao = httpsCallable(functions, 'registrarDevolucao');
      await registrarDevolucao({
        id_emprestimo_reagente: "simulado_emprestimo_aberto", // Em produção, leria do histórico do frasco
        quantidade_devolvida_mg_ml: Number(quantidadeDevolvida),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      // Aqui a UI brilha com a tratativa elegante da margem higroscópica rejeitada
      setErrorMsg(err.message || "Erro na validação da devolução.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-sm p-6 rounded-2xl shadow-xl border-amber-500/20">
        <h2 className="text-xl font-bold mb-4 text-amber-500">Registrar Devolução</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade Marcada na Balança</label>
            <input type="number" step="0.01" required value={quantidadeDevolvida} onChange={(e) => setQuantidadeDevolvida(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-amber-500 outline-none" />
            <p className="text-xs text-foreground/50 mt-1">
              Nota: O sistema rejeitará acréscimos além da margem de erro (2% do peso).
            </p>
          </div>

          {errorMsg && <div className="text-amber-500 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">{errorMsg}</div>}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50">
              {loading ? "Validando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

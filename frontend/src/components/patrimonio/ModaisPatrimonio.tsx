"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ListaLocais } from "@/components/patrimonio/ListaLocais";
import { NovaLocalModal } from "@/components/patrimonio/NovaLocalModal";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ModalNovoBem({ isOpen, onClose, onSuccess }: ModalProps) {
  const [nome, setNome] = useState("");
  const [numeroPatrimonio, setNumeroPatrimonio] = useState("");
  const [selectedLocalId, setSelectedLocalId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState("Ativo");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Estados do modal interno de novo local
  const [isNovoLocalOpen, setIsNovoLocalOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        setLoading(false);
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro interno.";
      setErrorMsg(message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl border-blue-500/20">
        <h2 className="text-xl font-bold mb-4 text-blue-500">Adicionar Bem Patrimonial</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Equipamento</label>
              <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nº Patrimônio</label>
              <input type="text" required value={numeroPatrimonio} onChange={(e) => setNumeroPatrimonio(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* Seletor de Local (INC4) */}
          <div>
            <label className="block text-sm font-medium mb-1">Local</label>
            <ListaLocais
              modo="selecao"
              selectedId={selectedLocalId}
              onSelecionar={(id: string) => setSelectedLocalId(id)}
              onNovoLocal={() => setIsNovoLocalOpen(true)}
              testIdPrefix="seletor-local-"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="Ativo">Ativo</option>
                <option value="Inservivel">Inservível</option>
              </select>
            </div>
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || !selectedLocalId} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Bem"}
            </button>
          </div>
        </form>

        {/* Modal interno de criação de local */}
        <NovaLocalModal
          isOpen={isNovoLocalOpen}
          onClose={() => setIsNovoLocalOpen(false)}
          onSucesso={(id: string) => {
            setIsNovoLocalOpen(false);
            setSelectedLocalId(id);
          }}
        />
      </div>
    </div>
  );
}

export function ModalNotificacoesPatrimonio({ isOpen, onClose }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-sm p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-bold mb-4">Notificações</h2>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm font-semibold text-red-500">2 Requisições Pendentes</p>
            <p className="text-xs text-foreground/70 mt-1">Professores solicitaram adição de novos equipamentos que precisam de análise.</p>
            <Link href="/patrimonio/requisicoes">
              <button className="mt-3 text-xs font-bold text-red-500 hover:underline">Ver Requisições &rarr;</button>
            </Link>
          </div>
          <div className="p-4 rounded-lg bg-foreground/5 border border-foreground/10">
            <p className="text-sm font-semibold">Auditoria Anual</p>
            <p className="text-xs text-foreground/70 mt-1">Nenhuma pendência na auditoria atual.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors text-sm font-medium">Fechar</button>
        </div>
      </div>
    </div>
  );
}

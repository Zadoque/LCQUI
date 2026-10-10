import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

interface ModalPropostaAlteracaoBemProps {
  isOpen: boolean;
  onClose: () => void;
  idBemPatrimonial: string;
  statusAtual?: string;
  conservacaoAtual?: string;
  responsavelAtual?: string;
  onSuccess: () => void;
}

export function ModalPropostaAlteracaoBem({
  isOpen,
  onClose,
  idBemPatrimonial,
  statusAtual,
  conservacaoAtual,
  responsavelAtual,
  onSuccess,
}: ModalPropostaAlteracaoBemProps) {
  const [novoStatus, setNovoStatus] = useState<"Ativo" | "Inservivel" | "">("");
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [novoConservacao, setNovoConservacao] = useState<"BOM" | "REGULAR" | "RUIM" | "">("");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNovoStatus(statusAtual === "Ja_dado_baixa" ? "Inservivel" : (statusAtual as any) || "Ativo");
      setNovoResponsavel(responsavelAtual || "");
      setNovoConservacao((conservacaoAtual as any) || "BOM");
      setMotivo("");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, statusAtual, responsavelAtual, conservacaoAtual]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const criarRequisicao = httpsCallable(functions, "criarRequisicaoEdicaoBem");
      await criarRequisicao({
        idOperacao: crypto.randomUUID(),
        idBemPatrimonial,
        novoStatus: novoStatus !== statusAtual ? novoStatus : undefined,
        novoEstadoConservacao: novoConservacao !== conservacaoAtual ? novoConservacao : undefined,
        motivo,
      });

      setSuccessMsg("Requisição de alteração enviada com sucesso! Aguardando aprovação.");
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMsg("");
      }, 1500);
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : "Erro ao criar requisição. Talvez já exista uma pendente.";
      setErrorMsg(mensagem);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg p-6 rounded-3xl shadow-2xl border border-foreground/10 relative">
        <button
          onClick={() => !submitting && onClose()}
          className="absolute top-5 right-5 text-foreground/50 hover:text-foreground"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-1">Propor Atualização</h2>
        <p className="text-xs text-foreground/60 mb-4">
          Sua proposta será enviada para a Caixa de Entrada da Gestão Patrimonial.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Status Proposto</label>
            <select
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value as "Ativo" | "Inservivel")}
              className="w-full px-3 py-2 text-sm rounded-xl bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="Ativo">Ativo</option>
              <option value="Inservivel">Inservível (Quebrado/Desuso)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Novo Responsável SEI</label>
            <input
              type="text"
              value={novoResponsavel}
              onChange={(e) => setNovoResponsavel(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Estado de Conservação Proposto</label>
            <select
              value={novoConservacao}
              onChange={(e) => setNovoConservacao(e.target.value as "BOM" | "REGULAR" | "RUIM")}
              className="w-full px-3 py-2 text-sm rounded-xl bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="BOM">Bom</option>
              <option value="REGULAR">Regular</option>
              <option value="RUIM">Ruim</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Motivo da Alteração <span className="text-red-400">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              placeholder="Descreva por que esta alteração é necessária..."
              className="w-full px-3 py-2 text-sm rounded-xl bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none h-20 resize-none"
            />
          </div>

          {errorMsg && (
            <div className="text-red-500 text-xs bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="text-green-500 text-xs bg-green-500/10 p-2.5 rounded-lg border border-green-500/20">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 mt-2"
          >
            {submitting ? "Enviando Proposta..." : "Enviar para Aprovação"}
          </button>
        </form>
      </div>
    </div>
  );
}

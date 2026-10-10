import React from "react";

interface ModalRemoverPostProps {
  isOpen: boolean;
  motivo: string;
  onMotivoChange: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  loading: boolean;
}

export function ModalRemoverPost({
  isOpen,
  motivo,
  onMotivoChange,
  onConfirmar,
  onCancelar,
  loading,
}: ModalRemoverPostProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl border border-foreground/10 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
        <h3 className="text-lg font-bold text-red-500">Remover Postagem</h3>
        <p className="text-sm text-foreground/80">
          Informe a justificativa ou motivo da remoção desta postagem:
        </p>
        <textarea
          required
          data-testid="motivo-remocao-post"
          value={motivo}
          onChange={(e) => onMotivoChange(e.target.value)}
          placeholder="Descreva o motivo da remoção..."
          className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm outline-none resize-none h-24"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 rounded-lg font-medium hover:bg-foreground/5 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={!motivo.trim() || loading}
            data-testid="confirmar-remocao-post"
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Removendo..." : "Confirmar Remoção"}
          </button>
        </div>
      </div>
    </div>
  );
}

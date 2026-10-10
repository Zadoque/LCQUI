import React from "react";

interface ModalArquivarTurmaDialogProps {
  isOpen: boolean;
  nomeTurma: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  arquivando: boolean;
}

export function ModalArquivarTurmaDialog({
  isOpen,
  nomeTurma,
  onConfirmar,
  onCancelar,
  arquivando,
}: ModalArquivarTurmaDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl border border-foreground/10 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
        <h3 className="text-lg font-bold">Arquivar turma?</h3>
        <p className="text-sm text-foreground/80">
          Tem certeza que deseja arquivar <strong>{nomeTurma}</strong>? A turma ficará em modo somente leitura e poderá ser
          desarquivada posteriormente.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 rounded-lg font-medium hover:bg-foreground/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={arquivando}
            data-testid="confirmar-arquivar-turma"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {arquivando ? "Arquivando..." : "Confirmar Arquivamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

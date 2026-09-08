import React, { useState } from "react";
import { Bell, Plus, FileText, ClipboardList, Beaker } from "lucide-react";

interface ProfessorDashboardBarProps {
  turmasCount: number;
  onOpenNovoAluno: () => void;
  onOpenNovoRoteiro: () => void;
  onOpenGerenciarRoteiros: () => void;
}

export default function ProfessorDashboardBar({
  turmasCount,
  onOpenNovoAluno,
  onOpenNovoRoteiro,
  onOpenGerenciarRoteiros,
}: ProfessorDashboardBarProps) {
  const [isPlusOpen, setIsPlusOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <div className="w-full bg-card border-b border-border p-3 flex items-center justify-between z-30">
      <div className="flex items-center gap-4">
        {/* Notificações */}
        <div className="relative">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-full hover:bg-muted text-foreground/70 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          {isNotifOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-background border border-border rounded-xl shadow-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">Notificações</h3>
                <button className="text-xs text-primary hover:underline">Limpar tudo</button>
              </div>
              <div className="text-sm text-muted-foreground">
                Nenhuma notificação nova no momento.
              </div>
            </div>
          )}
        </div>

        {/* Botão + */}
        <div className="relative">
          <button 
            onClick={() => setIsPlusOpen(!isPlusOpen)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ações</span>
          </button>
          {isPlusOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden py-1">
              <button 
                onClick={() => { setIsPlusOpen(false); onOpenNovoAluno(); }}
                disabled={turmasCount === 0}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👨‍🎓 Novo Aluno na Turma
              </button>
              <button 
                onClick={() => { setIsPlusOpen(false); onOpenNovoRoteiro(); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                📄 Novo Roteiro de Experimento
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Atalhos de Gestão */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button 
          onClick={onOpenGerenciarRoteiros}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium whitespace-nowrap"
        >
          <FileText className="w-4 h-4 text-indigo-500" />
          Gerenciar Roteiros
        </button>
      </div>
    </div>
  );
}

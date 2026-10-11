import React from "react";
import { FileText } from "lucide-react";
import type { RoteiroProjecao } from "@/types/turmas";

export type { RoteiroProjecao };

interface NovoPostFormProps {
  titulo: string;
  setTitulo: (v: string) => void;
  descricao: string;
  setDescricao: (v: string) => void;
  idRoteiro: string;
  setIdRoteiro: (v: string) => void;
  roteiros: RoteiroProjecao[];
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onOpenNovoRoteiro?: () => void;
}

export function NovoPostForm({
  titulo,
  setTitulo,
  descricao,
  setDescricao,
  idRoteiro,
  setIdRoteiro,
  roteiros,
  loading,
  onSubmit,
  onOpenNovoRoteiro,
}: NovoPostFormProps) {
  return (
    <form onSubmit={onSubmit} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        Criar nova postagem
      </h3>
      <input
        type="text"
        required
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título da postagem..."
        className="w-full bg-background border border-input rounded-md px-4 py-2"
      />
      <textarea
        required
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Escreva as instruções ou recados para a turma..."
        className="w-full bg-background border border-input rounded-md px-4 py-2 h-24 resize-none"
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={idRoteiro}
            onChange={(e) => setIdRoteiro(e.target.value)}
            data-testid="seletor-roteiro-post"
            className="bg-background border border-input rounded-md px-3 py-2 text-sm w-full sm:w-64"
          >
            <option value="">Sem roteiro anexado</option>
            {roteiros.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onOpenNovoRoteiro}
            className="shrink-0 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm font-medium transition-colors"
            title="Fazer upload de um novo Roteiro PDF"
          >
            + Novo Roteiro
          </button>
        </div>
        <button
          type="submit"
          disabled={loading || !titulo || !descricao}
          className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-2 rounded-md font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Postando..." : "Postar"}
        </button>
      </div>
    </form>
  );
}

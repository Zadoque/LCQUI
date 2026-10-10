import React from "react";
import { ShieldAlert, Flag, Edit } from "lucide-react";

export interface ComentarioItem {
  id: string;
  id_usuario: string;
  nome_usuario: string;
  texto: string | null;
  criado_em: { toDate: () => Date } | null;
  editado: boolean;
  editado_em: unknown;
  moderado: boolean;
  motivo_moderacao?: string | null;
  moderado_por?: string | null;
  moderado_em?: unknown;
  aviso_institucional?: string | null;
}

interface ComentarioItemRowProps {
  comentario: ComentarioItem;
  currentUserId?: string;
  isProfessor: boolean;
  visao: "AUTOR" | "COLEGA" | "AUDITOR" | null;
  moderandoId: string | null;
  motivoModeracao: string;
  onMotivoModeracaoChange: (v: string) => void;
  onConfirmarModeracao: (id: string) => void;
  onCancelarModeracao: () => void;
  loadingMod: string | null;
  comentarioEditando: string | null;
  textoEditando: string;
  onTextoEditandoChange: (v: string) => void;
  onEditarComentario: (id: string) => void;
  onCancelarEdicaoComentario: () => void;
  loadingEdicao: string | null;
  onIniciarModeracao: (id: string) => void;
  onIniciarEdicaoComentario: (c: ComentarioItem) => void;
}

export function ComentarioItemRow({
  comentario: c,
  currentUserId,
  isProfessor,
  visao,
  moderandoId,
  motivoModeracao,
  onMotivoModeracaoChange,
  onConfirmarModeracao,
  onCancelarModeracao,
  loadingMod,
  comentarioEditando,
  textoEditando,
  onTextoEditandoChange,
  onEditarComentario,
  onCancelarEdicaoComentario,
  loadingEdicao,
  onIniciarModeracao,
  onIniciarEdicaoComentario,
}: ComentarioItemRowProps) {
  const date = c.criado_em?.toDate ? c.criado_em.toDate() : new Date();
  const isOwner = currentUserId === c.id_usuario;
  const canModerate = isProfessor && !isOwner;

  return (
    <div className="flex gap-3 text-sm" data-testid="comentario-item">
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
        U
      </div>
      <div className="flex-1 bg-background/50 p-3 rounded-xl border border-border/50 relative group">
        <div className="flex justify-between items-start mb-1">
          <span className="font-semibold">
            {c.nome_usuario || `Usuário ${c.id_usuario.substring(0, 5)}`}
            {c.moderado && isOwner && (
              <span className="ml-2 text-xs text-amber-600 font-normal">(moderado)</span>
            )}
            {c.editado && !c.moderado && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">(editado)</span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {moderandoId === c.id ? (
          <div className="space-y-2 mt-2">
            <textarea
              value={motivoModeracao}
              onChange={(e) => onMotivoModeracaoChange(e.target.value)}
              placeholder="Motivo da moderação..."
              aria-label="Motivo da moderação"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[80px] max-h-[300px] overflow-y-auto"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => onConfirmarModeracao(c.id)}
                disabled={!motivoModeracao.trim() || loadingMod === c.id}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {loadingMod === c.id ? "Moderando..." : "Confirmar moderação"}
              </button>
              <button
                onClick={onCancelarModeracao}
                disabled={loadingMod === c.id}
                className="px-3 py-1.5 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : comentarioEditando === c.id ? (
          <div className="space-y-2 mt-2">
            <textarea
              value={textoEditando}
              onChange={(e) => onTextoEditandoChange(e.target.value)}
              placeholder="Editar comentário..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[80px] max-h-[300px] overflow-y-auto"
              rows={3}
              disabled={loadingEdicao === c.id}
              data-testid="editar-texto-comentario"
            />
            <div className="flex gap-2">
              <button
                onClick={() => onEditarComentario(c.id)}
                disabled={loadingEdicao === c.id || !textoEditando.trim()}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                data-testid="salvar-edicao-comentario"
              >
                {loadingEdicao === c.id ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={onCancelarEdicaoComentario}
                disabled={loadingEdicao === c.id}
                className="px-3 py-1.5 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            {c.texto !== null ? (
              <p className="text-foreground/80 whitespace-pre-wrap break-words" data-testid="comentario-texto">
                {c.texto}
              </p>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground italic">
                <ShieldAlert className="w-4 h-4" />
                <span>{c.aviso_institucional || "Comentário moderado."}</span>
              </div>
            )}
          </>
        )}

        {visao === "AUDITOR" && c.moderado && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Flag className="w-3 h-3" />
            <span>Motivo: {c.motivo_moderacao}</span>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isOwner && (
            <button
              onClick={() => onIniciarEdicaoComentario(c)}
              className="p-1.5 bg-background border border-border rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"
              title="Editar comentário"
              aria-label="Editar comentário"
            >
              <Edit className="w-3 h-3" />
            </button>
          )}
          {!c.moderado && canModerate && (
            <button
              onClick={() => onIniciarModeracao(c.id)}
              disabled={loadingMod === c.id}
              className="p-1.5 bg-background border border-border rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
              title="Moderar comentário"
              aria-label="Moderar comentário"
            >
              <Flag className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

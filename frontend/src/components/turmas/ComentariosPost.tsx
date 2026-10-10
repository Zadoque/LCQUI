import React, { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { ComentarioItemRow, type ComentarioItem } from "@/components/turmas/ComentarioItemRow";

interface ComentariosPostProps {
  turmaId: string;
  postId: string;
  readOnly?: boolean;
}

export default function ComentariosPost({ turmaId, postId, readOnly }: ComentariosPostProps) {
  const { user, roles } = useAuth();
  const [comentarios, setComentarios] = useState<ComentarioItem[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMod, setLoadingMod] = useState<string | null>(null);
  const [loadingEdicao, setLoadingEdicao] = useState<string | null>(null);
  const [comentarioEditando, setComentarioEditando] = useState<string | null>(null);
  const [textoEditando, setTextoEditando] = useState("");
  const [visao, setVisao] = useState<"AUTOR" | "COLEGA" | "AUDITOR" | null>(null);
  const [moderandoId, setModerandoId] = useState<string | null>(null);
  const [motivoModeracao, setMotivoModeracao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");

  const carregar = useCallback(async () => {
    try {
      const functions = getFunctions();
      const listar = httpsCallable(functions, "listarComentariosPost");
      const idOp = `listar-${turmaId}-${postId}-${Date.now()}`;
      const resp = await listar({ idOperacao: idOp, idTurma: turmaId, idPost: postId });
      const dados = resp.data as { comentarios: ComentarioItem[]; visao: string };
      setComentarios(dados.comentarios);
      setVisao(dados.visao as "AUTOR" | "COLEGA" | "AUDITOR");
    } catch (erro: unknown) {
      console.error("Erro ao listar comentários:", erro);
    }
  }, [turmaId, postId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleComentar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;
    setLoading(true);
    setErro(null);
    try {
      const functions = getFunctions();
      const adicionarComentario = httpsCallable(functions, "adicionarComentario");
      const idOp = `coment-${turmaId}-${postId}-${Date.now()}`;
      await adicionarComentario({
        idOperacao: idOp,
        idTurma: turmaId,
        idPost: postId,
        texto: novoComentario,
      });
      setNovoComentario("");
      await carregar();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao comentar.";
      console.error("Erro ao comentar:", error);
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarModeracao = (idComentario: string) => {
    setModerandoId(idComentario);
    setMotivoModeracao("");
  };

  const handleCancelarModeracao = () => {
    setModerandoId(null);
    setMotivoModeracao("");
  };

  const handleConfirmarModeracao = async (idComentario: string) => {
    if (!motivoModeracao.trim()) return;
    setLoadingMod(idComentario);
    setErro(null);
    try {
      const functions = getFunctions();
      const moderar = httpsCallable(functions, "moderarComentario");
      const idOp = `mod-${turmaId}-${postId}-${idComentario}-${Date.now()}`;
      await moderar({
        idOperacao: idOp,
        idTurma: turmaId,
        idPost: postId,
        idComentario,
        motivo: motivoModeracao.trim(),
      });
      await carregar();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao moderar.";
      console.error("Erro ao moderar:", error);
      setErro(msg);
    } finally {
      setModerandoId(null);
      setMotivoModeracao("");
      setLoadingMod(null);
    }
  };

  const handleIniciarEdicaoComentario = (comentario: ComentarioItem) => {
    setComentarioEditando(comentario.id);
    setTextoEditando(comentario.texto || "");
  };

  const handleCancelarEdicaoComentario = () => {
    setComentarioEditando(null);
    setTextoEditando("");
  };

  const handleEditarComentario = async (idComentario: string) => {
    if (!textoEditando.trim()) return;

    setLoadingEdicao(idComentario);
    setErro(null);
    try {
      const functions = getFunctions();
      const editarComentario = httpsCallable(functions, "editarComentario");
      const idOp = `editar-comentario-${turmaId}-${postId}-${idComentario}-${Date.now()}`;

      await editarComentario({
        idOperacao: idOp,
        idTurma: turmaId,
        idPost: postId,
        idComentario,
        texto: textoEditando.trim(),
      });

      setComentarioEditando(null);
      setTextoEditando("");
      await carregar();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao editar comentário.";
      console.error("Erro ao editar comentário:", error);
      setErro(msg);
    } finally {
      setLoadingEdicao(null);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-4">
      <div className="space-y-3">
        {comentarios.map((c) => (
          <ComentarioItemRow
            key={c.id}
            comentario={c}
            currentUserId={user?.uid}
            isProfessor={isProfessor}
            visao={visao}
            moderandoId={moderandoId}
            motivoModeracao={motivoModeracao}
            onMotivoModeracaoChange={setMotivoModeracao}
            onConfirmarModeracao={handleConfirmarModeracao}
            onCancelarModeracao={handleCancelarModeracao}
            loadingMod={loadingMod}
            comentarioEditando={comentarioEditando}
            textoEditando={textoEditando}
            onTextoEditandoChange={setTextoEditando}
            onEditarComentario={handleEditarComentario}
            onCancelarEdicaoComentario={handleCancelarEdicaoComentario}
            loadingEdicao={loadingEdicao}
            onIniciarModeracao={handleIniciarModeracao}
            onIniciarEdicaoComentario={handleIniciarEdicaoComentario}
          />
        ))}
        {comentarios.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        )}
      </div>

      {erro && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
          {erro}
        </div>
      )}

      {readOnly ? (
        <p className="text-xs text-muted-foreground italic py-1">
          Turma em modo somente leitura (arquivada). Novos comentários estão desabilitados.
        </p>
      ) : (
        <form onSubmit={handleComentar} className="flex gap-2 mt-2">
          <textarea
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            placeholder="Escreva um comentário..."
            className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[80px] max-h-[300px] overflow-y-auto"
            rows={2}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !novoComentario.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Comentar
          </button>
        </form>
      )}
    </div>
  );
}

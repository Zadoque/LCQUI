import React, { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, Flag, Edit } from "lucide-react";

interface ComentariosPostProps {
  turmaId: string;
  postId: string;
}

interface ComentarioItem {
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

export default function ComentariosPost({ turmaId, postId }: ComentariosPostProps) {
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
      alert(msg);
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
      alert(msg);
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
      alert(msg);
    } finally {
      setLoadingEdicao(null);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-4">
      <div className="space-y-3">
        {comentarios.map((c) => {
          const date = c.criado_em?.toDate ? c.criado_em.toDate() : new Date();
          const isOwner = user?.uid === c.id_usuario;
          const canModerate = isProfessor && !isOwner;
          return (
            <div key={c.id} className="flex gap-3 text-sm" data-testid="comentario-item">
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
                        onChange={(e) => setMotivoModeracao(e.target.value)}
                        placeholder="Motivo da moderação..."
                        aria-label="Motivo da moderação"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[80px] max-h-[300px] overflow-y-auto"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirmarModeracao(c.id)}
                          disabled={!motivoModeracao.trim() || loadingMod === c.id}
                          className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                          {loadingMod === c.id ? "Moderando..." : "Confirmar moderação"}
                        </button>
                        <button
                          onClick={handleCancelarModeracao}
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
                        onChange={(e) => setTextoEditando(e.target.value)}
                        placeholder="Editar comentário..."
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[80px] max-h-[300px] overflow-y-auto"
                        rows={3}
                        disabled={loadingEdicao === c.id}
                        data-testid="editar-texto-comentario"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditarComentario(c.id)}
                          disabled={loadingEdicao === c.id || !textoEditando.trim()}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                          data-testid="salvar-edicao-comentario"
                        >
                          {loadingEdicao === c.id ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          onClick={handleCancelarEdicaoComentario}
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
                        <p className="text-foreground/80 whitespace-pre-wrap break-words" data-testid="comentario-texto">{c.texto}</p>
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
                        onClick={() => handleIniciarEdicaoComentario(c)}
                        className="p-1.5 bg-background border border-border rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"
                        title="Editar comentário"
                        aria-label="Editar comentário"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                    {!c.moderado && canModerate && (
                      <button
                        onClick={() => handleIniciarModeracao(c.id)}
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
        })}
        {comentarios.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        )}
      </div>

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
    </div>
  );
}

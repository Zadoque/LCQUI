import React, { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, Flag } from "lucide-react";

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
  const [visao, setVisao] = useState<"AUTOR" | "COLEGA" | "AUDITOR" | null>(null);

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

  const handleModerar = async (idComentario: string) => {
    const motivo = prompt("Motivo da moderação:");
    if (!motivo?.trim()) return;
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
        motivo: motivo.trim(),
      });
      await carregar();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao moderar.";
      console.error("Erro ao moderar:", error);
      alert(msg);
    } finally {
      setLoadingMod(null);
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
            <div key={c.id} className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                U
              </div>
              <div className="flex-1 bg-background/50 p-3 rounded-xl border border-border/50 relative group">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold">
                    {c.nome_usuario || `Usuário ${c.id_usuario.substring(0, 5)}`}
                    {c.moderado && visao === "AUTOR" && isOwner && (
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
                {c.texto !== null ? (
                  <p className="text-foreground/80 whitespace-pre-wrap break-words">{c.texto}</p>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground italic">
                    <ShieldAlert className="w-4 h-4" />
                    <span>{c.aviso_institucional || "Comentário moderado."}</span>
                  </div>
                )}
                {visao === "AUDITOR" && c.moderado && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Flag className="w-3 h-3" />
                    <span>Motivo: {c.motivo_moderacao}</span>
                  </div>
                )}
                {canModerate && !c.moderado && (
                  <button
                    onClick={() => handleModerar(c.id)}
                    disabled={loadingMod === c.id}
                    className="absolute top-2 right-2 p-1.5 bg-background border border-border rounded-lg text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500/10 disabled:opacity-50"
                    title="Moderar comentário"
                  >
                    <Flag className="w-3 h-3" />
                  </button>
                )}
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
        <input
          type="text"
          value={novoComentario}
          onChange={(e) => setNovoComentario(e.target.value)}
          placeholder="Escreva um comentário..."
          className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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

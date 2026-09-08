import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2 } from "lucide-react";

interface ComentariosPostProps {
  turmaId: string;
  postId: string;
}

export default function ComentariosPost({ turmaId, postId }: ComentariosPostProps) {
  const { user, roles } = useAuth();
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingExclusao, setLoadingExclusao] = useState<string | null>(null);

  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");

  useEffect(() => {
    const q = query(
      collection(db, "Turma", turmaId, "Posts", postId, "Comentarios"),
      orderBy("criado_em", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setComentarios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [turmaId, postId]);

  const handleComentar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;
    setLoading(true);
    try {
      const functions = getFunctions();
      const adicionarComentario = httpsCallable(functions, "adicionarComentario");
      await adicionarComentario({ idTurma: turmaId, idPost: postId, texto: novoComentario });
      setNovoComentario("");
    } catch (error: any) {
      console.error("Erro ao comentar:", error);
      alert(error.message || "Erro ao comentar.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (idComentario: string) => {
    if (!confirm("Excluir este comentário?")) return;
    setLoadingExclusao(idComentario);
    try {
      const functions = getFunctions();
      const excluirComentario = httpsCallable(functions, "excluirComentario");
      await excluirComentario({ idTurma: turmaId, idPost: postId, idComentario });
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      alert(error.message || "Erro ao excluir comentário.");
    } finally {
      setLoadingExclusao(null);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-4">
      <div className="space-y-3">
        {comentarios.map(c => {
          const date = c.criado_em?.toDate ? c.criado_em.toDate() : new Date();
          const isOwner = user?.uid === c.id_usuario;
          const canDelete = isProfessor || isOwner;
          return (
            <div key={c.id} className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                U
              </div>
              <div className="flex-1 bg-background/50 p-3 rounded-xl border border-border/50 relative group">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold">Usuário {c.id_usuario.substring(0, 5)}</span>
                  <span className="text-xs text-muted-foreground">
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-foreground/80 whitespace-pre-wrap break-words">
                  {c.texto}
                </p>
                {canDelete && (
                  <button 
                    onClick={() => handleExcluir(c.id)}
                    disabled={loadingExclusao === c.id}
                    className="absolute top-2 right-2 p-1.5 bg-background border border-border rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 disabled:opacity-50"
                    title="Excluir comentário"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {comentarios.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
        )}
      </div>
      
      <form onSubmit={handleComentar} className="flex gap-2 mt-2">
        <input 
          type="text"
          value={novoComentario}
          onChange={e => setNovoComentario(e.target.value)}
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

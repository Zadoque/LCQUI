import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, onSnapshot, where, getDoc, doc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Trash2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import ComentariosPost from "./ComentariosPost";

interface Turma {
  id: string;
  nome_turma: string;
  codigo_turma: string;
  status: string;
}

interface FeedTurmaProps {
  turma: Turma | null;
  onOpenNovoRoteiro?: () => void;
}

interface Post {
  id: string;
  titulo: string;
  descricao: string;
  criado_em: any;
  id_professor: string;
  id_roteiro_experimento?: string;
}

export default function FeedTurma({ turma, onOpenNovoRoteiro }: FeedTurmaProps) {
  const { user, roles } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [roteiros, setRoteiros] = useState<any[]>([]);
  
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [idRoteiro, setIdRoteiro] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingExclusao, setLoadingExclusao] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  
  // Dicionário para armazenar informações dos roteiros associados aos posts (id -> nome, url)
  const [roteirosPosts, setRoteirosPosts] = useState<{ [key: string]: any }>({});

  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");

  useEffect(() => {
    if (!turma) return;
    const q = query(
      collection(db, "Turma", turma.id, "Posts"),
      orderBy("criado_em", "desc")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
      setPosts(postsData);

      // Buscar os dados dos roteiros associados a estes posts (se não estiverem já em cache)
      const novosRoteiros: { [key: string]: any } = { ...roteirosPosts };
      for (const post of postsData) {
        if (post.id_roteiro_experimento && !novosRoteiros[post.id_roteiro_experimento]) {
          const roteiroSnap = await getDoc(doc(db, "Roteiro_Experimento", post.id_roteiro_experimento));
          if (roteiroSnap.exists()) {
            novosRoteiros[post.id_roteiro_experimento] = roteiroSnap.data();
          }
        }
      }
      setRoteirosPosts(novosRoteiros);
    });
    return () => unsubscribe();
  }, [turma]);

  useEffect(() => {
    if (!user || !isProfessor) return;
    const q = query(
      collection(db, "Roteiro_Experimento"),
      where("id_professor_upload", "==", user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      setRoteiros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user, isProfessor]);

  const handleCriarPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turma || !titulo.trim() || !descricao.trim()) return;
    setLoading(true);
    try {
      const functions = getFunctions();
      const criarPost = httpsCallable(functions, "criarPost");
      await criarPost({
        idTurma: turma.id,
        titulo,
        descricao,
        idRoteiroExperimento: idRoteiro || undefined
      });
      setTitulo("");
      setDescricao("");
      setIdRoteiro("");
    } catch (error: any) {
      console.error("Erro ao criar post:", error);
      alert(error.message || "Erro ao criar post.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirPost = async (idPost: string) => {
    if (!turma) return;
    if (!confirm("Tem certeza que deseja excluir esta postagem?")) return;
    setLoadingExclusao(idPost);
    try {
      const functions = getFunctions();
      const excluirPost = httpsCallable(functions, "excluirPost");
      await excluirPost({ idTurma: turma.id, idPost });
    } catch (error: any) {
      console.error("Erro ao excluir post:", error);
      alert(error.message || "Erro ao excluir post.");
    } finally {
      setLoadingExclusao(null);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  if (!turma) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50">
        <div className="text-center">
          <div className="text-6xl mb-4">🎓</div>
          <h2 className="text-2xl font-semibold text-foreground/70">
            Selecione uma turma ao lado para começarmos
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background/50">
      <div className="p-6 border-b border-border bg-card shadow-sm z-10">
        <h1 className="text-2xl font-bold">{turma.nome_turma}</h1>
        <p className="text-sm text-muted-foreground">Código: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{turma.codigo_turma}</span></p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isProfessor && (
          <form onSubmit={handleCriarPost} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Criar nova postagem
            </h3>
            <input 
              type="text"
              required
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Título da postagem..."
              className="w-full bg-background border border-input rounded-md px-4 py-2"
            />
            <textarea 
              required
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Escreva as instruções ou recados para a turma..."
              className="w-full bg-background border border-input rounded-md px-4 py-2 h-24 resize-none"
            />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={idRoteiro}
                  onChange={e => setIdRoteiro(e.target.value)}
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm w-full sm:w-64"
                >
                  <option value="">Sem roteiro anexado</option>
                  {roteiros.map(r => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
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
        )}

        {posts.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-card/50 rounded-xl border border-border border-dashed">
            Nenhuma postagem ainda nesta turma.
          </div>
        ) : (
          posts.map(post => {
            const date = post.criado_em?.toDate ? post.criado_em.toDate() : new Date();
            const isOwner = user?.uid === post.id_professor;
            const roteiro = post.id_roteiro_experimento ? roteirosPosts[post.id_roteiro_experimento] : null;
            
            return (
              <div key={post.id} className="bg-card border border-border rounded-xl p-5 shadow-sm relative group">
                {isProfessor && isOwner && (
                  <button 
                    onClick={() => handleExcluirPost(post.id)}
                    disabled={loadingExclusao === post.id}
                    className="absolute top-4 right-4 p-2 text-red-500 bg-background border border-border rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all disabled:opacity-50"
                    title="Excluir Postagem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="pr-10 mb-2">
                  <h3 className="text-lg font-bold">{post.titulo}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Postado por <span className="font-semibold">{(post as any).nome_professor || "Professor"}</span> em {date.toLocaleDateString()} às {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-foreground/90">{post.descricao}</p>
                
                {roteiro && (
                  <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <div>
                        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Anexo: {roteiro.nome}</p>
                      </div>
                    </div>
                    <a 
                      href={roteiro.file_url} 
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
                    >
                      Baixar PDF
                    </a>
                  </div>
                )}

                <hr className="my-4 border-border" />
                
                <div>
                  <button 
                    onClick={() => toggleComments(post.id)}
                    className="text-muted-foreground hover:text-foreground font-medium text-sm flex items-center gap-1"
                  >
                    {expandedComments[post.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedComments[post.id] ? "Ocultar comentários" : "Ver comentários / Comentar"}
                  </button>

                  {expandedComments[post.id] && (
                    <ComentariosPost turmaId={turma.id} postId={post.id} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

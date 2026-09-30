import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Trash2, FileText, ChevronDown, ChevronUp, Edit } from "lucide-react";
import ComentariosPost from "./ComentariosPost";

interface RoteiroProjecao {
  id: string;
  nome: string;
  status: string;
  referencia?: { storage_path?: string } | null;
}

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

interface RoteiroAnexo {
  id_roteiro: string;
  nome_arquivo: string;
  tamanho_bytes: number;
  storage_path: string;
  geracao: string;
}

interface Post {
  id: string;
  titulo: string;
  descricao: string;
  criado_em: any;
  id_professor: string;
  nome_professor?: string;
  id_roteiro_experimento?: string | null;
  roteiro_anexo?: RoteiroAnexo | null;
  removido_da_apresentacao?: boolean;
  editado?: boolean;
}

function RoteiroAnexoCard({
  anexo,
  idTurma,
  idPost,
  roles,
  onErro,
}: {
  anexo: RoteiroAnexo;
  idTurma: string;
  idPost: string;
  roles: string[];
  onErro: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const isAlunoBolsista = roles.includes("Aluno") || roles.includes("Bolsista");

  const handleDownload = async () => {
    setLoading(true);
    try {
      const fn = getFunctions();
      const emitir = httpsCallable(fn, "emitirUrlDownloadRoteiro");
      const payload: Record<string, string> = { idRoteiro: anexo.id_roteiro };
      if (isAlunoBolsista) {
        payload.idTurma = idTurma;
        payload.idPost = idPost;
      }
      const res = await emitir(payload);
      const data = res.data as { url: string };
      window.open(data.url, "_blank");
    } catch (err) {
      console.error("Erro ao emitir URL de download:", err);
      onErro("Erro ao gerar link de download do roteiro.");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div data-testid="roteiro-anexo-card" className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-500" />
        <div>
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            Anexo: {anexo.nome_arquivo}
          </p>
          <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
            {formatBytes(anexo.tamanho_bytes)}
          </p>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={loading}
        data-testid="botao-download-roteiro"
        className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
      >
        {loading ? "Gerando..." : "Baixar PDF"}
      </button>
    </div>
  );
}

export default function FeedTurma({ turma, onOpenNovoRoteiro }: FeedTurmaProps) {
  const { user, roles } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [roteiros, setRoteiros] = useState<RoteiroProjecao[]>([]);
  
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [idRoteiro, setIdRoteiro] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingExclusao, setLoadingExclusao] = useState<string | null>(null);
  const [loadingEdicao, setLoadingEdicao] = useState<string | null>(null);
  const [postEditando, setPostEditando] = useState<string | null>(null);
  const [tituloEditando, setTituloEditando] = useState("");
  const [descricaoEditando, setDescricaoEditando] = useState("");
  const [idRoteiroEditando, setIdRoteiroEditando] = useState("");
  const [idRoteiroOriginal, setIdRoteiroOriginal] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [erro, setErro] = useState<string | null>(null);

  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");

  useEffect(() => {
    if (!turma) return;
    const q = query(
      collection(db, "Turma", turma.id, "Posts"),
      orderBy("criado_em", "desc")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
      // Seção 11: Post removido só visível ao professor-dono e à chefia.
      const postsVisiveis = postsData.filter(p => {
        if (!p.removido_da_apresentacao) return true;
        return user?.uid === p.id_professor || roles.includes("Chefe_Geral");
      });
      setPosts(postsVisiveis);
    });
    return () => unsubscribe();
  }, [turma]);

  useEffect(() => {
    if (!user || !isProfessor) return;
    const fn = getFunctions();
    const listar = httpsCallable(fn, "listarRoteirosProfessor");
    let cancelado = false;
    listar({})
      .then((res) => {
        if (cancelado) return;
        setRoteiros((res.data as { roteiros: RoteiroProjecao[] }).roteiros);
      })
      .catch((err) => {
        console.error("Erro ao listar roteiros:", err);
      });
    return () => {
      cancelado = true;
    };
  }, [user, isProfessor]);

  const handleCriarPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turma || !titulo.trim() || !descricao.trim()) return;
    setLoading(true);
    try {
      const functions = getFunctions();
      const criarPost = httpsCallable(functions, "criarPost");
      // O SDK serializa `undefined` como `null`; omitir a chave ausente evita
      // rejeição pelo schema (roteiro é opcional — UI-11 / Seção 9).
      const idOp = `criar-${turma.id}-${Date.now()}`;
      const payload: Record<string, string> = {
        idOperacao: idOp,
        idTurma: turma.id,
        titulo,
        descricao
      };
      if (idRoteiro) payload.idRoteiroExperimento = idRoteiro;
      await criarPost(payload);
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
    const motivo = prompt("Motivo da remoção:");
    if (!motivo?.trim()) return;
    setLoadingExclusao(idPost);
    try {
      const functions = getFunctions();
      const removerPost = httpsCallable(functions, "removerPost");
      const idOp = `remover-${turma.id}-${idPost}-${Date.now()}`;
      await removerPost({ idOperacao: idOp, idTurma: turma.id, idPost, motivo: motivo.trim() });
    } catch (error: any) {
      console.error("Erro ao remover post:", error);
      alert(error.message || "Erro ao remover post.");
    } finally {
      setLoadingExclusao(null);
    }
  };

  const handleIniciarEdicaoPost = (post: Post) => {
    setPostEditando(post.id);
    setTituloEditando(post.titulo);
    setDescricaoEditando(post.descricao);
    const idRoteiroAtual = post.id_roteiro_experimento || null;
    setIdRoteiroEditando(idRoteiroAtual || "");
    setIdRoteiroOriginal(idRoteiroAtual);
  };

  const handleCancelarEdicao = () => {
    setPostEditando(null);
    setTituloEditando("");
    setDescricaoEditando("");
    setIdRoteiroEditando("");
    setIdRoteiroOriginal(null);
  };

  const handleEditarPost = async (idPost: string) => {
    if (!turma) return;
    if (!tituloEditando.trim() || !descricaoEditando.trim()) return;
    
    setLoadingEdicao(idPost);
    try {
      const functions = getFunctions();
      const editarPost = httpsCallable(functions, "editarPost");
      const idOp = `editar-${turma.id}-${idPost}-${Date.now()}`;
      
      const payload: Record<string, string | null | undefined> = {
        idOperacao: idOp,
        idTurma: turma.id,
        idPost,
        titulo: tituloEditando,
        descricao: descricaoEditando
      };
      
      if (idRoteiroEditando !== (idRoteiroOriginal || "")) {
        payload.idRoteiroExperimento = idRoteiroEditando || null;
      }
      
      await editarPost(payload);
      setPostEditando(null);
      setTituloEditando("");
      setDescricaoEditando("");
      setIdRoteiroEditando("");
      setIdRoteiroOriginal(null);
    } catch (error: any) {
      console.error("Erro ao editar post:", error);
      alert(error.message || "Erro ao editar post.");
    } finally {
      setLoadingEdicao(null);
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background/50">
      <div className="p-6 border-b border-border bg-card shadow-sm z-10">
        <h1 className="text-2xl font-bold">{turma.nome_turma}</h1>
        <p className="text-sm text-muted-foreground">Código: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{turma.codigo_turma}</span></p>
      </div>

      {erro && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm flex items-center justify-between">
          <span>{erro}</span>
          <button onClick={() => setErro(null)} className="font-bold">×</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isProfessor && turma.status !== "Arquivada" && (
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
                  data-testid="seletor-roteiro-post"
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
            
            return (
              <div key={post.id} className="bg-card border border-border rounded-xl p-5 shadow-sm relative group">
                {post.removido_da_apresentacao && (
                  <div className="absolute top-4 right-4 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                    Removido
                  </div>
                )}
                {((isProfessor && isOwner) || roles.includes("Chefe_Geral")) && !post.removido_da_apresentacao && (
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleIniciarEdicaoPost(post)}
                      className="p-2 text-blue-500 bg-background border border-border rounded-xl hover:bg-blue-500/10 transition-colors"
                      title="Editar Postagem"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleExcluirPost(post.id)}
                      disabled={loadingExclusao === post.id}
                      className="p-2 text-red-500 bg-background border border-border rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Remover Postagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="pr-10 mb-2">
                  {postEditando === post.id ? (
                    <div className="space-y-3">
                      <input 
                        type="text"
                        required
                        value={tituloEditando}
                        onChange={e => setTituloEditando(e.target.value)}
                        placeholder="Título da postagem..."
                        data-testid="editar-titulo-post"
                        className="w-full bg-background border border-input rounded-md px-4 py-2 text-lg font-bold"
                      />
                      <textarea 
                        required
                        value={descricaoEditando}
                        onChange={e => setDescricaoEditando(e.target.value)}
                        placeholder="Escreva as instruções ou recados para a turma..."
                        data-testid="editar-descricao-post"
                        className="w-full bg-background border border-input rounded-md px-4 py-2 h-24 resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={idRoteiroEditando}
                          onChange={e => setIdRoteiroEditando(e.target.value)}
                          data-testid="seletor-roteiro-edicao"
                          className="bg-background border border-input rounded-md px-3 py-2 text-sm w-64"
                        >
                          <option value="">Sem roteiro anexado</option>
                          {roteiros.map(r => (
                            <option key={r.id} value={r.id}>{r.nome}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditarPost(post.id)}
                            disabled={loadingEdicao === post.id || !tituloEditando.trim() || !descricaoEditando.trim()}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
                          >
                            {loadingEdicao === post.id ? "Salvando..." : "Salvar"}
                          </button>
                          <button 
                            onClick={handleCancelarEdicao}
                            disabled={loadingEdicao === post.id}
                            className="px-4 py-2 bg-background border border-border text-foreground rounded-md font-bold hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold">{post.titulo}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Postado por <span className="font-semibold">{post.nome_professor || "Professor"}</span> em {date.toLocaleDateString()} às {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {post.editado && <span className="ml-2 text-xs text-muted-foreground">(editado)</span>}
                      </p>
                    </>
                  )}
                </div>
                {postEditando !== post.id && <p className="whitespace-pre-wrap text-foreground/90">{post.descricao}</p>}
                
                {post.roteiro_anexo && (
                  <RoteiroAnexoCard
                    anexo={post.roteiro_anexo as RoteiroAnexo}
                    idTurma={turma.id}
                    idPost={post.id}
                    roles={roles}
                    onErro={(msg) => setErro(msg)}
                  />
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

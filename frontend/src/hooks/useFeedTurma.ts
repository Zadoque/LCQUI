import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import {
  resolverIdOperacao,
  lerIntencao,
  gravarIntencao,
  limparIntencao,
  chaveIntencaoStatusTurma,
  assinaturaStatusTurma,
} from "@/lib/intencaoOperacao";
import type { Turma, Post, RoteiroProjecao } from "@/types/turmas";

export function useFeedTurma(turma: Turma | null) {
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
  const [modalArquivar, setModalArquivar] = useState(false);
  const [arquivando, setArquivando] = useState(false);
  const [modalRemoverPost, setModalRemoverPost] = useState<string | null>(null);
  const [motivoRemocaoPost, setMotivoRemocaoPost] = useState("");

  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");

  useEffect(() => {
    if (!turma) return;
    const q = query(
      collection(db, "Turma", turma.id, "Posts"),
      orderBy("criado_em", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Post[];
      const postsVisiveis = postsData.filter((p) => {
        if (!p.removido_da_apresentacao) return true;
        return user?.uid === p.id_professor || roles.includes("Chefe_Geral");
      });
      setPosts(postsVisiveis);
    });
    return () => unsubscribe();
  }, [turma, user, roles]);

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
    setErro(null);
    try {
      const functions = getFunctions();
      const criarPost = httpsCallable(functions, "criarPost");
      const idOp = `criar-${turma.id}-${Date.now()}`;
      const payload: Record<string, string> = {
        idOperacao: idOp,
        idTurma: turma.id,
        titulo,
        descricao,
      };
      if (idRoteiro) payload.idRoteiroExperimento = idRoteiro;
      await criarPost(payload);
      setTitulo("");
      setDescricao("");
      setIdRoteiro("");
    } catch (error: unknown) {
      console.error("Erro ao criar post:", error);
      const msg = error instanceof Error ? error.message : "Erro ao criar post.";
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirPost = (idPost: string) => {
    setModalRemoverPost(idPost);
    setMotivoRemocaoPost("");
  };

  const handleConfirmarExclusaoPost = async () => {
    if (!turma || !modalRemoverPost || !motivoRemocaoPost.trim()) return;
    const idPost = modalRemoverPost;
    setLoadingExclusao(idPost);
    setErro(null);
    try {
      const functions = getFunctions();
      const removerPost = httpsCallable(functions, "removerPost");
      const idOp = `remover-${turma.id}-${idPost}-${Date.now()}`;
      await removerPost({ idOperacao: idOp, idTurma: turma.id, idPost, motivo: motivoRemocaoPost.trim() });
      setModalRemoverPost(null);
      setMotivoRemocaoPost("");
    } catch (error: unknown) {
      console.error("Erro ao remover post:", error);
      const msg = error instanceof Error ? error.message : "Erro ao remover post.";
      setErro(msg);
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
    setErro(null);
    try {
      const functions = getFunctions();
      const editarPost = httpsCallable(functions, "editarPost");
      const idOp = `editar-${turma.id}-${idPost}-${Date.now()}`;

      const payload: Record<string, string | null | undefined> = {
        idOperacao: idOp,
        idTurma: turma.id,
        idPost,
        titulo: tituloEditando,
        descricao: descricaoEditando,
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
    } catch (error: unknown) {
      console.error("Erro ao editar post:", error);
      const msg = error instanceof Error ? error.message : "Erro ao editar post.";
      setErro(msg);
    } finally {
      setLoadingEdicao(null);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const podeArquivar =
    turma &&
    turma.status === "Ativo" &&
    (roles.includes("Chefe_Geral") || user?.uid === turma.id_professor);

  const handleArquivar = async () => {
    if (!turma) return;
    setArquivando(true);
    try {
      const status = "Arquivada";
      const session = typeof window !== "undefined" ? window.sessionStorage : null;
      const chave = chaveIntencaoStatusTurma(turma.id, status);
      const assinatura = assinaturaStatusTurma(turma.id, status);
      const atual = session ? lerIntencao(session, chave) : null;
      const intencao = resolverIdOperacao(atual, assinatura, () => crypto.randomUUID());
      if (session) gravarIntencao(session, chave, intencao);

      const alterarStatusFn = httpsCallable(getFunctions(), "alterarStatusTurma");
      await alterarStatusFn({ idOperacao: intencao.idOperacao, idTurma: turma.id, status });
      if (session) limparIntencao(session, chave);
      setModalArquivar(false);
    } catch (err) {
      console.error("Erro ao arquivar turma:", err);
      const message = err instanceof Error ? err.message : "Erro ao arquivar turma.";
      setErro(message);
      setModalArquivar(false);
    } finally {
      setArquivando(false);
    }
  };

  return {
    user,
    roles,
    isProfessor,
    posts,
    roteiros,
    titulo,
    setTitulo,
    descricao,
    setDescricao,
    idRoteiro,
    setIdRoteiro,
    loading,
    loadingExclusao,
    loadingEdicao,
    postEditando,
    tituloEditando,
    setTituloEditando,
    descricaoEditando,
    setDescricaoEditando,
    idRoteiroEditando,
    setIdRoteiroEditando,
    expandedComments,
    toggleComments,
    erro,
    setErro,
    modalArquivar,
    setModalArquivar,
    arquivando,
    modalRemoverPost,
    setModalRemoverPost,
    motivoRemocaoPost,
    setMotivoRemocaoPost,
    handleCriarPost,
    handleExcluirPost,
    handleConfirmarExclusaoPost,
    handleIniciarEdicaoPost,
    handleCancelarEdicao,
    handleEditarPost,
    podeArquivar,
    handleArquivar,
  };
}

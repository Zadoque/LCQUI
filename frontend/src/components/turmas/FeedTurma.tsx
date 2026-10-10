import React from "react";
import { NovoPostForm } from "./NovoPostForm";
import { PostCardItem } from "./PostCardItem";
import { ModalRemoverPost } from "./ModalRemoverPost";
import { ModalArquivarTurmaDialog } from "./ModalArquivarTurmaDialog";
import { useFeedTurma } from "@/hooks/useFeedTurma";

interface Turma {
  id: string;
  nome_turma: string;
  codigo_turma?: string;
  status?: string;
  id_professor?: string;
}

interface FeedTurmaProps {
  turma: Turma | null;
  onOpenNovoRoteiro?: () => void;
}

export default function FeedTurma({ turma, onOpenNovoRoteiro }: FeedTurmaProps) {
  const {
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
  } = useFeedTurma(turma);

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
      <div className="p-6 border-b border-border bg-card shadow-sm z-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{turma.nome_turma}</h1>
          <p className="text-sm text-muted-foreground">
            Código: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{turma.codigo_turma}</span>
          </p>
        </div>
        {podeArquivar && (
          <button
            onClick={() => setModalArquivar(true)}
            data-testid="botao-arquivar-turma"
            className="shrink-0 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition-colors"
          >
            Arquivar
          </button>
        )}
      </div>

      {erro && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm flex items-center justify-between">
          <span>{erro}</span>
          <button onClick={() => setErro(null)} className="font-bold">
            ×
          </button>
        </div>
      )}

      {/* Modal de Arquivamento da Turma */}
      <ModalArquivarTurmaDialog
        isOpen={modalArquivar}
        nomeTurma={turma.nome_turma}
        onConfirmar={handleArquivar}
        onCancelar={() => setModalArquivar(false)}
        arquivando={arquivando}
      />

      {/* Modal de Remoção de Post */}
      <ModalRemoverPost
        isOpen={Boolean(modalRemoverPost)}
        motivo={motivoRemocaoPost}
        onMotivoChange={setMotivoRemocaoPost}
        onConfirmar={handleConfirmarExclusaoPost}
        onCancelar={() => setModalRemoverPost(null)}
        loading={loadingExclusao !== null}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isProfessor && turma.status !== "Arquivada" && (
          <NovoPostForm
            titulo={titulo}
            setTitulo={setTitulo}
            descricao={descricao}
            setDescricao={setDescricao}
            idRoteiro={idRoteiro}
            setIdRoteiro={setIdRoteiro}
            roteiros={roteiros}
            loading={loading}
            onSubmit={handleCriarPost}
            onOpenNovoRoteiro={onOpenNovoRoteiro}
          />
        )}

        {posts.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-card/50 rounded-xl border border-border border-dashed">
            Nenhuma postagem ainda nesta turma.
          </div>
        ) : (
          posts.map((post) => (
            <PostCardItem
              key={post.id}
              post={post}
              currentUserId={user?.uid}
              roles={roles}
              isProfessor={isProfessor}
              turmaId={turma.id}
              turmaStatus={turma.status}
              roteiros={roteiros}
              loadingExclusao={loadingExclusao}
              loadingEdicao={loadingEdicao}
              postEditando={postEditando}
              tituloEditando={tituloEditando}
              descricaoEditando={descricaoEditando}
              idRoteiroEditando={idRoteiroEditando}
              onSetTituloEditando={setTituloEditando}
              onSetDescricaoEditando={setDescricaoEditando}
              onSetIdRoteiroEditando={setIdRoteiroEditando}
              onIniciarEdicao={handleIniciarEdicaoPost}
              onCancelarEdicao={handleCancelarEdicao}
              onSalvarEdicao={handleEditarPost}
              onExcluirPost={handleExcluirPost}
              isExpandedComments={Boolean(expandedComments[post.id])}
              onToggleComments={toggleComments}
              onErro={(msg) => setErro(msg)}
            />
          ))
        )}
      </div>
    </div>
  );
}

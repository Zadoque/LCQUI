import React from "react";
import { Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import ComentariosPost from "./ComentariosPost";
import { RoteiroAnexoCard } from "./RoteiroAnexoCard";
import type { Post, RoteiroProjecao } from "@/types/turmas";

export type { Post };

interface PostCardItemProps {
  post: Post;
  currentUserId?: string;
  roles: string[];
  isProfessor: boolean;
  turmaId: string;
  turmaStatus?: string;
  roteiros: RoteiroProjecao[];
  loadingExclusao: string | null;
  loadingEdicao: string | null;
  postEditando: string | null;
  tituloEditando: string;
  descricaoEditando: string;
  idRoteiroEditando: string;
  onSetTituloEditando: (v: string) => void;
  onSetDescricaoEditando: (v: string) => void;
  onSetIdRoteiroEditando: (v: string) => void;
  onIniciarEdicao: (p: Post) => void;
  onCancelarEdicao: () => void;
  onSalvarEdicao: (idPost: string) => void;
  onExcluirPost: (idPost: string) => void;
  isExpandedComments: boolean;
  onToggleComments: (idPost: string) => void;
  onErro: (msg: string) => void;
}

export function PostCardItem({
  post,
  currentUserId,
  roles,
  isProfessor,
  turmaId,
  turmaStatus,
  roteiros,
  loadingExclusao,
  loadingEdicao,
  postEditando,
  tituloEditando,
  descricaoEditando,
  idRoteiroEditando,
  onSetTituloEditando,
  onSetDescricaoEditando,
  onSetIdRoteiroEditando,
  onIniciarEdicao,
  onCancelarEdicao,
  onSalvarEdicao,
  onExcluirPost,
  isExpandedComments,
  onToggleComments,
  onErro,
}: PostCardItemProps) {
  const date = post.criado_em?.toDate ? post.criado_em.toDate() : new Date();
  const isOwner = currentUserId === post.id_professor;
  const canManagePost = ((isProfessor && isOwner) || roles.includes("Chefe_Geral")) && !post.removido_da_apresentacao;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative group">
      {post.removido_da_apresentacao && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
          Removido
        </div>
      )}

      {canManagePost && (
        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={() => onIniciarEdicao(post)}
            className="p-2 text-blue-500 bg-background border border-border rounded-xl hover:bg-blue-500/10 transition-colors"
            title="Editar Postagem"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExcluirPost(post.id)}
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
              onChange={(e) => onSetTituloEditando(e.target.value)}
              placeholder="Título da postagem..."
              data-testid="editar-titulo-post"
              className="w-full bg-background border border-input rounded-md px-4 py-2 text-lg font-bold"
            />
            <textarea
              required
              value={descricaoEditando}
              onChange={(e) => onSetDescricaoEditando(e.target.value)}
              placeholder="Escreva as instruções ou recados para a turma..."
              data-testid="editar-descricao-post"
              className="w-full bg-background border border-input rounded-md px-4 py-2 h-24 resize-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={idRoteiroEditando}
                onChange={(e) => onSetIdRoteiroEditando(e.target.value)}
                data-testid="seletor-roteiro-edicao"
                className="bg-background border border-input rounded-md px-3 py-2 text-sm w-64"
              >
                <option value="">Sem roteiro anexado</option>
                {roteiros.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => onSalvarEdicao(post.id)}
                  disabled={loadingEdicao === post.id || !tituloEditando.trim() || !descricaoEditando.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {loadingEdicao === post.id ? "Salvando..." : "Salvar"}
                </button>
                <button
                  onClick={onCancelarEdicao}
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
              Postado por <span className="font-semibold">{post.nome_professor || "Professor"}</span> em{" "}
              {date.toLocaleDateString()} às {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {post.editado && <span className="ml-2 text-xs text-muted-foreground">(editado)</span>}
            </p>
          </>
        )}
      </div>

      {postEditando !== post.id && <p className="whitespace-pre-wrap text-foreground/90">{post.descricao}</p>}

      {post.roteiro_anexo && (
        <RoteiroAnexoCard
          anexo={post.roteiro_anexo}
          idTurma={turmaId}
          idPost={post.id}
          roles={roles}
          onErro={onErro}
        />
      )}

      <hr className="my-4 border-border" />

      <div>
        <button
          onClick={() => onToggleComments(post.id)}
          className="text-muted-foreground hover:text-foreground font-medium text-sm flex items-center gap-1"
        >
          {isExpandedComments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {isExpandedComments ? "Ocultar comentários" : "Ver comentários / Comentar"}
        </button>

        {isExpandedComments && (
          <ComentariosPost
            turmaId={turmaId}
            postId={post.id}
            readOnly={turmaStatus === "Arquivada"}
          />
        )}
      </div>
    </div>
  );
}

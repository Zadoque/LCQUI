"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Bell, Clock, CheckCircle2, XCircle, AlertCircle, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

export interface NotificacaoItem {
  id: string;
  tipo: string;
  papel_destinatario: string;
  id_destinatario: string;
  id_alvo: string;
  entidade_alvo?: string | null;
  id_turma?: string | null;
  id_quem_fez_acao?: string | null;
  lida: boolean;
  lida_em?: Timestamp | null;
  emitida_em?: Timestamp | null;
  expira_em?: Timestamp | null;
  mensagem_customizada?: string | null;
}

// Tipos acadêmicos V1 com mensagem contextual (RN-M13-07: exigem id_turma)
const TIPOS_ACADEMICOS_V1 = new Set([
  "POST",
  "COMENTARIO",
  "ADICIONADO",
  "REMOVIDO",
  "TURMA_ARQUIVADA",
  "TURMA_DESARQUIVADA",
  "CONVITE_PARA_TURMA",
]);

/** Rótulos legíveis para os tipos V1 ativos. */
export const ROTULO_TIPO: Record<string, string> = {
  POST: "Nova postagem",
  COMENTARIO: "Novo comentário",
  ADICIONADO: "Adicionado à turma",
  REMOVIDO: "Removido da turma",
  TURMA_ARQUIVADA: "Turma arquivada",
  TURMA_DESARQUIVADA: "Turma desarquivada",
  ROTEIRO_COMPARTILHADO: "Roteiro compartilhado",
  CONVITE_PARA_TURMA: "Convite para turma",
  REQUISICAO_EDICAO_BEM: "Requisição de edição de bem",
  REQUISICAO_ADICAO_BEM: "Requisição de adição de bem",
  REQUISICAO_BEM: "Requisição de bem",
  BEM_INSERVIVEL: "Bem inservível",
  DATA_DEVOLUCAO_REAGENTE: "Data de devolução",
  ENTREGA_ATRASADA: "Entrega atrasada",
  FRASCOS_VAZIOS: "Frascos vazios",
  FRASCOS_QUEBRADOS: "Frascos quebrados",
  FRASCOS_VENCIDOS: "Frascos vencidos",
  FRASCOS_A_SEREM_PESADOS: "Frascos a serem pesados",
  FRASCOS_EM_QUARENTENA: "Frascos em quarentena",
  ESCASSEZ_ESTOQUE: "Escassez no estoque",
  AUTO_ATENDIMENTO_RETIRADA: "Autoatendimento — retirada",
};

export function isNotificacaoExpirada(expira_em_ms: number | null | undefined, agora_ms: number): boolean {
  if (!expira_em_ms) return false;
  return expira_em_ms <= agora_ms;
}

export function filtrarNaoLidasAtivas(notificacoes: NotificacaoItem[], agora_ms: number): NotificacaoItem[] {
  return notificacoes.filter((n) => {
    const expMs = n.expira_em?.toMillis ? n.expira_em.toMillis() : null;
    return !n.lida && !isNotificacaoExpirada(expMs, agora_ms);
  });
}

export function buildDeepLinkConvite(idAlvo: string): string {
  return `/convite?id=${encodeURIComponent(idAlvo)}&via=notificacao`;
}

/**
 * RN-M13-04: mapeia `entidade_alvo` para deep link correspondente.
 * Retorna `null` quando não há rota implementada.
 */
export function buildDeepLink(notif: NotificacaoItem): string | null {
  switch (notif.entidade_alvo) {
    case "Convite_Aluno":
      return `/convite?id=${encodeURIComponent(notif.id_alvo)}&via=notificacao`;
    case "Bem_Patrimonial":
      return `/patrimonio/${encodeURIComponent(notif.id_alvo)}`;
    case "Requisicao_Bem":
      return `/patrimonio/requisicoes`;
    case "Turma":
      return `/turmas?turma=${encodeURIComponent(notif.id_alvo)}`;
    case "Post":
      return notif.id_turma
        ? `/turmas?turma=${encodeURIComponent(notif.id_turma)}`
        : null;
    case "Comentario":
      return notif.id_turma
        ? `/turmas?turma=${encodeURIComponent(notif.id_turma)}`
        : null;
    default:
      return null;
  }
}

export function shouldRenderInbox(user: { uid?: string } | null | undefined): boolean {
  return !!user?.uid;
}

/**
 * Gera uma mensagem contextual para notificações V1 ativas usando
 * `id_turma`/`id_alvo`/`mensagem_customizada` sem expor conteúdo protegido
 * (RN-M13-05).
 */
export function mensagemContextual(notif: NotificacaoItem): string {
  const rotulo = ROTULO_TIPO[notif.tipo] ?? notif.tipo.replace(/_/g, " ");

  if (TIPOS_ACADEMICOS_V1.has(notif.tipo)) {
    // Tipos acadêmicos: indicar contexto de turma quando disponível
    if (notif.tipo === "CONVITE_PARA_TURMA") {
      return "Você recebeu um convite para ingressar em uma turma acadêmica.";
    }
    if (notif.mensagem_customizada) {
      return notif.mensagem_customizada;
    }
    // Sem mensagem customizada: o tipo já é contextual suficiente
    return `${rotulo} na turma.`;
  }

  // Tipos operacionais: usar mensagem customizada se existir
  if (notif.mensagem_customizada) {
    return notif.mensagem_customizada;
  }

  return rotulo;
}

export function NotificacoesDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"nao_lidas" | "todas">("nao_lidas");
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [agora, setAgora] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // "Limpar tudo" state
  const [limparConfirmacao, setLimparConfirmacao] = useState(false);
  const [limparLoading, setLimparLoading] = useState(false);

  // "Marcar como lida" loading por item
  const [marcandoIds, setMarcandoIds] = useState<Set<string>>(new Set());

  const handleToggle = () => {
    setAgora(Date.now());
    setIsOpen((prev) => !prev);
    // Reset confirmation state when re-opening
    setLimparConfirmacao(false);
  };

  const permissionDeniedRef = useRef(false);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    // Reset permission-denied state on user change
    permissionDeniedRef.current = false;

    const colRef = collection(db, "Usuarios", user.uid, "Notificacoes");
    // A Rule de M13 exige que listagens provem a coerência entre o caminho da
    // caixa e `id_destinatario`; sem este filtro o Firestore nega a query.
    const notificacoesQuery = query(colRef, where("id_destinatario", "==", user.uid));
    const unsubscribe = onSnapshot(
      notificacoesQuery,
      (snapshot) => {
        const itens: NotificacaoItem[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data() as Omit<NotificacaoItem, "id">;
          itens.push({
            id: doc.id,
            ...d,
          });
        });

        // Ordenação em memória por emitida_em descrescente
        itens.sort((a, b) => {
          const tA = a.emitida_em?.toMillis ? a.emitida_em.toMillis() : 0;
          const tB = b.emitida_em?.toMillis ? b.emitida_em.toMillis() : 0;
          return tB - tA;
        });

        setNotificacoes(itens);
        setLoading(false);
      },
      (error) => {
        // permission-denied em cenários legítimos (conta sem papel
        // persistido antes da correção da Rule, ou listener órfão) não é
        // erro fatal — apenas encerra o listener e exibe caixa vazia.
        // Outros erros continuam registrados normalmente.
        if (error.code === "permission-denied") {
          if (!permissionDeniedRef.current) {
            permissionDeniedRef.current = true;
            console.warn("Notificações: leitura negada (caixa própria) — verifique autenticação/vínculo.");
            // Registra apenas uma vez; não polui o console em reconexões.
          }
        } else {
          console.error("Erro ao ouvir notificações:", error);
        }
        setNotificacoes([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const marcarComoLida = useCallback(async (notifId: string) => {
    if (marcandoIds.has(notifId)) return;
    setMarcandoIds((prev) => new Set(prev).add(notifId));
    try {
      const functions = getFunctions();
      const marcar = httpsCallable<{ idNotificacao: string }, { success: boolean }>(
        functions,
        "marcarNotificacaoComoLida"
      );
      await marcar({ idNotificacao: notifId });
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
    } finally {
      setMarcandoIds((prev) => {
        const next = new Set(prev);
        next.delete(notifId);
        return next;
      });
    }
  }, [marcandoIds]);

  const handleLimparTudo = useCallback(async () => {
    if (limparLoading) return;
    setLimparLoading(true);
    try {
      const functions = getFunctions();
      const limpar = httpsCallable<
        { corte?: string; cursor?: string; limite?: number },
        { corte: string; marcadas: number; continuar: boolean; proximo_cursor: string | null }
      >(functions, "limparTudoNotificacoes");

      let resultado = await limpar({});
      // Paginação automática: continua enquanto houver mais itens
      while (resultado.data.continuar && resultado.data.proximo_cursor) {
        resultado = await limpar({
          corte: resultado.data.corte,
          cursor: resultado.data.proximo_cursor,
        });
      }
    } catch (err) {
      console.error("Erro ao limpar notificações:", err);
    } finally {
      setLimparLoading(false);
      setLimparConfirmacao(false);
    }
  }, [limparLoading]);

  if (!user) return null;

  const isExpirada = (notif: NotificacaoItem) => {
    if (!notif.expira_em?.toMillis) return false;
    return notif.expira_em.toMillis() <= agora;
  };

  // Não lidas ativas: lida === false e não expirada
  const naoLidasAtivas = notificacoes.filter((n) => !n.lida && !isExpirada(n));
  const totalNaoLidas = naoLidasAtivas.length;

  const itensExibidos = abaAtiva === "nao_lidas" ? naoLidasAtivas : notificacoes;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full border border-foreground/10 text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        title="Notificações"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {totalNaoLidas > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {totalNaoLidas > 99 ? "99+" : totalNaoLidas}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-popover border border-foreground/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
          {/* Cabeçalho */}
          <div className="p-4 border-b border-foreground/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Notificações</h2>
              {totalNaoLidas > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {totalNaoLidas} novas
                </span>
              )}
            </div>
            {/* Botão "Limpar tudo" — visível quando há não lidas ativas */}
            {totalNaoLidas > 0 && !limparConfirmacao && (
              <button
                onClick={() => setLimparConfirmacao(true)}
                disabled={limparLoading}
                className="flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-foreground/5"
                aria-label="Limpar todas as notificações"
                data-testid="botao-limpar-tudo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar tudo
              </button>
            )}
            {/* Confirmação própria para "Limpar tudo" (sem prompt/confirm nativo) */}
            {limparConfirmacao && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleLimparTudo}
                  disabled={limparLoading}
                  className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                  data-testid="confirmar-limpar-tudo"
                >
                  {limparLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Confirmar
                </button>
                <button
                  onClick={() => setLimparConfirmacao(false)}
                  disabled={limparLoading}
                  className="text-xs text-foreground/50 hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-foreground/5"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Abas de filtro */}
          <div className="flex border-b border-foreground/10 text-xs font-semibold">
            <button
              onClick={() => setAbaAtiva("nao_lidas")}
              className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
                abaAtiva === "nao_lidas"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              Não lidas ({totalNaoLidas})
            </button>
            <button
              onClick={() => setAbaAtiva("todas")}
              className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
                abaAtiva === "todas"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              Todas ({notificacoes.length})
            </button>
          </div>

          {/* Lista de itens */}
          <div className="max-h-96 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="p-6 text-center text-xs text-foreground/50">Carregando notificações...</div>
            ) : itensExibidos.length === 0 ? (
              <div className="p-6 text-center text-xs text-foreground/50">
                {abaAtiva === "nao_lidas"
                  ? "Nenhuma notificação pendente no momento."
                  : "Nenhuma notificação registrada na sua caixa."}
              </div>
            ) : (
              itensExibidos.map((notif) => {
                const expirada = isExpirada(notif);
                const naoLidaAtiva = !notif.lida && !expirada;
                const marcando = marcandoIds.has(notif.id);

                if (notif.tipo === "CONVITE_PARA_TURMA") {
                  return (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-xl border transition-all ${
                        naoLidaAtiva
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/50 border-foreground/5 opacity-80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <AlertCircle className="w-3.5 h-3.5 text-primary" />
                          <span>Convite para Turma</span>
                        </div>
                        {expirada ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/60 font-medium">
                            Expirado
                          </span>
                        ) : notif.lida ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/60 font-medium">
                            Concluído
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                            Pendente
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-foreground/70 mt-1">
                        Você recebeu um convite para ingressar em uma turma acadêmica.
                      </p>

                      {notif.expira_em && (
                        <div className="flex items-center gap-1 text-[10px] text-foreground/50 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {expirada ? "Expirou em: " : "Válido até: "}
                            {notif.expira_em.toDate().toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      )}

                      {!expirada && (
                        <div className="mt-3 flex gap-2">
                          <Link
                            href={`/convite?id=${encodeURIComponent(notif.id_alvo)}&via=notificacao`}
                            onClick={() => setIsOpen(false)}
                            className="flex-1 py-1.5 px-3 bg-primary text-primary-foreground text-center text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Acessar Convite
                          </Link>
                          <Link
                            href={`/convite?id=${encodeURIComponent(notif.id_alvo)}&via=notificacao`}
                            onClick={() => setIsOpen(false)}
                            className="py-1.5 px-3 bg-foreground/10 hover:bg-red-500/10 text-foreground/70 hover:text-red-500 text-center text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Recusar
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                }

                // Notificação V1 com mensagem contextual
                const msg = mensagemContextual(notif);
                const rotulo = ROTULO_TIPO[notif.tipo] ?? notif.tipo.replace(/_/g, " ");
                const deepUrl = buildDeepLink(notif);

                const cardContent = (
                  <div
                    className={`p-3 rounded-xl border transition-all text-xs space-y-1 ${
                      naoLidaAtiva
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/50 border-foreground/5"
                    } ${deepUrl ? "cursor-pointer hover:bg-primary/10" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground">{rotulo}</p>
                      {!notif.lida && !expirada && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            marcarComoLida(notif.id);
                          }}
                          disabled={marcando}
                          className="shrink-0 text-foreground/40 hover:text-primary transition-colors"
                          aria-label="Marcar como lida"
                          data-testid={`marcar-lida-${notif.id}`}
                        >
                          {marcando ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-foreground/70">{msg}</p>
                  </div>
                );

                if (deepUrl) {
                  return (
                    <Link
                      key={notif.id}
                      href={deepUrl}
                      onClick={() => setIsOpen(false)}
                      data-testid={`notif-link-${notif.id}`}
                    >
                      {cardContent}
                    </Link>
                  );
                }

                return (
                  <div key={notif.id}>
                    {cardContent}
                  </div>
                );
              })
            )}
          </div>
          <div className="p-2 border-t border-foreground/10 text-center">
            <Link href="/notificacoes" onClick={() => setIsOpen(false)} className="text-xs font-semibold text-primary hover:text-primary/80" data-testid="link-ver-todas">
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

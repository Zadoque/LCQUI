"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { Bell, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export interface NotificacaoItem {
  id: string;
  tipo: string;
  papel_destinatario: string;
  id_destinatario: string;
  id_alvo: string;
  id_turma?: string | null;
  id_quem_fez_acao?: string | null;
  lida: boolean;
  lida_em?: Timestamp | null;
  emitida_em?: Timestamp | null;
  expira_em?: Timestamp | null;
  mensagem_customizada?: string | null;
}

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

export function shouldRenderInbox(user: { uid?: string } | null | undefined): boolean {
  return !!user?.uid;
}

export function NotificacoesDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"nao_lidas" | "todas">("nao_lidas");
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [agora, setAgora] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setAgora(Date.now());
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const colRef = collection(db, "Usuarios", user.uid, "Notificacoes");
    const unsubscribe = onSnapshot(
      colRef,
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
        console.error("Erro ao ouvir notificações:", error);
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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-foreground/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
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
          <div className="max-h-96 overflow-y-auto divide-y divide-foreground/5 p-2 space-y-2">
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

                if (notif.tipo === "CONVITE_PARA_TURMA") {
                  return (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-xl border transition-all ${
                        !notif.lida && !expirada
                          ? "bg-primary/5 border-primary/20"
                          : "bg-card border-foreground/5 opacity-80"
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

                // Notificação genérica
                return (
                  <div key={notif.id} className="p-3 rounded-xl border border-foreground/5 text-xs space-y-1">
                    <p className="font-semibold text-foreground">{notif.tipo.replace(/_/g, " ")}</p>
                    {notif.mensagem_customizada && (
                      <p className="text-foreground/70">{notif.mensagem_customizada}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

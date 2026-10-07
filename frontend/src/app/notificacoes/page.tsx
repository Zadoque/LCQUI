"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { NotificacaoItem, buildDeepLink, mensagemContextual, filtrarNaoLidasAtivas, isNotificacaoExpirada, ROTULO_TIPO } from "@/components/layout/NotificacoesDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

export default function NotificacoesPage() {
  const { user } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<"nao_lidas" | "todas">("nao_lidas");
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dadosDesatualizados, setDadosDesatualizados] = useState(false);
  const [offline, setOffline] = useState(false);
  const [limparConfirmacao, setLimparConfirmacao] = useState(false);
  const [limparLoading, setLimparLoading] = useState(false);

  // Real-time subscription
  useEffect(() => {
    if (!user?.uid) {
      setNotificacoes([]);
      setLoading(false);
      setDadosDesatualizados(false);
      setOffline(false);
      return;
    }

    setNotificacoes([]);
    setLoading(true);
    setDadosDesatualizados(false);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    const atualizarConectividade = () => setOffline(!navigator.onLine);
    window.addEventListener("online", atualizarConectividade);
    window.addEventListener("offline", atualizarConectividade);

    const colRef = collection(db, "Usuarios", user.uid, "Notificacoes");
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

        // Sort descending by emitida_em
        itens.sort((a, b) => {
          const tA = a.emitida_em?.toMillis ? a.emitida_em.toMillis() : 0;
          const tB = b.emitida_em?.toMillis ? b.emitida_em.toMillis() : 0;
          return tB - tA;
        });

        setNotificacoes(itens);
        setLoading(false);
        setDadosDesatualizados(snapshot.metadata.fromCache === true);
        setOffline(!navigator.onLine);
      },
      (error) => {
        console.error("Erro ao ouvir notificações:", error);
        setLoading(false);
        setDadosDesatualizados(true);
        setOffline(!navigator.onLine);
      }
    );

    return () => {
      unsubscribe();
      window.removeEventListener("online", atualizarConectividade);
      window.removeEventListener("offline", atualizarConectividade);
    };
  }, [user?.uid]);

  const [agora] = useState(() => Date.now());
  const naoLidasAtivas = filtrarNaoLidasAtivas(notificacoes, agora);
  const totalNaoLidas = naoLidasAtivas.length;
  const itensExibidos = abaAtiva === "nao_lidas" ? naoLidasAtivas : notificacoes;

  const handleLimparTudo = async () => {
    if (limparLoading) return;
    setLimparLoading(true);
    try {
      const functions = getFunctions();
      const limpar = httpsCallable<
        { corte?: string; cursor?: string; limite?: number },
        { corte: string; marcadas: number; continuar: boolean; proximo_cursor: string | null }
      >(functions, "limparTudoNotificacoes");

      let resultado = await limpar({});
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
  };

  const marcarComoLida = async (notifId: string) => {
    try {
      const functions = getFunctions();
      const marcar = httpsCallable<{ idNotificacao: string }, { success: boolean }>(
        functions,
        "marcarNotificacaoComoLida"
      );
      await marcar({ idNotificacao: notifId });
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Professor", "Aluno", "Bolsista"]}>
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Notificações</h1>

        {(offline || dadosDesatualizados) && (
          <div
            className="mb-4 px-3 py-2 text-xs text-amber-800 bg-amber-100/80 rounded-lg dark:text-amber-100 dark:bg-amber-950/50"
            role="status"
            data-testid="notificacoes-estado-offline"
          >
            {offline
              ? "Você está offline. Exibindo notificações autorizadas anteriormente; ações serão validadas ao reconectar."
              : "Notificações possivelmente desatualizadas. Aguarde a reconexão para confirmar mudanças."
            }
          </div>
        )}

        {/* Abas */}
        <div className="flex border-b border-foreground/10 text-sm font-semibold mb-4">
          <button
            onClick={() => setAbaAtiva("nao_lidas")}
            className={`px-4 py-2 transition-colors border-b-2 ${
              abaAtiva === "nao_lidas"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
            data-testid="aba-nao-lidas"
          >
            Não lidas ({totalNaoLidas})
          </button>
          <button
            onClick={() => setAbaAtiva("todas")}
            className={`px-4 py-2 transition-colors border-b-2 ${
              abaAtiva === "todas"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
            data-testid="aba-todas"
          >
            Todas ({notificacoes.length})
          </button>
        </div>

        {/* Lista de notificações */}
        <div className="space-y-3" data-testid="pagina-notificacoes">
          {loading ? (
            <div className="p-4 text-center text-foreground/50">Carregando...</div>
          ) : itensExibidos.length === 0 ? (
            <div className="p-4 text-center text-foreground/50">
              {abaAtiva === "nao_lidas"
                ? "Nenhuma notificação pendente no momento."
                : "Nenhuma notificação registrada na sua caixa."}
            </div>
          ) : (
            itensExibidos.map((notif) => {
              const expirada = isNotificacaoExpirada(
                notif.expira_em?.toMillis ? notif.expira_em.toMillis() : null,
                agora
              );

              // Badge com papel_destinatário
              const papelBadge = (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/60 font-medium">
                  {notif.papel_destinatario}
                </span>
              );

              // Build deep link
              const deepUrl = buildDeepLink(notif);

              // Renderização especial para CONVITE_PARA_TURMA
              if (notif.tipo === "CONVITE_PARA_TURMA") {
                return (
                  <div key={notif.id} className="p-4 rounded-xl border border-foreground/10 bg-muted/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                        <AlertCircle className="w-4 h-4 text-primary" />
                        <span>{ROTULO_TIPO[notif.tipo] ?? notif.tipo}</span>
                      </div>
                      {papelBadge}
                    </div>
                    <p className="text-sm text-foreground/70 mt-1">
                      {mensagemContextual(notif)}
                    </p>
                    {notif.expira_em && (
                      <div className="flex items-center gap-1 text-xs text-foreground/50 mt-1">
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
                          onClick={(e) => e.stopPropagation()}
                          className="py-1.5 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Acessar
                        </Link>
                        <Link
                          href={`/convite?id=${encodeURIComponent(notif.id_alvo)}&via=notificacao`}
                          onClick={(e) => e.stopPropagation()}
                          className="py-1.5 px-3 bg-foreground/10 hover:bg-red-500/10 text-foreground/70 hover:text-red-500 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Recusar
                        </Link>
                      </div>
                    )}
                  </div>
                );
              }

              // Normal notification item
              const cardContent = (
                <div className="p-4 rounded-xl border border-foreground/10 bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {ROTULO_TIPO[notif.tipo] ?? notif.tipo.replace(/_/g, " ")}
                      </p>
                      {papelBadge}
                    </div>
                    {!notif.lida && !expirada && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          marcarComoLida(notif.id);
                        }}
                        disabled={false}
                        className="shrink-0 text-foreground/40 hover:text-primary transition-colors"
                        aria-label="Marcar como lida"
                        data-testid={`marcar-lida-${notif.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/70 mt-1">
                    {mensagemContextual(notif)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-foreground/50 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{notif.emitida_em?.toDate().toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              );

              if (deepUrl) {
                return (
                  <Link
                    key={notif.id}
                    href={deepUrl}
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`notif-link-${notif.id}`}
                  >
                    {cardContent}
                  </Link>
                );
              }

              return <div key={notif.id}>{cardContent}</div>;
            })
          )}
        </div>

        {/* Limpar tudo */}
        {totalNaoLidas > 0 && (
          <div className="mt-6 flex justify-end">
            {!limparConfirmacao ? (
              <button
                onClick={() => setLimparConfirmacao(true)}
                disabled={limparLoading}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-1 text-sm font-semibold"
                data-testid="botao-limpar-tudo"
              >
                <Loader2 className={`w-4 h-4 ${limparLoading ? "animate-spin" : ""}`} />
                Limpar todas as não lidas
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleLimparTudo}
                  disabled={limparLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 text-sm font-semibold"
                  data-testid="confirmar-limpar-tudo"
                >
                  {limparLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Confirmar
                </button>
                <button
                  onClick={() => setLimparConfirmacao(false)}
                  disabled={limparLoading}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-foreground/5 transition-colors text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

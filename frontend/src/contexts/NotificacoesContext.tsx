"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import type { NotificacaoItem } from "@/types/notificacoes";

interface NotificacoesContextValue {
  notificacoes: NotificacaoItem[];
  loading: boolean;
  dadosDesatualizados: boolean;
  offline: boolean;
  marcarDadosDesatualizados: () => void;
}

const NotificacoesContext = createContext<NotificacoesContextValue | null>(null);

export function NotificacoesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dadosDesatualizados, setDadosDesatualizados] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      void Promise.resolve().then(() => {
        setNotificacoes([]);
        setLoading(false);
        setDadosDesatualizados(false);
        setOffline(false);
      });
      return;
    }

    void Promise.resolve().then(() => {
      setNotificacoes([]);
      setLoading(true);
      setDadosDesatualizados(false);
      setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    });

    const atualizarConectividade = () => setOffline(!navigator.onLine);
    window.addEventListener("online", atualizarConectividade);
    window.addEventListener("offline", atualizarConectividade);

    const colRef = collection(db, "Usuarios", user.uid, "Notificacoes");
    // M13 exige que a caixa consultada corresponda ao destinatário autenticado.
    const notificacoesQuery = query(colRef, where("id_destinatario", "==", user.uid));
    const unsubscribe = onSnapshot(
      notificacoesQuery,
      (snapshot) => {
        const itens: NotificacaoItem[] = [];
        snapshot.forEach((item) => {
          const dados = item.data() as Omit<NotificacaoItem, "id">;
          itens.push({ id: item.id, ...dados });
        });
        itens.sort((a, b) => {
          const instanteA = a.emitida_em?.toMillis ? a.emitida_em.toMillis() : 0;
          const instanteB = b.emitida_em?.toMillis ? b.emitida_em.toMillis() : 0;
          return instanteB - instanteA;
        });
        setNotificacoes(itens);
        setLoading(false);
        setDadosDesatualizados(snapshot.metadata.fromCache === true);
        setOffline(!navigator.onLine);
      },
      (error) => {
        if (error.code === "permission-denied") {
          console.warn("Notificações: leitura negada — verifique autenticação e vínculo.");
        } else {
          console.error("Erro ao ouvir notificações:", error);
        }
        setLoading(false);
        setDadosDesatualizados(true);
        setOffline(!navigator.onLine);
      },
    );

    return () => {
      unsubscribe();
      window.removeEventListener("online", atualizarConectividade);
      window.removeEventListener("offline", atualizarConectividade);
    };
  }, [user?.uid]);

  return (
    <NotificacoesContext.Provider
      value={{
        notificacoes,
        loading,
        dadosDesatualizados,
        offline,
        marcarDadosDesatualizados: () => setDadosDesatualizados(true),
      }}
    >
      {children}
    </NotificacoesContext.Provider>
  );
}

export function useNotificacoes() {
  const contexto = useContext(NotificacoesContext);
  if (!contexto) {
    throw new Error("useNotificacoes deve ser usado dentro de NotificacoesProvider.");
  }
  return contexto;
}

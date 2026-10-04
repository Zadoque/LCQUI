"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User, onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  construirEstadoAutenticacao,
  renovarEstadoAutenticacao,
} from "@/lib/authBootstrap.mjs";
import { resolverPapelAtivo, CHAVE_PAPEL_ATIVO } from "@/lib/papelAtivo.mjs";

interface EstadoAutenticacao {
  roles: string[];
  ativo: boolean;
}

interface AuthContextType {
  user: User | null;
  roles: string[];
  ativo: boolean;
  papelAtivo: string | null;
  isLoading: boolean;
  refreshSession: () => Promise<EstadoAutenticacao>;
  setPapelAtivo: (role: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  roles: [],
  ativo: false,
  papelAtivo: null,
  isLoading: true,
  refreshSession: async () => ({ roles: [], ativo: false }),
  setPapelAtivo: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [ativo, setAtivo] = useState<boolean>(false);
  const [papelAtivo, setPapelAtivo] = useState<string | null>(null);
  // Começa como true por padrão absoluto para prevenir flashes de UI vazados
  const [isLoading, setIsLoading] = useState(true);

  const aplicarEstado = useCallback((currentUser: User, estado: EstadoAutenticacao) => {
    setUser(currentUser);
    setRoles(estado.roles);
    setAtivo(estado.ativo);

    // Recomputa papelAtivo com base em roles e preferência persistida
    const preferido = localStorage.getItem(CHAVE_PAPEL_ATIVO);
    const novoPapelAtivo = resolverPapelAtivo(estado.roles, preferido);
    setPapelAtivo(novoPapelAtivo);
    if (novoPapelAtivo) {
      localStorage.setItem(CHAVE_PAPEL_ATIVO, novoPapelAtivo);
    } else {
      localStorage.removeItem(CHAVE_PAPEL_ATIVO);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<EstadoAutenticacao> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Sessão autenticada é obrigatória para renovar permissões.");
    }

    const estado = await renovarEstadoAutenticacao(currentUser);
    aplicarEstado(currentUser, estado);
    return estado;
  }, [aplicarEstado]);

  useEffect(() => {
    // onIdTokenChanged é o gatilho perfeito: aciona no login, logout e quando o token expira/renova
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Sempre busca o JWT em memória e extrai os custom claims. 
          // O backend (Cloud Functions) é quem dita essas roles.
          const tokenResult = await currentUser.getIdTokenResult();
          const estado = construirEstadoAutenticacao(tokenResult.claims.roles, tokenResult.claims.versao_permissoes, tokenResult.claims.ativo);

          aplicarEstado(currentUser, estado);
        } catch (error) {
          console.error("Erro ao validar token/claims do Firebase:", error);
          setUser(null);
          setRoles([]);
          setAtivo(false);
        }
      } else {
        setUser(null);
        setRoles([]);
        setAtivo(false);
        setPapelAtivo(null);
        localStorage.removeItem(CHAVE_PAPEL_ATIVO);
      }
      
      // Somente após ter certeza de QUEM é o usuário (ou se não tem), soltamos o render.
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [aplicarEstado]);

  const handleSetPapelAtivo = useCallback((role: string) => {
    if (!Array.isArray(roles) || roles.length === 0) return;
    if (!roles.includes(role)) return;
    setPapelAtivo(role);
    localStorage.setItem(CHAVE_PAPEL_ATIVO, role);
  }, [roles]);

  return (
    <AuthContext.Provider value={{ user, roles, ativo, papelAtivo, isLoading, refreshSession, setPapelAtivo: handleSetPapelAtivo }}>
      {children}
    </AuthContext.Provider>
  );
};

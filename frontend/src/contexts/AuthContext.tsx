"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { construirEstadoAutenticacao } from "@/lib/authBootstrap.mjs";

interface AuthContextType {
  user: User | null;
  roles: string[];
  ativo: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  roles: [],
  ativo: false,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [ativo, setAtivo] = useState<boolean>(false);
  // Começa como true por padrão absoluto para prevenir flashes de UI vazados
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged é o gatilho perfeito: aciona no login, logout e quando o token expira/renova
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Sempre busca o JWT em memória e extrai os custom claims. 
          // O backend (Cloud Functions) é quem dita essas roles.
          const tokenResult = await currentUser.getIdTokenResult();
          const estado = construirEstadoAutenticacao(tokenResult.claims.roles);
          
          setUser(currentUser);
          setRoles(estado.roles);
          setAtivo(estado.ativo);
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
      }
      
      // Somente após ter certeza de QUEM é o usuário (ou se não tem), soltamos o render.
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, roles, ativo, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

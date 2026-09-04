"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

interface AuthContextType {
  user: User | null;
  roles: string[];
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  roles: [],
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
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
          const userRoles = tokenResult.claims.roles as string[] || [];
          
          setUser(currentUser);
          setRoles(userRoles);
        } catch (error) {
          console.error("Erro ao validar token/claims do Firebase:", error);
          setUser(null);
          setRoles([]);
        }
      } else {
        setUser(null);
        setRoles([]);
      }
      
      // Somente após ter certeza de QUEM é o usuário (ou se não tem), soltamos o render.
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, roles, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

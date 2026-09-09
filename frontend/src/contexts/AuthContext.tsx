"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onIdTokenChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

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
          const userRoles = tokenResult.claims.roles as string[] || [];
          
          setUser(currentUser);
          setRoles(userRoles);

          // Verifica se o usuário tem roles. Se sim, está ativo.
          // Caso a lista de roles venha vazia, pode significar desativado. Buscamos no Firestore.
          if (userRoles.length > 0) {
            setAtivo(true);
          } else {
            const userDoc = await getDoc(doc(db, "Usuarios", currentUser.uid));
            if (userDoc.exists()) {
              setAtivo(userDoc.data().ativo === true);
            } else {
              setAtivo(false);
            }
          }
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

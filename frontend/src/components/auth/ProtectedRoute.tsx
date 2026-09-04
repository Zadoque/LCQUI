"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, roles, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Só toma decisões de roteamento DEPOIS que o Firebase determinou o estado e claims
    if (!isLoading) {
      if (!user) {
        // Usuário anônimo => Redireciona para login
        router.replace("/login");
      } else if (allowedRoles && allowedRoles.length > 0) {
        // Tem usuário, mas precisamos validar o papel exigido.
        const hasPermission = roles.some((role) => allowedRoles.includes(role));
        if (!hasPermission) {
          router.replace("/nao-autorizado");
        }
      }
    }
  }, [isLoading, user, roles, allowedRoles, router]);

  // Bloqueio Anti-Flash: 
  // Enquanto estiver carregando, OBRIGATORIAMENTE renderizamos Skeleton/Spinner.
  // Se não estiver carregando mas o user/role não passar (o que vai triggar o redirect acima),
  // retornamos null para não vazar nenhum milissegundo de UI sensível enquanto a navegação acontece.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = roles.some((role) => allowedRoles.includes(role));
    if (!hasPermission) return null;
  }

  // Passou no crivo: Firebase confirmou token válido e a role existe nas Claims.
  return (
    <>
      <Header />
      {children}
    </>
  );
}

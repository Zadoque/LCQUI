"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, roles, ativo, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Só toma decisões de roteamento DEPOIS que o Firebase determinou o estado e claims
    if (!isLoading) {
      if (!user) {
        // Usuário anônimo => Redireciona para login
        router.replace("/login");
      } else if (!ativo) {
        // Usuário autenticado sem documento Usuarios ativo (sem versao_permissoes)
        // — realmente desativado, vai para /desativado.
        // Conta com zero papéis mas ativo (versao_permissoes >= 1) permanece no layout.
        router.replace("/desativado");
      }
      // Nota: conta ativa sem o papel exigido NÃO é redirecionada para
      // /nao-autorizado. O layout (Header com sino UI-12, Sidebar) é
      // renderizado para permitir bootstrap de convite e notificações.
      // O conteúdo protegido é substituído por placeholder.
    }
  }, [isLoading, user, roles, ativo, allowedRoles, router]);

  // Bloqueio Anti-Flash: 
  // Enquanto estiver carregando, OBRIGATORIAMENTE renderizamos Skeleton/Spinner.
  // Se não estiver carregando mas o user não existe (o que vai triggar o redirect acima),
  // retornamos null para não vazar nenhum milissegundo de UI sensível enquanto a navegação acontece.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  // Usuário ativo sem o papel exigido: renderiza o layout completo (Header
  // com sino UI-12 + Sidebar) mas substitui o conteúdo protegido por placeholder
  // em vez de redirecionar para /nao-autorizado. Isto garante que contas com
  // zero papéis (bootstrap de convite M13) continuem vendo o sino.
  const lacksRole = allowedRoles && allowedRoles.length > 0 &&
    !roles.some((role) => allowedRoles.includes(role));

  if (lacksRole) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-md">
              <div className="mx-auto w-16 h-16 bg-foreground/5 flex items-center justify-center rounded-full">
                <svg className="w-8 h-8 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">Acesso restrito</h2>
              <p className="text-sm text-foreground/60">
                Esta seção exige um papel específico. Verifique suas notificações ou entre em contato com a administração.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Passou no crivo: Firebase confirmou token válido e a role existe nas Claims.
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        {children}
      </div>
    </div>
  );
}

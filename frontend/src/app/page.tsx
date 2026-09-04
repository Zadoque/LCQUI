"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Se estiver logado, joga para o Dashboard de Reagentes (Página Principal)
        router.replace("/reagentes");
      } else {
        // Se não estiver logado, joga para a Tela de Login
        router.replace("/login");
      }
    }
  }, [user, isLoading, router]);

  // Exibe um loader minimalista enquanto o AuthContext verifica o token JWT no Firebase
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </main>
  );
}

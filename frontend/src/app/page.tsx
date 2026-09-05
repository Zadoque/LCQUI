"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, roles, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (roles.includes("Chefe_Geral") || roles.includes("Professor") || roles.includes("Gestor_Almoxarifado") || roles.includes("Bolsista")) {
          router.replace("/reagentes");
        } else if (roles.includes("Gestor_Bens_Patrimoniais")) {
          router.replace("/patrimonio");
        } else {
          router.replace("/turmas");
        }
      } else {
        // Se não estiver logado, joga para a Tela de Login
        router.replace("/login");
      }
    }
  }, [user, roles, isLoading, router]);

  // Exibe um loader minimalista enquanto o AuthContext verifica o token JWT no Firebase
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </main>
  );
}

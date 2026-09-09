"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";

export default function DesativadoPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full bg-card shadow-lg rounded-lg p-8 text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Acesso Bloqueado</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Você não possui nenhum papel ativo no sistema. Se você acha que isso é um erro, por favor procure a equipe técnica.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
        >
          <LogOut size={16} />
          <span>Sair da conta</span>
        </button>
      </div>
    </div>
  );
}

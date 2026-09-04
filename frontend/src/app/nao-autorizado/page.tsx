"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decorativo Red (Aleta) */}
      <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl relative z-10 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-500 flex items-center justify-center rounded-full mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-foreground/70 mt-2 text-sm">
            Você não possui as permissões necessárias para acessar esta área do sistema.
          </p>
        </div>

        <div className="flex flex-col space-y-3 pt-4">
          <button
            onClick={() => router.replace("/")}
            className="w-full py-3 px-4 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground font-medium transition-all"
          >
            Voltar para o Início
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium transition-all"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </main>
  );
}

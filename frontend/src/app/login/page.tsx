"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const router = useRouter();
  
  // Se o usuário acessar /login mas já estiver logado, redireciona
  const { user, isLoading } = useAuth();
  if (!isLoading && user) {
    router.replace("/");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingForm(true);
    setErrorMsg("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // O ProtectedRoute ou o contexto no root cuidará do redirecionamento
      router.push("/");
    } catch (error: any) {
      // Normalização de Mensagens (Prevenção de Enumeração de Contas)
      // Evitamos dizer "user-not-found" ou "wrong-password" explicitamente.
      setErrorMsg("Credenciais inválidas. Verifique seu e-mail e senha.");
    } finally {
      setIsLoadingForm(false);
    }
  };

  if (isLoading) return null; // Evita flash da tela de login se já estiver logado

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decorativo Premium */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl relative z-10 transition-all duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">LCQUI</h1>
          <p className="text-sm text-foreground/60 mt-2">Acesso ao Sistema</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoadingForm}
            className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoadingForm ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

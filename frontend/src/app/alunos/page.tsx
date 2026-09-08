"use client";

import React, { useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db, functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

interface Aluno {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

export default function AlunosDashboard() {
  const { roles } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string; link?: string } | null>(null);

  // Filtro de banco obrigatório conforme Seção 5 da documentação
  const [filtroLetraInicial, setFiltroLetraInicial] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Form states
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAlunos = async () => {
    if (!filtroLetraInicial) {
      alert("Selecione uma letra inicial para realizar a busca.");
      return;
    }
    
    setLoading(true);
    setHasSearched(true);
    try {
      // Section 5 Search Strategy for Alunos:
      // "Busca via campo denormalizado letra_inicial (filtro de igualdade)."
      const q = query(
        collection(db, "Aluno"),
        where("letra_inicial", "==", filtroLetraInicial),
        limit(100)
      );
      const querySnapshot = await getDocs(q);
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Aluno[];
      setAlunos(lista);
    } catch (error) {
      console.error("Erro ao buscar alunos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvidar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setToastMessage(null);

    try {
      const convidarUsuario = httpsCallable(functions, "convidarUsuario");
      const result = await convidarUsuario({ email, nome, papel: "Aluno" });
      const data = result.data as { resetLink: string; uid: string };
      
      setToastMessage({
        type: "success",
        text: "Aluno convidado com sucesso!",
        link: data.resetLink
      });
      
      setIsModalOpen(false);
      setNome("");
      setEmail("");
      
      // Se a letra inicial do novo aluno coincidir com o filtro atual, atualiza a lista
      if (nome.charAt(0).toUpperCase() === filtroLetraInicial) {
        fetchAlunos();
      }
    } catch (error: any) {
      console.error("Erro ao convidar aluno:", error);
      setToastMessage({
        type: "error",
        text: error.message || "Erro ao convidar aluno"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAlunos = alunos.filter(a => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      (a.nome && a.nome.toLowerCase().includes(term)) ||
      (a.email && a.email.toLowerCase().includes(term))
    );
  });

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Alunos</h1>
              <p className="text-foreground/60 mt-1">
                Gestão de alunos (Acesso restrito ao Chefe Geral)
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              Novo Aluno
            </button>
          </header>

          {/* Toast Notification */}
          {toastMessage && (
            <div className={`p-4 rounded-xl shadow-lg border flex flex-col gap-2 ${
              toastMessage.type === "success" 
                ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" 
                : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {toastMessage.type === "success" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                )}
                {toastMessage.text}
              </div>
              {toastMessage.link && (
                <div className="mt-1 bg-background/50 p-3 rounded-lg border border-green-500/10 break-all text-sm">
                  <span className="font-semibold block mb-1">Link de Configuração de Senha:</span>
                  <a href={toastMessage.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
                    {toastMessage.link}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Filtro Obrigatório de Banco */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 border-2 border-primary/20 bg-primary/5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
              Passo 1: Filtro de Banco de Dados (Letra Inicial Obrigatória)
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-64">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Letra Inicial do Nome</label>
                <select
                  className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  value={filtroLetraInicial}
                  onChange={(e) => setFiltroLetraInicial(e.target.value)}
                >
                  <option value="">(Selecione)</option>
                  {alphabet.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <button
                onClick={fetchAlunos}
                className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 flex justify-center items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                Buscar no Banco
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-foreground/5 p-4 rounded-xl border border-foreground/10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/60 flex items-center gap-2 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
              Passo 2: Filtrar Resultados
            </h2>
            <div className="w-full sm:w-1/2">
              <input
                type="text"
                disabled={!hasSearched || alunos.length === 0}
                placeholder={hasSearched ? "Nome ou e-mail..." : "Busque no banco primeiro..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="glass-panel overflow-hidden rounded-2xl border border-foreground/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-foreground/70 border-b border-foreground/10">
                  <tr>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Nome</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">E-mail</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                      </td>
                    </tr>
                  ) : filteredAlunos.length > 0 ? (
                    filteredAlunos.map((aluno) => (
                      <tr key={aluno.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="px-5 py-4 font-semibold">{aluno.nome}</td>
                        <td className="px-5 py-4 text-foreground/70">{aluno.email}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            aluno.ativo !== false ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"
                          }`}>
                            {aluno.ativo !== false ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-16 text-center text-foreground/50">
                        {hasSearched
                          ? "Nenhum aluno encontrado para este filtro."
                          : "Selecione uma letra e clique em \"Buscar no Banco\"."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Novo Aluno */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl border border-foreground/10 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-foreground/10 flex justify-between items-center">
                  <h2 className="text-xl font-bold">Novo Aluno</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-foreground/50 hover:text-foreground">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                <form onSubmit={handleConvidar} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-foreground/80">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: Maria Silva"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-foreground/80">E-mail (UFSC)</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="maria.silva@grad.ufsc.br"
                    />
                  </div>
                  <div className="pt-4 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-lg font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Enviando...
                        </>
                      ) : (
                        "Convidar"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}

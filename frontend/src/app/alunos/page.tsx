"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, getDoc, doc, query, where, limit, onSnapshot } from "firebase/firestore";
import { db, functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { NovoAlunoModal } from "@/components/turmas/ProfessorModais";
import { HistoricoAlunoTurmaModal } from "@/components/turmas/HistoricoAlunoTurmaModal";

interface Aluno {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

export default function AlunosDashboard() {
  const { user, roles } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do Gestor
  const [filtroLetraInicial, setFiltroLetraInicial] = useState<string>("A");
  const [hasSearched, setHasSearched] = useState(false);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Estados do Professor
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [historicoModal, setHistoricoModal] = useState<{ isOpen: boolean, idAluno: string, nomeAluno: string, idTurma: string }>({ isOpen: false, idAluno: "", nomeAluno: "", idTurma: "" });
  const [loadingAcao, setLoadingAcao] = useState<string | null>(null);

  const isChefeGeral = roles.includes("Chefe_Geral");

  // Busca as turmas se for professor
  useEffect(() => {
    if (isChefeGeral || !user) return;
    const q = query(
      collection(db, "Turma"),
      where("id_professor", "==", user.uid),
      where("status", "==", "Ativo")
    );
    const unsub = onSnapshot(q, (snap) => {
      setTurmas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user, isChefeGeral]);

  // Listener para alunos da turma selecionada (Professor)
  useEffect(() => {
    if (isChefeGeral || !selectedTurma) {
      if (!isChefeGeral) setAlunos([]);
      return;
    }
    
    setLoading(true);
    const unsubAlunos = onSnapshot(collection(db, "Turma", selectedTurma, "Alunos"), (snap) => {
      const listaAlunos: Aluno[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          nome: data.nome || "Sem nome",
          email: data.email || "Sem e-mail",
          ativo: true // Assume ativo se está na turma
        };
      });
      setAlunos(listaAlunos);
      setLoading(false);
      setHasSearched(true);
    });

    return () => unsubAlunos();
  }, [selectedTurma, isChefeGeral]);

  const fetchAlunosGestor = async () => {
    if (!filtroLetraInicial) {
      alert("Selecione uma letra inicial para realizar a busca.");
      return;
    }
    
    setLoading(true);
    setHasSearched(true);
    try {
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

  const handleExcluirAluno = async (idAluno: string) => {
    if (!confirm("Deseja realmente remover este aluno da turma?")) return;
    setLoadingAcao(idAluno);
    try {
      const removerAlunoTurma = httpsCallable(functions, "removerAlunoTurma");
      await removerAlunoTurma({ idTurma: selectedTurma, idAluno });
      alert("Aluno removido com sucesso!");
    } catch (error: any) {
      console.error("Erro ao remover aluno:", error);
      alert(error.message || "Erro ao remover aluno.");
    } finally {
      setLoadingAcao(null);
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
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Professor"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Alunos</h1>
              <p className="text-foreground/60 mt-1">
                {isChefeGeral ? "Gestão global de alunos" : "Gestão de alunos por turma"}
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

          {/* Filtro Obrigatório de Banco */}
          <div className="bg-background border border-border rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
              Passo 1: Filtro de Banco de Dados ({isChefeGeral ? "Letra Inicial" : "Selecione a Turma"})
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              {isChefeGeral ? (
                <>
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
                    onClick={fetchAlunosGestor}
                    className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 flex justify-center items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    Buscar no Banco
                  </button>
                </>
              ) : (
                <div className="w-full sm:w-96">
                  <label className="block text-xs font-semibold mb-1 text-foreground/70">Turma</label>
                  <select
                    className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                  >
                    <option value="">Selecione uma turma...</option>
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>{t.nome_turma} ({t.codigo_turma})</option>
                    ))}
                  </select>
                </div>
              )}
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
                    {!isChefeGeral && (
                      <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs text-right">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {loading ? (
                    <tr>
                      <td colSpan={isChefeGeral ? 3 : 4} className="px-6 py-16 text-center">
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
                        {!isChefeGeral && (
                          <td className="px-5 py-4 text-right space-x-2">
                            <button
                              onClick={() => setHistoricoModal({ isOpen: true, idAluno: aluno.id, nomeAluno: aluno.nome, idTurma: selectedTurma })}
                              className="px-3 py-1.5 text-xs font-bold bg-foreground/5 hover:bg-foreground/10 rounded-lg transition-colors"
                            >
                              Histórico
                            </button>
                            <button
                              onClick={() => handleExcluirAluno(aluno.id)}
                              disabled={loadingAcao === aluno.id}
                              className="px-3 py-1.5 text-xs font-bold bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {loadingAcao === aluno.id ? "..." : "Remover"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isChefeGeral ? 3 : 4} className="px-6 py-16 text-center text-foreground/50">
                        {hasSearched
                          ? "Nenhum aluno encontrado para este filtro."
                          : isChefeGeral ? "Selecione uma letra e clique em 'Buscar no Banco'." : "Selecione uma turma para visualizar os alunos."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <NovoAlunoModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
          />
          
          {historicoModal.isOpen && (
            <HistoricoAlunoTurmaModal 
              isOpen={historicoModal.isOpen} 
              onClose={() => setHistoricoModal({ isOpen: false, idAluno: "", nomeAluno: "", idTurma: "" })}
              idAluno={historicoModal.idAluno}
              nomeAluno={historicoModal.nomeAluno}
              idTurma={historicoModal.idTurma}
            />
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

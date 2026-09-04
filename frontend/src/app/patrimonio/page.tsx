"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import { BemPatrimonial } from "@/types/patrimonio";

export default function PatrimonioDashboard() {
  const [bens, setBens] = useState<BemPatrimonial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filtros de banco de dados
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("");
  const [filtroPredio, setFiltroPredio] = useState<string>("");
  const [filtroAndar, setFiltroAndar] = useState<string>("");

  const searchFirestore = async () => {
    if (!filtroStatus && !filtroResponsavel && !filtroPredio) {
      alert("Por favor, preencha ao menos Status, Responsável ou Prédio para buscar no banco.");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const constraints = [];
      if (filtroStatus) constraints.push(where("status", "==", filtroStatus));
      if (filtroResponsavel) constraints.push(where("nome_responsavel_sei", "==", filtroResponsavel));
      if (filtroPredio) constraints.push(where("predio", "==", filtroPredio));
      if (filtroAndar) constraints.push(where("andar", "==", filtroAndar));
      
      const q = query(collection(db, "Bem_Patrimonial"), ...constraints, limit(100));
      const querySnapshot = await getDocs(q);
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BemPatrimonial[];
      
      setBens(lista);
    } catch (error) {
      console.error("Erro ao buscar patrimônios:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBens = bens.filter(b => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      b.nome_equipamento?.toLowerCase().includes(term) ||
      b.numero_patrimonio.includes(searchQuery) // Plaqueta exata
    );
  });

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Professor", "Bolsista"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Superior - Ações de Gestor de Patrimônio */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-6 bg-foreground/5 rounded-2xl border border-foreground/10">
            <div className="flex items-center gap-4">
              <button className="relative p-3 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors" title="Notificações (Requisições e Inservíveis)">
                <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
              </button>
              
              <div className="h-10 w-px bg-foreground/20 hidden sm:block"></div>
              
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Adicionar Direto (+)
                </button>
                <button className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Gerar Relatórios
                </button>
              </div>
            </div>

            {/* Ações Centrais de Bancada / Análise */}
            <div className="flex gap-3 w-full lg:w-auto">
              <button className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                Analisar Requisições
              </button>
            </div>
          </div>

          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Patrimônio Geral</h1>
              <p className="text-foreground/60 mt-1">Gestão de Equipamentos, Materiais Permanentes e Histórico.</p>
            </div>
            
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Buscar por nome ou Nº Plaqueta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 rounded-xl bg-foreground/5 border border-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-80"
              />
            </div>
          </header>

          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Filtros de Banco de Dados</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-xs mb-1 text-foreground/70">Status Patrimonial</label>
                <select 
                  className="bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inservivel">Inservível</option>
                  <option value="Ja_dado_baixa">Já dado baixa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-foreground/70">Responsável SEI</label>
                <input 
                  type="text"
                  placeholder="Nome exato..."
                  className="bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm w-40"
                  value={filtroResponsavel}
                  onChange={(e) => setFiltroResponsavel(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-foreground/70">Prédio</label>
                <input 
                  type="text"
                  placeholder="Ex: P5..."
                  className="bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm w-24"
                  value={filtroPredio}
                  onChange={(e) => setFiltroPredio(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-foreground/70">Andar</label>
                <input 
                  type="text"
                  placeholder="Ex: Térreo..."
                  className="bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm w-28"
                  value={filtroAndar}
                  onChange={(e) => setFiltroAndar(e.target.value)}
                />
              </div>

              <div className="mt-5">
                <button 
                  onClick={searchFirestore}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Buscar no Banco
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBens.map(bem => (
                <Link key={bem.id} href={`/patrimonio/${bem.id}`}>
                  <div className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-foreground/5 transition-all h-full flex flex-col relative overflow-hidden">
                    
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        bem.status === 'Ativo' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                        bem.status === 'Inservivel' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {bem.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mb-4 pr-20">
                      <h2 className="text-xl font-semibold text-foreground line-clamp-2">
                        {bem.nome_equipamento || "Equipamento sem nome"}
                      </h2>
                      <p className="font-mono text-sm text-foreground/50 mt-1">
                        Plaqueta: {bem.numero_patrimonio}
                      </p>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-foreground/10 flex flex-col gap-2 text-sm text-foreground/70">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{bem.predio} {bem.andar ? `- ${bem.andar}` : ''} {bem.sala ? `- Sala ${bem.sala}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="truncate">{bem.nome_responsavel_sei}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              
              {!loading && hasSearched && filteredBens.length === 0 && (
                <div className="col-span-full py-12 text-center text-foreground/50">
                  Nenhum bem patrimonial encontrado para este filtro.
                </div>
              )}

              {!loading && !hasSearched && (
                <div className="col-span-full py-12 text-center text-foreground/50">
                  Clique em "Buscar no Banco" para carregar os dados.
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}

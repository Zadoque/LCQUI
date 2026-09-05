"use client";

import React, { useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { ResumoReagente } from "@/types/reagentes";
import ModalRelatoriosReagentes from "@/components/reagentes/ModalRelatoriosReagentes";

export default function GestorAlmoxarifadoDashboard() {
  const { roles, user } = useAuth();
  const [reagentes, setReagentes] = useState<ResumoReagente[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRelatoriosOpen, setIsRelatoriosOpen] = useState(false);
  
  // Filtros obrigatórios do Firestore (Seção 5 do main.tex)
  const [filtroLetra, setFiltroLetra] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroNatureza, setFiltroNatureza] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const isChefe = roles.includes("Chefe_Geral");
  const isGestorAlmox = roles.includes("Gestor_Almoxarifado");
  const hasManagementAccess = isChefe || isGestorAlmox;

  const searchFirestore = async () => {
    if (!filtroLetra && !filtroEstado && !filtroNatureza) {
      alert("Por favor, selecione ao menos uma Letra Inicial, Estado Físico ou Natureza Química para buscar (Regra de performance).");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const constraints = [];
      if (filtroLetra) constraints.push(where("letra_inicial", "==", filtroLetra));
      if (filtroEstado) constraints.push(where("estado_fisico", "==", filtroEstado));
      if (filtroNatureza) constraints.push(where("natureza_quimica", "==", filtroNatureza));
      
      // limit para evitar estourar leituras se houver muitos na mesma letra
      const q = query(collection(db, "Resumo_Reagente"), ...constraints, limit(100));
      
      const querySnapshot = await getDocs(q);
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ResumoReagente[];
      
      setReagentes(lista);
    } catch (error) {
      console.error("Erro ao buscar reagentes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtro local por substring (nome)
  const filteredReagentes = reagentes.filter(r => 
    !searchQuery || r.nome?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Bolsista"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* ============================================================ */}
          {/* BARRA EXCLUSIVA DO CHEFE GERAL — Seção 6.3, linhas 1645-1661 */}
          {/* ============================================================ */}
          {isChefe && (
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Botão "Mais" do Chefe (linha 1648-1653) */}
                <button className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Novo Almoxarifado
                </button>
                <button className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                  Novo Gestor de Almoxarifado
                </button>
                <button className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                  Nova Matéria
                </button>

                <div className="h-8 w-px bg-foreground/10 hidden sm:block"></div>

                {/* Gerenciar Gestores (linha 1654-1657) */}
                <button className="px-4 py-2 rounded-lg bg-foreground/5 text-sm font-medium hover:bg-foreground/10 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  Gerenciar Gestores de Almoxarifado
                </button>

              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400/60">Ações de Chefe Geral</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* BARRA DO GESTOR DE ALMOXARIFADO — Seção 6.7, linhas 1723-1756 */}
          {/* ============================================================ */}
          {hasManagementAccess && (
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-6 bg-foreground/5 rounded-2xl border border-foreground/10">
            <div className="flex items-center gap-4">
              <button className="relative p-3 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors" title="Notificações e Alertas (Vencimentos, Quarentena, Escassez)">
                <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
              </button>
              
              <div className="h-10 w-px bg-foreground/20 hidden sm:block"></div>
              
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Novo Reagente
                </button>
                <button className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Adicionar Frasco
                </button>
                <div className="h-4 w-px bg-foreground/20 hidden sm:block mx-1"></div>
                <button 
                  onClick={() => setIsRelatoriosOpen(true)}
                  className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Relatórios
                </button>
              </div>
            </div>

            {/* Ações Centrais de Bancada */}
            <div className="flex gap-3 w-full lg:w-auto">
              <button className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                Registrar Retirada
              </button>
              <button className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Registrar Devolução
              </button>
            </div>
          </div>
          )}

          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Estoque (Reagentes)</h1>
              <p className="text-foreground/60 mt-1">Primeiro, busque no banco. Depois, filtre livremente o resultado.</p>
            </div>
          </header>

          {/* Filtros Obrigatórios do Banco de Dados */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 border-2 border-primary/20 bg-primary/5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
              Passo 1: Filtros de Banco de Dados (Obrigatório)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Estado Físico</label>
                <select 
                  className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="">(Nenhum)</option>
                  <option value="Sólido">Sólido</option>
                  <option value="Líquido">Líquido</option>
                </select>
              </div>

              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Natureza Química</label>
                <select 
                  className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  value={filtroNatureza}
                  onChange={(e) => setFiltroNatureza(e.target.value)}
                >
                  <option value="">(Nenhuma)</option>
                  <option value="ORGANICO">Orgânico</option>
                  <option value="INORGANICO">Inorgânico</option>
                  <option value="ELEMENTO">Elemento</option>
                  <option value="HIBRIDO">Híbrido</option>
                </select>
              </div>

              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Letra Inicial</label>
                <select 
                  className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  value={filtroLetra}
                  onChange={(e) => setFiltroLetra(e.target.value)}
                >
                  <option value="">(Nenhuma)</option>
                  {alphabet.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="w-full">
                <button 
                  onClick={searchFirestore}
                  className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 flex justify-center items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  Buscar no Banco
                </button>
              </div>
            </div>
          </div>

          {/* Filtro de Substring em Memória */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-foreground/5 p-4 rounded-xl border border-foreground/10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/60 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Passo 2: Filtrar Resultados
            </h2>
            <div className="w-full sm:w-1/2">
              <input
                type="text"
                disabled={!hasSearched || reagentes.length === 0}
                placeholder={hasSearched ? "Filtrar os itens da tabela pelo nome..." : "Busque no banco primeiro..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Área Central: Tabela Geral */}
          <div className="glass-panel overflow-hidden rounded-2xl border border-foreground/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-foreground/70 border-b border-foreground/10">
                  <tr>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Nome do Reagente</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Tipo</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Natureza</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Estado Físico</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                      </td>
                    </tr>
                  ) : filteredReagentes.length > 0 ? (
                    filteredReagentes.map((reagente) => (
                      <tr key={reagente.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="px-6 py-4 font-semibold">{reagente.nome}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded bg-foreground/10 text-xs">{reagente.tipo_substancia || "N/A"}</span>
                        </td>
                        <td className="px-6 py-4">{reagente.natureza_quimica}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            reagente.estado_fisico === 'Líquido' ? 'bg-blue-500/20 text-blue-500' : 'bg-amber-500/20 text-amber-500'
                          }`}>
                            {reagente.estado_fisico}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/reagentes/${reagente.id}`}>
                            <button className="text-primary hover:underline text-sm font-medium">Ver Dashboard</button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                        {hasSearched ? "Nenhum reagente encontrado para este filtro." : "Clique em Buscar no Banco para carregar os dados."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Relatorios Reagentes */}
          {user && (
            <ModalRelatoriosReagentes 
              isOpen={isRelatoriosOpen} 
              onClose={() => setIsRelatoriosOpen(false)} 
              uid={user.uid} 
              isChefe={isChefe}
            />
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}

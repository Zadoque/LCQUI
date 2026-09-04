"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import { ResumoReagente } from "@/types/reagentes";

export default function GestorAlmoxarifadoDashboard() {
  const [reagentes, setReagentes] = useState<ResumoReagente[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Filtros obrigatórios do Firestore (Seção 5 do main.tex)
  const [filtroLetra, setFiltroLetra] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroNatureza, setFiltroNatureza] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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
          
          {/* Header Superior - Ações de Gestor e Bancada */}
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

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Estoque (Reagentes)</h1>
              <p className="text-foreground/60 mt-1">Visão geral e pesquisa de catálogo</p>
            </div>
            
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Buscar por nome do reagente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 rounded-xl bg-foreground/5 border border-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-80"
              />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Filtros Obrigatórios (Banco de Dados)</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-xs mb-1 text-foreground/70">Estado Físico</label>
                <select 
                  className="bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm w-32"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Sólido">Sólido</option>
                  <option value="Líquido">Líquido</option>
                  {/* Removido Gasoso conforme regras de domínio da V1 */}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-foreground/70">Natureza Química</label>
                <select 
                  className="bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm w-40"
                  value={filtroNatureza}
                  onChange={(e) => setFiltroNatureza(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="ORGANICO">Orgânico</option>
                  <option value="INORGANICO">Inorgânico</option>
                  <option value="ELEMENTO">Elemento</option>
                  <option value="HIBRIDO">Híbrido</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-foreground/70">Letra Inicial</label>
                <select 
                  className="bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm w-24"
                  value={filtroLetra}
                  onChange={(e) => setFiltroLetra(e.target.value)}
                >
                  <option value="">Todas</option>
                  {alphabet.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
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

        </div>
      </main>
    </ProtectedRoute>
  );
}

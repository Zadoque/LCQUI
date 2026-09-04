"use client";

import React, { useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import { BemPatrimonial } from "@/types/patrimonio";

export default function PatrimonioDashboard() {
  const { roles } = useAuth();
  const [bens, setBens] = useState<BemPatrimonial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filtros obrigatórios (Seção 5.2 do main.tex):
  // "Combinação obrigatória de pelo menos um: (Prédio) ou (letra_inicial_nome) ou (Status)"
  const [filtroPredio, setFiltroPredio] = useState<string>("");
  const [filtroAndar, setFiltroAndar] = useState<string>("");
  const [filtroSala, setFiltroSala] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroLetraInicial, setFiltroLetraInicial] = useState<string>("");
  const [filtroConservacao, setFiltroConservacao] = useState<string>("");

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const isChefe = roles.includes("Chefe_Geral");
  const isGestorPatrimonio = roles.includes("Gestor_Bens_Patrimoniais");
  const isProfessor = roles.includes("Professor");

  // Determina se o usuário tem acesso de gestão (Chefe ou Gestor de Bens)
  const hasManagementAccess = isChefe || isGestorPatrimonio;

  const searchFirestore = async () => {
    // Seção 5.2: pelo menos Prédio, Letra inicial OU Status
    if (!filtroPredio && !filtroLetraInicial && !filtroStatus) {
      alert(
        "Selecione ao menos um filtro obrigatório: Prédio, Letra Inicial ou Status.\n" +
        "(Regra de performance do Firestore — Seção 5.2 do projeto)"
      );
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const constraints = [];
      if (filtroPredio) constraints.push(where("predio", "==", filtroPredio));
      if (filtroAndar) constraints.push(where("andar", "==", filtroAndar));
      if (filtroSala) constraints.push(where("sala", "==", filtroSala));
      if (filtroStatus) constraints.push(where("status", "==", filtroStatus));
      if (filtroLetraInicial) constraints.push(where("letra_inicial_nome", "==", filtroLetraInicial));
      if (filtroConservacao) constraints.push(where("estado_conservacao", "==", filtroConservacao));

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

  // Filtro local por substring sobre nome_equipamento e numero_patrimonio (Seção 5.2)
  const filteredBens = bens.filter(b => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      b.nome_equipamento?.toLowerCase().includes(term) ||
      b.numero_patrimonio?.toLowerCase().includes(term)
    );
  });

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Professor", "Bolsista"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ============================================================ */}
          {/* BARRA DE AÇÕES SUPERIOR (full-width) — Seção 6.8, linha 1764 */}
          {/* ============================================================ */}

          {/* --- Visão do Chefe Geral: Aba Bens Patrimoniais (Seção 6.4, linha 1663) --- */}
          {isChefe && (
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Botão "Mais" do Chefe: Novo Gestor de Bens Patrimoniais (linha 1666-1669) */}
                <button className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Novo Gestor de Bens Patrimoniais
                </button>

                <div className="h-8 w-px bg-foreground/10 hidden sm:block"></div>

                {/* Gerenciar Gestores (linha 1670-1673) */}
                <button className="px-4 py-2 rounded-lg bg-foreground/5 text-sm font-medium hover:bg-foreground/10 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  Gerenciar Gestores de Bens
                </button>

                {/* Relatórios (linha 1674) */}
                <button className="px-4 py-2 rounded-lg bg-foreground/5 text-sm font-medium hover:bg-foreground/10 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Relatórios
                </button>
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400/60">Ações de Chefe Geral</span>
            </div>
          )}

          {/* --- Visão do Gestor de Bens Patrimoniais (Seção 6.8, linha 1764-1770) --- */}
          {hasManagementAccess && (
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-5 bg-foreground/5 rounded-2xl border border-foreground/10">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Notificações: alerta de requisições (linha 1766) */}
                <button className="relative p-3 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors" title="Notificações — Requisições de professores (adição/edição de bens)">
                  <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
                </button>

                <div className="h-10 w-px bg-foreground/20 hidden sm:block"></div>

                {/* Botão Mais (+): Adição direta de bens (linha 1767) */}
                <button className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Adicionar Bem (+)
                </button>

                {/* Gerar Relatórios (linha 1769) */}
                <button className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Gerar Relatórios
                </button>
              </div>

              {/* Analisar Requisições — destaque (linha 1768) */}
              <div className="flex gap-3 w-full lg:w-auto">
                <button className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                  Analisar Requisições
                </button>
              </div>
            </div>
          )}

          {/* =============== */}
          {/* TÍTULO DA SEÇÃO */}
          {/* =============== */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Bens Patrimoniais</h1>
              <p className="text-foreground/60 mt-1">
                {hasManagementAccess
                  ? "Auditoria, análise comparativa e suporte processual institucional."
                  : "Pesquisa e visualização de equipamentos e materiais permanentes."}
              </p>
            </div>
          </header>

          {/* ====================================================================== */}
          {/* FILTROS OBRIGATÓRIOS DE BANCO (Seção 5.2, linha 1280-1281)             */}
          {/* "pelo menos um: (Prédio) ou (letra_inicial_nome) ou (Status)"          */}
          {/* Campos denormalizados: predio, andar, sala, status, letra_inicial_nome  */}
          {/* ====================================================================== */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 border-2 border-primary/20 bg-primary/5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
              Passo 1: Filtros de Banco de Dados (ao menos Prédio, Letra ou Status)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">

              {/* Prédio */}
              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Prédio</label>
                <input
                  type="text"
                  placeholder="Ex: P5, CCT..."
                  className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  value={filtroPredio}
                  onChange={(e) => setFiltroPredio(e.target.value)}
                />
              </div>

              {/* Andar */}
              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Andar</label>
                <input
                  type="text"
                  placeholder="Ex: Térreo, 1, 2..."
                  className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  value={filtroAndar}
                  onChange={(e) => setFiltroAndar(e.target.value)}
                />
              </div>

              {/* Sala */}
              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Sala</label>
                <input
                  type="text"
                  placeholder="Ex: 101, Lab. Orgânica..."
                  className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  value={filtroSala}
                  onChange={(e) => setFiltroSala(e.target.value)}
                />
              </div>

              {/* Status Patrimonial — Enum: Ativo, Inservivel, Ja_dado_baixa */}
              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Status</label>
                <select
                  className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                >
                  <option value="">(Nenhum)</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inservivel">Inservível</option>
                  <option value="Ja_dado_baixa">Já dado baixa</option>
                </select>
              </div>

              {/* Estado de Conservação — Enum: BOM, REGULAR, RUIM */}
              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Estado de Conservação</label>
                <select
                  className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  value={filtroConservacao}
                  onChange={(e) => setFiltroConservacao(e.target.value)}
                >
                  <option value="">(Nenhum)</option>
                  <option value="BOM">Bom</option>
                  <option value="REGULAR">Regular</option>
                  <option value="RUIM">Ruim</option>
                </select>
              </div>

              {/* Letra Inicial do Nome do Equipamento */}
              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Letra Inicial</label>
                <select
                  className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  value={filtroLetraInicial}
                  onChange={(e) => setFiltroLetraInicial(e.target.value)}
                >
                  <option value="">(Nenhuma)</option>
                  {alphabet.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Botão de busca no banco */}
            <div className="pt-2">
              <button
                onClick={searchFirestore}
                className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 flex justify-center items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                Buscar no Banco
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PASSO 2: Filtro local de substring (Seção 5.2, linha 1281) */}
          {/* "O frontend aplica substring sobre nome_equipamento e      */}
          {/*  numero_patrimonio nos resultados."                        */}
          {/* ========================================================= */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-foreground/5 p-4 rounded-xl border border-foreground/10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/60 flex items-center gap-2 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
              Passo 2: Filtrar Resultados
            </h2>
            <div className="w-full sm:w-1/2">
              <input
                type="text"
                disabled={!hasSearched || bens.length === 0}
                placeholder={hasSearched ? "Nome do equipamento ou Nº de patrimônio..." : "Busque no banco primeiro..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* ==================================================================== */}
          {/* ÁREA CENTRAL DE BUSCA — Tabela (Seção 6.8, linha 1771)               */}
          {/* "Pesquisa altamente filtrável (Prédio, Andar, Sala, Nome,            */}
          {/*  Responsável, Status). O clique no bem patrimonial exibe [...]        */}
          {/*  um histórico de auditoria vertical"                                  */}
          {/* ==================================================================== */}
          <div className="glass-panel overflow-hidden rounded-2xl border border-foreground/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-foreground/70 border-b border-foreground/10">
                  <tr>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Nome do Equipamento</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Nº Patrimônio</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Conservação</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Local</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Responsável SEI</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                      </td>
                    </tr>
                  ) : filteredBens.length > 0 ? (
                    filteredBens.map((bem) => (
                      <tr key={bem.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="px-5 py-4 font-semibold">{bem.nome_equipamento || "Sem nome"}</td>
                        <td className="px-5 py-4 font-mono text-foreground/70">{bem.numero_patrimonio}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            bem.status === "Ativo"
                              ? "bg-green-500/15 text-green-500"
                              : bem.status === "Inservivel"
                              ? "bg-orange-500/15 text-orange-500"
                              : "bg-red-500/15 text-red-500"
                          }`}>
                            {bem.status === "Ja_dado_baixa" ? "Dado Baixa" : bem.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            bem.estado_conservacao === "BOM"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : bem.estado_conservacao === "REGULAR"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-red-500/10 text-red-500"
                          }`}>
                            {bem.estado_conservacao}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-foreground/70 text-xs">
                          {bem.predio && <span>{bem.predio}</span>}
                          {bem.andar && <span> · {bem.andar}º</span>}
                          {bem.sala && <span> · {bem.sala}</span>}
                        </td>
                        <td className="px-5 py-4 text-foreground/70 truncate max-w-[150px]">{bem.nome_responsavel_sei}</td>
                        <td className="px-5 py-4">
                          <Link href={`/patrimonio/${bem.id}`}>
                            <button className="text-primary hover:underline text-sm font-medium">Ver Detalhes</button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-foreground/50">
                        {hasSearched
                          ? "Nenhum bem patrimonial encontrado para este filtro."
                          : "Selecione ao menos um filtro e clique em \"Buscar no Banco\" para carregar."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contador de resultados */}
          {hasSearched && !loading && (
            <div className="text-xs text-foreground/40 text-right">
              {filteredBens.length} {filteredBens.length === 1 ? "resultado" : "resultados"}
              {searchQuery && ` (filtrados de ${bens.length} do banco)`}
            </div>
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}

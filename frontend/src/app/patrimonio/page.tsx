"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ModalRelatoriosPatrimonio from "@/components/patrimonio/ModalRelatoriosPatrimonio";
import { ModalNovoBem, ModalNotificacoesPatrimonio } from "@/components/patrimonio/ModaisPatrimonio";
import { ListaLocais } from "@/components/patrimonio/ListaLocais";
import { NovaLocalModal } from "@/components/patrimonio/NovaLocalModal";
import type { LocalItem } from "@/types/cadastros";
import { usePatrimonioSearch } from "@/hooks/usePatrimonioSearch";
import { PatrimonioActionBar } from "@/components/patrimonio/PatrimonioActionBar";
import { PatrimonioFiltros } from "@/components/patrimonio/PatrimonioFiltros";
import { TabelaBensPatrimoniais } from "@/components/patrimonio/TabelaBensPatrimoniais";

export default function PatrimonioDashboard() {
  const { roles, user } = useAuth();
  const [isRelatoriosOpen, setIsRelatoriosOpen] = useState(false);
  const [isNovoBemOpen, setIsNovoBemOpen] = useState(false);
  const [isNotificacoesOpen, setIsNotificacoesOpen] = useState(false);

  // Gestão de locais
  const [isNovoLocalOpen, setIsNovoLocalOpen] = useState(false);
  const [localEditavel, setLocalEditavel] = useState<LocalItem | undefined>(undefined);

  const isChefe = roles.includes("Chefe_Geral");
  const isGestorPatrimonio = roles.includes("Gestor_Bens_Patrimoniais");
  const hasManagementAccess = isChefe || isGestorPatrimonio;
  const canRequestAddition = roles.includes("Professor");

  const {
    bens,
    searchQuery,
    setSearchQuery,
    loading,
    hasSearched,
    searchError,
    filtroPredio,
    setFiltroPredio,
    filtroAndar,
    setFiltroAndar,
    filtroSala,
    setFiltroSala,
    filtroStatus,
    setFiltroStatus,
    filtroLetraInicial,
    setFiltroLetraInicial,
    filtroConservacao,
    setFiltroConservacao,
    searchFirestore,
    filteredBens,
  } = usePatrimonioSearch();

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Professor", "Bolsista", "Aluno"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Barra de Ações Superior */}
          <PatrimonioActionBar
            isChefe={isChefe}
            hasManagementAccess={hasManagementAccess}
            canRequestAddition={canRequestAddition}
            onNovoBem={() => setIsNovoBemOpen(true)}
            onNotificacoes={() => setIsNotificacoesOpen(true)}
            onRelatorios={() => setIsRelatoriosOpen(true)}
          />

          {/* Título da Seção */}
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

          {/* Gestão de Locais — UI-03 (Seção 8) */}
          {hasManagementAccess && (
            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-foreground/10">
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Gestão de Locais
              </h2>
              <ListaLocais
                modo="listagem"
                onNovoLocal={() => { setLocalEditavel(undefined); setIsNovoLocalOpen(true); }}
                onEditar={(local) => { setLocalEditavel(local); setIsNovoLocalOpen(true); }}
              />
              <NovaLocalModal
                isOpen={isNovoLocalOpen}
                onClose={() => { setIsNovoLocalOpen(false); setLocalEditavel(undefined); }}
                onSucesso={() => { setIsNovoLocalOpen(false); setLocalEditavel(undefined); }}
                localEditavel={localEditavel}
              />
            </div>
          )}

          {/* Filtros de Banco e Substring (Seção 5.2) */}
          <PatrimonioFiltros
            filtroPredio={filtroPredio}
            onPredioChange={setFiltroPredio}
            filtroAndar={filtroAndar}
            onAndarChange={setFiltroAndar}
            filtroSala={filtroSala}
            onSalaChange={setFiltroSala}
            filtroStatus={filtroStatus}
            onStatusChange={setFiltroStatus}
            filtroConservacao={filtroConservacao}
            onConservacaoChange={setFiltroConservacao}
            filtroLetraInicial={filtroLetraInicial}
            onLetraChange={setFiltroLetraInicial}
            searchError={searchError}
            onBuscar={searchFirestore}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            hasSearched={hasSearched}
            bensCount={bens.length}
          />

          {/* Tabela de Resultados */}
          <TabelaBensPatrimoniais
            loading={loading}
            filteredBens={filteredBens}
            hasSearched={hasSearched}
            bensCount={bens.length}
            searchQuery={searchQuery}
          />

          {/* Modais de Relatórios, Cadastro e Notificações */}
          {user && (
            <ModalRelatoriosPatrimonio
              isOpen={isRelatoriosOpen}
              onClose={() => setIsRelatoriosOpen(false)}
              uid={user.uid}
            />
          )}

          <ModalNovoBem
            isOpen={isNovoBemOpen}
            onClose={() => setIsNovoBemOpen(false)}
            onSuccess={searchFirestore}
            uid={user?.uid}
          />

          <ModalNotificacoesPatrimonio
            isOpen={isNotificacoesOpen}
            onClose={() => setIsNotificacoesOpen(false)}
          />
        </div>
      </main>
    </ProtectedRoute>
  );
}

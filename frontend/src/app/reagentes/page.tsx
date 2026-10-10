"use client";

import React, { useState, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useSearchParams } from "next/navigation";
import { ListaAlmoxarifados } from "@/components/almoxarifados/ListaAlmoxarifados";
import { EstoqueSnapshotCard } from "@/components/reagentes/EstoqueSnapshotCard";
import type { AlmoxarifadoItem } from "@/types/cadastros";
import { ReagentesActionBar } from "@/components/reagentes/ReagentesActionBar";
import { ReagentesFiltros } from "@/components/reagentes/ReagentesFiltros";
import { CatalogoReagentesTable } from "@/components/reagentes/CatalogoReagentesTable";
import { ReagentesModaisManager } from "@/components/reagentes/ReagentesModaisManager";
import { useReagentesData } from "@/hooks/useReagentesData";

function ReagentesContent() {
  const searchParams = useSearchParams();
  const abaParam = searchParams.get("aba") || "catalogo";

  const {
    user,
    isChefe,
    hasManagementAccess,
    isPureAluno,
    idAlmoxarifado,
    abaAtiva,
    setAbaAtiva,
    loading,
    searchQuery,
    setSearchQuery,
    limiteExibicao,
    setLimiteExibicao,
    filtroLetra,
    setFiltroLetra,
    filtroEstado,
    setFiltroEstado,
    filtroNatureza,
    setFiltroNatureza,
    limparFiltros,
    estoqueSnapshot,
    loadingEstoque,
    erroEstoque,
    rateLimited,
    carregarCatalogo,
    carregarEstoqueAtual,
    filteredReagentes,
    displayedReagentes,
  } = useReagentesData(abaParam);

  // Estados dos modais de gestão
  const [isRelatoriosOpen, setIsRelatoriosOpen] = useState(false);
  const [isEtiquetasOpen, setIsEtiquetasOpen] = useState(false);
  const [isMateriaModalOpen, setIsMateriaModalOpen] = useState(false);
  const [isNovoReagenteOpen, setIsNovoReagenteOpen] = useState(false);
  const [isNovaSubstanciaOpen, setIsNovaSubstanciaOpen] = useState(false);
  const [isRetiradaOpen, setIsRetiradaOpen] = useState(false);
  const [isDevolucaoOpen, setIsDevolucaoOpen] = useState(false);
  const [isAlmoxOpen, setIsAlmoxOpen] = useState(false);
  const [isGestoresAlmoxOpen, setIsGestoresAlmoxOpen] = useState(false);
  const [almoxSelecionado, setAlmoxSelecionado] = useState<AlmoxarifadoItem | undefined>();

  // Estados dos modais de hierarquia
  const [isNovaEspecOpen, setIsNovaEspecOpen] = useState(false);
  const [isNovoLoteOpen, setIsNovoLoteOpen] = useState(false);
  const [isAdicionarFrascoOpen, setIsAdicionarFrascoOpen] = useState(false);

  // Estados dos modais de frasco
  const [isQuarentenaModalOpen, setIsQuarentenaModalOpen] = useState(false);
  const [isExtravioModalOpen, setIsExtravioModalOpen] = useState(false);
  const [isMetrologiaModalOpen, setIsMetrologiaModalOpen] = useState(false);
  const [isPesagemRotinaModalOpen, setIsPesagemRotinaModalOpen] = useState(false);
  const [isDescarteModalOpen, setIsDescarteModalOpen] = useState(false);
  const [frascoSelecionado, setFrascoSelecionado] = useState<any>(null);

  // Seleções de contexto
  const [selectedResumo, setSelectedResumo] = useState<any>(null);
  const [selectedEspec, setSelectedEspec] = useState<any>(null);
  const [selectedLote, setSelectedLote] = useState<any>(null);

  const handleAction = (action: string, payload: any) => {
    switch (action) {
      case "nova_especificacao":
        setSelectedResumo(payload);
        setIsNovaEspecOpen(true);
        break;
      case "novo_lote":
        setSelectedResumo(payload.reagente);
        setSelectedEspec(payload.espec);
        setIsNovoLoteOpen(true);
        break;
      case "novo_frasco":
        setSelectedResumo(payload.reagente);
        setSelectedEspec(payload.espec);
        setSelectedLote(payload.lote);
        setIsAdicionarFrascoOpen(true);
        break;
      case "quarentena":
        setFrascoSelecionado(payload);
        setIsQuarentenaModalOpen(true);
        break;
      case "extravio":
        setFrascoSelecionado(payload);
        setIsExtravioModalOpen(true);
        break;
      case "metrologia":
        setFrascoSelecionado(payload);
        setIsMetrologiaModalOpen(true);
        break;
      case "pesagem_rotina":
        setFrascoSelecionado(payload);
        setIsPesagemRotinaModalOpen(true);
        break;
      case "descarte":
        setFrascoSelecionado(payload);
        setIsDescarteModalOpen(true);
        break;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Bolsista", "Aluno"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Banner de Consulta para Aluno (Seção 3 & Seção 8 UI-04) */}
          {isPureAluno && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-primary">Catálogo de Reagentes (Consulta Pública Discente)</h3>
                <p className="text-xs text-foreground/70">
                  Consulte os reagentes disponíveis e suas especificações técnicas. A retirada de frascos é realizada no balcão de atendimento.
                </p>
              </div>
              <span className="text-xs uppercase font-bold px-2.5 py-1 rounded bg-primary text-primary-foreground">
                Aluno
              </span>
            </div>
          )}

          {/* Barra de Ações de Gestão */}
          <ReagentesActionBar
            isChefe={isChefe}
            hasManagementAccess={hasManagementAccess}
            onNovoAlmoxarifado={() => { setAlmoxSelecionado(undefined); setIsAlmoxOpen(true); }}
            onNovaMateria={() => setIsMateriaModalOpen(true)}
            onGerenciarGestores={() => setIsGestoresAlmoxOpen(true)}
            onNovaSubstancia={() => setIsNovaSubstanciaOpen(true)}
            onNovoReagente={() => setIsNovoReagenteOpen(true)}
            onNovaEspecificacao={() => { setSelectedResumo(null); setIsNovaEspecOpen(true); }}
            onImprimirEtiquetas={() => setIsEtiquetasOpen(true)}
            onAbrirRelatorios={() => setIsRelatoriosOpen(true)}
            onRegistrarRetirada={() => setIsRetiradaOpen(true)}
            onRegistrarDevolucao={() => setIsDevolucaoOpen(true)}
          />

          {/* Snapshot de Estoque M8 (UI-19) */}
          {hasManagementAccess && (
            <EstoqueSnapshotCard
              snapshot={estoqueSnapshot}
              loading={loadingEstoque}
              rateLimited={rateLimited}
              errorMsg={erroEstoque}
              onRefresh={carregarEstoqueAtual}
            />
          )}

          {isChefe && (
            <ListaAlmoxarifados
              onNovo={() => { setAlmoxSelecionado(undefined); setIsAlmoxOpen(true); }}
              onEditar={(item) => { setAlmoxSelecionado(item); setIsAlmoxOpen(true); }}
              onGerenciar={(item) => { setAlmoxSelecionado(item); setIsGestoresAlmoxOpen(true); }}
            />
          )}

          {/* Filtros e Abas do Catálogo (UI-04) */}
          <ReagentesFiltros
            abaAtiva={abaAtiva}
            onSelectAba={setAbaAtiva}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filtroEstado={filtroEstado}
            onEstadoChange={setFiltroEstado}
            filtroNatureza={filtroNatureza}
            onNaturezaChange={setFiltroNatureza}
            filtroLetra={filtroLetra}
            onLetraChange={setFiltroLetra}
            onLimparFiltros={limparFiltros}
          />

          {/* Tabela do Catálogo */}
          <CatalogoReagentesTable
            loading={loading}
            displayedReagentes={displayedReagentes}
            filteredReagentesCount={filteredReagentes.length}
            limiteExibicao={limiteExibicao}
            onExibirMais={() => setLimiteExibicao((prev) => prev + 50)}
            onAction={handleAction}
            readOnly={isPureAluno}
          />

          {/* Gestor Centralizado de Modais */}
          <ReagentesModaisManager
            uid={user?.uid}
            isChefe={isChefe}
            idAlmoxarifado={idAlmoxarifado}
            isRelatoriosOpen={isRelatoriosOpen}
            setIsRelatoriosOpen={setIsRelatoriosOpen}
            isEtiquetasOpen={isEtiquetasOpen}
            setIsEtiquetasOpen={setIsEtiquetasOpen}
            isMateriaModalOpen={isMateriaModalOpen}
            setIsMateriaModalOpen={setIsMateriaModalOpen}
            isNovoReagenteOpen={isNovoReagenteOpen}
            setIsNovoReagenteOpen={setIsNovoReagenteOpen}
            isNovaSubstanciaOpen={isNovaSubstanciaOpen}
            setIsNovaSubstanciaOpen={setIsNovaSubstanciaOpen}
            isNovaEspecOpen={isNovaEspecOpen}
            setIsNovaEspecOpen={setIsNovaEspecOpen}
            isNovoLoteOpen={isNovoLoteOpen}
            setIsNovoLoteOpen={setIsNovoLoteOpen}
            isAdicionarFrascoOpen={isAdicionarFrascoOpen}
            setIsAdicionarFrascoOpen={setIsAdicionarFrascoOpen}
            isRetiradaOpen={isRetiradaOpen}
            setIsRetiradaOpen={setIsRetiradaOpen}
            isDevolucaoOpen={isDevolucaoOpen}
            setIsDevolucaoOpen={setIsDevolucaoOpen}
            isAlmoxOpen={isAlmoxOpen}
            setIsAlmoxOpen={setIsAlmoxOpen}
            isGestoresAlmoxOpen={isGestoresAlmoxOpen}
            setIsGestoresAlmoxOpen={setIsGestoresAlmoxOpen}
            almoxSelecionado={almoxSelecionado}
            selectedResumo={selectedResumo}
            selectedEspec={selectedEspec}
            selectedLote={selectedLote}
            isQuarentenaModalOpen={isQuarentenaModalOpen}
            setIsQuarentenaModalOpen={setIsQuarentenaModalOpen}
            isExtravioModalOpen={isExtravioModalOpen}
            setIsExtravioModalOpen={setIsExtravioModalOpen}
            isMetrologiaModalOpen={isMetrologiaModalOpen}
            setIsMetrologiaModalOpen={setIsMetrologiaModalOpen}
            isPesagemRotinaModalOpen={isPesagemRotinaModalOpen}
            setIsPesagemRotinaModalOpen={setIsPesagemRotinaModalOpen}
            isDescarteModalOpen={isDescarteModalOpen}
            setIsDescarteModalOpen={setIsDescarteModalOpen}
            frascoSelecionado={frascoSelecionado}
            setFrascoSelecionado={setFrascoSelecionado}
            onSuccessCatalogo={carregarCatalogo}
          />
        </div>
      </main>
    </ProtectedRoute>
  );
}

export default function GestorAlmoxarifadoDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-foreground/50">Carregando Almoxarifado...</div>}>
      <ReagentesContent />
    </Suspense>
  );
}

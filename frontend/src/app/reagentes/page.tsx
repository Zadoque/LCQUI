"use client";

import React, { useState, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useSearchParams } from "next/navigation";
import { ListaAlmoxarifados } from "@/components/almoxarifados/ListaAlmoxarifados";
import { EstoqueSnapshotCard } from "@/components/reagentes/EstoqueSnapshotCard";
import type { AlmoxarifadoItem } from "@/types/cadastros";
import type { CatalogoEspecificacao, FrascoOperacional, ReagenteActionPayload, ResumoReagente } from "@/types/reagentes";
import { ReagentesActionBar } from "@/components/reagentes/ReagentesActionBar";
import { ReagentesFiltros } from "@/components/reagentes/ReagentesFiltros";
import { CatalogoReagentesTable } from "@/components/reagentes/CatalogoReagentesTable";
import { ReagentesModaisManager } from "@/components/reagentes/ReagentesModaisManager";
import { PainelOperacionalReagentes } from "@/components/reagentes/PainelOperacionalReagentes";
import { useReagentesData } from "@/hooks/useReagentesData";
import { gerarCatalogoReagentes, invalidarCachePainelOperacional } from "@/services/reagentes/reagentesService";

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
    filtroTipo,
    setFiltroTipo,
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
  const [isNovoGestorAlmoxOpen, setIsNovoGestorAlmoxOpen] = useState(false);
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
  const [isEscassezModalOpen, setIsEscassezModalOpen] = useState(false);
  const [frascoSelecionado, setFrascoSelecionado] = useState<FrascoOperacional | null>(null);
  const [painelRefreshToken, setPainelRefreshToken] = useState(0);

  // Seleções de contexto
  const [selectedResumo, setSelectedResumo] = useState<ResumoReagente | null>(null);
  const [selectedEspec, setSelectedEspec] = useState<CatalogoEspecificacao | null>(null);
  const [selectedLote, setSelectedLote] = useState<{ id: string; numero_lote?: string } | null>(null);

  const isContextoEspecificacao = (payload: ReagenteActionPayload): payload is Extract<ReagenteActionPayload, { reagente: ResumoReagente }> =>
    "reagente" in payload && "espec" in payload;
  const isFrasco = (payload: ReagenteActionPayload): payload is FrascoOperacional =>
    "codigo_frasco" in payload;

  const handleAction = (action: string, payload: ReagenteActionPayload) => {
    switch (action) {
      case "nova_especificacao":
        if (!isFrasco(payload) && !isContextoEspecificacao(payload)) setSelectedResumo(payload);
        setIsNovaEspecOpen(true);
        break;
      case "novo_lote":
        if (isContextoEspecificacao(payload)) {
          setSelectedResumo(payload.reagente);
          setSelectedEspec(payload.espec);
          setSelectedLote(payload.lote ? { id: payload.lote.id, numero_lote: payload.lote.numero_lote } : null);
        }
        setIsNovoLoteOpen(true);
        break;
      case "novo_frasco":
        if (isContextoEspecificacao(payload)) {
          setSelectedResumo(payload.reagente);
          setSelectedEspec(payload.espec);
          setSelectedLote(payload.lote ? { id: payload.lote.id, numero_lote: payload.lote.numero_lote } : null);
        }
        setIsAdicionarFrascoOpen(true);
        break;
      case "quarentena":
        if (isFrasco(payload)) setFrascoSelecionado(payload);
        setIsQuarentenaModalOpen(true);
        break;
      case "extravio":
        if (isFrasco(payload)) setFrascoSelecionado(payload);
        setIsExtravioModalOpen(true);
        break;
      case "metrologia":
        if (isFrasco(payload)) setFrascoSelecionado(payload);
        setIsMetrologiaModalOpen(true);
        break;
      case "configurar_escassez":
        if (isContextoEspecificacao(payload)) {
          setSelectedResumo(payload.reagente);
          setSelectedEspec(payload.espec);
        }
        setIsEscassezModalOpen(true);
        break;
      case "pesagem_rotina":
        if (isFrasco(payload)) setFrascoSelecionado(payload);
        setIsPesagemRotinaModalOpen(true);
        break;
      case "descarte":
        if (isFrasco(payload)) setFrascoSelecionado(payload);
        setIsDescarteModalOpen(true);
        break;
    }
  };

  const abaVisivel = hasManagementAccess && (abaAtiva === "movimentacoes" || abaAtiva === "alertas")
    ? abaAtiva
    : "catalogo";
  const atualizarCatalogoEOperacao = async () => {
    // O catálogo é uma materialização versionada. Regenerá-lo após uma
    // mutação garante que o resumo recém-cadastrado apareça na UI e preserve
    // seus campos normativos, incluindo natureza_quimica.
    await gerarCatalogoReagentes();
    await carregarCatalogo();
  };

  const atualizarOperacao = () => {
    invalidarCachePainelOperacional();
    setPainelRefreshToken((valor) => valor + 1);
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
            onNovoGestor={() => setIsNovoGestorAlmoxOpen(true)}
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
            abaAtiva={abaVisivel}
            onSelectAba={setAbaAtiva}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filtroEstado={filtroEstado}
            onEstadoChange={setFiltroEstado}
            filtroNatureza={filtroNatureza}
            onNaturezaChange={setFiltroNatureza}
            filtroTipo={filtroTipo}
            onTipoChange={setFiltroTipo}
            filtroLetra={filtroLetra}
            onLetraChange={setFiltroLetra}
            onLimparFiltros={limparFiltros}
            mostrarOperacional={hasManagementAccess}
          />

          {abaVisivel === "catalogo" ? (
            <CatalogoReagentesTable
              loading={loading}
              displayedReagentes={displayedReagentes}
              filteredReagentesCount={filteredReagentes.length}
              limiteExibicao={limiteExibicao}
              onExibirMais={() => setLimiteExibicao((prev) => prev + 50)}
              onAction={handleAction}
              readOnly={isPureAluno}
            />
          ) : (
            <PainelOperacionalReagentes
              aba={abaVisivel}
              idAlmoxarifado={idAlmoxarifado}
              uid={user?.uid}
              onAction={handleAction}
              refreshToken={painelRefreshToken}
            />
          )}

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
            isNovoGestorAlmoxOpen={isNovoGestorAlmoxOpen}
            setIsNovoGestorAlmoxOpen={setIsNovoGestorAlmoxOpen}
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
            isEscassezModalOpen={isEscassezModalOpen}
            setIsEscassezModalOpen={setIsEscassezModalOpen}
            frascoSelecionado={frascoSelecionado}
            setFrascoSelecionado={setFrascoSelecionado}
            onSuccessCatalogo={atualizarCatalogoEOperacao}
            onSuccessOperacional={atualizarOperacao}
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

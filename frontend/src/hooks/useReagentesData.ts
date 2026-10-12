import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  obterCatalogoReagentes,
  obterEstoqueAtual,
  buscarAlmoxarifadoDoGestor,
} from "@/services/reagentes/reagentesService";
import type { ResumoReagente, EstoqueSnapshot } from "@/types/reagentes";

export function useReagentesData(abaParam: string = "catalogo") {
  const { roles, user, isLoading: authLoading } = useAuth();

  const [abaAtiva, setAbaAtiva] = useState<"catalogo" | "movimentacoes" | "alertas">(
    abaParam === "movimentacoes" ? "movimentacoes" : abaParam === "alertas" ? "alertas" : "catalogo"
  );

  // A navegação pelo Sidebar altera apenas a query string e preserva a
  // instância desta página. A query precisa continuar sendo a fonte do estado
  // da aba; inicializá-la apenas no useState deixa a tela presa no catálogo.
  useEffect(() => {
    const proximaAba = abaParam === "movimentacoes" || abaParam === "alertas"
      ? abaParam
      : "catalogo";
    const atualizacao = window.setTimeout(() => setAbaAtiva(proximaAba), 0);
    return () => window.clearTimeout(atualizacao);
  }, [abaParam]);

  const [reagentes, setReagentes] = useState<ResumoReagente[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [limiteExibicao, setLimiteExibicao] = useState(50);

  // M8 Estoque Atual Snapshot
  const [estoqueSnapshot, setEstoqueSnapshot] = useState<EstoqueSnapshot | null>(null);
  const [loadingEstoque, setLoadingEstoque] = useState(false);
  const [erroEstoque, setErroEstoque] = useState("");
  const [rateLimited, setRateLimited] = useState(false);

  // Filtros de interface (UI-04)
  const [filtroLetra, setFiltroLetra] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroNatureza, setFiltroNatureza] = useState("");
  const [idAlmoxarifado, setIdAlmoxarifado] = useState<string>();
  const ultimaCargaEstoqueAutomatica = useRef<string | null>(null);

  const isChefe = roles.includes("Chefe_Geral");
  const isGestorAlmox = roles.includes("Gestor_Almoxarifado");
  const isProfessor = roles.includes("Professor");
  const isBolsista = roles.includes("Bolsista");
  const isAluno = roles.includes("Aluno");
  const hasManagementAccess = isChefe || isGestorAlmox;
  const isPureAluno = isAluno && !hasManagementAccess && !isProfessor && !isBolsista;

  // Busca o almoxarifado vinculado
  useEffect(() => {
    if (!user || !isGestorAlmox) return;
    void buscarAlmoxarifadoDoGestor(user.uid)
      .then((id) => setIdAlmoxarifado(id))
      .catch(() => setIdAlmoxarifado(undefined));
  }, [user, isGestorAlmox]);

  // Carrega catálogo de reagentes (UI-04)
  const carregarCatalogo = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await obterCatalogoReagentes();
      setReagentes(lista);
    } catch (error) {
      console.error("Erro ao carregar catálogo:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // ReagentesContent é avaliado antes de ProtectedRoute decidir se mostra o
    // spinner. Sem esta guarda, a primeira renderização lista Firestore sem
    // request.auth e dispara o deny-all antes do bootstrap do token.
    if (authLoading || !user) return;
    void Promise.resolve().then(() => carregarCatalogo());
  }, [authLoading, user, carregarCatalogo]);

  // Carrega snapshot de estoque atual M8 (UI-19)
  const carregarEstoqueAtual = useCallback(async () => {
    if (!idAlmoxarifado && !isChefe) return;
    const almoxTarget = idAlmoxarifado || "almoxarifado-central";
    setLoadingEstoque(true);
    setErroEstoque("");
    setRateLimited(false);
    const resultado = await obterEstoqueAtual({ idAlmoxarifado: almoxTarget });
    if (resultado.ok) {
      setEstoqueSnapshot(resultado.data);
    } else {
      if (resultado.rateLimit) setRateLimited(true);
      setErroEstoque(resultado.message);
    }
    setLoadingEstoque(false);
  }, [idAlmoxarifado, isChefe]);

  useEffect(() => {
    if (hasManagementAccess) {
      const chave = `${idAlmoxarifado ?? ""}:${isChefe ? "chefe" : "gestor"}`;
      if (ultimaCargaEstoqueAutomatica.current === chave) return;
      ultimaCargaEstoqueAutomatica.current = chave;
      void Promise.resolve().then(() => carregarEstoqueAtual());
    }
  }, [hasManagementAccess, carregarEstoqueAtual, idAlmoxarifado, isChefe]);

  // Normalização de acentos e busca local (UI-04)
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredReagentes = reagentes.filter((r) => {
    if (searchQuery.trim()) {
      const q = norm(searchQuery.trim());
      const matchNome = norm(r.nome || "").includes(q);
      const matchTipo = norm(r.tipo_substancia || "").includes(q);
      if (!matchNome && !matchTipo) return false;
    }
    // O catálogo normativo usa SOLIDO/LIQUIDO; a normalização mantém filtros
    // compatíveis com fotografias legadas que ainda exibam acentos.
    if (filtroEstado && norm(r.estado_fisico || "") !== norm(filtroEstado)) return false;
    if (filtroNatureza && r.natureza_quimica !== filtroNatureza) return false;
    if (filtroLetra && !r.nome?.toUpperCase().startsWith(filtroLetra)) return false;
    return true;
  });

  const displayedReagentes = filteredReagentes.slice(0, limiteExibicao);

  const limparFiltros = () => {
    setSearchQuery("");
    setFiltroLetra("");
    setFiltroEstado("");
    setFiltroNatureza("");
  };

  return {
    user,
    roles,
    isChefe,
    isGestorAlmox,
    isProfessor,
    isBolsista,
    isAluno,
    hasManagementAccess,
    isPureAluno,
    idAlmoxarifado,
    abaAtiva,
    setAbaAtiva,
    reagentes,
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
  };
}

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { ResumoReagente } from "@/types/reagentes";
import type { EstoqueSnapshot } from "@/components/reagentes/EstoqueSnapshotCard";

export function useReagentesData(abaParam: string = "catalogo") {
  const { roles, user } = useAuth();

  const [abaAtiva, setAbaAtiva] = useState<"catalogo" | "movimentacoes" | "alertas">(
    abaParam === "movimentacoes" ? "movimentacoes" : abaParam === "alertas" ? "alertas" : "catalogo"
  );

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
    void getDocs(
      query(
        collection(db, "Gestor_Almoxarifado_x_Almoxarifado"),
        where("id_gestor_almoxarifado", "==", user.uid),
        limit(1)
      )
    )
      .then((snapshot) => setIdAlmoxarifado(snapshot.docs[0]?.data().id_almoxarifado as string | undefined))
      .catch(() => setIdAlmoxarifado(undefined));
  }, [user, isGestorAlmox]);

  // Carrega catálogo de reagentes (UI-04)
  const carregarCatalogo = useCallback(async () => {
    setLoading(true);
    try {
      const obterCat = httpsCallable(functions, "obterCatalogoReagentes");
      try {
        const res = await obterCat();
        const data = res.data as { catalogo?: { resumos?: Record<string, ResumoReagente> } };
        if (data?.catalogo?.resumos) {
          const lista = Object.values(data.catalogo.resumos);
          setReagentes(lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
          return;
        }
      } catch {
        // Fallback para Firestore direto
      }

      const q = query(collection(db, "Resumo_Reagente"), limit(200));
      const snap = await getDocs(q);
      const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ResumoReagente[];
      setReagentes(lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
    } catch (error) {
      console.error("Erro ao carregar catálogo:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => carregarCatalogo());
  }, [carregarCatalogo]);

  // Carrega snapshot de estoque atual M8 (UI-19)
  const carregarEstoqueAtual = useCallback(async () => {
    if (!idAlmoxarifado && !isChefe) return;
    const almoxTarget = idAlmoxarifado || "almoxarifado-central";
    setLoadingEstoque(true);
    setErroEstoque("");
    setRateLimited(false);
    try {
      const obterEstoque = httpsCallable(functions, "obterEstoqueAtual");
      const res = await obterEstoque({ idAlmoxarifado: almoxTarget });
      const data = res.data as Partial<EstoqueSnapshot>;
      setEstoqueSnapshot({
        qtd_aptos: data.qtd_aptos ?? 0,
        qtd_total: data.qtd_total ?? 0,
        qtd_emprestados: data.qtd_emprestados ?? 0,
        qtd_saldo_desconhecido: data.qtd_saldo_desconhecido ?? 0,
        massa_aferida_g: data.massa_aferida_g ?? null,
        volume_aferido_ml: data.volume_aferido_ml ?? null,
        idadeMs: data.idadeMs,
        fonte: data.fonte,
        calculadoEm: new Date(),
      });
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj?.code === "resource-exhausted" || errObj?.message?.includes("Rate limit")) {
        setRateLimited(true);
        setErroEstoque("Limite de 5 consultas/minuto por usuário atingido (UI-19). Aguarde um instante.");
      } else {
        setErroEstoque(errObj?.message || "Não foi possível calcular o estoque atual.");
      }
    } finally {
      setLoadingEstoque(false);
    }
  }, [idAlmoxarifado, isChefe]);

  useEffect(() => {
    if (hasManagementAccess) {
      void Promise.resolve().then(() => carregarEstoqueAtual());
    }
  }, [hasManagementAccess, carregarEstoqueAtual]);

  // Normalização de acentos e busca local (UI-04)
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredReagentes = reagentes.filter((r) => {
    if (searchQuery.trim()) {
      const q = norm(searchQuery.trim());
      const matchNome = norm(r.nome || "").includes(q);
      const matchTipo = norm(r.tipo_substancia || "").includes(q);
      if (!matchNome && !matchTipo) return false;
    }
    if (filtroEstado && r.estado_fisico !== filtroEstado) return false;
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

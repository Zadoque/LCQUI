import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { BemPatrimonial } from "@/types/patrimonio";

export function usePatrimonioSearch() {
  const [bens, setBens] = useState<BemPatrimonial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Filtros de banco (Seção 5.2 do main.tex)
  const [filtroPredio, setFiltroPredio] = useState("");
  const [filtroAndar, setFiltroAndar] = useState("");
  const [filtroSala, setFiltroSala] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroLetraInicial, setFiltroLetraInicial] = useState("");
  const [filtroConservacao, setFiltroConservacao] = useState("");

  const searchFirestore = async (statusOverride?: string) => {
    const statusBusca = statusOverride ?? filtroStatus;
    // Seção 5.2: pelo menos Prédio, Letra inicial OU Status
    if (!filtroPredio && !filtroLetraInicial && !statusBusca) {
      setSearchError(
        "Selecione pelo menos um filtro: prédio, letra inicial ou situação."
      );
      return;
    }

    setSearchError("");
    setLoading(true);
    setHasSearched(true);
    try {
      const constraints = [];
      if (filtroPredio) constraints.push(where("predio", "==", filtroPredio));
      if (filtroAndar) constraints.push(where("andar", "==", filtroAndar));
      if (filtroSala) constraints.push(where("sala", "==", filtroSala));
      if (statusBusca) constraints.push(where("status", "==", statusBusca));
      if (filtroLetraInicial) constraints.push(where("letra_inicial_nome", "==", filtroLetraInicial));
      if (filtroConservacao) constraints.push(where("estado_conservacao", "==", filtroConservacao));

      const q = query(collection(db, "Bem_Patrimonial"), ...constraints, limit(100));
      const querySnapshot = await getDocs(q);
      const lista = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BemPatrimonial[];

      setBens(lista);
    } catch (error) {
      console.error("Erro ao buscar patrimônios:", error);
    } finally {
      setLoading(false);
    }
  };

  // O link de alerta é um deep link para a mesma UI-04, não uma tela separada.
  // Carrega o filtro pela URL para que /patrimonio?status=Inservivel tenha
  // efeito observável ao ser aberto pelo menu, notificação ou link externo.
  useEffect(() => {
    const statusDaUrl = new URLSearchParams(window.location.search).get("status");
    if (!statusDaUrl) return;

    setFiltroStatus(statusDaUrl);
    const carregamento = window.setTimeout(() => {
      void searchFirestore(statusDaUrl);
    }, 0);
    return () => window.clearTimeout(carregamento);
  }, []);

  // Filtro local por substring (Seção 5.2)
  const filteredBens = bens.filter((b) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      b.nome_equipamento?.toLowerCase().includes(term) ||
      b.numero_patrimonio?.toLowerCase().includes(term)
    );
  });

  return {
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
  };
}

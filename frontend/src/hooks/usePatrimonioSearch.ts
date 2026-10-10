import { useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { BemPatrimonial } from "@/types/patrimonio";

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

  const searchFirestore = async () => {
    // Seção 5.2: pelo menos Prédio, Letra inicial OU Status
    if (!filtroPredio && !filtroLetraInicial && !filtroStatus) {
      setSearchError(
        "Selecione ao menos um filtro obrigatório: Prédio, Letra Inicial ou Status. (Regra de performance do Firestore — Seção 5.2 do projeto)"
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
      if (filtroStatus) constraints.push(where("status", "==", filtroStatus));
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

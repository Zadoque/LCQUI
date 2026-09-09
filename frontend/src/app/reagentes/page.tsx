"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { ResumoReagente } from "@/types/reagentes";
import ModalRelatoriosReagentes from "@/components/reagentes/ModalRelatoriosReagentes";
import ModalEtiquetasReagentes from "@/components/reagentes/ModalEtiquetasReagentes";
import { 
  ModalEntradaFrasco, 
  ModalDevolucaoFrasco,
  ModalNovoReagente,
  ModalRegistrarRetirada,
  ModalNovaEspecificacao,
  ModalNovoLote,
  ModalNovaSubstancia
} from "@/components/reagentes/ModaisReagentes";
import { NovaMateriaModal } from "@/components/materias/NovaMateriaModal";

function AccordionRow({ reagente, onAction }: { reagente: ResumoReagente, onAction: (action: string, payload: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [especificacoes, setEspecificacoes] = useState<any[]>([]);
  const [loadingEspec, setLoadingEspec] = useState(false);

  const toggleExpand = async () => {
    if (!expanded) {
      setLoadingEspec(true);
      try {
        const snap = await getDocs(collection(db, "Resumo_Reagente", reagente.id, "Especificacoes"));
        setEspecificacoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingEspec(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <>
      <tr className="hover:bg-foreground/5 transition-colors cursor-pointer" onClick={toggleExpand}>
        <td className="px-6 py-4 font-semibold flex items-center gap-2">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          {reagente.nome}
        </td>
        <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-foreground/10 text-xs">{reagente.tipo_substancia || "N/A"}</span></td>
        <td className="px-6 py-4">{reagente.natureza_quimica}</td>
        <td className="px-6 py-4">
          <span className={`px-2 py-1 rounded text-xs ${reagente.estado_fisico === 'Líquido' ? 'bg-blue-500/20 text-blue-500' : 'bg-amber-500/20 text-amber-500'}`}>
            {reagente.estado_fisico || "N/A"}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <button onClick={(e) => { e.stopPropagation(); onAction("nova_especificacao", reagente); }} className="text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1 rounded border border-primary/20 mr-2">
            + Nova Especificação
          </button>
          <Link href={`/reagentes/${reagente.id}`}>
            <button className="text-primary hover:underline text-sm font-medium" onClick={(e) => e.stopPropagation()}>Ver Dashboard</button>
          </Link>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0 bg-foreground/5">
            <div className="p-4 pl-12">
              {loadingEspec ? (
                <div className="text-sm text-foreground/50">Carregando especificações...</div>
              ) : especificacoes.length === 0 ? (
                <div className="text-sm text-foreground/50">Nenhuma especificação cadastrada.</div>
              ) : (
                <div className="space-y-4">
                  {especificacoes.map(espec => (
                    <EspecificacaoRow key={espec.id} espec={espec} reagente={reagente} onAction={onAction} />
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function EspecificacaoRow({ espec, reagente, onAction }: { espec: any, reagente: ResumoReagente, onAction: (action: string, payload: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [lotesEFrascos, setLotesEFrascos] = useState<{ lotes: any[], frascosAvulsos: any[] }>({ lotes: [], frascosAvulsos: [] });
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!expanded) {
      setLoading(true);
      try {
        const lotesSnap = await getDocs(query(collection(db, "Lote"), where("id_especificacao_reagente", "==", espec.id)));
        const lotes = lotesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const frascosAvulsosSnap = await getDocs(query(collection(db, "Frasco_Reagente"), where("id_especificacao_reagente", "==", espec.id), where("id_lote", "==", null)));
        const frascosAvulsos = frascosAvulsosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setLotesEFrascos({ lotes, frascosAvulsos });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className="bg-background rounded-lg border border-foreground/10 p-3">
      <div className="flex justify-between items-center cursor-pointer" onClick={toggleExpand}>
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          <span className="font-semibold text-sm">{espec.descricao} {espec.fabricante ? `(${espec.fabricante})` : ''}</span>
          <span className="text-xs text-foreground/50 border border-foreground/10 px-2 rounded">{espec.estado_fisico}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); onAction("novo_lote", { reagente, espec }); }} className="text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded border border-primary/20">
            + Novo Lote
          </button>
          <button onClick={(e) => { e.stopPropagation(); onAction("novo_frasco", { reagente, espec, lote: null }); }} className="text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded border border-primary/20">
            + Frasco S/ Lote
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pl-6 space-y-3">
          {loading ? (
            <div className="text-xs text-foreground/50">Carregando...</div>
          ) : (
            <>
              {lotesEFrascos.lotes.map(lote => (
                <LoteRow key={lote.id} lote={lote} espec={espec} reagente={reagente} onAction={onAction} />
              ))}
              {lotesEFrascos.frascosAvulsos.length > 0 && (
                <div className="p-3 bg-foreground/5 rounded-lg">
                  <h4 className="text-xs font-bold mb-2">Frascos Avulsos (Sem Lote)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {lotesEFrascos.frascosAvulsos.map(f => (
                      <FrascoCard key={f.id} frasco={f} />
                    ))}
                  </div>
                </div>
              )}
              {lotesEFrascos.lotes.length === 0 && lotesEFrascos.frascosAvulsos.length === 0 && (
                <div className="text-xs text-foreground/50">Nenhum lote ou frasco encontrado.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LoteRow({ lote, espec, reagente, onAction }: { lote: any, espec: any, reagente: ResumoReagente, onAction: (action: string, payload: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [frascos, setFrascos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!expanded) {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "Frasco_Reagente"), where("id_lote", "==", lote.id)));
        setFrascos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className="bg-foreground/5 rounded-lg border border-foreground/10 p-3">
      <div className="flex justify-between items-center cursor-pointer" onClick={toggleExpand}>
        <div className="flex items-center gap-2">
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          <span className="font-semibold text-xs">Lote: {lote.numero_lote} (Forn: {lote.nome_fornecedor})</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onAction("novo_frasco", { reagente, espec, lote }); }} className="text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded border border-primary/20">
          + Frasco
        </button>
      </div>
      {expanded && (
        <div className="mt-2 pl-5">
          {loading ? (
            <div className="text-xs text-foreground/50">Carregando frascos...</div>
          ) : frascos.length === 0 ? (
            <div className="text-xs text-foreground/50">Nenhum frasco neste lote.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {frascos.map(f => (
                <FrascoCard key={f.id} frasco={f} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FrascoCard({ frasco }: { frasco: any }) {
  return (
    <div className="bg-background rounded border border-foreground/10 p-2 text-xs flex justify-between items-center">
      <div>
        <div className="font-bold">{frasco.codigo_frasco}</div>
        <div className="text-foreground/60">{frasco.peso_atual} / {frasco.peso_no_cadastrado} g</div>
      </div>
      <div>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
          frasco.estado_fisico_frasco === 'FECHADO' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
        }`}>
          {frasco.estado_fisico_frasco}
        </span>
      </div>
    </div>
  );
}

export default function GestorAlmoxarifadoDashboard() {
  const { roles, user } = useAuth();
  const [reagentes, setReagentes] = useState<ResumoReagente[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [isRelatoriosOpen, setIsRelatoriosOpen] = useState(false);
  const [isEtiquetasOpen, setIsEtiquetasOpen] = useState(false);
  const [isMateriaModalOpen, setIsMateriaModalOpen] = useState(false);
  const [isNovoReagenteOpen, setIsNovoReagenteOpen] = useState(false);
  const [isNovaSubstanciaOpen, setIsNovaSubstanciaOpen] = useState(false);
  const [isCadastroMenuOpen, setIsCadastroMenuOpen] = useState(false);
  const [isRetiradaOpen, setIsRetiradaOpen] = useState(false);
  const [isDevolucaoOpen, setIsDevolucaoOpen] = useState(false);

  // Estados dos modais de hierarquia
  const [isNovaEspecOpen, setIsNovaEspecOpen] = useState(false);
  const [isNovoLoteOpen, setIsNovoLoteOpen] = useState(false);
  const [isAdicionarFrascoOpen, setIsAdicionarFrascoOpen] = useState(false);

  // Payloads selecionados para os modais
  const [selectedResumo, setSelectedResumo] = useState<any>(null);
  const [selectedEspec, setSelectedEspec] = useState<any>(null);
  const [selectedLote, setSelectedLote] = useState<any>(null);

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

  const filteredReagentes = reagentes.filter(r =>
    !searchQuery || r.nome?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAction = (action: string, payload: any) => {
    if (action === "nova_especificacao") {
      setSelectedResumo(payload);
      setIsNovaEspecOpen(true);
    } else if (action === "novo_lote") {
      setSelectedResumo(payload.reagente);
      setSelectedEspec(payload.espec);
      setIsNovoLoteOpen(true);
    } else if (action === "novo_frasco") {
      setSelectedResumo(payload.reagente);
      setSelectedEspec(payload.espec);
      setSelectedLote(payload.lote);
      setIsAdicionarFrascoOpen(true);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Bolsista"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {isChefe && (
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
              <div className="flex items-center gap-3 flex-wrap">
                <button className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  Novo Almoxarifado
                </button>
                <button className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Novo Gestor de Almoxarifado
                </button>
                <button onClick={() => setIsMateriaModalOpen(true)} className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  Nova Matéria
                </button>
                <div className="h-8 w-px bg-foreground/10 hidden sm:block"></div>
                <button className="px-4 py-2 rounded-lg bg-foreground/5 text-sm font-medium hover:bg-foreground/10 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Gerenciar Gestores de Almoxarifado
                </button>
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400/60">Ações de Chefe Geral</span>
            </div>
          )}

          {hasManagementAccess && (
            <div className="flex flex-col min-[1572px]:flex-row gap-4 items-center justify-between p-5 bg-foreground/5 rounded-2xl border border-foreground/10">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button className="relative p-3 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors">
                    <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
                  </button>
                  <div className="h-8 w-px bg-foreground/20 hidden sm:block"></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <button onClick={() => setIsCadastroMenuOpen(!isCadastroMenuOpen)} className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        <span className="hidden sm:inline">Cadastrar Reagente</span>
                        <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      
                      {isCadastroMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsCadastroMenuOpen(false)}></div>
                          <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-foreground/10 rounded-xl shadow-xl z-50 overflow-hidden">
                            <div className="p-1">
                              <button onClick={() => { setIsNovaSubstanciaOpen(true); setIsCadastroMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-foreground/5 rounded-lg flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">1</span>
                                <div>
                                  <div className="font-bold">Substância Química Base</div>
                                  <div className="text-[10px] text-foreground/50">Crie o registro base (ex: NaCl)</div>
                                </div>
                              </button>
                              <button onClick={() => { setIsNovoReagenteOpen(true); setIsCadastroMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-foreground/5 rounded-lg flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">2</span>
                                <div>
                                  <div className="font-bold">Resumo de Reagente</div>
                                  <div className="text-[10px] text-foreground/50">Item agrupador de catálogo</div>
                                </div>
                              </button>
                              <button onClick={() => { 
                                  setSelectedResumo(null); 
                                  setIsNovaEspecOpen(true); 
                                  setIsCadastroMenuOpen(false); 
                                }} 
                                className="w-full text-left px-4 py-3 text-sm hover:bg-foreground/5 rounded-lg flex items-center gap-2"
                              >
                                <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">3</span>
                                <div>
                                  <div className="font-bold">Especificação Comercial</div>
                                  <div className="text-[10px] text-foreground/50">Produto físico (ex: NaCl P.A. 99%)</div>
                                </div>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <button onClick={() => setIsEtiquetasOpen(true)} className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 flex items-center gap-2 border border-foreground/20">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      <span className="hidden sm:inline">Imprimir Etiquetas</span>
                    </button>
                    <div className="h-4 w-px bg-foreground/20 hidden sm:block mx-1"></div>
                    <button onClick={() => setIsRelatoriosOpen(true)} className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="hidden sm:inline">Relatórios</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex gap-3 w-full lg:w-auto">
                  <button onClick={() => setIsRetiradaOpen(true)} className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                    <svg className="hidden sm:inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    Registrar Retirada
                  </button>
                  <button onClick={() => setIsDevolucaoOpen(true)} className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                    <svg className="hidden sm:inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Registrar Devolução
                  </button>
                </div>
              </div>
            </div>
          )}

          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Estoque (Reagentes)</h1>
              <p className="text-foreground/60 mt-1">Primeiro, busque no banco. Depois, filtre livremente o resultado.</p>
            </div>
          </header>

          <div className="glass-panel p-6 rounded-2xl space-y-4 border-2 border-primary/20 bg-primary/5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              Passo 1: Filtros de Banco de Dados (Obrigatório)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Estado Físico</label>
                <select className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                  <option value="">(Nenhum)</option>
                  <option value="Sólido">Sólido</option>
                  <option value="Líquido">Líquido</option>
                </select>
              </div>
              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Natureza Química</label>
                <select className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm" value={filtroNatureza} onChange={(e) => setFiltroNatureza(e.target.value)}>
                  <option value="">(Nenhuma)</option>
                  <option value="ORGANICO">Orgânico</option>
                  <option value="INORGANICO">Inorgânico</option>
                  <option value="ELEMENTO">Elemento</option>
                  <option value="HIBRIDO">Híbrido</option>
                </select>
              </div>
              <div className="w-full">
                <label className="block text-xs font-semibold mb-1 text-foreground/70">Letra Inicial</label>
                <select className="w-full bg-background border border-foreground/10 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm" value={filtroLetra} onChange={(e) => setFiltroLetra(e.target.value)}>
                  <option value="">(Nenhuma)</option>
                  {alphabet.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="w-full">
                <button onClick={searchFirestore} className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 flex justify-center items-center gap-2">
                  Buscar no Banco
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-foreground/5 p-4 rounded-xl border border-foreground/10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/60 flex items-center gap-2">
              Passo 2: Filtrar Resultados
            </h2>
            <div className="w-full sm:w-1/2">
              <input type="text" disabled={!hasSearched || reagentes.length === 0} placeholder={hasSearched ? "Filtrar os itens da tabela pelo nome..." : "Busque no banco primeiro..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
          </div>

          <div className="glass-panel overflow-hidden rounded-2xl border border-foreground/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-foreground/70 border-b border-foreground/10">
                  <tr>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Nome do Reagente</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Tipo</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Natureza</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Estado Físico</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-right">Ações</th>
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
                      <AccordionRow key={reagente.id} reagente={reagente} onAction={handleAction} />
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

          {user && <ModalRelatoriosReagentes isOpen={isRelatoriosOpen} onClose={() => setIsRelatoriosOpen(false)} uid={user.uid} isChefe={isChefe} />}
          {isEtiquetasOpen && <ModalEtiquetasReagentes isOpen={isEtiquetasOpen} onClose={() => setIsEtiquetasOpen(false)} />}
          <NovaMateriaModal isOpen={isMateriaModalOpen} onClose={() => setIsMateriaModalOpen(false)} />
          <ModalNovaSubstancia isOpen={isNovaSubstanciaOpen} onClose={() => setIsNovaSubstanciaOpen(false)} onSuccess={() => {}} />
          <ModalNovoReagente isOpen={isNovoReagenteOpen} onClose={() => setIsNovoReagenteOpen(false)} onSuccess={searchFirestore} />
          
          <ModalNovaEspecificacao isOpen={isNovaEspecOpen} onClose={() => setIsNovaEspecOpen(false)} onSuccess={() => {}} idResumoReagente={selectedResumo?.id} tipoSubstanciaResumo={selectedResumo?.tipo_substancia} />
          <ModalNovoLote isOpen={isNovoLoteOpen} onClose={() => setIsNovoLoteOpen(false)} onSuccess={() => {}} idResumoReagente={selectedResumo?.id} idEspecificacaoReagente={selectedEspec?.id} />
          <ModalEntradaFrasco isOpen={isAdicionarFrascoOpen} onClose={() => setIsAdicionarFrascoOpen(false)} onSuccess={() => {}} idResumoReagente={selectedResumo?.id} idEspecificacaoReagente={selectedEspec?.id} />
          <ModalRegistrarRetirada isOpen={isRetiradaOpen} onClose={() => setIsRetiradaOpen(false)} />
          <ModalDevolucaoFrasco isOpen={isDevolucaoOpen} onClose={() => setIsDevolucaoOpen(false)} frascoId="" />

        </div>
      </main>
    </ProtectedRoute>
  );
}

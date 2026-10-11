"use client";

import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { functions, db } from "@/lib/firebase/config";
import { ModalProps } from "./types";
import { obterCatalogoReagentes } from "@/services/reagentes/reagentesService";
import type { ResumoReagente } from "@/types/reagentes";

type SubstanciaCatalogo = { id: string; nome: string; cas_number?: string };
type ComposicaoForm = {
  idSubstanciaQuimica: string;
  valorMin: string;
  valorMax: string;
  tipoConcentracao: string;
  notacaoOriginalFabricante: string;
};
type CampoComposicao = keyof ComposicaoForm;

export function ModalNovaEspecificacao({ isOpen, onClose, idResumoReagente, resumoSelecionado, onSuccess }: ModalProps) {
  const [resumos, setResumos] = useState<ResumoReagente[]>([]);
  const [substancias, setSubstancias] = useState<SubstanciaCatalogo[]>([]);
  
  const [selectedResumoId, setSelectedResumoId] = useState(idResumoReagente || "");
  
  const [descricao, setDescricao] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [densidade, setDensidade] = useState("");
  const [classeInflamabilidade, setClasseInflamabilidade] = useState("NAO_INFLAMAVEL");
  const [ehControladoPf, setEhControladoPf] = useState(false);
  const [ehControladoEb, setEhControladoEb] = useState(false);
  
  const [idSubstanciaPura, setIdSubstanciaPura] = useState("");
  const [composicoes, setComposicoes] = useState<ComposicaoForm[]>([{ idSubstanciaQuimica: "", valorMin: "", valorMax: "", tipoConcentracao: "M_M", notacaoOriginalFabricante: "" }]);
  
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroNatureza, setFiltroNatureza] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [textoBusca, setTextoBusca] = useState("");
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isOpen || idResumoReagente) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) { setLoadingBusca(true); setErrorMsg(""); }
      return obterCatalogoReagentes();
    }).then((catalogo) => { if (!cancelled) setResumos(catalogo); })
      .catch((err: unknown) => { if (!cancelled) setErrorMsg(err instanceof Error ? err.message : "Não foi possível carregar o catálogo de reagentes."); })
      .finally(() => { if (!cancelled) setLoadingBusca(false); });
    return () => { cancelled = true; };
  }, [isOpen, idResumoReagente]);

  useEffect(() => {
    if (isOpen) {
      getDocs(query(collection(db, "Substancia_Quimica"), limit(200))).then(snap => {
        setSubstancias(snap.docs.map(d => ({ id: d.id, ...d.data() })) as SubstanciaCatalogo[]);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && idResumoReagente) {
      void Promise.resolve().then(() => setSelectedResumoId(idResumoReagente));
    }
  }, [isOpen, idResumoReagente]);

  if (!isOpen) return null;

  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const termoNormalizado = normalizar(textoBusca.trim());
  const resumosFiltrados = resumos.filter((resumo) => {
    const correspondeTexto = !termoNormalizado || [resumo.id, resumo.nome, resumo.natureza_quimica, resumo.tipo_substancia, resumo.estado_fisico].some((valor) => normalizar(String(valor ?? "")).includes(termoNormalizado));
    return correspondeTexto && (!filtroEstado || resumo.estado_fisico === filtroEstado) && (!filtroNatureza || resumo.natureza_quimica === filtroNatureza) && (!filtroTipo || resumo.tipo_substancia === filtroTipo);
  });
  const selectedResumoData = resumos.find(r => r.id === selectedResumoId) || resumoSelecionado || (idResumoReagente ? { tipo_substancia: "PURA", estado_fisico: "SOLIDO" } : null);
  
  const isMistura = selectedResumoData?.tipo_substancia === "MISTURA";
  const estadoFisico = selectedResumoData?.estado_fisico === "LIQUIDO" || selectedResumoData?.estado_fisico === "Líquido"
    ? "LIQUIDO"
    : "SOLIDO";
  const unidadeDeMedida = estadoFisico === "LIQUIDO" ? "ml" : "g";

  const handleAddComposicao = () => {
    setComposicoes([...composicoes, { idSubstanciaQuimica: "", valorMin: "", valorMax: "", tipoConcentracao: "M_M", notacaoOriginalFabricante: "" }]);
  };

  const handleComposicaoChange = (index: number, field: CampoComposicao, value: string) => {
    setComposicoes((atual) => atual.map((composicao, composicaoIndex) => (
      composicaoIndex === index ? { ...composicao, [field]: value } : composicao
    )));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      if (!selectedResumoId) throw new Error("Selecione um Resumo de Reagente.");
      
      const cadastrarEspecificacao = httpsCallable(functions, 'cadastrarEspecificacao');
      const compData = isMistura ? composicoes.map(c => ({
        idSubstanciaQuimica: c.idSubstanciaQuimica,
        valorMin: c.valorMin ? Number(c.valorMin) : undefined,
        valorMax: c.valorMax ? Number(c.valorMax) : undefined,
        tipoConcentracao: c.tipoConcentracao as "M_M" | "V_V" | "M_V" | "MOL_L" | "MOL_KG" | "PPM" | "PPB",
        notacaoOriginalFabricante: c.notacaoOriginalFabricante || undefined,
      })) : undefined;

      await cadastrarEspecificacao({
        idOperacao: crypto.randomUUID(),
        idResumoReagente: selectedResumoId,
        descricao,
        fabricante: fabricante || undefined,
        densidade: estadoFisico === "LIQUIDO" ? Number(densidade) : undefined,
        classeInflamabilidade,
        ehControladoPf,
        ehControladoEb,
        idSubstanciaQuimica: !isMistura ? idSubstanciaPura : undefined,
        composicao: compData
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro interno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl shadow-xl my-8">
        <h2 className="text-xl font-bold mb-4">Nova Especificação Comercial</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!idResumoReagente && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4 space-y-3">
              <label className="block text-sm font-bold text-primary">Buscar Resumo de Reagente (Catálogo)</label>
              
              <div className="mb-2">
                <label htmlFor="busca-resumo-catalogo" className="sr-only">Buscar no catálogo por texto</label>
                <input id="busca-resumo-catalogo" type="search" value={textoBusca} onChange={(e) => setTextoBusca(e.target.value)} placeholder="Buscar por nome, natureza, tipo ou estado…" className="w-full rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-1/3 px-2 py-1.5 text-sm rounded bg-background border border-primary/20 outline-none">
                  <option value="">Qualquer Estado Físico</option>
                  <option value="SOLIDO">Sólido</option>
                  <option value="LIQUIDO">Líquido</option>
                  <option value="GASOSO">Gasoso</option>
                </select>
                <select value={filtroNatureza} onChange={(e) => setFiltroNatureza(e.target.value)} className="w-1/3 px-2 py-1.5 text-sm rounded bg-background border border-primary/20 outline-none">
                  <option value="">Qualquer Natureza</option>
                  <option value="ORGANICO">Orgânico</option>
                  <option value="INORGANICO">Inorgânico</option>
                  <option value="ELEMENTO">Elemento</option>
                  <option value="HIBRIDO">Híbrido</option>
                </select>
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-1/3 px-2 py-1.5 text-sm rounded bg-background border border-primary/20 outline-none">
                  <option value="">Qualquer Tipo</option>
                  <option value="PURA">Pura</option>
                  <option value="MISTURA">Mistura</option>
                </select>
              </div>
              <div className="text-[10px] text-foreground/50 italic">A busca consulta o catálogo JSON; os filtros são opcionais e podem ser combinados com o texto.</div>

              <select data-testid="especificacao-resumo-catalogo" required value={selectedResumoId} onChange={(e) => setSelectedResumoId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary outline-none mt-2">
                <option value="">{loadingBusca ? "(Carregando catálogo…)" : resumosFiltrados.length === 0 ? "(Nenhum resumo encontrado)" : "(Selecione o Reagente)"}</option>
                {resumosFiltrados.map(r => (
                  <option key={r.id} value={r.id}>{r.nome} ({r.estado_fisico}) - {r.tipo_substancia}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Descrição Comercial</label>
              <input type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fabricante (Opcional)</label>
              <input type="text" value={fabricante} onChange={(e) => setFabricante(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground/50">Estado Físico (Herdado)</label>
              <input data-testid="especificacao-estado-fisico" type="text" disabled value={selectedResumoId ? estadoFisico : ""}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none opacity-50 font-bold" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground/50">Unidade (Herdada)</label>
              <input data-testid="especificacao-unidade-medida" type="text" disabled value={selectedResumoId ? unidadeDeMedida : ""}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none opacity-50 font-bold" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Densidade (g/ml)</label>
              <input type="number" step="0.0001" required={estadoFisico === "LIQUIDO"} disabled={estadoFisico !== "LIQUIDO" || !selectedResumoId} value={densidade} onChange={(e) => setDensidade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none disabled:opacity-50" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Classe Inflamabilidade</label>
              <select value={classeInflamabilidade} onChange={(e) => setClasseInflamabilidade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none">
                <option value="NAO_INFLAMAVEL">Não Inflamável</option>
                <option value="CLASSE_1">Classe 1</option>
                <option value="CLASSE_2">Classe 2</option>
                <option value="CLASSE_3">Classe 3</option>
              </select>
            </div>
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input type="checkbox" checked={ehControladoPf} onChange={(e) => setEhControladoPf(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                <span className="text-sm font-medium">Controlado PF</span>
              </label>
            </div>
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input type="checkbox" checked={ehControladoEb} onChange={(e) => setEhControladoEb(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                <span className="text-sm font-medium">Controlado Exército</span>
              </label>
            </div>
          </div>

          {selectedResumoId && (
            <div className="mt-4 p-4 border border-foreground/10 rounded-xl bg-foreground/5">
              <h3 className="font-bold mb-2 text-primary">{isMistura ? "Composição (Mistura)" : "Substância Química Base (Pura)"}</h3>
              
              {!isMistura ? (
                <div>
                  <select required value={idSubstanciaPura} onChange={(e) => setIdSubstanciaPura(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/10 focus:ring-2 focus:ring-primary outline-none text-sm">
                    <option value="">(Selecione a Substância Base)</option>
                    {substancias.map(s => (
                      <option key={s.id} value={s.id}>{s.nome} {s.cas_number ? `(CAS: ${s.cas_number})` : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  {composicoes.map((comp, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                      <select required value={comp.idSubstanciaQuimica} onChange={(e) => handleComposicaoChange(idx, "idSubstanciaQuimica", e.target.value)} 
                        className="px-2 py-1 text-xs rounded bg-background border border-foreground/10 w-full col-span-2">
                        <option value="">(Selecione a Substância)</option>
                        {substancias.map(s => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                      <input type="number" step="0.01" placeholder="Mín" value={comp.valorMin} onChange={(e) => handleComposicaoChange(idx, "valorMin", e.target.value)} className="px-2 py-1 text-xs rounded bg-background border border-foreground/10" />
                      <input type="number" step="0.01" placeholder="Máx" value={comp.valorMax} onChange={(e) => handleComposicaoChange(idx, "valorMax", e.target.value)} className="px-2 py-1 text-xs rounded bg-background border border-foreground/10" />
                      <select value={comp.tipoConcentracao} onChange={(e) => handleComposicaoChange(idx, "tipoConcentracao", e.target.value)} className="px-2 py-1 text-xs rounded bg-background border border-foreground/10">
                        <option value="M_M">% m/m</option>
                        <option value="V_V">% v/v</option>
                        <option value="M_V">% m/v</option>
                        <option value="MOL_L">mol/L</option>
                        <option value="MOL_KG">mol/kg</option>
                        <option value="PPM">ppm</option>
                        <option value="PPB">ppb</option>
                      </select>
                    </div>
                  ))}
                  <button type="button" onClick={handleAddComposicao} className="text-xs text-primary hover:underline font-bold">+ Adicionar Substância na Mistura</button>
                </div>
              )}
            </div>
          )}

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || !selectedResumoId} className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Especificação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

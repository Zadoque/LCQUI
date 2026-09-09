"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  idResumoReagente?: string;
  idEspecificacaoReagente?: string;
  onSuccess?: () => void;
}

export function ModalEntradaFrasco({ isOpen, onClose, idResumoReagente, idEspecificacaoReagente, onSuccess }: ModalProps) {
  const [lote, setLote] = useState("");
  const [pesoCheio, setPesoCheio] = useState("");
  const [volumeNominal, setVolumeNominal] = useState("");
  const [unidade, setUnidade] = useState<"mg" | "ml">("mg");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const cadastrarFrascoFechado = httpsCallable(functions, 'cadastrarFrascoFechado');
      await cadastrarFrascoFechado({
        idResumoReagente,
        idEspecificacaoReagente,
        idAlmoxarifado: "simulado_almoxarifado", // TODO: pegar do contexto do gestor
        idLote: lote || undefined,
        pesoTotal: Number(pesoCheio),
        volumeNominal: Number(volumeNominal)
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro interno ao cadastrar o frasco.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-bold mb-4">Cadastrar Novo Frasco (Fechado)</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ID do Lote (opcional se não houver lote cadastrado)</label>
            <input type="text" value={lote} onChange={(e) => setLote(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Peso Total (Balança) - g</label>
              <input type="number" step="0.01" required value={pesoCheio} onChange={(e) => setPesoCheio(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Volume/Massa Nominal - {unidade}</label>
              <input type="number" step="0.01" required value={volumeNominal} onChange={(e) => setVolumeNominal(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Frasco"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ModalDevolucaoFrasco({ isOpen, onClose, frascoId, onSuccess }: ModalProps & { frascoId: string }) {
  const [quantidadeDevolvida, setQuantidadeDevolvida] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const registrarDevolucao = httpsCallable(functions, 'registrarDevolucao');
      await registrarDevolucao({
        id_emprestimo_reagente: "simulado_emprestimo_aberto",
        quantidade_devolvida_mg_ml: Number(quantidadeDevolvida),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro na validação da devolução.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-sm p-6 rounded-2xl shadow-xl border-amber-500/20">
        <h2 className="text-xl font-bold mb-4 text-amber-500">Registrar Devolução</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade Marcada na Balança</label>
            <input type="number" step="0.01" required value={quantidadeDevolvida} onChange={(e) => setQuantidadeDevolvida(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          {errorMsg && <div className="text-amber-500 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50">
              {loading ? "Validando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ModalNovoReagente({ isOpen, onClose, onSuccess }: ModalProps) {
  const [nome, setNome] = useState("");
  const [tipoSubstancia, setTipoSubstancia] = useState("PURA");
  const [naturezaQuimica, setNaturezaQuimica] = useState("ORGANICO");
  const [requerPesagemFrequente, setRequerPesagemFrequente] = useState(false);
  const [frequenciaPesagemDias, setFrequenciaPesagemDias] = useState("");
  const [qtdEscasso, setQtdEscasso] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const cadastrarResumoReagente = httpsCallable(functions, 'cadastrarResumoReagente');
      await cadastrarResumoReagente({
        nome,
        tipoSubstancia,
        naturezaQuimica,
        requerPesagemFrequente,
        frequenciaPesagemDias: requerPesagemFrequente && frequenciaPesagemDias ? Number(frequenciaPesagemDias) : undefined,
        qtdEmQueEConsideradoEscasso: Number(qtdEscasso)
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro interno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl my-8">
        <h2 className="text-xl font-bold mb-4">Novo Resumo de Reagente (Catálogo)</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Reagente</label>
            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Substância</label>
              <select value={tipoSubstancia} onChange={(e) => setTipoSubstancia(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none">
                <option value="PURA">Pura</option>
                <option value="MISTURA">Mistura</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Natureza Química</label>
              <select value={naturezaQuimica} onChange={(e) => setNaturezaQuimica(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none">
                <option value="ORGANICO">Orgânico</option>
                <option value="INORGANICO">Inorgânico</option>
                <option value="ELEMENTO">Elemento</option>
                <option value="HIBRIDO">Híbrido</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={requerPesagemFrequente} onChange={(e) => setRequerPesagemFrequente(e.target.checked)} className="rounded text-primary focus:ring-primary bg-foreground/5 border-foreground/10" />
                <span className="text-sm font-medium">Requer pesagem frequente?</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dias p/ Pesagem (se req.)</label>
              <input type="number" required={requerPesagemFrequente} disabled={!requerPesagemFrequente} value={frequenciaPesagemDias} onChange={(e) => setFrequenciaPesagemDias(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none disabled:opacity-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Limiar de Escassez (frascos ou ml/g)</label>
            <input type="number" required value={qtdEscasso} onChange={(e) => setQtdEscasso(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Resumo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ModalNovaEspecificacao({ isOpen, onClose, idResumoReagente, onSuccess, tipoSubstanciaResumo }: ModalProps & { tipoSubstanciaResumo: string }) {
  const [descricao, setDescricao] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [densidade, setDensidade] = useState("");
  const [estadoFisico, setEstadoFisico] = useState("SOLIDO");
  const [unidadeDeMedida, setUnidadeDeMedida] = useState("g");
  const [classeInflamabilidade, setClasseInflamabilidade] = useState("NAO_INFLAMAVEL");
  const [ehControladoPf, setEhControladoPf] = useState(false);
  const [ehControladoEb, setEhControladoEb] = useState(false);
  const [composicoes, setComposicoes] = useState([{ idSubstanciaQuimica: "", valorComposicao: "", tipoConcentracao: "M_M", unidade: "" }]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const isMistura = tipoSubstanciaResumo === "MISTURA";

  const handleAddComposicao = () => {
    setComposicoes([...composicoes, { idSubstanciaQuimica: "", valorComposicao: "", tipoConcentracao: "M_M", unidade: "" }]);
  };

  const handleComposicaoChange = (index: number, field: string, value: string) => {
    const newComp = [...composicoes];
    (newComp[index] as any)[field] = value;
    setComposicoes(newComp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const cadastrarEspecificacao = httpsCallable(functions, 'cadastrarEspecificacao');
      const compData = isMistura ? composicoes.map(c => ({
        ...c,
        valorComposicao: c.valorComposicao ? Number(c.valorComposicao) : undefined
      })) : undefined;

      await cadastrarEspecificacao({
        idResumoReagente,
        descricao,
        fabricante,
        estadoFisico,
        unidadeDeMedida,
        densidade: estadoFisico === "LIQUIDO" ? Number(densidade) : undefined,
        classeInflamabilidade,
        ehControladoPf,
        ehControladoEb,
        composicao: compData
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro interno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl shadow-xl my-8">
        <h2 className="text-xl font-bold mb-4">Nova Especificação</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium mb-1">Estado Físico</label>
              <select value={estadoFisico} onChange={(e) => setEstadoFisico(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none">
                <option value="SOLIDO">Sólido</option>
                <option value="LIQUIDO">Líquido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unidade</label>
              <select value={unidadeDeMedida} onChange={(e) => setUnidadeDeMedida(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none">
                <option value="g">g</option>
                <option value="ml">ml</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Densidade (g/ml)</label>
              <input type="number" step="0.0001" required={estadoFisico === "LIQUIDO"} disabled={estadoFisico === "SOLIDO"} value={densidade} onChange={(e) => setDensidade(e.target.value)}
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

          {isMistura && (
            <div className="mt-4 p-4 border border-foreground/10 rounded-xl bg-foreground/5">
              <h3 className="font-bold mb-2">Composição (Obrigatório para Mistura)</h3>
              {composicoes.map((comp, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                  <input type="text" placeholder="Substância (ex: ID123)" value={comp.idSubstanciaQuimica} onChange={(e) => handleComposicaoChange(idx, "idSubstanciaQuimica", e.target.value)} className="px-2 py-1 text-sm rounded bg-background border border-foreground/10" required />
                  <input type="number" step="0.01" placeholder="Valor" value={comp.valorComposicao} onChange={(e) => handleComposicaoChange(idx, "valorComposicao", e.target.value)} className="px-2 py-1 text-sm rounded bg-background border border-foreground/10" required />
                  <select value={comp.tipoConcentracao} onChange={(e) => handleComposicaoChange(idx, "tipoConcentracao", e.target.value)} className="px-2 py-1 text-sm rounded bg-background border border-foreground/10">
                    <option value="M_M">% m/m</option>
                    <option value="V_V">% v/v</option>
                    <option value="M_V">% m/v</option>
                    <option value="MOL_L">mol/L</option>
                  </select>
                  <input type="text" placeholder="Unidade (Opc)" value={comp.unidade} onChange={(e) => handleComposicaoChange(idx, "unidade", e.target.value)} className="px-2 py-1 text-sm rounded bg-background border border-foreground/10" />
                </div>
              ))}
              <button type="button" onClick={handleAddComposicao} className="text-sm text-primary hover:underline">+ Adicionar Substância</button>
            </div>
          )}

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Especificação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ModalNovoLote({ isOpen, onClose, idResumoReagente, idEspecificacaoReagente, onSuccess }: ModalProps) {
  const [numeroLote, setNumeroLote] = useState("");
  const [nomeFornecedor, setNomeFornecedor] = useState("");
  const [qtdFrascosComprados, setQtdFrascosComprados] = useState("");
  const [dataAquisicao, setDataAquisicao] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [dataFabricacao, setDataFabricacao] = useState("");
  const [dataValidade, setDataValidade] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const cadastrarLote = httpsCallable(functions, 'cadastrarLote');
      await cadastrarLote({
        idResumoReagente,
        idEspecificacaoReagente,
        numeroLote,
        nomeFornecedor,
        qtdFrascosComprados: Number(qtdFrascosComprados),
        dataAquisicao,
        notaFiscal,
        dataFabricacao,
        dataValidade
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro interno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl my-8">
        <h2 className="text-xl font-bold mb-4">Cadastrar Lote</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Número do Lote</label>
              <input type="text" required value={numeroLote} onChange={(e) => setNumeroLote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fornecedor</label>
              <input type="text" required value={nomeFornecedor} onChange={(e) => setNomeFornecedor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nota Fiscal</label>
              <input type="text" required value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Qtd. Comprada (Frascos)</label>
              <input type="number" required value={qtdFrascosComprados} onChange={(e) => setQtdFrascosComprados(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data Aquisição</label>
              <input type="date" required value={dataAquisicao} onChange={(e) => setDataAquisicao(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fabricação</label>
              <input type="date" required value={dataFabricacao} onChange={(e) => setDataFabricacao(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Validade</label>
              <input type="date" required value={dataValidade} onChange={(e) => setDataValidade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none text-sm" />
            </div>
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Lote"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ModalRegistrarRetirada({ isOpen, onClose, onSuccess }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [frascoId, setFrascoId] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-sm p-6 rounded-2xl shadow-xl border-orange-500/20">
        <h2 className="text-xl font-bold mb-4 text-orange-500">Registrar Retirada</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ID do Frasco / QR Code</label>
            <input type="text" required placeholder="Ex: F-12345" value={frascoId} onChange={(e) => setFrascoId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50">
              {loading ? "Processando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

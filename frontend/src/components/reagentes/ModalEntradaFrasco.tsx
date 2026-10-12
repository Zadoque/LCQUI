"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ModalProps } from "./types";
import { cadastrarFrascoAberto, cadastrarFrascoFechado, obterCatalogoReagentes } from "@/services/reagentes/reagentesService";
import type { CatalogoEspecificacao, ResumoReagente } from "@/types/reagentes";
import type { CadastroFrascoResult } from "@/types/reagentesApi";

interface OpcaoEspecificacao {
  resumo: ResumoReagente;
  especificacao: CatalogoEspecificacao;
}

function normalizarBusca(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function rotuloEstado(estado?: ResumoReagente["estado_fisico"]): string {
  return estado === "LIQUIDO" ? "Líquido" : "Sólido";
}

export function ModalEntradaFrasco({
  isOpen,
  onClose,
  idResumoReagente,
  idEspecificacaoReagente,
  idAlmoxarifado,
  onSuccess,
}: ModalProps) {
  const [condicaoInicial, setCondicaoInicial] = useState<"FECHADO" | "JA_ABERTO">("FECHADO");
  const [lote, setLote] = useState("");
  const [pesoCheio, setPesoCheio] = useState("");
  const [volumeNominal, setVolumeNominal] = useState("");
  const [validade, setValidade] = useState("");
  const [validadeDesconhecida, setValidadeDesconhecida] = useState(false);
  const [decisaoSeJaVencido, setDecisaoSeJaVencido] = useState<"QUARENTENA" | "PENDENTE_DE_DESCARTE" | "DISPONIVEL">("QUARENTENA");
  const [detalheStatus, setDetalheStatus] = useState("");
  const [catalogo, setCatalogo] = useState<ResumoReagente[]>([]);
  const [buscaCatalogo, setBuscaCatalogo] = useState("");
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [resumoSelecionadoId, setResumoSelecionadoId] = useState(idResumoReagente ?? "");
  const [especificacaoSelecionadaId, setEspecificacaoSelecionadaId] = useState(idEspecificacaoReagente ?? "");

  useEffect(() => {
    if (!isOpen) return;

    let cancelado = false;
    void Promise.resolve().then(() => {
      if (cancelado) return;
      setCodigoGerado(null);
      setErrorMsg("");
      setBuscaCatalogo("");
      setResumoSelecionadoId(idResumoReagente ?? "");
      setEspecificacaoSelecionadaId(idEspecificacaoReagente ?? "");
      setLoadingCatalogo(true);
    });

    void obterCatalogoReagentes()
      .then((resumos) => {
        if (!cancelado) setCatalogo(resumos);
      })
      .catch((error: unknown) => {
        if (!cancelado) {
          setErrorMsg(error instanceof Error ? error.message : "Não foi possível carregar o catálogo de reagentes.");
        }
      })
      .finally(() => {
        if (!cancelado) setLoadingCatalogo(false);
      });

    return () => {
      cancelado = true;
    };
  }, [isOpen, idResumoReagente, idEspecificacaoReagente]);

  const opcoesEspecificacao = useMemo<OpcaoEspecificacao[]>(
    () => catalogo.flatMap((resumo) => Object.values(resumo.especificacoes ?? {}).map((especificacao) => ({ resumo, especificacao }))),
    [catalogo],
  );

  const opcoesFiltradas = useMemo(() => {
    const termo = normalizarBusca(buscaCatalogo.trim());
    if (!termo) return opcoesEspecificacao;
    return opcoesEspecificacao.filter(({ resumo, especificacao }) => [
      resumo.nome,
      resumo.estado_fisico,
      especificacao.descricao,
      especificacao.fabricante,
    ].some((valor) => normalizarBusca(String(valor ?? "")).includes(termo)));
  }, [buscaCatalogo, opcoesEspecificacao]);

  const resumoAtual = catalogo.find((resumo) => resumo.id === resumoSelecionadoId);
  const especificacaoAtual = opcoesEspecificacao.find(({ resumo, especificacao }) => (
    resumo.id === resumoSelecionadoId && especificacao.id === especificacaoSelecionadaId
  ));
  const estadoFisico = resumoAtual?.estado_fisico === "LIQUIDO"
    ? "LIQUIDO"
    : "SOLIDO";
  const unidade = estadoFisico === "LIQUIDO" ? "ml" : "g";

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (!idAlmoxarifado) throw new Error("Nenhum almoxarifado ativo está vinculado ao gestor.");
      if (!resumoSelecionadoId || !especificacaoSelecionadaId || !especificacaoAtual) {
        throw new Error("Selecione o resumo e a especificação do reagente antes de cadastrar o frasco.");
      }
      let resultado: CadastroFrascoResult;
      if (condicaoInicial === "FECHADO") {
        const resposta = await cadastrarFrascoFechado({
          idOperacao: crypto.randomUUID(),
          idResumoReagente: resumoSelecionadoId,
          idEspecificacaoReagente: especificacaoSelecionadaId,
          idAlmoxarifado,
          idLote: lote || undefined,
          pesoTotal: Number(pesoCheio),
          volumeNominal: volumeNominal ? Number(volumeNominal) : null,
          ...(validade ? { validadeFechado: validade } : {}),
          validadeDesconhecida,
          ...((validade || validadeDesconhecida) ? { decisaoSeJaVencido, ...(detalheStatus ? { detalheStatus } : {}) } : {}),
        });
        resultado = resposta;
      } else {
        const resposta = await cadastrarFrascoAberto({
          idOperacao: crypto.randomUUID(),
          idResumoReagente: resumoSelecionadoId,
          idEspecificacaoReagente: especificacaoSelecionadaId,
          idAlmoxarifado,
          idLote: lote || undefined,
          pesoTotalBalanca: Number(pesoCheio),
          volumeNominal: volumeNominal ? Number(volumeNominal) : null,
          ...(validade ? { validadeAberto: validade } : {}),
          validadeDesconhecida,
          ...((validade || validadeDesconhecida) ? { decisaoSeJaVencido, ...(detalheStatus ? { detalheStatus } : {}) } : {}),
        });
        resultado = resposta;
      }
      setCodigoGerado(resultado.codigoFrasco);
      await onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro interno ao cadastrar o frasco.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-bold mb-4">Cadastrar Novo Frasco</h2>

        {codigoGerado ? (
          <div className="space-y-4" data-testid="frasco-cadastro-sucesso">
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Frasco cadastrado com sucesso.</p>
              <p className="mt-2 text-lg font-bold">Código do frasco: <span data-testid="codigo-frasco-gerado">{codigoGerado}</span></p>
              <p className="mt-2 text-sm text-foreground/70">Localize a etiqueta correspondente, escreva os dados necessários e cole-a no frasco.</p>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-primary text-white font-medium">Concluir</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3" data-testid="seletor-especificacao-frasco">
            <div>
              <label htmlFor="busca-especificacao-frasco" className="block text-sm font-bold text-primary">Resumo e especificação do reagente</label>
              <p className="mt-1 text-xs text-foreground/60">Pesquise por nome, estado físico, fabricante ou descrição da especificação.</p>
            </div>
            <input
              id="busca-especificacao-frasco"
              type="search"
              value={buscaCatalogo}
              onChange={(event) => setBuscaCatalogo(event.target.value)}
              placeholder="Buscar nome, estado, fabricante ou descrição..."
              disabled={loadingCatalogo}
              className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary outline-none"
            />
            <select
              aria-label="Resumo e especificação do reagente"
              required
              value={especificacaoAtual ? JSON.stringify([resumoSelecionadoId, especificacaoSelecionadaId]) : ""}
              onChange={(event) => {
                if (!event.target.value) {
                  setResumoSelecionadoId("");
                  setEspecificacaoSelecionadaId("");
                  return;
                }
                const [idResumo, idEspecificacao] = JSON.parse(event.target.value) as [string, string];
                setResumoSelecionadoId(idResumo);
                setEspecificacaoSelecionadaId(idEspecificacao);
              }}
              disabled={loadingCatalogo || opcoesFiltradas.length === 0}
              className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">
                {loadingCatalogo ? "Carregando catálogo..." : opcoesFiltradas.length === 0 ? "Nenhuma especificação encontrada" : "Selecione uma especificação"}
              </option>
              {opcoesFiltradas.map(({ resumo, especificacao }) => (
                <option key={`${resumo.id}-${especificacao.id}`} value={JSON.stringify([resumo.id, especificacao.id])}>
                  {resumo.nome} — {especificacao.descricao || "Sem descrição"}{especificacao.fabricante ? ` — ${especificacao.fabricante}` : ""} ({rotuloEstado(resumo.estado_fisico)})
                </option>
              ))}
            </select>
            {especificacaoAtual && (
              <div className="grid grid-cols-1 gap-1 text-xs text-foreground/70 sm:grid-cols-3">
                <span>Resumo: <strong>{especificacaoAtual.resumo.nome}</strong></span>
                <span>Estado: <strong>{rotuloEstado(especificacaoAtual.resumo.estado_fisico)}</strong></span>
                <span>Unidade: <strong>{unidade}</strong></span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Condição Física Inicial</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCondicaoInicial("FECHADO")}
                className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${condicaoInicial === "FECHADO" ? "bg-primary text-primary-foreground border-primary" : "bg-foreground/5 border-foreground/10 text-foreground/70"}`}
              >
                Fechado (Original)
              </button>
              <button
                type="button"
                onClick={() => setCondicaoInicial("JA_ABERTO")}
                className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${condicaoInicial === "JA_ABERTO" ? "bg-primary text-primary-foreground border-primary" : "bg-foreground/5 border-foreground/10 text-foreground/70"}`}
              >
                Já Aberto (Em Uso)
              </button>
            </div>
            {/* UI-06: frasco já aberto sem tara e saldo inicial conhecidos. */}
            {condicaoInicial === "JA_ABERTO" && (
              <p className="text-xs text-foreground/60 mt-1">
                Como o peso do frasco e o saldo inicial ainda não são conhecidos, o sistema acompanhará o consumo até o esgotamento.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Código do lote (opcional)</label>
            <input
              type="text"
              value={lote}
              onChange={(e) => setLote(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Peso Total (Balança) - g *</label>
              <input
                type="number"
                step="0.01"
                required
                value={pesoCheio}
                onChange={(e) => setPesoCheio(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Conteúdo Nominal do Rótulo ({unidade})</label>
              <input
                type="number"
                step="0.01"
                value={volumeNominal}
                onChange={(e) => setVolumeNominal(e.target.value)} 
                placeholder="Opcional se ilegível"
                className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-foreground/10 p-3">
            <label className="block text-sm font-medium">Validade efetiva conhecida</label>
            <input aria-label="Validade do frasco" type="date" value={validade} disabled={validadeDesconhecida}
              onChange={(e) => setValidade(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none" />
            <label className="flex items-center gap-2 text-sm">
              <input aria-label="Validade desconhecida" type="checkbox" checked={validadeDesconhecida}
                onChange={(e) => setValidadeDesconhecida(e.target.checked)} />
              Validade desconhecida
            </label>
            {(validade || validadeDesconhecida) && (
              <>
                <label className="block text-sm font-medium">Destino se já estiver vencido</label>
                <select aria-label="Destino do frasco vencido" value={decisaoSeJaVencido}
                  onChange={(e) => setDecisaoSeJaVencido(e.target.value as typeof decisaoSeJaVencido)}
                  className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none">
                  <option value="QUARENTENA">Quarentena</option>
                  <option value="PENDENTE_DE_DESCARTE">Pendente de descarte</option>
                  <option value="DISPONIVEL">Disponível com autorização</option>
                </select>
                <textarea aria-label="Detalhe da decisão de validade" value={detalheStatus}
                  onChange={(e) => setDetalheStatus(e.target.value)}
                  placeholder="Justificativa da decisão de validade..."
                  className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 outline-none" />
              </>
            )}
          </div>

          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Frasco"}
            </button>
          </div>
          </form>
        )}
      </div>
    </div>
  );
}

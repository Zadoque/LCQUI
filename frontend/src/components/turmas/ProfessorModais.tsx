import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, getDocs, limit } from "firebase/firestore";
import { db, storage } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import {
  resolverIdOperacao,
  lerIntencao,
  gravarIntencao,
  limparIntencao,
  chaveIntencaoStatusTurma,
  assinaturaStatusTurma,
  obterIntencaoPersistida,
  chaveIntencaoMembro,
  assinaturaMembro,
  chaveIntencaoConvite,
  assinaturaIntencaoConvite,
} from "@/lib/intencaoOperacao";
import { construirPayloadConvidarAluno } from "@/lib/convitesPayload.mjs";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TurmasArquivadasModal({ isOpen, onClose }: ModalProps) {
  const { user } = useAuth();
  const [arquivadas, setArquivadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    const q = query(
      collection(db, "Turma"),
      where("id_professor", "==", user.uid),
      where("status", "==", "Arquivada")
    );

    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setArquivadas(lista);
    });
    return () => unsub();
  }, [isOpen, user]);

  const handleDesarquivar = async (idTurma: string) => {
    try {
      setLoading(true);
      const status = "Ativo";
      const session = typeof window !== "undefined" ? window.sessionStorage : null;
      const chave = chaveIntencaoStatusTurma(idTurma, status);
      const assinatura = assinaturaStatusTurma(idTurma, status);
      const atual = session ? lerIntencao(session, chave) : null;
      const intencao = resolverIdOperacao(atual, assinatura, () => crypto.randomUUID());
      if (session) gravarIntencao(session, chave, intencao);

      const alterarStatusFn = httpsCallable(getFunctions(), "alterarStatusTurma");
      await alterarStatusFn({ idOperacao: intencao.idOperacao, idTurma, status });
      if (session) limparIntencao(session, chave);
    } catch (error) {
      console.error("Erro ao desarquivar turma:", error);
      alert("Erro ao desarquivar turma.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="bg-background rounded-2xl border border-foreground/10 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-foreground/10 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            🗃️ Turmas Arquivadas
          </h2>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {arquivadas.length === 0 ? (
            <p className="text-muted-foreground text-center">Nenhuma turma arquivada encontrada.</p>
          ) : (
            <ul className="space-y-3">
              {arquivadas.map(turma => (
                <li key={turma.id} data-testid={`linha-turma-arquivada-${turma.id}`} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-bold">{turma.nome_turma}</p>
                    <p className="text-sm text-muted-foreground">
                      {turma.ano}.{turma.semestre} | {turma.nome_materia}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDesarquivar(turma.id)}
                    disabled={loading}
                    data-testid="botao-desarquivar-turma"
                    className="px-4 py-2 bg-primary/10 text-primary font-medium rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    Desarquivar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function NovoAlunoModal({ isOpen, onClose, turmaPreSelecionadaId }: ModalProps & { turmaPreSelecionadaId?: string }) {
  const { user, roles } = useAuth();
  const [idTurma, setIdTurma] = useState(turmaPreSelecionadaId || "");
  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"buscar" | "convidar">("buscar");
  const [matriculados, setMatriculados] = useState<Set<string>>(new Set());

  // Convidar form state (UI-10)
  const [emailsTexto, setEmailsTexto] = useState("");
  const [matricula, setMatricula] = useState("");
  const [confirmarGlobal, setConfirmarGlobal] = useState(false);
  const [excederCapacidade, setExcederCapacidade] = useState(false);
  const [justificativaExcecao, setJustificativaExcecao] = useState("");
  const [loadingConvite, setLoadingConvite] = useState(false);
  const [resultadosConvite, setResultadosConvite] = useState<Array<{
    email: string;
    status: "sucesso" | "erro";
    msg: string;
  }> | null>(null);

  // Buscar state
  const [letraInicial, setLetraInicial] = useState("A");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [alunosEncontrados, setAlunosEncontrados] = useState<any[]>([]);
  const [loadingAdicao, setLoadingAdicao] = useState<string | null>(null);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const isGestorGeral = roles.includes("Chefe_Geral");
  const functions = getFunctions();

  useEffect(() => {
    if (isOpen && turmaPreSelecionadaId) setIdTurma(turmaPreSelecionadaId);
  }, [isOpen, turmaPreSelecionadaId]);

  useEffect(() => {
    if (!isOpen || !user) return;
    let q;
    if (isGestorGeral) {
      q = query(collection(db, "Turma"), where("status", "==", "Ativo"));
    } else {
      q = query(collection(db, "Turma"), where("id_professor", "==", user.uid), where("status", "==", "Ativo"));
    }
    const unsub = onSnapshot(q, snap => {
      setTurmas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isOpen, user, isGestorGeral]);

  useEffect(() => {
    if (!isOpen || !idTurma) {
      setMatriculados(new Set());
      return;
    }
    const unsub = onSnapshot(collection(db, "Turma", idTurma, "Alunos"), snap => {
      setMatriculados(new Set(snap.docs.map(d => d.id)));
    });
    return () => unsub();
  }, [isOpen, idTurma]);

  const handleBuscar = async () => {
    setLoadingBusca(true);
    try {
      const buscarAlunos = httpsCallable(functions, "buscarAlunos");
      const res = await buscarAlunos({ letra: letraInicial, termo: filtroTexto });
      const data = res.data as { alunos: { id: string; nome: string }[] };
      setAlunosEncontrados(data.alunos);
    } catch (error) {
      console.error("Erro na busca:", error);
    } finally {
      setLoadingBusca(false);
    }
  };

  const handleAdicionarExistente = async (idAluno: string) => {
    if (!idTurma) {
      setToast({ type: "error", msg: "Selecione uma turma primeiro." });
      return;
    }
    setLoadingAdicao(idAluno);
    setToast(null);
    try {
      const session = typeof window !== "undefined" ? window.sessionStorage : null;
      const chave = chaveIntencaoMembro(idTurma, idAluno, "ADICIONAR");
      const assinatura = assinaturaMembro(idTurma, idAluno, "ADICIONAR");
      const intencao = session
        ? obterIntencaoPersistida(session, chave, assinatura, () => crypto.randomUUID())
        : { idOperacao: crypto.randomUUID(), assinatura };
      const adicionar = httpsCallable(functions, "adicionarAlunoExistenteTurma");
      await adicionar({ idOperacao: intencao.idOperacao, idTurma, idAluno });
      if (session) limparIntencao(session, chave);
      setToast({ type: "success", msg: "Aluno adicionado com sucesso!" });
    } catch (error: any) {
      console.error("Erro ao adicionar aluno:", error);
      setToast({ type: "error", msg: error.message || "Erro ao adicionar aluno." });
    } finally {
      setLoadingAdicao(null);
    }
  };

  const handleConvidar = async (e?: React.FormEvent, emailsAlvo?: string[]) => {
    if (e) e.preventDefault();
    setLoadingConvite(true);
    setToast(null);

    const listaEmails = emailsAlvo ?? Array.from(
      new Set(
        emailsTexto
          .split(/[\n,; ]+/)
          .map((em) => em.trim().toLowerCase())
          .filter((em) => em.length > 0)
      )
    );

    if (listaEmails.length === 0) {
      setToast({ type: "error", msg: "Informe ao menos um e-mail válido." });
      setLoadingConvite(false);
      return;
    }

    if (!idTurma && !confirmarGlobal) {
      setToast({
        type: "error",
        msg: "Para emitir convite sem turma selecionada, confirme explicitamente o convite GLOBAL.",
      });
      setLoadingConvite(false);
      return;
    }

    const podeExceder = Boolean(idTurma && !isGestorGeral && excederCapacidade);
    const justificativaFinal = podeExceder ? justificativaExcecao.trim() : undefined;

    if (idTurma && !isGestorGeral && excederCapacidade && !justificativaExcecao.trim()) {
      setToast({
        type: "error",
        msg: "Justificativa é obrigatória quando 'Exceder capacidade' for marcado.",
      });
      setLoadingConvite(false);
      return;
    }

    const session = typeof window !== "undefined" ? window.sessionStorage : null;
    const novosResultados = [...(resultadosConvite || [])];

    for (const em of listaEmails) {
      const chave = chaveIntencaoConvite(em, idTurma || null);
      const assinatura = assinaturaIntencaoConvite({
        email: em,
        idTurma: idTurma || null,
        matricula: matricula.trim() || null,
        excederCapacidade: podeExceder,
        justificativaExcecao: justificativaFinal ?? null,
      });

      const intencao = session
        ? obterIntencaoPersistida(session, chave, assinatura, () => crypto.randomUUID())
        : { idOperacao: crypto.randomUUID(), assinatura };

      try {
        const convidar = httpsCallable(functions, "convidarAluno");
        const res = await convidar(construirPayloadConvidarAluno({
          idOperacao: intencao.idOperacao,
          email: em,
          idTurma,
          matricula,
          excederCapacidade: podeExceder,
          justificativaExcecao: justificativaFinal ?? "",
        }));

        if (session) limparIntencao(session, chave);

        const dataRet = res.data as { canal_entrega?: string; status_entrega?: string };
        const canal = dataRet?.canal_entrega;
        const statusEntrega = dataRet?.status_entrega;

        let msgCanal = "";
        let statusItem: "sucesso" | "erro" = "sucesso";

        if (statusEntrega === "FALHOU") {
          statusItem = "erro";
          msgCanal = "Convite registrado, mas houve falha no envio das instruções pelo Firebase Auth. Reenvie o convite.";
        } else if (canal === "notificacao_interna") {
          msgCanal = "Convite registrado via notificação interna do aluno.";
        } else {
          msgCanal = "Convite registrado; fluxo de acesso enviado via Firebase Auth.";
        }

        const idx = novosResultados.findIndex((r) => r.email === em);
        const item = { email: em, status: statusItem, msg: msgCanal };
        if (idx >= 0) novosResultados[idx] = item;
        else novosResultados.push(item);
      } catch (error: unknown) {
        console.error(`Erro ao registrar convite para ${em}:`, error);
        const idx = novosResultados.findIndex((r) => r.email === em);
        const msg = error instanceof Error ? error.message : "Erro ao registrar convite.";
        const item = {
          email: em,
          status: "erro" as const,
          msg,
        };
        if (idx >= 0) novosResultados[idx] = item;
        else novosResultados.push(item);
      }
    }

    setResultadosConvite(novosResultados);
    setLoadingConvite(false);

    const falhas = novosResultados.filter((r) => r.status === "erro");
    if (falhas.length === 0) {
      setToast({ type: "success", msg: "Convite(s) registrado(s) com sucesso." });
      setEmailsTexto("");
      setMatricula("");
      setJustificativaExcecao("");
      setExcederCapacidade(false);
    } else {
      setToast({
        type: "error",
        msg: `${falhas.length} convite(s) falharam. Verifique os detalhes e tente novamente.`,
      });
    }
  };

  const alunosFiltrados = alunosEncontrados.filter(a => {
    if (!filtroTexto) return true;
    const term = filtroTexto.toLowerCase();
    return a.nome?.toLowerCase().includes(term);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl border border-foreground/10 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-foreground/10 flex justify-between items-center">
          <h2 className="text-xl font-bold">Novo Aluno</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-foreground/50 hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <label htmlFor="convite-turma" className="block text-sm font-semibold mb-1">Turma {isGestorGeral && "(Opcional para Convite)"}</label>
          <select
            id="convite-turma"
            value={idTurma}
            onChange={e => setIdTurma(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Selecione uma turma...</option>
            {turmas.map(t => (
              <option key={t.id} value={t.id}>
                {t.nome_turma} ({t.codigo_turma}){isGestorGeral && (t.nome_professor || t.id_professor) ? ` — Prof. ${t.nome_professor || t.id_professor}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex border-b border-foreground/10 px-6 mt-4">
          <button
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'buscar' ? 'border-primary text-primary' : 'border-transparent text-foreground/60 hover:text-foreground'}`}
            onClick={() => setActiveTab('buscar')}
            data-testid="aba-buscar-aluno"
          >Buscar no Sistema</button>
          <button
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'convidar' ? 'border-primary text-primary' : 'border-transparent text-foreground/60 hover:text-foreground'}`}
            onClick={() => setActiveTab('convidar')}
          >Convidar por E-mail</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {toast && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              {toast.msg}
            </div>
          )}

          {activeTab === "buscar" && (
            <div className="space-y-4">
              <div className="flex gap-2 items-end">
                <div>
                  <label htmlFor="buscar-letra" className="block text-xs font-semibold mb-1">Letra</label>
                  <select
                    id="buscar-letra"
                    value={letraInicial}
                    onChange={e => setLetraInicial(e.target.value)}
                    className="w-20 px-2 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2"
                  >
                    {alphabet.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="buscar-nome-matricula" className="block text-xs font-semibold mb-1">Nome ou Matrícula (opcional)</label>
                  <input
                    id="buscar-nome-matricula"
                    type="text"
                    value={filtroTexto}
                    onChange={e => setFiltroTexto(e.target.value)}
                    placeholder="Filtrar localmente..."
                    data-testid="input-buscar-aluno"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2"
                  />
                </div>
                <button 
                  onClick={handleBuscar}
                  disabled={loadingBusca}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90"
                >
                  {loadingBusca ? "..." : "Buscar"}
                </button>
              </div>

              <div className="space-y-2 mt-4">
                {alunosEncontrados.length === 0 && (
                  <p className="text-sm text-foreground/50 text-center py-4">Nenhum aluno encontrado.</p>
                )}
                {alunosFiltrados.map(a => {
                  const isMatriculado = matriculados.has(a.id);
                  const isLoading = loadingAdicao === a.id;
                  return (
                    <div key={a.id} data-testid={`linha-aluno-${a.id}`} className="flex justify-between items-center p-3 bg-foreground/5 rounded-xl">
                      <div>
                        <p className="font-bold text-sm">{a.nome || "Sem nome"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAdicionarExistente(a.id)}
                        disabled={isMatriculado || isLoading || !idTurma}
                        data-testid="botao-adicionar-existente"
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isMatriculado ? 'bg-foreground/10 text-foreground/50' : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'}`}
                      >
                        {isLoading ? "Adicionando..." : isMatriculado ? "[Já matriculado]" : "Adicionar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "convidar" && (
            <form onSubmit={handleConvidar} className="space-y-4">
              <div>
                <label htmlFor="convite-emails" className="block text-sm font-semibold mb-1">
                  E-mail(s) do(s) Aluno(s)
                </label>
                <textarea
                  id="convite-emails"
                  required
                  rows={3}
                  value={emailsTexto}
                  onChange={(e) => setEmailsTexto(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="aluno1@ufsc.br, aluno2@ufsc.br (um ou mais e-mails separados por vírgula, espaço ou linha)"
                />
                <p className="text-[11px] text-foreground/50 mt-1">
                  Os e-mails serão automaticamente normalizados (trim e minúsculas) e deduplicados.
                </p>
              </div>

              <div>
                <label htmlFor="convite-matricula" className="block text-sm font-semibold mb-1">
                  Matrícula Institucional (opcional)
                </label>
                <input
                  id="convite-matricula"
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="Ex: 21100000"
                />
              </div>

              {!idTurma && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer text-xs font-medium text-amber-900 dark:text-amber-200">
                    <input
                      type="checkbox"
                      checked={confirmarGlobal}
                      onChange={(e) => setConfirmarGlobal(e.target.checked)}
                      className="mt-0.5 rounded text-primary focus:ring-primary"
                    />
                    <span>
                      Confirmo a emissão de convite <strong>GLOBAL</strong> (o aluno será cadastrado no sistema sem vínculo inicial a uma turma).
                    </span>
                  </label>
                </div>
              )}

              {idTurma && !isGestorGeral && (
                <div className="p-3 bg-foreground/5 border border-foreground/10 rounded-xl space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={excederCapacidade}
                      onChange={(e) => setExcederCapacidade(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span>Exceder capacidade da turma (vaga extraordinária nominal)</span>
                  </label>
                  {excederCapacidade && (
                    <div>
                      <label htmlFor="convite-justificativa" className="block text-xs font-semibold mb-1">
                        Justificativa da Exceção (obrigatória)
                      </label>
                      <textarea
                        id="convite-justificativa"
                        required
                        rows={2}
                        value={justificativaExcecao}
                        onChange={(e) => setJustificativaExcecao(e.target.value)}
                        placeholder="Informe a justificativa acadêmica para a concessão da vaga além da capacidade..."
                        className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              )}

              {resultadosConvite && resultadosConvite.length > 0 && (
                <div className="space-y-2 border-t border-foreground/10 pt-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                    Resultado dos Convites Registrados
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {resultadosConvite.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg text-xs flex justify-between items-center ${
                          item.status === "sucesso"
                            ? "bg-green-500/10 text-green-700 dark:text-green-300"
                            : "bg-red-500/10 text-red-700 dark:text-red-300"
                        }`}
                      >
                        <span className="font-mono text-[11px] truncate max-w-[200px]">{item.email}</span>
                        <span className="font-semibold">{item.msg}</span>
                      </div>
                    ))}
                  </div>

                  {resultadosConvite.some((r) => r.status === "erro") && (
                    <button
                      type="button"
                      onClick={() =>
                        handleConvidar(
                          undefined,
                          resultadosConvite.filter((r) => r.status === "erro").map((r) => r.email)
                        )
                      }
                      disabled={loadingConvite}
                      className="w-full mt-2 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {loadingConvite ? "Retentando..." : "Tentar novamente (apenas falhas)"}
                    </button>
                  )}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={loadingConvite || !emailsTexto.trim() || (!idTurma && !confirmarGlobal)}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50 text-sm transition-all"
                >
                  {loadingConvite ? "Registrando..." : "Registrar Convite(s)"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function NovoRoteiroModal({ isOpen, onClose }: ModalProps) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);

  const resolverIdOperacaoEtapa = (
    chave: string,
    assinatura: string
  ): { idOperacao: string; assinatura: string } => {
    const session = typeof window !== "undefined" ? window.sessionStorage : null;
    if (session) {
      return obterIntencaoPersistida(session, chave, assinatura, () => crypto.randomUUID());
    }
    return { idOperacao: crypto.randomUUID(), assinatura };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    setLoading(true);
    setToast(null);

    try {
      // Upload do objeto no Storage com metadado de posse.
      const fileRef = ref(storage, `roteiros/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file, { customMetadata: { owner: user.uid } });
      const storagePath = fileRef.fullPath;

      const chaveRegistrar = `lcqui.intencao.roteiro.registrar.${storagePath}`;
      const assinaturaRegistrar = JSON.stringify(["REGISTRAR_ROTEIRO", nome, descricao, storagePath, file.name]);
      const intencaoRegistrar = resolverIdOperacaoEtapa(chaveRegistrar, assinaturaRegistrar);

      const functions = getFunctions();
      const registrar = httpsCallable(functions, "registrarRoteiro");
      const resRegistrar = await registrar({
        idOperacao: intencaoRegistrar.idOperacao,
        nome,
        descricao,
        storagePath,
        nomeArquivo: file.name,
      });
      const { idRoteiro } = resRegistrar.data as { idRoteiro: string };

      const chaveValidar = `lcqui.intencao.roteiro.validar.${idRoteiro}`;
      const assinaturaValidar = JSON.stringify(["VALIDAR_OBJETO_ROTEIRO", idRoteiro]);
      const intencaoValidar = resolverIdOperacaoEtapa(chaveValidar, assinaturaValidar);
      const validar = httpsCallable(functions, "validarObjetoRoteiro");
      await validar({ idOperacao: intencaoValidar.idOperacao, idRoteiro });

      const chavePublicar = `lcqui.intencao.roteiro.publicar.${idRoteiro}`;
      const assinaturaPublicar = JSON.stringify(["PUBLICAR_ROTEIRO", idRoteiro]);
      const intencaoPublicar = resolverIdOperacaoEtapa(chavePublicar, assinaturaPublicar);
      const publicar = httpsCallable(functions, "publicarRoteiro");
      await publicar({ idOperacao: intencaoPublicar.idOperacao, idRoteiro });

      setToast({ type: "success", msg: "Roteiro adicionado com sucesso!" });
      setTimeout(() => {
        onClose();
        setNome("");
        setDescricao("");
        setFile(null);
        setToast(null);
      }, 2000);
    } catch (error: unknown) {
      console.error("Erro ao fazer upload de roteiro:", error);
      const msg = error instanceof Error ? error.message : "Erro ao fazer upload do roteiro.";
      setToast({ type: "error", msg });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl border border-foreground/10 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-foreground/10 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">📄 Novo Roteiro</h2>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {toast && (
            <div className={`p-3 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              {toast.msg}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-1">Nome do Experimento</label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Titulação Ácido-Base"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Descrição Breve</label>
            <textarea
              required
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary h-24 resize-none"
              placeholder="Descreva o objetivo ou orientações principais..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Arquivo (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              required
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-medium hover:bg-foreground/5">
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading || !file || !nome || !descricao}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Adicionar Roteiro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RoteiroProjecao {
  id: string;
  nome: string;
  descricao: string;
  file_url?: string | null;
  status: string;
}

export function GerenciarRoteirosModal({ isOpen, onClose }: ModalProps) {
  const { user } = useAuth();
  const [roteiros, setRoteiros] = useState<RoteiroProjecao[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingAbrirId, setLoadingAbrirId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    const fn = getFunctions();
    const listar = httpsCallable(fn, "listarRoteirosProfessor");
    let cancelado = false;
    listar({})
      .then((res) => {
        if (cancelado) return;
        setRoteiros((res.data as { roteiros: RoteiroProjecao[] }).roteiros);
      })
      .catch((err) => {
        console.error("Erro ao listar roteiros:", err);
      });
    return () => {
      cancelado = true;
    };
  }, [isOpen, user]);

  const handleExcluir = async (id: string) => {
    if (confirmandoExclusaoId !== id) {
      setConfirmandoExclusaoId(id);
      return;
    }
    setLoadingId(id);
    setToast(null);
    try {
      const fn = getFunctions();
      const session = typeof window !== "undefined" ? window.sessionStorage : null;
      const chave = `lcqui.intencao.roteiro.remover.${id}`;
      const assinatura = JSON.stringify(["REMOVER_ROTEIRO", id]);
      const intencao = session
        ? obterIntencaoPersistida(session, chave, assinatura, () => crypto.randomUUID())
        : { idOperacao: crypto.randomUUID(), assinatura };
      const remover = httpsCallable(fn, "removerRoteiro");
      await remover({ idOperacao: intencao.idOperacao, idRoteiro: id });
      setToast({ type: "success", msg: "Roteiro removido com sucesso." });
    } catch (error: unknown) {
      console.error("Erro ao excluir roteiro:", error);
      const message = error instanceof Error ? error.message : "Erro ao excluir roteiro.";
      setToast({ type: "error", msg: message });
    } finally {
      setLoadingId(null);
      setConfirmandoExclusaoId(null);
    }
  };

  const handleCompartilhar = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/roteiro/${id}`);
    setToast({ type: "success", msg: "Link de compartilhamento copiado para a área de transferência!" });
  };

  const handleAbrirPdf = async (idRoteiro: string) => {
    setLoadingAbrirId(idRoteiro);
    setToast(null);
    try {
      const fn = getFunctions();
      const emitir = httpsCallable(fn, "emitirUrlDownloadRoteiro");
      const res = await emitir({ idRoteiro });
      const data = res.data as { url: string };
      window.open(data.url, "_blank");
    } catch (error) {
      console.error("Erro ao emitir URL de download:", error);
      const message = error instanceof Error ? error.message : "Erro ao gerar link de download do roteiro.";
      setToast({ type: "error", msg: message });
    } finally {
      setLoadingAbrirId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl border border-foreground/10 shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-foreground/10 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">📁 Gerenciar Roteiros</h2>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {toast && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              {toast.msg}
            </div>
          )}
          {roteiros.length === 0 ? (
            <p className="text-muted-foreground text-center">Nenhum roteiro encontrado.</p>
          ) : (
            <ul className="space-y-4">
              {roteiros.map(roteiro => (
                <li key={roteiro.id} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div className="flex-1 mr-4">
                    <p className="font-bold text-lg">{roteiro.nome}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{roteiro.descricao}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAbrirPdf(roteiro.id)}
                      disabled={loadingAbrirId === roteiro.id}
                      className="px-3 py-1.5 bg-background border border-foreground/10 rounded-lg text-sm font-medium hover:bg-foreground/5 transition-colors disabled:opacity-50"
                    >
                      {loadingAbrirId === roteiro.id ? "..." : "Abrir PDF"}
                    </button>
                    <button
                      onClick={() => handleCompartilhar(roteiro.id)}
                      className="px-3 py-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-500/20 transition-colors"
                    >
                      Compartilhar
                    </button>
                    <button
                      onClick={() => handleExcluir(roteiro.id)}
                      disabled={loadingId === roteiro.id}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        confirmandoExclusaoId === roteiro.id
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                      }`}
                    >
                      {loadingId === roteiro.id ? "..." : confirmandoExclusaoId === roteiro.id ? "Confirmar?" : "Excluir"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

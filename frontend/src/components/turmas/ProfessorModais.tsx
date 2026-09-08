import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, limit } from "firebase/firestore";
import { db, storage } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, serverTimestamp } from "firebase/firestore";

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
      await updateDoc(doc(db, "Turma", idTurma), {
        status: "Ativo"
      });
    } catch (error) {
      console.error("Erro ao desarquivar turma:", error);
      alert("Erro ao desarquivar turma.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
                <li key={turma.id} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-bold">{turma.nome_turma}</p>
                    <p className="text-sm text-muted-foreground">
                      {turma.ano}.{turma.semestre} | {turma.nome_materia}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDesarquivar(turma.id)}
                    disabled={loading}
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

  // Convidar form state
  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [loadingConvite, setLoadingConvite] = useState(false);

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
      // Removemos o limit baixo para permitir que todos os alunos com aquela letra sejam buscados
      const q = query(collection(db, "Aluno"), where("letra_inicial", "==", letraInicial), limit(1000));
      const snap = await getDocs(q);
      setAlunosEncontrados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      const adicionar = httpsCallable(functions, "adicionarAlunoExistenteTurma");
      await adicionar({ idTurma, idAluno });
      setToast({ type: "success", msg: "Aluno adicionado com sucesso!" });
    } catch (error: any) {
      console.error("Erro ao adicionar aluno:", error);
      setToast({ type: "error", msg: error.message || "Erro ao adicionar aluno." });
    } finally {
      setLoadingAdicao(null);
    }
  };

  const handleConvidar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingConvite(true);
    setToast(null);
    try {
      const convidarAluno = httpsCallable(functions, "convidarAluno");
      await convidarAluno({ email, idTurma: idTurma || undefined, matricula });
      setToast({ type: "success", msg: "Convite enviado com sucesso!" });
      setTimeout(() => {
        setEmail("");
        setMatricula("");
        setToast(null);
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao convidar aluno:", error);
      setToast({ type: "error", msg: error.message || "Erro ao enviar convite." });
    } finally {
      setLoadingConvite(false);
    }
  };

  const alunosFiltrados = alunosEncontrados.filter(a => {
    if (!filtroTexto) return true;
    const term = filtroTexto.toLowerCase();
    return (a.nome?.toLowerCase().includes(term) || a.numero_matricula?.toLowerCase().includes(term));
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl border border-foreground/10 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-foreground/10 flex justify-between items-center">
          <h2 className="text-xl font-bold">Novo Aluno</h2>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <label className="block text-sm font-semibold mb-1">Turma {isGestorGeral && "(Opcional para Convite)"}</label>
          <select
            value={idTurma}
            onChange={e => setIdTurma(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Selecione uma turma...</option>
            {turmas.map(t => (
              <option key={t.id} value={t.id}>{t.nome_turma} ({t.codigo_turma})</option>
            ))}
          </select>
        </div>

        <div className="flex border-b border-foreground/10 px-6 mt-4">
          <button 
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'buscar' ? 'border-primary text-primary' : 'border-transparent text-foreground/60 hover:text-foreground'}`}
            onClick={() => setActiveTab('buscar')}
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
                  <label className="block text-xs font-semibold mb-1">Letra</label>
                  <select
                    value={letraInicial}
                    onChange={e => setLetraInicial(e.target.value)}
                    className="w-20 px-2 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2"
                  >
                    {alphabet.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1">Nome ou Matrícula (opcional)</label>
                  <input 
                    type="text"
                    value={filtroTexto}
                    onChange={e => setFiltroTexto(e.target.value)}
                    placeholder="Filtrar localmente..."
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
                    <div key={a.id} className="flex justify-between items-center p-3 bg-foreground/5 rounded-xl">
                      <div>
                        <p className="font-bold text-sm">{a.nome || "Sem nome"}</p>
                        <p className="text-xs text-foreground/60">{a.numero_matricula || "Sem matrícula"} • {a.email}</p>
                      </div>
                      <button
                        onClick={() => handleAdicionarExistente(a.id)}
                        disabled={isMatriculado || isLoading || !idTurma}
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
                <label className="block text-sm font-semibold mb-1">Email do Aluno</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="aluno@ufsc.br"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Matrícula (opcional)</label>
                <input
                  type="text"
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: 21100000"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="submit" disabled={loadingConvite || !email || (!isGestorGeral && !idTurma)} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50">
                  {loadingConvite ? "Enviando..." : "Convidar Aluno"}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    setLoading(true);
    setToast(null);
    
    try {
      const fileRef = ref(storage, `roteiros/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);

      await addDoc(collection(db, "Roteiro_Experimento"), {
        id_professor_upload: user.uid,
        nome,
        descricao,
        file_url: downloadUrl,
        criado_em: serverTimestamp()
      });

      setToast({ type: "success", msg: "Roteiro adicionado com sucesso!" });
      setTimeout(() => {
        onClose();
        setNome("");
        setDescricao("");
        setFile(null);
        setToast(null);
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao fazer upload de roteiro:", error);
      setToast({ type: "error", msg: "Erro ao fazer upload do roteiro." });
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

export function GerenciarRoteirosModal({ isOpen, onClose }: ModalProps) {
  const { user } = useAuth();
  const [roteiros, setRoteiros] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    const q = query(
      collection(db, "Roteiro_Experimento"),
      where("id_professor_upload", "==", user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      setRoteiros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isOpen, user]);

  const handleExcluir = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este roteiro?")) return;
    setLoadingId(id);
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "Roteiro_Experimento", id));
    } catch (error) {
      console.error("Erro ao excluir roteiro:", error);
      alert("Erro ao excluir roteiro.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCompartilhar = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/roteiro/${id}`);
    alert("Link de compartilhamento copiado para a área de transferência!");
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
                    <a
                      href={roteiro.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-background border border-foreground/10 rounded-lg text-sm font-medium hover:bg-foreground/5 transition-colors"
                    >
                      Abrir PDF
                    </a>
                    <button
                      onClick={() => handleCompartilhar(roteiro.id)}
                      className="px-3 py-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-500/20 transition-colors"
                    >
                      Compartilhar
                    </button>
                    <button
                      onClick={() => handleExcluir(roteiro.id)}
                      disabled={loadingId === roteiro.id}
                      className="px-3 py-1.5 bg-red-500/10 text-red-600 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      {loadingId === roteiro.id ? "..." : "Excluir"}
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

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { X } from "lucide-react";
import {
  obterIntencaoPersistida,
  chaveIntencaoMembro,
  assinaturaMembro,
  limparIntencao,
} from "@/lib/intencaoOperacao";

interface MembrosTurmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  idTurma: string | undefined;
}

interface Membro {
  id: string;
  nome: string;
  email: string;
}

export function MembrosTurmaModal({ isOpen, onClose, idTurma }: MembrosTurmaModalProps) {
  const { roles } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [membroParaRemover, setMembroParaRemover] = useState<Membro | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");

  useEffect(() => {
    if (!isOpen || !idTurma) return;

    const unsub = onSnapshot(collection(db, "Turma", idTurma, "Alunos"), (snap) => {
      const lista = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            nome: typeof data.nome === "string" ? data.nome : "Sem nome",
            email: typeof data.email === "string" ? data.email : "Sem e-mail",
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome));
      setMembros(lista);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, idTurma]);

  const handleConfirmarRemover = async () => {
    if (!idTurma || !membroParaRemover) return;

    setRemovendoId(membroParaRemover.id);
    setToast(null);
    try {
      const session = typeof window !== "undefined" ? window.sessionStorage : null;
      const chave = chaveIntencaoMembro(idTurma, membroParaRemover.id, "REMOVER");
      const assinatura = assinaturaMembro(idTurma, membroParaRemover.id, "REMOVER");
      const intencao = session
        ? obterIntencaoPersistida(session, chave, assinatura, () => crypto.randomUUID())
        : { idOperacao: crypto.randomUUID(), assinatura };

      const removerAlunoTurma = httpsCallable(getFunctions(), "removerAlunoTurma");
      await removerAlunoTurma({
        idOperacao: intencao.idOperacao,
        idTurma: idTurma,
        idAluno: membroParaRemover.id,
      });

      if (session) limparIntencao(session, chave);
      setMembroParaRemover(null);
      setToast({ type: "success", msg: "Aluno removido com sucesso!" });
    } catch (err) {
      console.error("Erro ao remover aluno:", err);
      const message = err instanceof Error ? err.message : "Erro ao remover aluno.";
      setToast({ type: "error", msg: message });
    } finally {
      setRemovendoId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl border border-foreground/10 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-foreground/10 flex justify-between items-center">
          <h2 className="text-xl font-bold">Membros da Turma</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-foreground/50 hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {toast && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${toast.type === "success" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
              {toast.msg}
            </div>
          )}

          {membroParaRemover ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground/80">
                Tem certeza que deseja remover <strong>{membroParaRemover.nome}</strong> da turma?
                O vínculo será removido, mas comentários e histórico permanecem.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setMembroParaRemover(null)}
                  className="px-4 py-2 rounded-lg font-medium hover:bg-foreground/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarRemover}
                  disabled={removendoId === membroParaRemover.id}
                  data-testid="confirmar-remover-aluno"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {removendoId === membroParaRemover.id ? "Removendo..." : "Confirmar Remoção"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {loading && membros.length === 0 && (
                <div className="text-center py-8 text-foreground/50">Carregando membros...</div>
              )}
              {!loading && membros.length === 0 && (
                <p className="text-center text-foreground/60 py-8">Nenhum membro na turma.</p>
              )}
              <ul data-testid="lista-membros" className="space-y-3">
                {membros.map((membro) => (
                  <li key={membro.id} data-testid={`linha-membro-${membro.id}`} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                    <div>
                      <p className="font-bold text-sm">{membro.nome}</p>
                      <p className="text-xs text-muted-foreground">{membro.email}</p>
                    </div>
                    {isProfessor && (
                      <button
                        onClick={() => setMembroParaRemover(membro)}
                        disabled={removendoId === membro.id}
                        data-testid={`remover-aluno-${membro.id}`}
                        className="px-3 py-1.5 bg-red-500/10 text-red-600 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {removendoId === membro.id ? "..." : "Remover"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

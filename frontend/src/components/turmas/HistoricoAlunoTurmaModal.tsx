"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface HistoricoAlunoTurmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  idAluno: string;
  nomeAluno: string;
  idTurma: string;
}

interface HistoricoEntry {
  id: string;
  tipo: string;
  timestamp: any;
}

export function HistoricoAlunoTurmaModal({ isOpen, onClose, idAluno, nomeAluno, idTurma }: HistoricoAlunoTurmaModalProps) {
  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !idTurma || !idAluno) return;
    
    const fetchHistorico = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "Turma", idTurma, "HistoricoAlunos"),
          where("id_aluno", "==", idAluno),
          orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        const lista = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as HistoricoEntry[];
        setHistorico(lista);
      } catch (error) {
        console.error("Erro ao buscar histórico:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorico();
  }, [isOpen, idTurma, idAluno]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl w-full max-w-lg shadow-2xl flex flex-col border border-border">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-foreground">Histórico do Aluno</h2>
            <p className="text-sm text-foreground/60">{nomeAluno}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : historico.length === 0 ? (
            <p className="text-center text-foreground/50 py-8">Nenhum registro encontrado para este aluno nesta turma.</p>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-foreground/10 before:to-transparent">
              {historico.map(entry => {
                const date = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date();
                const isEntrada = entry.tipo === "inclusao_aluno";
                return (
                  <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${isEntrada ? 'bg-green-500' : 'bg-red-500'}`}>
                      {isEntrada ? (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-background shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-foreground text-sm">{isEntrada ? "Ingressou na Turma" : "Removido da Turma"}</h4>
                        <time className="text-xs font-mono text-foreground/50">{date.toLocaleDateString()} {date.toLocaleTimeString()}</time>
                      </div>
                      <p className="text-xs text-foreground/70">
                        {isEntrada 
                          ? "O aluno foi adicionado ou ingressou pelo código da turma." 
                          : "O aluno foi removido desta turma."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold bg-foreground/5 hover:bg-foreground/10 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

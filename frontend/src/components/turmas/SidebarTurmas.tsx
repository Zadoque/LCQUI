import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { TurmasArquivadasModal } from "./ProfessorModais";
import type { Turma } from "@/types/turmas";

export type { Turma };

interface SidebarTurmasProps {
  turmaSelecionada: Turma | null;
  setTurmaSelecionada: (turma: Turma | null) => void;
  onOpenNovaTurma?: () => void;
  onOpenIngressar?: () => void;
  turmaInicialId?: string;
}

export default function SidebarTurmas({
  turmaSelecionada,
  setTurmaSelecionada,
  onOpenNovaTurma,
  onOpenIngressar,
  turmaInicialId,
}: SidebarTurmasProps) {
  const { user, roles } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [showArquivadas, setShowArquivadas] = useState(false);
  const [painelExpandido, setPainelExpandido] = useState(true);
  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");
  const isAluno = roles.includes("Aluno") || roles.includes("Bolsista");
  const turmaInicialAplicadaRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const atualizar = () => setPainelExpandido(!media.matches);
    atualizar();
    media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, []);

  useEffect(() => {
    if (!user) return;

    let unsubscribe = () => {};

    if (isProfessor) {
      // Se for Chefe Geral, ele vê todas as turmas ativas
      const q = roles.includes("Chefe_Geral")
        ? query(collection(db, "Turma"), where("status", "==", "Ativo"))
        : query(collection(db, "Turma"), where("id_professor", "==", user.uid), where("status", "==", "Ativo"));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const turmasData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Turma[];
        setTurmas(turmasData);
      });
    } else if (isAluno) {
      const q = query(
        collection(db, "Usuarios", user.uid, "Turmas"),
        orderBy("ingressou_em", "desc")
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const turmasData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Turma[];
        setTurmas(turmasData);
      });
    }

    return () => unsubscribe();
  }, [user, roles, isProfessor, isAluno]);

  // Auto-selecionar turma via deep link (uma única vez)
  useEffect(() => {
    if (turmaInicialAplicadaRef.current) return;
    if (!turmaInicialId || turmas.length === 0) return;
    if (turmaSelecionada) {
      turmaInicialAplicadaRef.current = true;
      return;
    }
    const turmaAlvo = turmas.find((t) => t.id === turmaInicialId);
    if (turmaAlvo) {
      setTurmaSelecionada(turmaAlvo);
      turmaInicialAplicadaRef.current = true;
    }
  }, [turmaInicialId, turmas, turmaSelecionada, setTurmaSelecionada]);

  return (
    <aside
      data-testid="painel-lateral-turmas"
      className={`relative h-full shrink-0 bg-card transition-[width] duration-200 ease-in-out ${painelExpandido ? "w-64 border-r border-border" : "w-0 border-r-0"} sm:w-64 sm:border-r sm:border-border`}
    >
      {!painelExpandido && (
        <button
          type="button"
          onClick={() => setPainelExpandido(true)}
          aria-expanded={false}
          aria-controls="painel-minhas-turmas"
          className="absolute left-2 top-4 z-20 cursor-pointer rounded-lg border border-border bg-card px-2 py-1 text-xs shadow-sm hover:bg-muted sm:hidden"
        >
          Expandir
        </button>
      )}

      <div id="painel-minhas-turmas" className={`${painelExpandido ? "flex" : "hidden sm:flex"} h-full w-64 flex-col`}>
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Minhas Turmas</h2>
            <button type="button" onClick={() => setPainelExpandido(false)} aria-expanded={painelExpandido} aria-controls="painel-minhas-turmas" className="cursor-pointer rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted sm:hidden">
              Recolher
            </button>
          </div>
          {isProfessor && (
            <button
              onClick={onOpenNovaTurma}
              data-testid="botao-nova-turma"
              className="mt-4 w-full rounded-lg bg-primary/10 py-2 font-medium text-primary transition-colors hover:bg-primary/20"
            >
              + Nova Turma
            </button>
          )}
          {isAluno && !isProfessor && (
            <button
              onClick={onOpenIngressar}
              data-testid="botao-ingressar-turma"
              className="mt-4 w-full rounded-lg bg-primary/10 py-2 font-medium text-primary transition-colors hover:bg-primary/20"
            >
              Ingressar em Turma
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {turmas.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma turma encontrada.</p>
          ) : (
            <ul className="space-y-1">
              {turmas.map(turma => (
                <li key={turma.id}>
                  <button
                    onClick={() => setTurmaSelecionada(turma)}
                    className={`w-full rounded-lg px-4 py-3 text-left transition-colors ${
                      turmaSelecionada?.id === turma.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <p className="truncate font-medium">{turma.nome_turma}</p>
                    <p className={`text-xs ${turmaSelecionada?.id === turma.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {turma.codigo_turma || turma.nome_materia}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isProfessor && (
          <div className="shrink-0 border-t border-border p-4">
            <button
              onClick={() => setShowArquivadas(true)}
              className="w-full px-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              🗃️ Turmas Arquivadas
            </button>
          </div>
        )}
      </div>

      <TurmasArquivadasModal isOpen={showArquivadas} onClose={() => setShowArquivadas(false)} />
    </aside>
  );
}

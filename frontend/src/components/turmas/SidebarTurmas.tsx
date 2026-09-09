import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { TurmasArquivadasModal } from "./ProfessorModais";

interface Turma {
  id: string;
  nome_turma: string;
  codigo_turma?: string;
  nome_materia?: string;
  status?: string;
}

interface SidebarTurmasProps {
  turmaSelecionada: Turma | null;
  setTurmaSelecionada: (turma: Turma | null) => void;
  onOpenNovaTurma?: () => void;
  onOpenIngressar?: () => void;
}

export default function SidebarTurmas({
  turmaSelecionada,
  setTurmaSelecionada,
  onOpenNovaTurma,
  onOpenIngressar
}: SidebarTurmasProps) {
  const { user, roles } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [showArquivadas, setShowArquivadas] = useState(false);
  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");
  const isAluno = roles.includes("Aluno") || roles.includes("Bolsista");

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
  }, [user, isProfessor, isAluno]);

  return (
    <div className="w-64 bg-card border-r border-border h-[calc(100vh-64px)] flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-4">Minhas Turmas</h2>
        {isProfessor && (
          <button 
            onClick={onOpenNovaTurma}
            className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-lg font-medium transition-colors"
          >
            + Nova Turma
          </button>
        )}
        {isAluno && !isProfessor && (
          <button 
            onClick={onOpenIngressar}
            className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-lg font-medium transition-colors"
          >
            Ingressar em Turma
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {turmas.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma turma encontrada.</p>
        ) : (
          <ul className="space-y-1">
            {turmas.map(turma => (
              <li key={turma.id}>
                <button
                  onClick={() => setTurmaSelecionada(turma)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    turmaSelecionada?.id === turma.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <p className="font-medium truncate">{turma.nome_turma}</p>
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
        <div className="p-4 border-t border-border">
          <button 
            onClick={() => setShowArquivadas(true)}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-left px-2"
          >
            🗃️ Turmas Arquivadas
          </button>
        </div>
      )}

      <TurmasArquivadasModal isOpen={showArquivadas} onClose={() => setShowArquivadas(false)} />
    </div>
  );
}

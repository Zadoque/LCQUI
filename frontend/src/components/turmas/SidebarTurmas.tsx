import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface Turma {
  id: string;
  nome_turma: string;
  codigo_turma: string;
  status: string;
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
  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");
  const isAluno = roles.includes("Aluno") || roles.includes("Bolsista");

  useEffect(() => {
    if (!user) return;

    let unsubscribe = () => {};

    if (isProfessor) {
      // Professor: buscar turmas onde id_professor == user.uid
      const q = query(
        collection(db, "Turma"),
        where("id_professor", "==", user.uid),
        where("status", "==", "Ativo")
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const turmasData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Turma[];
        setTurmas(turmasData);
      });
    } else if (isAluno) {
      // Aluno: A princípio, para recuperar turmas do aluno em tempo real, 
      // precisamos buscar as turmas onde ele está na subcoleção, o que não é possível com query simples no Firestore.
      // Solução V1: Buscar todas as turmas que ele está matriculado seria com um array-contains no documento da Turma,
      // ou usando uma Collection Group Query. Para simplificar e manter a segurança, 
      // o aluno deve ter os IDs das turmas salvos no documento de Aluno, ou buscamos na Collection Group "Alunos".
      
      const q = query(
        collection(db, "Turma") // Placeholder até resolver a busca de turmas de aluno
      );
      
      // Implementação da view de turmas de aluno:
      // O Firestore permite 'collectionGroup' query se indexado
      const alunosGroupQ = query(
        collection(db, "Alunos") // Se estivéssemos usando collection group
      );
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
                    {turma.codigo_turma}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {isProfessor && (
        <div className="p-4 border-t border-border">
          <button className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-left px-2">
            🗃️ Turmas Arquivadas
          </button>
        </div>
      )}
    </div>
  );
}

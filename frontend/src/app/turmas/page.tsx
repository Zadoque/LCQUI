"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SidebarTurmas, { Turma } from "@/components/turmas/SidebarTurmas";
import FeedTurma from "@/components/turmas/FeedTurma";
import { NovaTurmaModal, IngressarTurmaModal } from "@/components/turmas/ModaisAcademico";
import { NovoAlunoModal, NovoRoteiroModal, GerenciarRoteirosModal } from "@/components/turmas/ProfessorModais";
import { MembrosTurmaModal } from "@/components/turmas/MembrosTurmaModal";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ProfessorDashboardBar from "@/components/turmas/ProfessorDashboardBar";

export default function TurmasPage() {
  const { user, roles, isLoading } = useAuth();
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");

  const [showNovaTurma, setShowNovaTurma] = useState(false);
  const [showIngressar, setShowIngressar] = useState(false);

  // Professor Modal states
  const [showNovoAluno, setShowNovoAluno] = useState(false);
  const [showNovoRoteiro, setShowNovoRoteiro] = useState(false);
  const [showGerenciarRoteiros, setShowGerenciarRoteiros] = useState(false);
  const [showMembros, setShowMembros] = useState(false);

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Professor", "Aluno", "Bolsista"]}>
      <div className="flex flex-col h-[calc(100vh-73px)]">
        {isProfessor && (
          <ProfessorDashboardBar
            turmasCount={1} // Temporary dummy count
            turmaSelecionada={turmaSelecionada}
            onOpenNovoAluno={() => setShowNovoAluno(true)}
            onOpenNovoRoteiro={() => setShowNovoRoteiro(true)}
            onOpenGerenciarRoteiros={() => setShowGerenciarRoteiros(true)}
            onOpenMembros={() => setShowMembros(true)}
          />
        )}
        <main className="flex-1 flex overflow-hidden">
        {/* Painel Lateral de Turmas */}
        <SidebarTurmas 
          turmaSelecionada={turmaSelecionada}
          setTurmaSelecionada={setTurmaSelecionada}
          onOpenNovaTurma={() => setShowNovaTurma(true)}
          onOpenIngressar={() => setShowIngressar(true)}
        />

        {/* Feed Central */}
        <FeedTurma turma={turmaSelecionada} onOpenNovoRoteiro={() => setShowNovoRoteiro(true)} />
        </main>
      </div>

      {/* Modais Base */}
      <NovaTurmaModal isOpen={showNovaTurma} onClose={() => setShowNovaTurma(false)} />
      <IngressarTurmaModal isOpen={showIngressar} onClose={() => setShowIngressar(false)} />

      {/* Modais Professor */}
      <NovoAlunoModal isOpen={showNovoAluno} onClose={() => setShowNovoAluno(false)} turmaPreSelecionadaId={turmaSelecionada?.id} />
      <NovoRoteiroModal isOpen={showNovoRoteiro} onClose={() => setShowNovoRoteiro(false)} />
      <GerenciarRoteirosModal isOpen={showGerenciarRoteiros} onClose={() => setShowGerenciarRoteiros(false)} />
      <MembrosTurmaModal isOpen={showMembros} onClose={() => setShowMembros(false)} idTurma={turmaSelecionada?.id} />
    </ProtectedRoute>
  );
}

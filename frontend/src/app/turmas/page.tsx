"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SidebarTurmas from "@/components/turmas/SidebarTurmas";
import FeedTurma from "@/components/turmas/FeedTurma";
import { NovaTurmaModal, IngressarTurmaModal } from "@/components/turmas/ModaisAcademico";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function TurmasPage() {
  const { user, isLoading } = useAuth();
  const [turmaSelecionada, setTurmaSelecionada] = useState<any | null>(null);
  
  const [showNovaTurma, setShowNovaTurma] = useState(false);
  const [showIngressar, setShowIngressar] = useState(false);

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Professor", "Aluno", "Bolsista"]}>
      <main className="flex-1 flex overflow-hidden">
        {/* Painel Lateral de Turmas */}
        <SidebarTurmas 
          turmaSelecionada={turmaSelecionada}
          setTurmaSelecionada={setTurmaSelecionada}
          onOpenNovaTurma={() => setShowNovaTurma(true)}
          onOpenIngressar={() => setShowIngressar(true)}
        />

        {/* Feed Central */}
        <FeedTurma turma={turmaSelecionada} />
      </main>

      {/* Modais */}
      <NovaTurmaModal isOpen={showNovaTurma} onClose={() => setShowNovaTurma(false)} />
      <IngressarTurmaModal isOpen={showIngressar} onClose={() => setShowIngressar(false)} />
    </ProtectedRoute>
  );
}

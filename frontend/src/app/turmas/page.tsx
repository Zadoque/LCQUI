"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SidebarTurmas from "@/components/turmas/SidebarTurmas";
import FeedTurma from "@/components/turmas/FeedTurma";
import { NovaTurmaModal, IngressarTurmaModal } from "@/components/turmas/ModaisAcademico";
import Header from "@/components/layout/Header";
import { useRouter } from "next/navigation";

export default function TurmasPage() {
  const { user, roles, isLoading } = useAuth();
  const router = useRouter();
  const [turmaSelecionada, setTurmaSelecionada] = useState<any | null>(null);
  
  const [showNovaTurma, setShowNovaTurma] = useState(false);
  const [showIngressar, setShowIngressar] = useState(false);

  // Redireciona se não for Chefe_Geral, Professor, Aluno ou Bolsista
  React.useEffect(() => {
    if (!isLoading && (!roles.includes("Chefe_Geral") && !roles.includes("Professor") && !roles.includes("Aluno") && !roles.includes("Bolsista"))) {
      router.push("/nao-autorizado");
    }
  }, [isLoading, roles, router]);

  if (!isLoading && (!roles.includes("Chefe_Geral") && !roles.includes("Professor") && !roles.includes("Aluno") && !roles.includes("Bolsista"))) {
    return null;
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
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
    </div>
  );
}

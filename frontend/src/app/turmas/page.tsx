"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SidebarTurmas, { Turma } from "@/components/turmas/SidebarTurmas";
import FeedTurma from "@/components/turmas/FeedTurma";
import { NovaTurmaModal, IngressarTurmaModal } from "@/components/turmas/ModaisAcademico";
import { NovoAlunoModal, NovoRoteiroModal, GerenciarRoteirosModal } from "@/components/turmas/ProfessorModais";
import { MembrosTurmaModal } from "@/components/turmas/MembrosTurmaModal";
import { ListaMaterias } from "@/components/materias/ListaMaterias";
import { NovaMateriaModal } from "@/components/materias/NovaMateriaModal";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ProfessorDashboardBar from "@/components/turmas/ProfessorDashboardBar";

function TurmasConteudo() {
  const { user, roles, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const turmaInicialId = searchParams.get("turma") ?? undefined;
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");

  const [showNovaTurma, setShowNovaTurma] = useState(false);
  const [showIngressar, setShowIngressar] = useState(false);

  // Professor Modal states
  const [showNovoAluno, setShowNovoAluno] = useState(false);
  const [showNovoRoteiro, setShowNovoRoteiro] = useState(false);
  const [showGerenciarRoteiros, setShowGerenciarRoteiros] = useState(false);
  const [showMembros, setShowMembros] = useState(false);
  const [showMaterias, setShowMaterias] = useState(false);

  // Matéria modal state (para criar/editar via overlay de matérias)
  const [materiaModalOpen, setMateriaModalOpen] = useState(false);
  const [materiaEditando, setMateriaEditando] = useState<{
    id: string;
    nome: string;
    codigo: string;
  } | null>(null);

  // RN-M13-04: deep link ?roteiros=1 abre GerenciarRoteirosModal uma única vez
  const abrirRoteiros = searchParams.get("roteiros") === "1";
  const roteirosJaAbertosRef = useRef(false);
  useEffect(() => {
    if (abrirRoteiros && !roteirosJaAbertosRef.current) {
      roteirosJaAbertosRef.current = true;
      setShowGerenciarRoteiros(true);
    }
  }, [abrirRoteiros]);

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
            onOpenMaterias={() => setShowMaterias(true)}
          />
        )}
        <main className="flex-1 flex overflow-hidden">
        {/* Painel Lateral de Turmas */}
        <SidebarTurmas 
          turmaSelecionada={turmaSelecionada}
          setTurmaSelecionada={setTurmaSelecionada}
          onOpenNovaTurma={() => setShowNovaTurma(true)}
          onOpenIngressar={() => setShowIngressar(true)}
          turmaInicialId={turmaInicialId}
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

      {/* Overlay de Gerenciamento de Matérias */}
      {showMaterias && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-2xl rounded-2xl shadow-xl border border-foreground/10 overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-foreground/10 shrink-0">
              <h2 className="text-lg font-bold">Gerenciar Matérias</h2>
              <button
                onClick={() => {
                  setShowMaterias(false);
                  setMateriaEditando(null);
                }}
                className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-foreground/70"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <ListaMaterias
                modo="listagem"
                onNovaMateria={() => {
                  setMateriaEditando(null);
                  setMateriaModalOpen(true);
                }}
                onEditar={(m) => {
                  setMateriaEditando(m);
                  setMateriaModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova/Editar Matéria (aberto via overlay ou direto) */}
      <NovaMateriaModal
        isOpen={materiaModalOpen}
        onClose={() => {
          setMateriaModalOpen(false);
          setMateriaEditando(null);
        }}
        idMateria={materiaEditando?.id}
        nomeInicial={materiaEditando?.nome}
        codigoInicial={materiaEditando?.codigo}
      />
    </ProtectedRoute>
  );
}

export default function TurmasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-foreground/60 animate-pulse">Carregando turmas...</p>
      </div>
    }>
      <TurmasConteudo />
    </Suspense>
  );
}

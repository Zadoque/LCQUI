"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import type { BemPatrimonial } from "@/types/patrimonio";
import { ModalBaixaPatrimonial } from "@/components/patrimonio/ModalBaixaPatrimonial";
import { HistoricoPatrimonioList } from "@/components/patrimonio/HistoricoPatrimonioList";
import { ModalPropostaAlteracaoBem } from "@/components/patrimonio/ModalPropostaAlteracaoBem";

const PAPEIS_PATRIMONIO = ["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Professor"];

export default function BemPatrimonialDetails() {
  return (
    <ProtectedRoute allowedRoles={PAPEIS_PATRIMONIO}>
      <BemPatrimonialDetailsContent />
    </ProtectedRoute>
  );
}

function BemPatrimonialDetailsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { roles } = useAuth();

  const [bem, setBem] = useState<BemPatrimonial | null>(null);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalBaixaOpen, setIsModalBaixaOpen] = useState(false);

  const isChefe = roles.includes("Chefe_Geral");
  const isGestorPatrimonio = roles.includes("Gestor_Bens_Patrimoniais");
  const isProfessor = roles.includes("Professor");
  const isBolsista = roles.includes("Bolsista");
  const isAluno = roles.includes("Aluno");
  const hasManagementAccess = isChefe || isGestorPatrimonio;
  const isPureAluno = isAluno && !hasManagementAccess && !isProfessor && !isBolsista;

  const fetchBem = useCallback(async () => {
    try {
      if (typeof id !== "string") return;
      const docSnap = await getDoc(doc(db, "Bem_Patrimonial", id));
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as BemPatrimonial;
        setBem(data);
      } else {
        router.replace("/patrimonio");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchBem();
  }, [fetchBem]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
      </div>
    );
  }

  if (!bem) return null;

  return (
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <button onClick={() => router.back()} className="text-sm font-medium text-primary hover:underline">
            &larr; Voltar ao Catálogo Patrimonial
          </button>

          <header className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-foreground/10">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-foreground/10 text-foreground/70">
                Versão {bem.versao ?? 1}
              </span>
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  bem.status === "Ativo"
                    ? "bg-green-500/10 text-green-500 border border-green-500/20"
                    : bem.status === "Inservivel"
                    ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                }`}
              >
                Status: {bem.status.replace("_", " ")}
              </span>
            </div>

            <div className="flex items-start gap-6">
              {bem.photo_url ? (
                <img
                  src={bem.photo_url}
                  alt={bem.nome_equipamento}
                  className="w-28 h-28 object-cover rounded-xl border border-foreground/10 shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 bg-foreground/5 rounded-xl border border-foreground/10 flex items-center justify-center text-foreground/30 shadow-lg text-xs">
                  Sem Foto
                </div>
              )}

              <div className="pt-2">
                <h1 className="text-2xl font-bold text-foreground">{bem.nome_equipamento || "Equipamento Sem Nome"}</h1>
                <p className="font-mono text-base text-primary mt-1">Plaqueta: {bem.numero_patrimonio}</p>
                {bem.status === "Ja_dado_baixa" && (
                  <p className="text-xs text-red-500 font-semibold mt-2">
                    Processo de baixa patrimonial concluído. O bem foi desincorporado definitivamente.
                  </p>
                )}
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-foreground/10 space-y-4">
              <h3 className="text-base font-bold border-b border-foreground/10 pb-2">Detalhes de Alocação</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-foreground/50">Responsável SEI</dt>
                  <dd className="font-medium">{bem.nome_responsavel_sei || "Não atribuído"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground/50">Localização Física</dt>
                  <dd className="font-medium">
                    {bem.predio} {bem.andar ? `- ${bem.andar}` : ""} {bem.sala ? `- Sala ${bem.sala}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-foreground/50">Estado de Conservação</dt>
                  <dd className="font-medium">{bem.estado_conservacao || "N/A"}</dd>
                </div>
                {bem.descricao_complementar && (
                  <div>
                    <dt className="text-xs text-foreground/50">Nota Complementar</dt>
                    <dd className="font-medium">{bem.descricao_complementar}</dd>
                  </div>
                )}
              </dl>

              {/* Ações permitidas para não-aluno */}
              {!isPureAluno && bem.status !== "Ja_dado_baixa" && (
                <div className="pt-4 border-t border-foreground/10 space-y-2">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-sm transition-colors border border-primary/20"
                  >
                    Propor Alteração de Status / Conservação
                  </button>

                  {/* Baixa SEI: apenas para Inservível e Gestor/Chefe */}
                  {hasManagementAccess && bem.status === "Inservivel" && (
                    <button
                      onClick={() => setIsModalBaixaOpen(true)}
                      className="w-full py-2.5 rounded-xl bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white font-semibold text-sm transition-colors border border-red-600/30"
                    >
                      Registrar Baixa Patrimonial (Processo SEI)
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-foreground/10">
              <h3 className="text-base font-bold mb-3 border-b border-foreground/10 pb-2">
                Histórico de Versões e Auditoria
              </h3>
              <HistoricoPatrimonioList idBemPatrimonial={bem.id} />
            </div>
          </section>
        </div>

        {/* Modal de Proposta de Edição */}
        <ModalPropostaAlteracaoBem
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          idBemPatrimonial={bem.id}
          statusAtual={bem.status}
          conservacaoAtual={bem.estado_conservacao}
          responsavelAtual={bem.nome_responsavel_sei}
          onSuccess={fetchBem}
        />

        {/* Modal de Baixa Patrimonial SEI */}
        <ModalBaixaPatrimonial
          isOpen={isModalBaixaOpen}
          onClose={() => setIsModalBaixaOpen(false)}
          idBemPatrimonial={bem.id}
          nomeEquipamento={bem.nome_equipamento}
          numeroPatrimonio={bem.numero_patrimonio}
          onSuccess={fetchBem}
        />
      </main>
  );
}

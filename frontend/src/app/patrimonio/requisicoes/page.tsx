"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { RequisicaoProfessor } from "@/types/patrimonio";

export default function PatrimonioInbox() {
  const [requisicoes, setRequisicoes] = useState<RequisicaoProfessor[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequisicoes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "Requisicao_Edicao_Bem_Patrimonial"), where("status", "==", "pendente"));
      const querySnapshot = await getDocs(q);
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RequisicaoProfessor[];
      
      setRequisicoes(lista);
    } catch (error) {
      console.error("Erro ao buscar requisições:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisicoes();
  }, []);

  const handleDecisao = async (idRequisicao: string, aprovado: boolean) => {
    setProcessingId(idRequisicao);
    try {
      const responder = httpsCallable(functions, 'responderRequisicaoEdicaoBem');
      await responder({
        id_requisicao: idRequisicao,
        aprovado,
        motivo_rejeicao: aprovado ? undefined : "Rejeitado pelo Gestor via Inbox." // Simplificado para UX rápida
      });
      // Remove da lista otimisticamente
      setRequisicoes(prev => prev.filter(r => r.id !== idRequisicao));
    } catch (error: any) {
      alert("Erro ao processar a requisição: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Bens_Patrimoniais"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <header>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              Caixa de Entrada Patrimonial
              {requisicoes.length > 0 && (
                <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full font-bold">
                  {requisicoes.length} pendentes
                </span>
              )}
            </h1>
            <p className="text-foreground/60 mt-2">
              Analise e aprove as solicitações de alteração nos equipamentos feitas pelos Professores.
            </p>
          </header>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
            </div>
          ) : requisicoes.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center text-foreground/50">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">Tudo em dia!</p>
              <p className="text-sm">Não há solicitações pendentes no momento.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {requisicoes.map(req => (
                <div key={req.id} className="glass-panel p-6 rounded-2xl border border-foreground/10 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                  
                  {processingId === req.id && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                    </div>
                  )}

                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold">{req.nome_equipamento}</h3>
                      <p className="font-mono text-sm text-foreground/50">Plaqueta: {req.numero_patrimonio}</p>
                    </div>

                    <div className="bg-foreground/5 p-4 rounded-xl border border-foreground/5">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-3">Mudanças Propostas</h4>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {req.novo_status && (
                          <div className="bg-background/50 p-3 rounded-lg border border-foreground/5">
                            <dt className="text-xs text-foreground/50">Novo Status</dt>
                            <dd className="font-bold text-amber-500">{req.novo_status.replace("_", " ")}</dd>
                          </div>
                        )}
                        {req.novo_nome_responsavel_sei && (
                          <div className="bg-background/50 p-3 rounded-lg border border-foreground/5">
                            <dt className="text-xs text-foreground/50">Novo Responsável</dt>
                            <dd className="font-medium text-foreground">{req.novo_nome_responsavel_sei}</dd>
                          </div>
                        )}
                        {req.novo_estado_conservacao && (
                          <div className="bg-background/50 p-3 rounded-lg border border-foreground/5 col-span-full">
                            <dt className="text-xs text-foreground/50">Novo Estado de Conservação</dt>
                            <dd className="font-medium text-foreground">{req.novo_estado_conservacao}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>

                  <div className="flex md:flex-col justify-center gap-3 min-w-[140px] border-t md:border-t-0 md:border-l border-foreground/10 pt-4 md:pt-0 md:pl-6">
                    <button 
                      onClick={() => handleDecisao(req.id, true)}
                      disabled={!!processingId}
                      className="flex-1 py-3 px-4 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white font-bold rounded-xl transition-all border border-green-500/20"
                    >
                      Aprovar
                    </button>
                    <button 
                      onClick={() => handleDecisao(req.id, false)}
                      disabled={!!processingId}
                      className="flex-1 py-3 px-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold rounded-xl transition-all border border-red-500/20"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}

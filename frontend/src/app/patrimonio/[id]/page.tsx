"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { BemPatrimonial } from "@/types/patrimonio";

export default function BemPatrimonialDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { roles } = useAuth();
  
  const [bem, setBem] = useState<BemPatrimonial | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State para Proposta de Edição
  const [novoStatus, setNovoStatus] = useState<"Ativo" | "Inservivel" | "Ja_dado_baixa" | "">("");
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [novoConservacao, setNovoConservacao] = useState("");

  useEffect(() => {
    const fetchBem = async () => {
      try {
        if (typeof id !== "string") return;
        const docSnap = await getDoc(doc(db, "Bem_Patrimonial", id));
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as BemPatrimonial;
          setBem(data);
          // Pré-popula os dados do form
          setNovoStatus(data.status);
          setNovoResponsavel(data.nome_responsavel_sei);
          setNovoConservacao(data.estado_conservacao);
        } else {
          router.replace("/patrimonio");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchBem();
  }, [id, router]);

  const handleProporAlteracao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const criarRequisicao = httpsCallable(functions, 'criarRequisicaoEdicaoBem');
      await criarRequisicao({
        id_bem_patrimonial: bem?.id,
        numero_patrimonio_atual: bem?.numero_patrimonio,
        novo_status: novoStatus !== bem?.status ? novoStatus : undefined,
        novo_nome_responsavel_sei: novoResponsavel !== bem?.nome_responsavel_sei ? novoResponsavel : undefined,
        novo_estado_conservacao: novoConservacao !== bem?.estado_conservacao ? novoConservacao : undefined,
      });
      
      setSuccessMsg("Requisição de alteração enviada com sucesso! Aguardando aprovação.");
      setTimeout(() => setIsModalOpen(false), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao criar requisição. Talvez já exista uma pendente.");
    } finally {
      setSubmitting(false);
    }
  };

  const isProfessorOrBolsista = roles.includes("Professor") || roles.includes("Bolsista");
  const isGestor = roles.includes("Chefe_Geral") || roles.includes("Gestor_Bens_Patrimoniais");

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!bem) return null;

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Professor", "Bolsista"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <button onClick={() => router.back()} className="text-sm font-medium text-primary hover:underline">
            &larr; Voltar ao Catálogo Patrimonial
          </button>

          <header className="glass-panel p-8 rounded-2xl relative overflow-hidden border border-foreground/10">
             <div className="absolute top-4 right-4">
               <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${
                 bem.status === 'Ativo' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                 bem.status === 'Inservivel' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                 'bg-red-500/10 text-red-500 border border-red-500/20'
               }`}>
                 Status: {bem.status.replace("_", " ")}
               </span>
             </div>

            <div className="flex items-start gap-6">
              {bem.photo_url ? (
                <img src={bem.photo_url} alt={bem.nome_equipamento} className="w-32 h-32 object-cover rounded-xl border border-foreground/10 shadow-lg" />
              ) : (
                <div className="w-32 h-32 bg-foreground/5 rounded-xl border border-foreground/10 flex items-center justify-center text-foreground/30 shadow-lg">
                  Sem Foto
                </div>
              )}
              
              <div className="pt-2">
                <h1 className="text-3xl font-bold text-foreground">{bem.nome_equipamento || "Equipamento Sem Nome"}</h1>
                <p className="font-mono text-lg text-primary mt-1">Plaqueta: {bem.numero_patrimonio}</p>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-foreground/10">
              <h3 className="text-lg font-bold mb-4 border-b border-foreground/10 pb-2">Detalhes de Alocação</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-foreground/50">Responsável SEI</dt>
                  <dd className="font-medium">{bem.nome_responsavel_sei}</dd>
                </div>
                <div>
                  <dt className="text-sm text-foreground/50">Localização Física</dt>
                  <dd className="font-medium">
                    {bem.predio} {bem.andar ? `- ${bem.andar}` : ''} {bem.sala ? `- Sala ${bem.sala}` : ''}
                  </dd>
                </div>
              </dl>
            </div>
            
            <div className="glass-panel p-6 rounded-2xl border border-foreground/10 flex flex-col">
              <h3 className="text-lg font-bold mb-4 border-b border-foreground/10 pb-2">Conservação</h3>
              <dl className="space-y-4 flex-1">
                <div>
                  <dt className="text-sm text-foreground/50">Estado Descritivo</dt>
                  <dd className="font-medium">{bem.estado_conservacao}</dd>
                </div>
                {bem.descricao_complementar && (
                  <div>
                    <dt className="text-sm text-foreground/50">Nota Complementar</dt>
                    <dd className="font-medium">{bem.descricao_complementar}</dd>
                  </div>
                )}
              </dl>
              
              {/* Botão de Mutação via Fluxo de Aprovação */}
              <div className="pt-6 mt-auto">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors border border-primary/20"
                >
                  Propor Alteração (Requisitar)
                </button>
                <p className="text-xs text-center text-foreground/40 mt-2">
                  Toda alteração passa pela Inbox da Chefia.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* MODAL DE REQUISIÇÃO (Glassmorphism) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="glass-panel w-full max-w-lg p-8 rounded-3xl shadow-2xl border border-foreground/10 relative">
              <button 
                onClick={() => !submitting && setIsModalOpen(false)}
                className="absolute top-6 right-6 text-foreground/50 hover:text-foreground"
              >
                ✕
              </button>
              
              <h2 className="text-2xl font-bold mb-2">Propor Atualização</h2>
              <p className="text-sm text-foreground/60 mb-6">
                Sua proposta será enviada para a Caixa de Entrada da Chefia. Somente após a aprovação os dados oficiais do bem serão sobrescritos.
              </p>
              
              <form onSubmit={handleProporAlteracao} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1">Status Proposto</label>
                  <select 
                    value={novoStatus} 
                    onChange={(e) => setNovoStatus(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inservivel">Inservível (Quebrado/Desuso)</option>
                    <option value="Ja_dado_baixa">Já dado Baixa (Processo SEI concluído)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Novo Responsável SEI</label>
                  <input 
                    type="text" 
                    value={novoResponsavel} 
                    onChange={(e) => setNovoResponsavel(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Estado de Conservação Detalhado</label>
                  <textarea 
                    value={novoConservacao} 
                    onChange={(e) => setNovoConservacao(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-primary outline-none h-24 resize-none" 
                  />
                </div>

                {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{errorMsg}</div>}
                {successMsg && <div className="text-green-500 text-sm bg-green-500/10 p-3 rounded-lg border border-green-500/20">{successMsg}</div>}

                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-50 mt-4"
                >
                  {submitting ? "Enviando Proposta..." : "Enviar para Aprovação"}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </ProtectedRoute>
  );
}

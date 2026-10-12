"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import type { ResumoReagente, FrascoReagente, CatalogoEspecificacao } from "@/types/reagentes";
import { obterCatalogoReagentes } from "@/services/reagentes/reagentesService";
import { ModalEntradaFrasco, ModalDevolucaoFrasco, ModalMetrologia } from "@/components/reagentes/ModaisReagentes";

type FirestoreTimestampLike = {
  toMillis?: () => number;
  toDate?: () => Date;
};

type EmprestimoReagenteDetalhe = {
  id_frasco_reagente: string;
  data_retirada?: FirestoreTimestampLike;
  data_devolucao_efetuada?: FirestoreTimestampLike;
  status?: string;
  consumo_validado?: boolean;
  medida_utilizada?: number | null;
  unidade_medida_utilizada?: string | null;
  peso_retorno?: number;
  peso_saida?: number;
};

type FrascoDetalhe = FrascoReagente & {
  idEmprestimoAtivo?: string;
  id_ultimo_emprestimo?: string;
  status?: string;
  consumo_validado?: boolean;
  peso_retorno?: number;
  peso_saida?: number;
};

export default function ReagenteDetailsPage() {
  const { roles, user, isLoading: authLoading } = useAuth();
  const userUid = user?.uid;
  const { id } = useParams();
  const router = useRouter();
  
  const [reagente, setReagente] = useState<ResumoReagente | null>(null);
  const [frascos, setFrascos] = useState<FrascoDetalhe[]>([]);
  const [emprestimosProprios, setEmprestimosProprios] = useState<Array<{ id: string; data: EmprestimoReagenteDetalhe }>>([]);
  const [loading, setLoading] = useState(true);

  const [isModalEntradaOpen, setIsModalEntradaOpen] = useState(false);
  const [isModalDevolucaoOpen, setIsModalDevolucaoOpen] = useState(false);
  const [selectedFrascoId, setSelectedFrascoId] = useState("");
  const [selectedEmprestimoId, setSelectedEmprestimoId] = useState("");
  const [selectedFrascoMetrologia, setSelectedFrascoMetrologia] = useState<FrascoDetalhe | null>(null);
  const [isMetrologiaOpen, setIsMetrologiaOpen] = useState(false);

  const fetchDados = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof id !== "string" || !userUid) return;

      // O catálogo JSON é a fonte de leitura das especificações comerciais.
      // A consulta do resumo é apenas um fallback para catálogo ainda não publicado.
      const catalogo = await obterCatalogoReagentes();
      const resumoDoCatalogo = catalogo.find((item) => item.id === id);
      if (resumoDoCatalogo) {
        setReagente(resumoDoCatalogo);
      } else {
        const docSnap = await getDoc(doc(db, "Resumo_Reagente", id));
        if (!docSnap.exists()) {
          router.replace("/reagentes");
          return;
        }
        setReagente({ id: docSnap.id, ...docSnap.data() } as ResumoReagente);
      }

      const frascosSnap = await getDocs(
        query(collection(db, "Frasco_Reagente"), where("id_resumo_reagente", "==", id))
      );
      const podeConsultarTodosEmprestimos = roles.includes("Chefe_Geral") || roles.includes("Gestor_Almoxarifado");
      const emprestimosQuery = podeConsultarTodosEmprestimos
        ? query(collection(db, "Emprestimo_Reagente"))
        : query(
            collection(db, "Emprestimo_Reagente"),
            where("id_usuario_retirou", "==", userUid),
          );
      const emprestimosSnap = await getDocs(emprestimosQuery);
      const idsFrascosDoReagente = new Set(frascosSnap.docs.map((frasco) => frasco.id));
      setEmprestimosProprios(
        emprestimosSnap.docs
          .map((emprestimo) => ({ id: emprestimo.id, data: emprestimo.data() as EmprestimoReagenteDetalhe }))
          .filter((emprestimo) => idsFrascosDoReagente.has(emprestimo.data.id_frasco_reagente))
          .sort((a, b) => {
            const instanteA = a.data.data_retirada?.toMillis?.() ?? 0;
            const instanteB = b.data.data_retirada?.toMillis?.() ?? 0;
            return instanteB - instanteA;
          })
      );
      const emprestimosPorFrasco = new Map<string, { id: string; data: EmprestimoReagenteDetalhe }>();
      for (const emprestimo of emprestimosSnap.docs) {
        const dados = emprestimo.data() as EmprestimoReagenteDetalhe;
        const anterior = emprestimosPorFrasco.get(dados.id_frasco_reagente);
        const atual = dados.data_devolucao_efetuada?.toMillis?.() ?? dados.data_retirada?.toMillis?.() ?? 0;
        const anteriorTempo = anterior?.data.data_devolucao_efetuada?.toMillis?.() ?? anterior?.data.data_retirada?.toMillis?.() ?? 0;
        if (!anterior || atual >= anteriorTempo) emprestimosPorFrasco.set(dados.id_frasco_reagente, { id: emprestimo.id, data: dados });
      }
      const listaFrascos = frascosSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        idEmprestimoAtivo: emprestimosPorFrasco.get(d.id)?.data.status === "EM_USO" ? emprestimosPorFrasco.get(d.id)?.id : undefined,
        id_ultimo_emprestimo: emprestimosPorFrasco.get(d.id)?.id,
        ...emprestimosPorFrasco.get(d.id)?.data,
      })) as FrascoDetalhe[];
      setFrascos(listaFrascos);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, roles, router, userUid]);

  useEffect(() => {
    if (authLoading || !userUid) return;
    void Promise.resolve().then(() => fetchDados());
  }, [authLoading, fetchDados, userUid]);

  const handleDevolucao = (frascoId: string, idEmprestimo?: string) => {
    setSelectedFrascoId(frascoId);
    setSelectedEmprestimoId(idEmprestimo ?? "");
    setIsModalDevolucaoOpen(true);
  };

  const handleMetrologia = (frasco: FrascoDetalhe) => {
    setSelectedFrascoMetrologia(frasco);
    setIsMetrologiaOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!reagente) return null;

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Bolsista", "Aluno"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <button onClick={() => router.back()} className="text-sm font-medium text-primary hover:underline">
            &larr; Voltar ao Catálogo
          </button>

          <header className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{reagente.nome}</h1>
              <div className="flex gap-3 mt-3">
                <span className="px-3 py-1 rounded-full bg-foreground/5 text-xs font-medium border border-foreground/10">
                  {reagente.estado_fisico}
                </span>
                <span className="px-3 py-1 rounded-full bg-foreground/5 text-xs font-medium border border-foreground/10">
                  {reagente.natureza_quimica}
                </span>
              </div>
            </div>
            
            {(roles.includes("Chefe_Geral") || roles.includes("Gestor_Almoxarifado")) && (
              <button 
                onClick={() => setIsModalEntradaOpen(true)}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all"
              >
                + Novo Frasco
              </button>
            )}
          </header>

          <section data-testid="reagente-especificacoes">
            <h2 className="text-xl font-bold mb-4">Especificações comerciais</h2>
            <div className="glass-panel rounded-2xl border border-foreground/10 p-5">
              {Object.values(reagente.especificacoes ?? {}).length === 0 ? (
                <p className="text-sm text-foreground/50">Nenhuma especificação comercial publicada no catálogo.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.values(reagente.especificacoes ?? {}).map((especificacao: CatalogoEspecificacao) => (
                    <article key={especificacao.id} className="rounded-xl bg-foreground/5 p-4 text-sm">
                      <h3 className="font-semibold">{especificacao.descricao || "Especificação sem descrição"}</h3>
                      {especificacao.fabricante && <p className="text-foreground/70">Fabricante: {especificacao.fabricante}</p>}
                      {especificacao.grau_pureza && <p className="text-foreground/70">Grau de pureza: {especificacao.grau_pureza}</p>}
                      {reagente.estado_fisico === "LIQUIDO" && (
                        <p data-testid={`densidade-${especificacao.id}`} className="mt-2 font-medium text-primary">
                          Densidade: {typeof especificacao.densidade === "number" ? `${especificacao.densidade} g/mL` : "não informada"}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">Estoque e Frascos</h2>
            <div className="glass-panel rounded-2xl overflow-hidden border border-foreground/10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-foreground/5 text-sm font-semibold text-foreground/70 border-b border-foreground/10">
                    <th className="p-4">Lote / Fornecedor</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Quantidade</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {frascos.map((f) => (
                    <tr key={f.id} data-testid={`frasco-row-${f.id}`} className="hover:bg-foreground/5 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{f.codigo_frasco}</div>
                        <div className="text-xs text-foreground/50">{f.id_lote ? "Lote Vinculado" : "Sem Lote"}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded w-fit text-xs font-bold ${
                            f.estado_fisico_frasco === 'FECHADO' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {f.estado_fisico_frasco}
                          </span>
                          
                          {f.em_quarentena && (
                            <span className="px-2 py-1 rounded w-fit text-xs font-bold bg-red-500/10 text-red-500">
                              QUARENTENA
                            </span>
                          )}
                          
                          {f.vencido && (
                            <span className="px-2 py-1 rounded w-fit text-xs font-bold bg-purple-500/10 text-purple-500">
                              VENCIDO
                            </span>
                          )}

                          {f.disponibilidade === "EMPRESTADO" && (
                            <span className="px-2 py-1 rounded w-fit text-xs font-bold bg-blue-500/10 text-blue-500">
                              EM USO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm">
                        {f.peso_atual} / {f.peso_no_cadastrado} g
                      </td>
                      <td className="p-4 text-right">
                        {f.estado_fisico_frasco === 'ABERTO' && f.disponibilidade === 'EMPRESTADO' && !f.em_quarentena && (
                          <button 
                            onClick={() => handleDevolucao(f.id, (f as FrascoReagente & { idEmprestimoAtivo?: string }).idEmprestimoAtivo)}
                            className="text-xs font-semibold text-amber-500 hover:bg-amber-500/10 px-3 py-1 rounded"
                          >
                            Devolver
                          </button>
                        )}
                        {(((f.status === "DEVOLVIDO_COM_ANOMALIA" && f.consumo_validado === false) || f.estado_fisico_frasco === "VAZIO")) ? (
                          <button
                            onClick={() => handleMetrologia(f)}
                            className="text-xs font-semibold text-blue-500 hover:bg-blue-500/10 px-3 py-1 rounded"
                          >
                            Resolver Metrologia
                          </button>
                        ) : null}
                        {f.estado_fisico_frasco === 'FECHADO' && f.disponibilidade === 'DISPONIVEL' && !f.em_quarentena && (
                          <button className="text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1 rounded">
                            Retirar (Abrir)
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {frascos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-foreground/50">
                        Nenhum frasco encontrado para esta substância.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {(roles.includes("Professor") || roles.includes("Bolsista")) && (
            <section data-testid="meus-reagentes-historico">
              <h2 className="text-xl font-bold mb-4">Meus Reagentes</h2>
              <div className="glass-panel rounded-2xl border border-foreground/10 p-5 space-y-3">
                <p className="text-sm text-foreground/60">
                  Empréstimos próprios e consumo histórico. Outros usuários não são exibidos.
                </p>
                {emprestimosProprios.length === 0 ? (
                  <p className="text-sm text-foreground/50">Nenhum empréstimo próprio para este reagente.</p>
                ) : (
                  <div className="space-y-3">
                    {emprestimosProprios.map((emprestimo) => {
                      const frasco = frascos.find((item) => item.id === emprestimo.data.id_frasco_reagente);
                      const formatarInstante = (valor: FirestoreTimestampLike | undefined) => valor?.toDate?.().toLocaleString("pt-BR") ?? "—";
                      return (
                        <article key={emprestimo.id} className="rounded-xl bg-foreground/5 p-4 text-sm">
                          <div className="flex flex-wrap justify-between gap-2 font-medium">
                            <span>{frasco?.codigo_frasco ?? emprestimo.data.id_frasco_reagente}</span>
                            <span>{emprestimo.data.status}</span>
                          </div>
                          <div className="mt-2 grid gap-1 text-foreground/70 sm:grid-cols-2">
                            <span>Retirada: {formatarInstante(emprestimo.data.data_retirada)}</span>
                            <span>Devolução: {formatarInstante(emprestimo.data.data_devolucao_efetuada)}</span>
                            <span>Consumo: {emprestimo.data.medida_utilizada ?? "—"} {emprestimo.data.unidade_medida_utilizada ?? ""}</span>
                            <span>Frasco: {emprestimo.data.id_frasco_reagente}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

        </div>

        {/* Modais de Fluxo de Bancada (Cloud Functions Bridge) */}
        <ModalEntradaFrasco 
          isOpen={isModalEntradaOpen} 
          onClose={() => setIsModalEntradaOpen(false)} 
          idResumoReagente={reagente.id}
          onSuccess={fetchDados}
        />
        
        <ModalDevolucaoFrasco
          isOpen={isModalDevolucaoOpen}
          onClose={() => setIsModalDevolucaoOpen(false)}
          frascoId={selectedFrascoId}
          idEmprestimo={selectedEmprestimoId || undefined}
          onSuccess={fetchDados}
        />

        <ModalMetrologia
          isOpen={isMetrologiaOpen}
          onClose={() => { setIsMetrologiaOpen(false); setSelectedFrascoMetrologia(null); }}
          idFrasco={selectedFrascoMetrologia?.id}
          idEmprestimo={selectedFrascoMetrologia?.id_ultimo_emprestimo}
          pesoRetornoOriginal={selectedFrascoMetrologia?.peso_retorno}
          pesoSaidaOriginal={selectedFrascoMetrologia?.peso_saida}
          tara={selectedFrascoMetrologia?.peso_frasco_vazio}
          onSuccess={fetchDados}
        />
        
      </main>
    </ProtectedRoute>
  );
}

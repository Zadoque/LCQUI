"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { ResumoReagente, FrascoReagente } from "@/types/reagentes";
import { ModalEntradaFrasco, ModalDevolucaoFrasco } from "@/components/reagentes/ModaisReagentes";

export default function ReagenteDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [reagente, setReagente] = useState<ResumoReagente | null>(null);
  const [frascos, setFrascos] = useState<FrascoReagente[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalEntradaOpen, setIsModalEntradaOpen] = useState(false);
  const [isModalDevolucaoOpen, setIsModalDevolucaoOpen] = useState(false);
  const [selectedFrascoId, setSelectedFrascoId] = useState("");

  const fetchDados = async () => {
    setLoading(true);
    try {
      if (typeof id !== "string") return;

      const docSnap = await getDoc(doc(db, "Resumo_Reagente", id));
      if (docSnap.exists()) {
        setReagente({ id: docSnap.id, ...docSnap.data() } as ResumoReagente);
      } else {
        router.replace("/reagentes");
        return;
      }

      const frascosSnap = await getDocs(
        query(collection(db, "Frasco_Reagente"), where("id_resumo_reagente", "==", id))
      );
      const listaFrascos = frascosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as FrascoReagente[];
      setFrascos(listaFrascos);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, [id, router]);

  const handleDevolucao = (frascoId: string) => {
    setSelectedFrascoId(frascoId);
    setIsModalDevolucaoOpen(true);
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
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Bolsista"]}>
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
            
            <button 
              onClick={() => setIsModalEntradaOpen(true)}
              className="px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all"
            >
              + Novo Frasco
            </button>
          </header>

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
                    <tr key={f.id} className="hover:bg-foreground/5 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{f.lote}</div>
                        <div className="text-xs text-foreground/50">{f.fornecedor}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          f.status === 'Fechado' ? 'bg-green-500/10 text-green-500' :
                          f.status === 'Aberto' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-sm">
                        {f.quantidade_atual_mg_ml} / {f.quantidade_inicial_mg_ml} {f.unidade_medida}
                      </td>
                      <td className="p-4 text-right">
                        {f.status === 'Aberto' && (
                          <button 
                            onClick={() => handleDevolucao(f.id)}
                            className="text-xs font-semibold text-amber-500 hover:bg-amber-500/10 px-3 py-1 rounded"
                          >
                            Devolver
                          </button>
                        )}
                        {f.status === 'Fechado' && (
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
          onSuccess={fetchDados}
        />
        
      </main>
    </ProtectedRoute>
  );
}

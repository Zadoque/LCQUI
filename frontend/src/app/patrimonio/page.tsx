"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import { BemPatrimonial } from "@/types/patrimonio";

export default function PatrimonioDashboard() {
  const [bens, setBens] = useState<BemPatrimonial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBens = async () => {
      try {
        // Na v1, listamos tudo com limit para evitar overfetching (ou paginate real)
        const q = query(collection(db, "Bem_Patrimonial"), limit(100));
        const querySnapshot = await getDocs(q);
        const lista = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BemPatrimonial[];
        
        setBens(lista);
      } catch (error) {
        console.error("Erro ao buscar patrimônios:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBens();
  }, []);

  const filteredBens = bens.filter(b => 
    b.nome_equipamento?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.numero_patrimonio.includes(searchQuery)
  );

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Professor", "Bolsista"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Bens Patrimoniais</h1>
              <p className="text-foreground/60 mt-1">Gestão de Equipamentos e Materiais Permanentes.</p>
            </div>
            
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Buscar por nome ou Nº Plaqueta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 rounded-xl bg-foreground/5 border border-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-80"
              />
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBens.map(bem => (
                <Link key={bem.id} href={`/patrimonio/${bem.id}`}>
                  <div className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-foreground/5 transition-all h-full flex flex-col relative overflow-hidden">
                    
                    {/* Status Badge - Posição Absoluta */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        bem.status === 'Ativo' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                        bem.status === 'Inservivel' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {bem.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mb-4 pr-20">
                      <h2 className="text-xl font-semibold text-foreground line-clamp-2">
                        {bem.nome_equipamento || "Equipamento sem nome"}
                      </h2>
                      <p className="font-mono text-sm text-foreground/50 mt-1">
                        Plaqueta: {bem.numero_patrimonio}
                      </p>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-foreground/10 flex flex-col gap-2 text-sm text-foreground/70">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{bem.predio} {bem.andar ? `- ${bem.andar}` : ''} {bem.sala ? `- Sala ${bem.sala}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="truncate">{bem.nome_responsavel_sei}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              
              {filteredBens.length === 0 && (
                <div className="col-span-full py-12 text-center text-foreground/50">
                  Nenhum bem patrimonial encontrado.
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}

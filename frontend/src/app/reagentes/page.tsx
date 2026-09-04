"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import { ResumoReagente } from "@/types/reagentes";

export default function ReagentesDashboard() {
  const [reagentes, setReagentes] = useState<ResumoReagente[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReagentes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Resumo_Reagente"));
        const lista = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ResumoReagente[];
        
        setReagentes(lista);
      } catch (error) {
        console.error("Erro ao buscar reagentes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReagentes();
  }, []);

  const filteredReagentes = reagentes.filter(r => 
    r.nome?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Bolsista"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Catálogo de Reagentes</h1>
              <p className="text-foreground/60 mt-1">Busque e gerencie o estoque químico.</p>
            </div>
            
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Buscar substância..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 rounded-xl bg-foreground/5 border border-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-64"
              />
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReagentes.map(reagente => (
                <Link key={reagente.id} href={`/reagentes/${reagente.id}`}>
                  <div className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-foreground/5 transition-all h-full flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-xl font-semibold text-foreground line-clamp-2">
                        {reagente.nome}
                      </h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        reagente.estado_fisico === 'Líquido' ? 'bg-blue-500/20 text-blue-500' : 
                        reagente.estado_fisico === 'Sólido' ? 'bg-amber-500/20 text-amber-500' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {reagente.estado_fisico}
                      </span>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-foreground/10 flex flex-wrap gap-2">
                      {reagente.riscos?.map((risco, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded-md">
                          {risco}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
              
              {filteredReagentes.length === 0 && (
                <div className="col-span-full py-12 text-center text-foreground/50">
                  Nenhuma substância encontrada.
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}

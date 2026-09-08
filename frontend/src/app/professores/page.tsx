"use client";

import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { NovaMateriaModal } from "@/components/materias/NovaMateriaModal";

interface Professor {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  centro?: string;
  laboratorio?: string;
}

interface Materia {
  id: string;
  nome: string;
  codigo_materia: string;
}

export default function ProfessoresDashboard() {
  const { roles } = useAuth();
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [materiasDb, setMateriasDb] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMateriaModalOpen, setIsMateriaModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string; link?: string } | null>(null);

  // Form states
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [centro, setCentro] = useState("CCT");
  const [laboratorio, setLaboratorio] = useState("");
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>([]);
  const [materiaSearch, setMateriaSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Section 5 Search Strategy for Professores:
    const qProf = query(collection(db, "Professor"));
    const unsubProf = onSnapshot(qProf, (querySnapshot) => {
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Professor[];
      setProfessores(lista);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar professores:", error);
      setLoading(false);
    });

    // Fetch Materias
    const qMat = query(collection(db, "Materia"), orderBy("nome", "asc"));
    const unsubMat = onSnapshot(qMat, (querySnapshot) => {
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Materia[];
      setMateriasDb(lista);
    }, (error) => {
      console.error("Erro ao buscar materias:", error);
    });

    return () => {
      unsubProf();
      unsubMat();
    };
  }, []);

  const handleConvidar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setToastMessage(null);

    try {
      const convidarUsuario = httpsCallable(functions, "convidarUsuario");
      const result = await convidarUsuario({ 
        email, 
        nome, 
        papel: "Professor",
        centro,
        laboratorio,
        materias: selectedMaterias
      });
      const data = result.data as { resetLink: string; uid: string };
      
      setToastMessage({
        type: "success",
        text: "Professor convidado com sucesso!",
        link: data.resetLink
      });
      
      setIsModalOpen(false);
      setNome("");
      setEmail("");
      setCentro("CCT");
      setLaboratorio("");
      setSelectedMaterias([]);
    } catch (error: any) {
      console.error("Erro ao convidar professor:", error);
      setToastMessage({
        type: "error",
        text: error.message || "Erro ao convidar professor"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMateria = (id: string) => {
    setSelectedMaterias(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const filteredProfessores = professores.filter(p => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      (p.nome && p.nome.toLowerCase().includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term))
    );
  });

  const filteredMaterias = materiasDb.filter(m => 
    m.nome.toLowerCase().includes(materiaSearch.toLowerCase()) || 
    m.codigo_materia.toLowerCase().includes(materiaSearch.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Professores</h1>
              <p className="text-foreground/60 mt-1">
                Gestão do corpo docente (Acesso restrito ao Chefe Geral)
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              Novo Professor
            </button>
          </header>

          {/* Toast Notification */}
          {toastMessage && (
            <div className={`p-4 rounded-xl shadow-lg border flex flex-col gap-2 ${
              toastMessage.type === "success" 
                ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" 
                : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {toastMessage.type === "success" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                )}
                {toastMessage.text}
              </div>
              {toastMessage.link && (
                <div className="mt-1 bg-background/50 p-3 rounded-lg border border-green-500/10 break-all text-sm">
                  <span className="font-semibold block mb-1">Link de Configuração de Senha:</span>
                  <a href={toastMessage.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
                    {toastMessage.link}
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="glass-panel p-6 rounded-2xl space-y-4 border border-foreground/10">
            <div className="w-full sm:w-1/2">
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="glass-panel overflow-hidden rounded-2xl border border-foreground/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-foreground/70 border-b border-foreground/10">
                  <tr>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Nome</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">E-mail</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Centro</th>
                    <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                      </td>
                    </tr>
                  ) : filteredProfessores.length > 0 ? (
                    filteredProfessores.map((prof) => (
                      <tr key={prof.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="px-5 py-4 font-semibold">{prof.nome}</td>
                        <td className="px-5 py-4 text-foreground/70">{prof.email}</td>
                        <td className="px-5 py-4 text-foreground/70">{prof.centro || "N/A"}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            prof.ativo !== false ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"
                          }`}>
                            {prof.ativo !== false ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-foreground/50">
                        Nenhum professor encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Novo Professor */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl border border-foreground/10 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-foreground/10 flex justify-between items-center shrink-0">
                  <h2 className="text-xl font-bold">Novo Professor</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-foreground/50 hover:text-foreground">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                
                <form onSubmit={handleConvidar} className="p-6 overflow-y-auto space-y-6 flex-1">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-foreground/80">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ex: João Silva"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-foreground/80">E-mail (UFSC)</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="joao.silva@ufsc.br"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-foreground/80">Centro</label>
                      <select
                        required
                        value={centro}
                        onChange={(e) => setCentro(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="CCT">CCT</option>
                        <option value="CCTA">CCTA</option>
                        <option value="CBB">CBB</option>
                        <option value="CCH">CCH</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-foreground/80">Laboratório</label>
                      <input
                        type="text"
                        required
                        value={laboratorio}
                        onChange={(e) => setLaboratorio(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ex: Lab de Polímeros"
                      />
                    </div>
                  </div>

                  {/* Seletor de Matérias */}
                  <div className="border border-foreground/10 rounded-xl p-4 bg-foreground/5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <label className="block text-sm font-semibold text-foreground/80">Matérias Lecionadas</label>
                      <button 
                        type="button"
                        onClick={() => setIsMateriaModalOpen(true)}
                        className="text-xs bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                        Nova Matéria
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Filtrar matérias..."
                      value={materiaSearch}
                      onChange={(e) => setMateriaSearch(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />

                    <div className="max-h-48 overflow-y-auto border border-foreground/10 rounded-lg bg-background">
                      {filteredMaterias.length > 0 ? (
                        filteredMaterias.map(m => (
                          <label key={m.id} className="flex items-center gap-3 p-3 hover:bg-foreground/5 border-b border-foreground/5 last:border-0 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedMaterias.includes(m.id)}
                              onChange={() => toggleMateria(m.id)}
                              className="rounded border-foreground/30 text-primary focus:ring-primary w-4 h-4"
                            />
                            <div>
                              <span className="font-bold text-sm block">{m.codigo_materia}</span>
                              <span className="text-xs text-foreground/60">{m.nome}</span>
                            </div>
                          </label>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-foreground/50">
                          Nenhuma matéria encontrada.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3 justify-end border-t border-foreground/10">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-lg font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Enviando...
                        </>
                      ) : (
                        "Convidar"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal de Nova Matéria (Sobreposto) */}
          <NovaMateriaModal 
            isOpen={isMateriaModalOpen} 
            onClose={() => setIsMateriaModalOpen(false)} 
          />

        </div>
      </main>
    </ProtectedRoute>
  );
}

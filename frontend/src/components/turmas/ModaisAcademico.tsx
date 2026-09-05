import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { X } from "lucide-react";

interface NovaTurmaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NovaTurmaModal({ isOpen, onClose }: NovaTurmaModalProps) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [semestre, setSemestre] = useState(1);
  const [capacidade, setCapacidade] = useState(40);
  const [idMateria, setIdMateria] = useState("MAT_TEMP_ID"); // TODO: Buscar do Firestore
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const functions = getFunctions();
      const criarTurmaFn = httpsCallable(functions, "criarTurma");
      
      await criarTurmaFn({
        idMateria,
        nomeMateria: "Matéria Temporária", // TODO: Integrar com a seleção real
        nomeTurma: nome,
        ano,
        semestre,
        capacidade,
        codigoTurma: codigo
      });
      
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao criar turma.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">Nova Turma</h2>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Nome da Turma</label>
            <input 
              required
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Química Analítica I - Turma A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Código de Ingresso</label>
            <input 
              required
              type="text" 
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              placeholder="Ex: QA1-2026"
            />
            <p className="text-xs text-muted-foreground mt-1">Este código será usado pelos alunos para entrar.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ano</label>
              <input 
                required
                type="number" 
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Semestre</label>
              <select 
                value={semestre}
                onChange={(e) => setSemestre(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={1}>1º Semestre</option>
                <option value={2}>2º Semestre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Capacidade de Alunos</label>
            <input 
              required
              type="number" 
              min="1"
              max="200"
              value={capacidade}
              onChange={(e) => setCapacidade(Number(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-foreground/5 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Criando..." : "Criar Turma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function IngressarTurmaModal({ isOpen, onClose }: NovaTurmaModalProps) {
  const { user } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const functions = getFunctions();
      const ingressarFn = httpsCallable(functions, "ingressarEmTurmaPorCodigo");
      
      await ingressarFn({ codigoTurma: codigo });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao ingressar na turma.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">Ingressar em Turma</h2>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Código da Turma</label>
            <input 
              required
              type="text" 
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 text-center text-xl tracking-widest bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              placeholder="CÓDIGO"
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-foreground/5 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !codigo.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Processando..." : "Ingressar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NovaMateriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NovaMateriaModal({ isOpen, onClose }: NovaMateriaModalProps) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [codigoMateria, setCodigoMateria] = useState("");
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
      const criarMateria = httpsCallable(functions, "criarMateria");
      
      await criarMateria({
        nome,
        codigoMateria: codigoMateria.toUpperCase()
      });
      
      onClose();
      setNome("");
      setCodigoMateria("");
    } catch (err: any) {
      setError(err.message || "Erro ao criar matéria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-foreground/10">
        <div className="flex items-center justify-between p-4 border-b border-foreground/10">
          <h2 className="text-lg font-bold">Nova Matéria</h2>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-foreground/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1 text-foreground/80">Código da Matéria</label>
            <input 
              required
              type="text" 
              value={codigoMateria}
              onChange={(e) => setCodigoMateria(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              placeholder="Ex: QMC101"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-foreground/80">Nome da Matéria</label>
            <input 
              required
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Química Analítica I"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-foreground/5 rounded-lg transition-colors text-foreground/70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : "Salvar Matéria"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

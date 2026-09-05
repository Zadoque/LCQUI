import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { FileText, Loader2, X, Download } from "lucide-react";

interface ModalRelatoriosProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
}

export default function ModalRelatoriosPatrimonio({ isOpen, onClose, uid }: ModalRelatoriosProps) {
  const [activeTab, setActiveTab] = useState<"mensal" | "inserviveis">("mensal");
  const [loading, setLoading] = useState(false);

  // Form states
  const [predio, setPredio] = useState("");
  const [andar, setAndar] = useState("");
  const [sala, setSala] = useState("");
  const [status, setStatus] = useState("");
  
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  if (!isOpen) return null;

  const handleGerar = async () => {
    setLoading(true);
    try {
      if (activeTab === "mensal") {
        const gerarRelatorioBensPredio = httpsCallable(functions, "gerarRelatorioBensPredio");
        const filtros: any = {};
        if (predio) filtros.predio = predio;
        if (andar) filtros.andar = andar;
        if (sala) filtros.sala = sala;
        if (status) filtros.status = status;
        
        const res = await gerarRelatorioBensPredio(filtros);
        const data = res.data as { url: string };
        window.open(data.url, "_blank");
      } else {
        // Aba de bens inservíveis é apenas um atalho para gerarRelatorioBensPredio com status "Inservível"
        const gerarRelatorioBensPredio = httpsCallable(functions, "gerarRelatorioBensPredio");
        const res = await gerarRelatorioBensPredio({ status: "Inservível" });
        const data = res.data as { url: string };
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error(error);
      alert("Erro ao gerar relatório: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-background border border-foreground/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-foreground/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Relatórios de Patrimônio</h2>
              <p className="text-sm text-foreground/60">Gere listagens de bens em PDF</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-foreground/50 hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-foreground/10">
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "mensal" ? "border-primary text-primary" : "border-transparent text-foreground/60 hover:text-foreground"}`}
            onClick={() => setActiveTab("mensal")}
          >
            Filtrado por Local/Status
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "inserviveis" ? "border-red-500 text-red-500" : "border-transparent text-foreground/60 hover:text-foreground"}`}
            onClick={() => setActiveTab("inserviveis")}
          >
            Baixa de Inservíveis
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {activeTab === "mensal" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Prédio (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: P5, E1"
                  className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  value={predio} onChange={e => setPredio(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Andar</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 1, 2"
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={andar} onChange={e => setAndar(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Sala</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 101"
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={sala} onChange={e => setSala(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Status (Opcional)</label>
                <select 
                  className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  value={status} onChange={e => setStatus(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Manutenção">Em Manutenção</option>
                  <option value="Emprestado">Emprestado</option>
                  <option value="Inservível">Inservível</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === "inserviveis" && (
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600">
                <p className="text-sm font-medium">
                  Este relatório irá buscar todos os bens patrimoniais marcados com o status "Inservível", agrupando pelo nome do responsável SEI, pronto para ser anexado ao processo administrativo da Universidade.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-foreground/10 bg-foreground/5 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-foreground/70 hover:bg-foreground/10 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleGerar}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-bold text-white transition-colors flex items-center gap-2 disabled:opacity-50 ${activeTab === "inserviveis" ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

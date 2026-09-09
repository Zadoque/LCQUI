import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, query, where } from "firebase/firestore";
import { functions, db } from "@/lib/firebase/config";
import { openPdfFromBase64 } from "@/lib/pdf";
import { Printer, Loader2, X, Plus, Trash2, Search } from "lucide-react";

interface ModalEtiquetasProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalEtiquetasReagentes({ isOpen, onClose }: ModalEtiquetasProps) {
  const [activeTab, setActiveTab] = useState<"virgens" | "reimpressao">("virgens");
  const [loading, setLoading] = useState(false);

  // === ABA 1: Virgens ===
  const [codigoInicial, setCodigoInicial] = useState<number | "">(1);
  const [codigoFinal, setCodigoFinal] = useState<number | "">(1);
  const [startRow, setStartRow] = useState<number>(1);
  const [startCol, setStartCol] = useState<number>(1);

  // === ABA 2: Reimpressão ===
  const [searchCode, setSearchCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedFrascos, setSelectedFrascos] = useState<{ id: string, codigo: string, reagente: string }[]>([]);

  if (!isOpen) return null;

  const numInicial = typeof codigoInicial === "number" ? codigoInicial : 0;
  const numFinal = typeof codigoFinal === "number" ? codigoFinal : 0;
  const totalVirgens = numFinal - numInicial + 1;

  // Render Grid 3x10
  const renderGrid = () => {
    const cells = [];
    let currentIndex = 1;
    
    // Convert startRow/startCol to flat index (1-30)
    const startIndex = ((startRow - 1) * 3) + startCol;

    for (let r = 1; r <= 10; r++) {
      for (let c = 1; c <= 3; c++) {
        const isStart = r === startRow && c === startCol;
        const isSelected = currentIndex >= startIndex && currentIndex < startIndex + totalVirgens;
        const cellIndex = currentIndex;
        const row = r;
        const col = c;

        cells.push(
          <div 
            key={`${r}-${c}`}
            onClick={() => { setStartRow(row); setStartCol(col); }}
            className={`
              h-8 border rounded-sm flex items-center justify-center cursor-pointer text-xs transition-colors
              ${isStart ? "bg-primary text-primary-foreground border-primary font-bold" : 
                isSelected ? "bg-primary/20 border-primary/50 text-primary" : 
                "bg-foreground/5 border-foreground/10 hover:bg-foreground/10 text-foreground/40"}
            `}
          >
            {isStart ? "Início" : cellIndex}
          </div>
        );
        currentIndex++;
      }
    }
    return (
      <div className="grid grid-cols-3 gap-1 mt-2">
        {cells}
      </div>
    );
  };

  const handleBuscarFrasco = async () => {
    if (!searchCode.trim()) return;
    setSearching(true);
    try {
      // Ajuste para adicionar LCQUI- se o usuário digitar apenas o número
      const formattedCode = searchCode.toUpperCase().startsWith("LCQUI-") 
        ? searchCode.toUpperCase() 
        : `LCQUI-${searchCode}`;

      const q = query(collection(db, "Frasco_Reagente"), where("codigo_frasco", "==", formattedCode));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        alert("Nenhum frasco encontrado com esse código.");
        return;
      }

      const doc = snap.docs[0];
      const data = doc.data();

      if (selectedFrascos.find(f => f.id === doc.id)) {
        alert("Este frasco já foi adicionado.");
        return;
      }

      if (selectedFrascos.length >= 10) {
        alert("Você só pode selecionar até 10 frascos por vez.");
        return;
      }

      setSelectedFrascos(prev => [...prev, { id: doc.id, codigo: data.codigo_frasco, reagente: data.id_reagente }]);
      setSearchCode("");
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar frasco.");
    } finally {
      setSearching(false);
    }
  };

  const handleGerar = async () => {
    setLoading(true);
    try {
      if (activeTab === "virgens") {
        if (totalVirgens < 1 || totalVirgens > 50) {
          alert("O intervalo deve gerar entre 1 e 50 etiquetas.");
          setLoading(false);
          return;
        }
        const gerarPdfEtiquetasVirgens = httpsCallable(functions, "gerarPdfEtiquetasVirgens");
        const res = await gerarPdfEtiquetasVirgens({ 
          codigoInicial: Number(codigoInicial), 
          codigoFinal: Number(codigoFinal),
          startRow,
          startCol
        });
        const data = res.data as { base64: string };
        openPdfFromBase64(data.base64);
      } else {
        if (selectedFrascos.length === 0) {
          alert("Adicione pelo menos um frasco.");
          setLoading(false);
          return;
        }
        const gerarPdfReimpressaoFrascos = httpsCallable(functions, "gerarPdfReimpressaoFrascos");
        const res = await gerarPdfReimpressaoFrascos({ frascoIds: selectedFrascos.map(f => f.id) });
        const data = res.data as { base64: string };
        openPdfFromBase64(data.base64);
      }
    } catch (error: any) {
      console.error(error);
      alert("Erro ao gerar PDF: " + error.message);
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
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Imprimir Etiquetas</h2>
              <p className="text-sm text-foreground/60">Gere PDFs com códigos de barra Code 128</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-foreground/50 hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-foreground/10">
          <button 
            onClick={() => setActiveTab("virgens")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "virgens" ? "border-primary text-primary" : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            Novos Frascos (Virgens)
          </button>
          <button 
            onClick={() => setActiveTab("reimpressao")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "reimpressao" ? "border-primary text-primary" : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            Reimpressão / Conferência
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {activeTab === "virgens" ? (
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-foreground">Código LCQUI Inicial</label>
                  <input 
                    type="number" 
                    value={codigoInicial} 
                    onChange={e => setCodigoInicial(e.target.value === "" ? "" : parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg focus:outline-none focus:border-primary text-foreground"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-foreground">Código LCQUI Final</label>
                  <input 
                    type="number" 
                    value={codigoFinal} 
                    onChange={e => setCodigoFinal(e.target.value === "" ? "" : parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg focus:outline-none focus:border-primary text-foreground"
                  />
                </div>
              </div>
              
              <div className="bg-primary/5 text-primary p-3 rounded-lg text-sm border border-primary/20">
                Serão geradas <strong>{totalVirgens}</strong> etiquetas. (Máximo: 50 por vez)
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center justify-between">
                  <span>Posição Inicial na Folha (Grid 3x10)</span>
                  <span className="text-xs text-foreground/50">Clique para selecionar</span>
                </label>
                <div className="p-4 bg-foreground/5 rounded-xl border border-foreground/10">
                  {renderGrid()}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Buscar Frasco por Código LCQUI</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ex: LCQUI-5 ou apenas 5"
                    value={searchCode} 
                    onChange={e => setSearchCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleBuscarFrasco()}
                    className="flex-1 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg focus:outline-none focus:border-primary text-foreground uppercase"
                  />
                  <button 
                    onClick={handleBuscarFrasco}
                    disabled={searching || !searchCode.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                  >
                    {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex justify-between">
                  <span>Frascos Selecionados</span>
                  <span className="text-xs text-foreground/50">{selectedFrascos.length}/10</span>
                </label>
                {selectedFrascos.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-foreground/10 rounded-xl text-center text-foreground/40 text-sm">
                    Nenhum frasco adicionado ainda.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                    {selectedFrascos.map(f => (
                      <div key={f.id} className="flex items-center justify-between p-3 bg-foreground/5 rounded-lg border border-foreground/10">
                        <div>
                          <p className="font-bold text-sm text-foreground">{f.codigo}</p>
                          <p className="text-xs text-foreground/60 truncate max-w-[200px]">Reagente ID: {f.reagente}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedFrascos(prev => prev.filter(x => x.id !== f.id))}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-primary/5 text-primary p-3 rounded-lg text-sm border border-primary/20">
                A reimpressão de etiquetas para frascos já cadastrados gerará uma <strong>Ficha de Conferência</strong> individual (A4) para cada frasco selecionado.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-foreground/10 bg-foreground/[0.02] flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-medium hover:bg-foreground/5 text-foreground/70 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleGerar}
            disabled={loading}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

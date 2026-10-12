import React, { useState, useEffect } from "react";
import { openPdfFromBase64 } from "@/lib/pdf";
import { buscarAlmoxarifadosDoGestor, listarAlmoxarifados, listarAlmoxarifadosPorIds } from "@/services/cadastros/cadastrosService";
import { gerarRelatorioAlmoxarifado, gerarRelatorioPersonalizado } from "@/services/reagentes/reagentesService";
import { FileText, Loader2, X, Download } from "lucide-react";

interface ModalRelatoriosProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  isChefe?: boolean;
}

export default function ModalRelatoriosReagentes({ isOpen, onClose, uid, isChefe = false }: ModalRelatoriosProps) {
  const [activeTab, setActiveTab] = useState<"mensal" | "personalizado">("mensal");
  const [loading, setLoading] = useState(false);
  const [almoxarifados, setAlmoxarifados] = useState<{id: string, nome: string}[]>([]);

  // Form states
  const [idAlmoxarifado, setIdAlmoxarifado] = useState("");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (isChefe) {
        listarAlmoxarifados().then(items => {
          const alms = items.map(item => ({ id: item.id, nome: item.nome || "Sem Nome" }));
          setAlmoxarifados(alms);
          if (alms.length > 0) setIdAlmoxarifado(alms[0].id);
        }).catch(err => console.error(err));
      } else {
        buscarAlmoxarifadosDoGestor(uid).then(async (ids) => {
          if (ids.length === 0) {
            setAlmoxarifados([]);
            return;
          }
          
          const alms = (await listarAlmoxarifadosPorIds(ids)).map(item => ({ id: item.id, nome: item.nome || "Sem Nome" }));
          setAlmoxarifados(alms);
          if (alms.length > 0) setIdAlmoxarifado(alms[0].id);
        }).catch(err => console.error(err));
      }
    }
  }, [isOpen, isChefe, uid]);

  if (!isOpen) return null;

  const handleGerar = async () => {
    setErrorMsg("");
    // Validações
    if (activeTab === "mensal") {
      const hoje = new Date();
      // O ano selecionado não pode ser no futuro. E se for o ano atual, o mês selecionado não pode ser no futuro.
      if (ano > hoje.getFullYear()) {
        setErrorMsg("O ano do relatório não pode ser no futuro.");
        return;
      }
      if (ano === hoje.getFullYear() && mes > hoje.getMonth() + 1) {
        setErrorMsg("O mês do relatório não pode ser no futuro.");
        return;
      }
      if (!idAlmoxarifado) {
        setErrorMsg("Selecione um almoxarifado.");
        return;
      }
    } else {
      const inicio = new Date(dataInicio + "T00:00:00");
      const fim = new Date(dataFim + "T23:59:59");
      const hoje = new Date();

      if (inicio > hoje) {
        setErrorMsg("A data inicial não pode ser no futuro.");
        return;
      }
      if (fim > hoje) {
        setErrorMsg("A data final não pode ser no futuro.");
        return;
      }
      if (inicio > fim) {
        setErrorMsg("A data inicial não pode ser maior que a data final.");
        return;
      }
      
      const diffTime = Math.abs(fim.getTime() - inicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays > 31) {
        setErrorMsg("O período selecionado permite no máximo 31 dias corridos.");
        return;
      }
    }

    setLoading(true);
    try {
      if (activeTab === "mensal") {
        openPdfFromBase64(await gerarRelatorioAlmoxarifado({ idAlmoxarifado, mes: Number(mes), ano: Number(ano) }));
      } else {
        openPdfFromBase64(await gerarRelatorioPersonalizado({
          dataInicio: dataInicio + "T00:00:00", 
          dataFim: dataFim + "T23:59:59", 
          entidade: "Reagentes" 
        }));
      }
    } catch (error: unknown) {
      console.error(error);
      setErrorMsg("Erro ao gerar relatório: " + (error instanceof Error ? error.message : "falha na operação"));
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
              <h2 className="text-lg font-bold text-foreground">Relatórios de Reagentes</h2>
              <p className="text-sm text-foreground/60">Gere relatórios em PDF para impressão</p>
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
            Mensal (Por Almoxarifado)
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "personalizado" ? "border-primary text-primary" : "border-transparent text-foreground/60 hover:text-foreground"}`}
            onClick={() => setActiveTab("personalizado")}
          >
            Personalizado
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {activeTab === "mensal" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Almoxarifado</label>
                <select 
                  className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  value={idAlmoxarifado} onChange={e => setIdAlmoxarifado(e.target.value)}
                >
                  {almoxarifados.map(a => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Mês</label>
                  <select 
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={mes} onChange={e => setMes(Number(e.target.value))}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Ano</label>
                  <input 
                    type="number" 
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={ano} onChange={e => setAno(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "personalizado" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Data Inicial</label>
                  <input 
                    type="date" 
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Data Final</label>
                  <input 
                    type="date" 
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={dataFim} onChange={e => setDataFim(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                <p className="text-sm font-medium text-primary/80 flex items-start gap-2">
                  <span className="text-lg">ℹ️</span>
                  <span>
                    <strong>Importante:</strong> O período personalizado permite no <strong>máximo 31 dias corridos</strong>.
                    <br />
                    <em>Nota: A formatação visual (dd/mm/aaaa ou mm/dd/aaaa) varia automaticamente conforme o idioma do seu sistema ou navegador.</em>
                  </span>
                </p>
              </div>
              <p className="text-xs text-foreground/50 mt-2 text-center">
                O relatório personalizado buscará todos os empréstimos e devoluções dentro do período selecionado, sem restringir a um único almoxarifado.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs mt-3">
              {errorMsg}
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
            disabled={loading || (activeTab === "personalizado" && (!dataInicio || !dataFim))}
            className="px-6 py-2 rounded-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

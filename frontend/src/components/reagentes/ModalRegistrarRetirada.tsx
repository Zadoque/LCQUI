"use client";

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { ModalProps } from "./types";
import { ModalBuscaUsuarioReagente, SeletorUsuarioReagente } from "./SeletorUsuarioReagente";
import type { UsuarioRetirada } from "@/services/usuarios/usuariosService";
import { ModalBuscaLocalReagente, SeletorLocalReagente } from "./ModalBuscaLocalReagente";
import type { LocalRetirada } from "@/services/reagentes/reagentesService";

export function ModalRegistrarRetirada({ isOpen, onClose, onSuccess }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [frascoId, setFrascoId] = useState("");
  const [usuarioRetirou, setUsuarioRetirou] = useState("");
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioRetirada | null>(null);
  const [buscaUsuarioAberta, setBuscaUsuarioAberta] = useState(false);
  const [localUsado, setLocalUsado] = useState("");
  const [localSelecionado, setLocalSelecionado] = useState<LocalRetirada | null>(null);
  const [buscaLocalAberta, setBuscaLocalAberta] = useState(false);
  const [pesoSaida, setPesoSaida] = useState("");
  const [dataDevolucao, setDataDevolucao] = useState("");
  const [finalidade, setFinalidade] = useState<"PESQUISA" | "DIDATICO_DEMONSTRACAO" | "OUTRO">("PESQUISA");
  const [abrirNoEmprestimo, setAbrirNoEmprestimo] = useState(false);
  const [confirmarUsoVencido, setConfirmarUsoVencido] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      if (!localUsado) throw new Error("Selecione um local de uso cadastrado.");
      const registrarRetirada = httpsCallable(functions, "registrarRetirada");
      await registrarRetirada({
        idOperacao: crypto.randomUUID(),
        idFrasco: frascoId.trim(),
        idUsuarioRetirou: usuarioRetirou,
        idLocalUsado: localUsado.trim(),
        pesoSaida: Number(pesoSaida),
        dataDevolucaoPrevista: dataDevolucao,
        finalidadeUso: finalidade,
        abrirNoEmprestimo,
        confirmarUsoVencido,
        justificativaAutoAtendimento: justificativa.trim(),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao registrar retirada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-xl border-orange-500/20">
        <h2 className="text-xl font-bold mb-4 text-orange-500">Registrar Retirada</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="retirada-frasco-id" className="block text-sm font-medium mb-1">ID do Frasco / QR Code</label>
            <input id="retirada-frasco-id" type="text" required placeholder="Ex: F-12345" value={frascoId} onChange={(e) => setFrascoId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SeletorUsuarioReagente
              label="Usuário retirante"
              value={usuarioRetirou}
              usuario={usuarioSelecionado}
              onAbrir={() => setBuscaUsuarioAberta(true)}
              testIdPrefix="retirada"
            />
            <SeletorLocalReagente value={localUsado} local={localSelecionado} onAbrir={() => setBuscaLocalAberta(true)} />
            <div>
              <label className="block text-sm font-medium mb-1">Peso de saída (g)</label>
              <input type="number" min="0.01" step="0.01" required value={pesoSaida} onChange={(e) => setPesoSaida(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Devolução prevista</label>
              <input type="date" required value={dataDevolucao} onChange={(e) => setDataDevolucao(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Finalidade</label>
            <select value={finalidade} onChange={(e) => setFinalidade(e.target.value as typeof finalidade)} className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10">
              <option value="PESQUISA">Pesquisa</option>
              <option value="DIDATICO_DEMONSTRACAO">Didático/demonstração</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <label className="flex gap-2 items-center text-sm">
            <input type="checkbox" checked={abrirNoEmprestimo} onChange={(e) => setAbrirNoEmprestimo(e.target.checked)} />
            Abrir o frasco no empréstimo
          </label>
          <label className="flex gap-2 items-center text-sm">
            <input type="checkbox" checked={confirmarUsoVencido} onChange={(e) => setConfirmarUsoVencido(e.target.checked)} />
            Confirmar uso vencido
          </label>
          <div>
            <label className="block text-sm font-medium mb-1">Justificativa de autoatendimento (se aplicável)</label>
            <textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10" />
          </div>
          {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50">
              {loading ? "Processando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
      <ModalBuscaUsuarioReagente
        isOpen={buscaUsuarioAberta}
        onClose={() => setBuscaUsuarioAberta(false)}
        label="Selecionar usuário retirante"
        value={usuarioRetirou}
        onChange={(usuario) => {
          setUsuarioSelecionado(usuario);
          setUsuarioRetirou(usuario?.id ?? "");
        }}
        testIdPrefix="retirada"
      />
      <ModalBuscaLocalReagente
        isOpen={buscaLocalAberta}
        onClose={() => setBuscaLocalAberta(false)}
        value={localUsado}
        onChange={(local) => {
          setLocalSelecionado(local);
          setLocalUsado(local?.id ?? "");
        }}
      />
    </div>
  );
}

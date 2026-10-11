"use client";

import React, { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { ModalProps } from "./types";
import { ModalBuscaUsuarioReagente, SeletorUsuarioReagente } from "./SeletorUsuarioReagente";
import type { UsuarioRetirada } from "@/services/usuarios/usuariosService";

export function ModalDevolucaoFrasco({
  isOpen,
  onClose,
  frascoId,
  idEmprestimo,
  onSuccess,
}: ModalProps & { frascoId: string; idEmprestimo?: string }) {
  const [pesoRetorno1, setPesoRetorno1] = useState("");
  const [pesoRetorno2, setPesoRetorno2] = useState("");
  const [evaporacao, setEvaporacao] = useState("");
  const [ficouVazio, setFicouVazio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [usuarioDevolveu, setUsuarioDevolveu] = useState("");
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioRetirada | null>(null);
  const [buscaUsuarioAberta, setBuscaUsuarioAberta] = useState(false);
  const [frascoOuEmprestimo, setFrascoOuEmprestimo] = useState(idEmprestimo || frascoId);

  useEffect(() => {
    if (isOpen) void Promise.resolve().then(() => setFrascoOuEmprestimo(idEmprestimo || frascoId));
  }, [isOpen, idEmprestimo, frascoId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(pesoRetorno1) !== Number(pesoRetorno2)) {
      setErrorMsg("As duas pesagens precisam ser iguais. Confira os valores digitados.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const registrarDevolucao = httpsCallable(functions, "registrarDevolucao");
      const payload = {
        idOperacao: crypto.randomUUID(),
        idEmprestimo: frascoOuEmprestimo.trim(),
        pesoRetorno: Number(pesoRetorno1),
        confirmarEsgotamento: ficouVazio,
        idUsuarioDevolveu: usuarioDevolveu || undefined,
        ...(evaporacao.trim() ? { pesoPerdaEvaporacao: Number(evaporacao) } : {}),
      };
      await registrarDevolucao({
        ...payload,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro na validação da devolução.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-xl border-amber-500/20">
        <h2 className="text-xl font-bold mb-4 text-amber-500">Registrar Devolução</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="devolucao-frasco-id" className="block text-sm font-medium mb-1">Código do frasco ou empréstimo *</label>
            <input id="devolucao-frasco-id" type="text" required value={frascoOuEmprestimo} onChange={(e) => setFrascoOuEmprestimo(e.target.value)} placeholder="Ex.: LCQUI-12345" className="w-full rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none" />
            <p className="mt-1 text-xs text-foreground/50">Informe o identificador exibido no empréstimo ativo do frasco.</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
            Digite o peso de retorno duas vezes para confirmar o valor.
          </div>
          <div>
            <SeletorUsuarioReagente
              label="Usuário que devolveu"
              value={usuarioDevolveu}
              usuario={usuarioSelecionado}
              onAbrir={() => setBuscaUsuarioAberta(true)}
              testIdPrefix="devolucao"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">1ª Leitura da Balança (g) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={pesoRetorno1}
              onChange={(e) => setPesoRetorno1(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">2ª Leitura da Balança (g) — Confirmação *</label>
            <input
              type="number"
              step="0.01"
              required
              value={pesoRetorno2}
              onChange={(e) => setPesoRetorno2(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Perda por Evaporação Declarada (g, opcional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={evaporacao}
              onChange={(e) => setEvaporacao(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div className="p-3 rounded-lg bg-foreground/5 border border-foreground/10">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={ficouVazio} onChange={(e) => setFicouVazio(e.target.checked)} className="rounded" />
              O frasco ficou vazio nesta devolução? (Esgotamento)
            </label>
            <p className="text-xs text-foreground/50 mt-1">
              Ao confirmar o frasco esgotado, o sistema registra o retorno como a tara real e zera o saldo.
            </p>
          </div>
          {errorMsg && <div className="text-amber-500 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">{errorMsg}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-foreground/5 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50">
              {loading ? "Validando..." : "Confirmar Devolução"}
            </button>
          </div>
        </form>
      </div>
      <ModalBuscaUsuarioReagente
        isOpen={buscaUsuarioAberta}
        onClose={() => setBuscaUsuarioAberta(false)}
        label="Selecionar usuário que devolveu"
        value={usuarioDevolveu}
        onChange={(usuario) => {
          setUsuarioSelecionado(usuario);
          setUsuarioDevolveu(usuario?.id ?? "");
        }}
        testIdPrefix="devolucao"
      />
    </div>
  );
}

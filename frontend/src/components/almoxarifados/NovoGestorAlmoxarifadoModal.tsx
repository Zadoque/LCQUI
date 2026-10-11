"use client";

import React, { useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  buscarUsuarios,
  concederPapel,
} from "@/services/usuarios/usuariosService";
import type { Pessoa } from "@/types/usuarios";

interface NovoGestorAlmoxarifadoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NovoGestorAlmoxarifadoModal({
  isOpen,
  onClose,
}: NovoGestorAlmoxarifadoModalProps) {
  const [modo, setModo] = useState<"existente" | "novo">("existente");
  const [termo, setTermo] = useState("");
  const [usuarios, setUsuarios] = useState<Pessoa[]>([]);
  const [uidAlvo, setUidAlvo] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || modo !== "existente") return;
    let cancelado = false;
    // A busca é disparada pelo termo/aba; o estado de carregamento representa
    // diretamente o ciclo desta operação externa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregandoBusca(true);
    buscarUsuarios(termo.trim() ? { termo: termo.trim() } : undefined)
      .then((resultado) => { if (!cancelado) setUsuarios(resultado); })
      .catch(() => { if (!cancelado) setErro("Não foi possível buscar usuários existentes."); })
      .finally(() => { if (!cancelado) setCarregandoBusca(false); });
    return () => { cancelado = true; };
  }, [isOpen, modo, termo]);

  if (!isOpen) return null;

  const limpar = () => {
    setModo("existente"); setTermo(""); setUsuarios([]); setUidAlvo("");
    setNome(""); setEmail(""); setMensagem(null); setErro(null);
  };

  const fechar = () => { limpar(); onClose(); };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setSalvando(true); setErro(null); setMensagem(null);
    try {
      const resultado = await concederPapel({
        idOperacao: crypto.randomUUID(),
        papel: "Gestor_Almoxarifado",
        ...(modo === "existente" ? { uidAlvo } : { nome: nome.trim(), email: email.trim() }),
      });

      if (modo === "novo" && resultado.contaAuthCriada) {
        await sendPasswordResetEmail(auth, email.trim());
      }
      setMensagem(modo === "novo"
        ? "Gestor criado. O e-mail oficial do Firebase Authentication foi enviado para definir a senha."
        : "Gestor de almoxarifado adicionado com sucesso.");
      // Mantém o modal aberto para que a confirmação normativa permaneça visível;
      // o fechamento é uma ação explícita do usuário.
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Não foi possível adicionar o gestor.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" data-testid="modal-novo-gestor-almoxarifado">
      <form onSubmit={salvar} className="w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 rounded-2xl bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Novo Gestor de Almoxarifado</h2>
            <p className="text-sm text-foreground/60">Selecione uma identidade existente ou convide uma nova.</p>
          </div>
          <button type="button" onClick={fechar}>Fechar</button>
        </div>
        <div className="flex gap-2 border-b border-foreground/10 pb-2">
          <button type="button" data-testid="gestor-existente-tab" className={`rounded px-3 py-2 text-sm ${modo === "existente" ? "bg-primary text-primary-foreground" : "bg-foreground/5"}`} onClick={() => { setModo("existente"); setErro(null); }}>Usuário existente</button>
          <button type="button" data-testid="gestor-novo-tab" className={`rounded px-3 py-2 text-sm ${modo === "novo" ? "bg-primary text-primary-foreground" : "bg-foreground/5"}`} onClick={() => { setModo("novo"); setErro(null); }}>Convidar novo usuário</button>
        </div>
        {erro && <p role="alert" data-testid="erro-novo-gestor-almoxarifado" className="text-sm text-red-500">{erro}</p>}
        {mensagem && <p role="status" data-testid="status-novo-gestor-almoxarifado" className="text-sm text-green-600">{mensagem}</p>}
        {modo === "existente" ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium">Buscar identidade existente
              <input data-testid="buscar-gestor-almoxarifado" aria-label="Buscar identidade existente" className="mt-1 w-full rounded border p-2" value={termo} onChange={(event) => setTermo(event.target.value)} placeholder="Nome ou termo de busca" />
            </label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded border p-2">
              {carregandoBusca && <p className="text-sm text-foreground/60">Buscando...</p>}
              {!carregandoBusca && usuarios.length === 0 && <p className="text-sm text-foreground/60">Nenhuma identidade encontrada.</p>}
              {usuarios.map((usuario) => (
                <label key={usuario.id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-foreground/5">
                  <input type="radio" name="gestor-existente" data-testid={`gestor-opcao-${usuario.id}`} checked={uidAlvo === usuario.id} onChange={() => setUidAlvo(usuario.id)} />
                  <span>{usuario.nome}</span>
                  <span className="ml-auto text-xs text-foreground/50">{usuario.papeis.join(", ")}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Nome<input required data-testid="input-nome-novo-gestor-almoxarifado" className="mt-1 w-full rounded border p-2" value={nome} onChange={(event) => setNome(event.target.value)} /></label>
            <label className="text-sm font-medium">E-mail<input required type="email" data-testid="input-email-novo-gestor-almoxarifado" className="mt-1 w-full rounded border p-2" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          </div>
        )}
        <button type="submit" data-testid="btn-salvar-novo-gestor-almoxarifado" disabled={salvando || (modo === "existente" && !uidAlvo)} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
          {salvando ? "Salvando..." : modo === "novo" ? "Convidar gestor" : "Adicionar gestor"}
        </button>
      </form>
    </div>
  );
}

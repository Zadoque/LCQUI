"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  buscarUsuarios,
  concederPapel,
  obterDetalhesUsuario,
} from "@/services/usuarios/usuariosService";
import type { DetalhesUsuario, Pessoa } from "@/types/usuarios";

const PAPEL = "Gestor_Bens_Patrimoniais" as const;

// UI-02/UI-13: a coleção de papel não pode ser listada pelo cliente nas Rules.
// Por isso estes modais usam a projeção callable filtrada, com cache/debounce
// no serviço, em vez de abrir um onSnapshot que vazaria a lista de identidades.

interface NovoGestorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GerenciarGestoresProps {
  isOpen: boolean;
  onClose: () => void;
}

function Mensagem({ children, erro = false }: { children: string; erro?: boolean }) {
  return <p role={erro ? "alert" : "status"} className={erro ? "text-sm text-red-600" : "text-sm text-green-700"}>{children}</p>;
}

export function NovoGestorPatrimonioModal({ isOpen, onClose }: NovoGestorProps) {
  const [modo, setModo] = useState<"existente" | "novo">("existente");
  const [termo, setTermo] = useState("");
  const [usuarios, setUsuarios] = useState<Pessoa[]>([]);
  const [uidAlvo, setUidAlvo] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!isOpen || modo !== "existente") return;
    let cancelado = false;
    void Promise.resolve().then(() => { if (!cancelado) setCarregando(true); });
    const timeout = window.setTimeout(() => {
      buscarUsuarios({ papel: PAPEL, ...(termo.trim() ? { termo: termo.trim() } : {}) })
        .then((resultado) => { if (!cancelado) setUsuarios(resultado); })
        .catch(() => { if (!cancelado) setErro("Não foi possível carregar os usuários elegíveis."); })
        .finally(() => { if (!cancelado) setCarregando(false); });
    }, 300);
    return () => { cancelado = true; window.clearTimeout(timeout); };
  }, [isOpen, modo, termo]);

  if (!isOpen) return null;

  const fechar = () => {
    setModo("existente"); setTermo(""); setUsuarios([]); setUidAlvo("");
    setNome(""); setEmail(""); setErro(""); setMensagem(""); onClose();
  };

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSalvando(true); setErro(""); setMensagem("");
    try {
      const resultado = await concederPapel({
        idOperacao: crypto.randomUUID(), papel: PAPEL,
        ...(modo === "existente" ? { uidAlvo } : { nome: nome.trim(), email: email.trim() }),
      });
      setMensagem(modo === "novo" && resultado.emailEnviado
        ? "Gestor criado. As instruções de acesso foram enviadas por e-mail."
        : "Gestor de bens patrimoniais adicionado com sucesso.");
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Não foi possível adicionar o gestor.");
    } finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" data-testid="modal-novo-gestor-patrimonio">
      <form onSubmit={salvar} className="w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 rounded-2xl bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Novo Gestor de Bens Patrimoniais</h2><p className="text-sm text-foreground/60">Selecione uma identidade existente ou convide uma nova.</p></div><button type="button" onClick={fechar} aria-label="Fechar novo gestor patrimonial">Fechar</button></div>
        <div className="flex gap-2 border-b border-foreground/10 pb-2"><button type="button" data-testid="gestor-patrimonio-existente-tab" className={`rounded px-3 py-2 text-sm ${modo === "existente" ? "bg-primary text-primary-foreground" : "bg-foreground/5"}`} onClick={() => setModo("existente")}>Usuário existente</button><button type="button" data-testid="gestor-patrimonio-novo-tab" className={`rounded px-3 py-2 text-sm ${modo === "novo" ? "bg-primary text-primary-foreground" : "bg-foreground/5"}`} onClick={() => setModo("novo")}>Convidar novo usuário</button></div>
        {erro && <Mensagem erro>{erro}</Mensagem>}{mensagem && <Mensagem>{mensagem}</Mensagem>}
        {modo === "existente" ? <div className="space-y-3"><label className="block text-sm font-medium">Buscar identidade existente<input data-testid="buscar-gestor-patrimonio" aria-label="Buscar gestor patrimonial" className="mt-1 w-full rounded border p-2" value={termo} onChange={(event) => setTermo(event.target.value)} placeholder="Nome ou termo de busca" /></label><div className="max-h-48 space-y-2 overflow-y-auto rounded border p-2">{carregando && <p role="status">Buscando usuários...</p>}{!carregando && usuarios.length === 0 && <p className="text-sm text-foreground/60">Nenhum usuário elegível encontrado.</p>}{usuarios.map((usuario) => <label key={usuario.id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-foreground/5"><input type="radio" name="gestor-patrimonio-existente" data-testid={`gestor-patrimonio-opcao-${usuario.id}`} checked={uidAlvo === usuario.id} onChange={() => setUidAlvo(usuario.id)} /><span>{usuario.nome}</span><span className="ml-auto text-xs text-foreground/50">{usuario.papeis.join(", ")}</span></label>)}</div></div> : <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Nome<input required className="mt-1 w-full rounded border p-2" value={nome} onChange={(event) => setNome(event.target.value)} /></label><label className="text-sm font-medium">E-mail<input required type="email" className="mt-1 w-full rounded border p-2" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div>}
        <button type="submit" data-testid="btn-salvar-novo-gestor-patrimonio" disabled={salvando || (modo === "existente" && !uidAlvo) || (modo === "novo" && (!nome.trim() || !email.trim()))} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{salvando ? "Salvando..." : modo === "novo" ? "Convidar gestor" : "Adicionar gestor"}</button>
      </form>
    </div>
  );
}

function converterInstante(valor: DetalhesUsuario["atividade"][number]["instante"]): Date | null {
  if (typeof valor === "string" || typeof valor === "number") { const data = new Date(valor); return Number.isNaN(data.getTime()) ? null : data; }
  if (valor && typeof valor === "object" && "_seconds" in valor && typeof valor._seconds === "number") return new Date(valor._seconds * 1000);
  if (valor && typeof valor === "object" && "seconds" in valor && typeof valor.seconds === "number") return new Date(valor.seconds * 1000);
  return null;
}

function intervaloPeriodo(periodo: "30dias" | "mes", mes: string, ano: string): { inicio: Date; fim: Date } | null {
  if (periodo === "mes") {
    if (!mes || !ano) return null;
    const inicio = new Date(Number(ano), Number(mes) - 1, 1);
    const fim = new Date(Number(ano), Number(mes), 0, 23, 59, 59, 999);
    return Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) ? null : { inicio, fim };
  }
  const inicio = new Date(); inicio.setDate(inicio.getDate() - 30);
  return { inicio, fim: new Date() };
}

export function GerenciarGestoresPatrimonioModal({ isOpen, onClose }: GerenciarGestoresProps) {
  const [termo, setTermo] = useState("");
  const [usuarios, setUsuarios] = useState<Pessoa[]>([]);
  const [selecionado, setSelecionado] = useState<Pessoa | null>(null);
  const [detalhes, setDetalhes] = useState<DetalhesUsuario | null>(null);
  const [periodo, setPeriodo] = useState<"30dias" | "mes">("30dias");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelado = false;
    void Promise.resolve().then(() => { if (!cancelado) setCarregando(true); });
    const timeout = window.setTimeout(() => {
      buscarUsuarios({ papel: PAPEL, ...(termo.trim() ? { termo: termo.trim() } : {}) })
        .then((resultado) => { if (!cancelado) setUsuarios(resultado); })
        .catch(() => { if (!cancelado) setErro("Não foi possível carregar os gestores patrimoniais."); })
        .finally(() => { if (!cancelado) setCarregando(false); });
    }, 300);
    return () => { cancelado = true; window.clearTimeout(timeout); };
  }, [isOpen, termo]);

  useEffect(() => {
    if (!isOpen || !selecionado) return;
    let cancelado = false;
    void Promise.resolve().then(() => { if (!cancelado) setCarregandoDetalhes(true); });
    void Promise.resolve().then(() => { if (!cancelado) setErro(""); });
    obterDetalhesUsuario({ uid: selecionado.id })
      .then((resultado) => { if (!cancelado) setDetalhes(resultado); })
      .catch(() => { if (!cancelado) setErro("Não foi possível carregar o histórico autorizado."); })
      .finally(() => { if (!cancelado) setCarregandoDetalhes(false); });
    return () => { cancelado = true; };
  }, [isOpen, selecionado]);

  const atividades = useMemo(() => {
    if (!detalhes) return [];
    const intervalo = intervaloPeriodo(periodo, mes, ano);
    if (!intervalo) return [];
    return detalhes.atividade.filter((evento) => {
      const instante = converterInstante(evento.instante);
      return !instante || (instante >= intervalo.inicio && instante <= intervalo.fim);
    });
  }, [detalhes, mes, ano, periodo]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" data-testid="modal-gerenciar-gestores-patrimonio">
      <section className="w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 rounded-2xl bg-background p-6 shadow-xl"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Gerenciar Gestores de Bens Patrimoniais</h2><p className="text-sm text-foreground/60">Consulte a atividade autorizada dos gestores.</p></div><button type="button" onClick={onClose} aria-label="Fechar gestores patrimoniais">Fechar</button></div>
        {erro && <Mensagem erro>{erro}</Mensagem>}
        <label className="block text-sm font-medium">Pesquisar por nome<input data-testid="buscar-gestores-patrimonio" aria-label="Pesquisar gestores patrimoniais" className="mt-1 w-full rounded border p-2" value={termo} onChange={(event) => setTermo(event.target.value)} placeholder="Nome do gestor" /></label>
        <div className="max-h-44 space-y-2 overflow-y-auto rounded border p-2">{carregando && <p role="status">Buscando gestores...</p>}{!carregando && usuarios.length === 0 && <p className="text-sm text-foreground/60">Nenhum gestor patrimonial encontrado.</p>}{usuarios.map((usuario) => <button type="button" key={usuario.id} data-testid={`selecionar-gestor-patrimonio-${usuario.id}`} onClick={() => setSelecionado(usuario)} className={`w-full rounded p-2 text-left hover:bg-foreground/5 ${selecionado?.id === usuario.id ? "bg-primary/10" : ""}`}><span className="font-semibold">{usuario.nome}</span><span className="ml-2 text-xs text-foreground/50">{usuario.papeis.join(", ")}</span></button>)}</div>
        {selecionado && <div className="space-y-4 rounded-lg border border-foreground/10 p-4"><h3 className="font-bold">Histórico de {selecionado.nome}</h3><div className="flex flex-wrap items-end gap-3"><label className="text-sm">Período<select aria-label="Período do histórico" className="mt-1 block rounded border p-2" value={periodo} onChange={(event) => setPeriodo(event.target.value as "30dias" | "mes")}><option value="30dias">Últimos 30 dias</option><option value="mes">Mês específico</option></select></label>{periodo === "mes" && <><label className="text-sm">Mês<input aria-label="Mês do histórico" type="number" min="1" max="12" className="mt-1 block w-24 rounded border p-2" value={mes} onChange={(event) => setMes(event.target.value)} /></label><label className="text-sm">Ano<input aria-label="Ano do histórico" type="number" min="2000" max="2100" className="mt-1 block w-28 rounded border p-2" value={ano} onChange={(event) => setAno(event.target.value)} /></label></>}</div>{periodo === "mes" && (!mes || !ano) && <p className="text-sm text-foreground/60">Informe o mês e o ano para consultar o período.</p>}{carregandoDetalhes && <p role="status">Carregando histórico...</p>}{!carregandoDetalhes && periodo === "30dias" && atividades.length === 0 && <p className="text-sm text-foreground/60">Nenhuma atividade encontrada nesse período.</p>}{!carregandoDetalhes && periodo === "mes" && mes && ano && atividades.length === 0 && <p className="text-sm text-foreground/60">Nenhuma atividade encontrada nesse período.</p>}{!carregandoDetalhes && atividades.length > 0 && <ul className="space-y-2">{atividades.map((evento) => <li key={evento.id} className="rounded border border-foreground/10 p-2 text-sm"><span>{evento.acao ?? "Alteração registrada"}</span>{converterInstante(evento.instante) && <span className="ml-2 text-foreground/60">{converterInstante(evento.instante)?.toLocaleString("pt-BR")}</span>}</li>)}</ul>}</div>}
      </section>
    </div>
  );
}

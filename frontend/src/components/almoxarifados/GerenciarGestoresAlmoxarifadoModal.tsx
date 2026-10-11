"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { assinaturaIntencaoAlmoxarifado, chaveIntencaoAlmoxarifado, limparIntencao, obterIntencaoPersistida } from "@/lib/intencaoOperacao";
import type { AlmoxarifadoItem, GestorAlmoxarifado as Gestor } from "@/types/cadastros";

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; item?: AlmoxarifadoItem; }

export function GerenciarGestoresAlmoxarifadoModal({ isOpen, onClose, item, onSuccess }: Props) {
  const { user } = useAuth();
  const [almoxarifados, setAlmoxarifados] = useState<AlmoxarifadoItem[]>([]);
  const [selecionado, setSelecionado] = useState<AlmoxarifadoItem | undefined>(item);
  const [opcoes, setOpcoes] = useState<Gestor[]>([]);
  const [gestores, setGestores] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelado = false;
    (async () => {
      await user.getIdToken();
      const [gestoresResult, almoxResult] = await Promise.all([
        httpsCallable<unknown, { gestores: Gestor[] }>(functions, "buscarGestoresAlmoxarifado")({}),
        item ? Promise.resolve(null) : getDocs(collection(db, "Almoxarifado")),
      ]);
      if (cancelado) return;
      setOpcoes(gestoresResult.data.gestores);
      if (almoxResult) setAlmoxarifados(almoxResult.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AlmoxarifadoItem)));
      setCarregando(false);
    })().catch((error: unknown) => {
      if (!cancelado) {
        setCarregando(false);
        setErro(error instanceof Error ? error.message : "Falha ao carregar gestores.");
      }
    });
    return () => { cancelado = true; };
  }, [isOpen, item, user]);

  useEffect(() => {
    if (!isOpen || !selecionado) return;
    let cancelado = false;
    getDocs(query(collection(db, "Gestor_Almoxarifado_x_Almoxarifado"), where("id_almoxarifado", "==", selecionado.id)))
      .then((snapshot) => { if (!cancelado) setGestores(snapshot.docs.map((doc) => doc.data().id_gestor_almoxarifado as string)); })
      .catch((error: unknown) => { if (!cancelado) setErro(error instanceof Error ? error.message : "Falha ao carregar vínculos."); });
    return () => { cancelado = true; };
  }, [isOpen, selecionado]);

  if (!isOpen) return null;

  async function salvar() {
    if (!selecionado) return;
    setErro("");
    setSalvando(true);
    const campos = { acao: "EDITAR" as const, idAlmoxarifado: selecionado.id, idLocal: selecionado.id_local, nome: selecionado.nome, descricao: selecionado.descricao, gestores };
    const chave = chaveIntencaoAlmoxarifado("EDITAR", selecionado.id);
    const intencao = obterIntencaoPersistida(sessionStorage, chave, assinaturaIntencaoAlmoxarifado(campos), () => crypto.randomUUID());
    try {
      await httpsCallable(functions, "gerenciarAlmoxarifado")({ ...campos, idOperacao: intencao.idOperacao });
      limparIntencao(sessionStorage, chave);
      onSuccess();
      onClose();
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar os gestores.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" data-testid="modal-gerenciar-gestores-almoxarifado">
      <section className="bg-background rounded-2xl p-6 w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">Gerenciar gestores de almoxarifado</h2><button type="button" onClick={onClose}>Fechar</button></div>
        {erro && <p role="alert" data-testid="erro-gerenciar-gestores-almoxarifado" className="text-red-500">{erro}</p>}
        {!selecionado && <div data-testid="seletor-almoxarifado-gestores" className="space-y-2"><p className="font-semibold">Selecione o almoxarifado</p>{carregando && <p>Carregando almoxarifados...</p>}{!carregando && almoxarifados.length === 0 && <p>Nenhum almoxarifado cadastrado.</p>}{almoxarifados.map((almox) => <button type="button" key={almox.id} data-testid={`selecionar-almoxarifado-gestores-${almox.id}`} onClick={() => setSelecionado(almox)} className="w-full rounded-lg border border-foreground/10 p-3 text-left hover:bg-foreground/5"><span className="font-semibold">{almox.nome}</span><span className="block text-sm text-foreground/60">{almox.ativo ? "Ativo" : "Inativo"} · {almox.qtd_gestores_ativos} gestor(es)</span></button>)}</div>}
        {selecionado && <><div className="rounded-lg bg-foreground/5 p-3"><p className="font-semibold">{selecionado.nome}</p><p className="text-sm text-foreground/60">{selecionado.ativo ? "Ativo" : "Inativo"}</p></div><fieldset data-testid="seletor-gestores-almoxarifado" className="space-y-2"><legend className="font-semibold">Responsáveis vinculados</legend>{opcoes.length === 0 && <p className="text-sm text-foreground/60">Nenhum Gestor de Almoxarifado ativo disponível.</p>}{opcoes.map((gestor) => <label key={gestor.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-foreground/5"><input type="checkbox" checked={gestores.includes(gestor.id)} onChange={(event) => setGestores((atuais) => event.target.checked ? [...atuais, gestor.id] : atuais.filter((id) => id !== gestor.id))} /><span>{gestor.nome}</span></label>)}</fieldset><div className="flex justify-end gap-2">{!item && <button type="button" onClick={() => setSelecionado(undefined)}>Trocar almoxarifado</button>}<button type="button" data-testid="btn-salvar-gestores-almoxarifado" disabled={salvando || carregando} onClick={salvar} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">{salvando ? "Salvando..." : "Salvar gestores"}</button></div></>}
      </section>
    </div>
  );
}

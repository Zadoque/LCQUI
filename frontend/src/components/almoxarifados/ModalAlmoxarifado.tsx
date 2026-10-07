"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/config";
import { ListaLocais } from "@/components/patrimonio/ListaLocais";
import { NovaLocalModal } from "@/components/patrimonio/NovaLocalModal";
import { useAuth } from "@/contexts/AuthContext";
import { obterIntencaoPersistida, limparIntencao, chaveIntencaoAlmoxarifado, assinaturaIntencaoAlmoxarifado } from "@/lib/intencaoOperacao";
import type { AlmoxarifadoItem } from "./ListaAlmoxarifados";

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; item?: AlmoxarifadoItem; }
interface Gestor { id: string; nome: string; }
export function ModalAlmoxarifado({ isOpen, onClose, onSuccess, item }: Props) {
  const { user } = useAuth();
  const [nome, setNome] = useState(item?.nome ?? ""); const [descricao, setDescricao] = useState(item?.descricao ?? ""); const [idLocal, setIdLocal] = useState(item?.id_local ?? ""); const [gestores, setGestores] = useState<string[]>([]); const [opcoes, setOpcoes] = useState<Gestor[]>([]); const [ativo, setAtivo] = useState(item?.ativo ?? false); const [erro, setErro] = useState(""); const [novoLocal, setNovoLocal] = useState(false); const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelado = false;
    (async () => {
      await user.getIdToken();
      const [resultado, vinculos] = await Promise.all([
        httpsCallable<unknown, { gestores: Gestor[] }>(functions, "buscarGestoresAlmoxarifado")({}),
        item ? getDocs(query(collection(db, "Gestor_Almoxarifado_x_Almoxarifado"), where("id_almoxarifado", "==", item.id))) : Promise.resolve(null),
      ]);
      if (cancelado) return;
      setOpcoes(resultado.data.gestores);
      if (vinculos) setGestores(vinculos.docs.map(doc => doc.data().id_gestor_almoxarifado as string));
    })().catch(e => { if (!cancelado) setErro(e.message ?? "Falha ao carregar gestores."); });
    return () => { cancelado = true; };
  }, [isOpen, item, user]);
  if (!isOpen) return null;
  const editar = !!item;
  async function salvar(e: React.FormEvent) { e.preventDefault(); setErro(""); if (!idLocal || !nome.trim() || !descricao.trim() || (!editar && ativo && gestores.length === 0)) { setErro(!editar && ativo && gestores.length === 0 ? "Ativação exige ao menos um gestor." : "Preencha nome, descrição e local."); return; } setLoading(true); const campos = editar ? { acao: "EDITAR" as const, idAlmoxarifado: item!.id, idLocal, nome, descricao, gestores } : { acao: "CRIAR" as const, idLocal, nome, descricao, gestores, ativo }; const chave = chaveIntencaoAlmoxarifado(campos.acao, item?.id); const intencao = obterIntencaoPersistida(sessionStorage, chave, assinaturaIntencaoAlmoxarifado(campos), () => crypto.randomUUID()); try { await httpsCallable(functions, "gerenciarAlmoxarifado")({ ...campos, idOperacao: intencao.idOperacao }); limparIntencao(sessionStorage, chave); onSuccess(); onClose(); } catch (e) { setErro((e as { message?: string }).message ?? "Falha ao salvar."); } finally { setLoading(false); } }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" data-testid="modal-almoxarifado"><form onSubmit={salvar} className="bg-background rounded-2xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto"><div className="flex justify-between"><h2 className="text-xl font-bold">{editar ? "Editar Almoxarifado" : "Novo Almoxarifado"}</h2><button type="button" onClick={onClose}>Fechar</button></div>{erro && <p role="alert" data-testid="erro-campo-almoxarifado" className="text-red-500">{erro}</p>}<label>Nome<input data-testid="input-nome-almoxarifado" className="w-full border rounded p-2" maxLength={100} value={nome} onChange={e => setNome(e.target.value)} /></label><label>Descrição<textarea data-testid="input-descricao-almoxarifado" className="w-full border rounded p-2" maxLength={500} value={descricao} onChange={e => setDescricao(e.target.value)} /></label><div><p className="font-semibold">Local</p><ListaLocais modo="selecao" selectedId={idLocal} onSelecionar={id => setIdLocal(id)} onNovoLocal={() => setNovoLocal(true)} testIdPrefix="almox-" /></div><fieldset data-testid="seletor-gestores-almoxarifado"><legend className="font-semibold">Gestores ativos</legend>{opcoes.map((g, indice) => <label key={`gestor-${indice}-${g.id}`} className="block"><input type="checkbox" checked={gestores.includes(g.id)} onChange={e => setGestores(v => e.target.checked ? [...v, g.id] : v.filter(id => id !== g.id))} /> {g.nome}</label>)}</fieldset>{!editar && <label className="block"><input data-testid="toggle-ativo-almoxarifado" type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} /> Ativo</label>}<button data-testid="btn-salvar-almoxarifado" disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" type="submit">{loading ? "Salvando..." : "Salvar"}</button></form><NovaLocalModal isOpen={novoLocal} onClose={() => setNovoLocal(false)} onSucesso={id => { setIdLocal(id); setNovoLocal(false); }} /></div>;
}

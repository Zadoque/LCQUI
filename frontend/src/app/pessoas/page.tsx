"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { functions } from "@/lib/firebase/config";

const PAPEIS = ["Aluno", "Bolsista", "Professor", "Gestor_Almoxarifado", "Gestor_Bens_Patrimoniais"] as const;
type Papel = typeof PAPEIS[number];
type Pessoa = { id: string; nome: string; papeis: string[] };
type Detalhes = { dados: { id: string; nome: string; email: string | null; ativo: boolean; versao_permissoes: number }; papeis: string[]; turmas: Array<{ id: string; [key: string]: unknown }>; atividade: Array<{ id: string; acao?: string }> };

export default function PessoasPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [busca, setBusca] = useState("");
  const [alvo, setAlvo] = useState("");
  const [papel, setPapel] = useState<Papel>("Aluno");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [detalhes, setDetalhes] = useState<Detalhes | null>(null);
  const [aba, setAba] = useState<"dados" | "papeis" | "vinculos" | "turmas" | "atividade">("dados");
  const [confirmacao, setConfirmacao] = useState(false);

  const carregar = useCallback(async () => {
    const buscar = httpsCallable(functions, "buscarUsuariosParaPapel");
    const resposta = await buscar(busca ? { termo: busca } : {});
    setPessoas((resposta.data as { usuarios: Pessoa[] }).usuarios);
  }, [busca]);

  useEffect(() => { void carregar().catch(() => setErro("Não foi possível carregar as pessoas.")); }, [carregar]);

  const executar = async (acao: "conceder" | "revogar") => {
    setCarregando(true); setErro(""); setMensagem("");
    try {
      if (acao === "conceder") {
        const conceder = httpsCallable(functions, "convidarUsuario");
        await conceder({
          idOperacao: crypto.randomUUID(), papel,
          ...(alvo ? { uidAlvo: alvo } : { nome, email }),
        });
        setMensagem("Papel concedido; a sessão será sincronizada após o commit.");
      } else {
        const revogar = httpsCallable(functions, "revogarUsuarioPapel");
        await revogar({ idOperacao: crypto.randomUUID(), uidAlvo: alvo, papel, motivo });
        setMensagem("Papel revogado e a alteração foi auditada.");
      }
      setAlvo(""); setNome(""); setEmail(""); setMotivo(""); await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Operação rejeitada pelo servidor.");
    } finally { setCarregando(false); }
  };

  const selecionada = pessoas.find((pessoa) => pessoa.id === alvo);
  const papeisProjetados = selecionada
    ? (papel === "Bolsista" && !selecionada.papeis.includes("Aluno") && !selecionada.papeis.includes(papel)
      ? [...selecionada.papeis, papel, "Aluno"]
      : [...selecionada.papeis.filter((item) => item !== papel), papel])
    : [];
  const bloqueioProjetado = papeisProjetados.includes("Chefe_Geral") && papeisProjetados.length > 1
    ? "Chefe Geral não pode possuir outro papel."
    : papeisProjetados.includes("Aluno") && papeisProjetados.includes("Professor")
      ? "Aluno e Professor não podem coexistir."
      : papeisProjetados.includes("Bolsista") && papeisProjetados.includes("Gestor_Almoxarifado")
        ? "Bolsista não pode ser Gestor de Almoxarifado."
        : "";
  const abrirDetalhes = async (uid: string) => {
    setAlvo(uid); setAba("dados"); setErro("");
    try {
      const obter = httpsCallable(functions, "obterDetalhesUsuarioParaPapel");
      setDetalhes((await obter({ uid })).data as Detalhes);
    } catch { setErro("Não foi possível carregar os detalhes autorizados."); }
  };
  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <header><h1 className="text-3xl font-bold">Pessoas e papéis</h1><p className="text-foreground/60 mt-1">UI-02 — concessão, revogação e diretório mínimo.</p></header>
          {mensagem && <p role="status" className="p-3 rounded-lg bg-green-500/10 text-green-700">{mensagem}</p>}
          {erro && <p role="alert" className="p-3 rounded-lg bg-red-500/10 text-red-700">{erro}</p>}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <label className="block font-semibold" htmlFor="busca-pessoas">Buscar pessoa</label>
            <input id="busca-pessoas" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome" className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/20" />
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Nome</th><th>Papéis</th><th>Ação</th></tr></thead><tbody>
              {pessoas.map((pessoa) => <tr key={pessoa.id} className="border-t border-foreground/10"><td className="py-3">{pessoa.nome}</td><td>{pessoa.papeis.join(", ") || "sem papel"}</td><td className="space-x-3"><button type="button" onClick={() => setAlvo(pessoa.id)} className="text-primary underline">Selecionar</button><button type="button" onClick={() => void abrirDetalhes(pessoa.id)} className="text-primary underline">Detalhes</button></td></tr>)}
            </tbody></table></div>
          </section>
          {detalhes && <section className="glass-panel rounded-2xl p-6 space-y-4" aria-label="Detalhes da pessoa">
            <h2 className="text-xl font-bold">Detalhes de {detalhes.dados.nome}</h2>
            <div className="flex gap-2 flex-wrap">{(["dados", "papeis", "vinculos", "turmas", "atividade"] as const).map((item) => <button key={item} type="button" onClick={() => setAba(item)} aria-pressed={aba === item} className="px-3 py-2 rounded-lg border border-foreground/20">{{ dados: "Dados", papeis: "Papéis", vinculos: "Vínculos", turmas: "Turmas", atividade: "Atividade" }[item]}</button>)}</div>
            {aba === "dados" && <dl className="grid md:grid-cols-2 gap-3"><div><dt className="font-semibold">Nome</dt><dd>{detalhes.dados.nome}</dd></div><div><dt className="font-semibold">E-mail</dt><dd>{detalhes.dados.email ?? "—"}</dd></div><div><dt className="font-semibold">Estado</dt><dd>{detalhes.dados.ativo ? "Ativo" : "Desativado"}</dd></div><div><dt className="font-semibold">Versão de permissões</dt><dd>{detalhes.dados.versao_permissoes}</dd></div></dl>}
            {aba === "papeis" && <p>{detalhes.papeis.join(", ") || "Nenhum papel ativo"}</p>}
            {aba === "vinculos" && <p>{detalhes.turmas.length ? `${detalhes.turmas.length} vínculo(s) acadêmico(s) carregado(s).` : "Nenhum vínculo acadêmico."}</p>}
            {aba === "turmas" && <ul className="list-disc pl-5">{detalhes.turmas.map((turma) => <li key={turma.id}>{String(turma.nome ?? turma.id)}</li>)}</ul>}
            {aba === "atividade" && <ul className="list-disc pl-5">{detalhes.atividade.map((evento) => <li key={evento.id}>{evento.acao ?? "Alteração registrada"}</li>)}</ul>}
          </section>}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold">Alterar papéis</h2>
            <p className="text-sm text-foreground/70">{selecionada ? `Selecionada: ${selecionada.nome}` : "Nenhuma identidade selecionada; para conceder, preencha uma nova identidade."}</p>
            <label className="block font-semibold" htmlFor="papel">Papel</label>
            <select id="papel" value={papel} onChange={(event) => setPapel(event.target.value as Papel)} className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/20">{PAPEIS.map((item) => <option key={item}>{item}</option>)}</select>
            {alvo && <p className={bloqueioProjetado ? "text-red-700" : "text-foreground/70"} role="status">Conjunto após concessão: {papeisProjetados.join(", ") || "sem papel"}{bloqueioProjetado ? ` — bloqueado: ${bloqueioProjetado}` : ""}</p>}
            {!alvo && <div className="grid md:grid-cols-2 gap-3"><input aria-label="Nome da nova pessoa" value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome" className="px-3 py-2 rounded-lg bg-background border border-foreground/20" /><input aria-label="E-mail da nova pessoa" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" type="email" className="px-3 py-2 rounded-lg bg-background border border-foreground/20" /></div>}
            <label className="block font-semibold" htmlFor="motivo">Justificativa para revogar</label>
            <textarea id="motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Obrigatória para revogação" className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/20" />
            <div className="flex gap-3"><button type="button" disabled={carregando || Boolean(bloqueioProjetado) || (!alvo && (!nome || !email))} onClick={() => void executar("conceder")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">Conceder papel</button><button type="button" disabled={carregando || !alvo || !motivo.trim()} onClick={() => setConfirmacao(true)} className="px-4 py-2 rounded-lg border border-red-500 text-red-700 disabled:opacity-50">Revogar papel</button></div>
            {confirmacao && <div role="dialog" aria-label="Confirmar revogação" className="border border-red-500/40 rounded-lg p-4 space-y-3"><p>Revogar <strong>{papel}</strong> de <strong>{selecionada?.nome ?? "esta pessoa"}</strong>? A operação será auditada e pode desativar a conta se for o último papel.</p><div className="flex gap-3"><button type="button" onClick={() => setConfirmacao(false)} className="px-3 py-2 rounded-lg border">Cancelar</button><button type="button" disabled={carregando} onClick={() => { setConfirmacao(false); void executar("revogar"); }} className="px-3 py-2 rounded-lg bg-red-600 text-white">Confirmar revogação</button></div></div>}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}

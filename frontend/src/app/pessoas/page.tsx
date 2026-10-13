"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { buscarUsuarios, concederPapel, revogarPapel, obterDetalhesUsuario } from "@/services/usuarios/usuariosService";
import type { Pessoa, DetalhesUsuario as Detalhes, Papel } from "@/types/usuarios";

const PAPEIS = ["Aluno", "Bolsista", "Professor", "Gestor_Almoxarifado", "Gestor_Bens_Patrimoniais"] as const;

function PessoasContent() {
  const searchParams = useSearchParams();
  const papelDaUrl = searchParams.get("papel");
  const papelInicial: Papel = PAPEIS.includes(papelDaUrl as (typeof PAPEIS)[number])
    ? papelDaUrl as Papel
    : "Aluno";
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [busca, setBusca] = useState("");
  const [letraInicial, setLetraInicial] = useState("");
  const [alvo, setAlvo] = useState("");
  const [papel, setPapel] = useState<Papel>(papelInicial);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [detalhes, setDetalhes] = useState<Detalhes | null>(null);
  const [aba, setAba] = useState<"dados" | "papeis" | "vinculos" | "turmas" | "atividade">("dados");
  const [confirmacao, setConfirmacao] = useState(false);

  const carregar = useCallback(async () => {
    try {
      if (!letraInicial) { setPessoas([]); return; }
      const lista = await buscarUsuarios({ papel, letra: letraInicial, ...(busca ? { termo: busca } : {}) });
      setPessoas(lista);
    } catch {
      setErro("Não foi possível carregar as pessoas.");
    }
  }, [busca, letraInicial, papel]);

  useEffect(() => {
    let cancelado = false;
    if (!letraInicial) return () => { cancelado = true; };
    void Promise.resolve().then(() => { if (!cancelado) setCarregandoLista(true); });
    buscarUsuarios({ papel, letra: letraInicial, ...(busca ? { termo: busca } : {}) })
      .then((lista) => {
        if (!cancelado) setPessoas(lista);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar as pessoas.");
      }).finally(() => { if (!cancelado) setCarregandoLista(false); });
    return () => {
      cancelado = true;
    };
  }, [busca, letraInicial, papel]);

  const executar = async (acao: "conceder" | "revogar") => {
    setCarregando(true); setErro(""); setMensagem("");
    setAcaoEmAndamento(acao);
    try {
      if (acao === "conceder") {
        await concederPapel({
          idOperacao: crypto.randomUUID(),
          papel,
          ...(alvo ? { uidAlvo: alvo } : { nome, email }),
        });
        setMensagem("Papel concedido; a sessão será sincronizada após o commit.");
      } else {
        await revogarPapel({ idOperacao: crypto.randomUUID(), uidAlvo: alvo, papel, motivo });
        setMensagem("Papel revogado e a alteração foi auditada.");
      }
      setAlvo(""); setNome(""); setEmail(""); setMotivo(""); await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Operação rejeitada pelo servidor.");
    } finally { setCarregando(false); setAcaoEmAndamento(null); }
  };

  const selecionada = pessoas.find((pessoa) => pessoa.id === alvo);
  const pessoasVisiveis = letraInicial ? pessoas : [];
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
    setCarregandoDetalhes(true);
    try {
      setDetalhes(await obterDetalhesUsuario({ uid }));
    } catch { setErro("Não foi possível carregar os detalhes autorizados."); }
    finally { setCarregandoDetalhes(false); }
  };
  return (
    <ProtectedRoute allowedRoles={["Chefe_Geral"]}>
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* UI-02: diretório mínimo e administração de papéis. */}
          <header><h1 className="text-3xl font-bold">Pessoas e papéis</h1><p className="text-foreground/60 mt-1">Gerencie as pessoas e os acessos do sistema.</p></header>
          {mensagem && <p role="status" className="p-3 rounded-lg bg-green-500/10 text-green-700">{mensagem}</p>}
          {erro && <p role="alert" className="p-3 rounded-lg bg-red-500/10 text-red-700">{erro}</p>}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <label className="block font-semibold" htmlFor="letra-pessoas">Primeiro escolha a letra inicial</label>
            <select id="letra-pessoas" value={letraInicial} onChange={(event) => { setLetraInicial(event.target.value); setBusca(""); }} className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/20"><option value="">Selecione uma letra</option>{"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letra) => <option key={letra} value={letra}>{letra}</option>)}</select>
            <label className="block font-semibold" htmlFor="busca-pessoas">Filtrar resultados</label>
            <input id="busca-pessoas" value={busca} disabled={!letraInicial} onChange={(event) => setBusca(event.target.value)} placeholder={letraInicial ? "Nome" : "Escolha uma letra primeiro"} className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/20 disabled:opacity-50" />
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Nome</th><th>Papéis</th><th>Ação</th></tr></thead><tbody>
              {carregandoLista ? <tr><td colSpan={3} className="py-8 text-center" role="status">Carregando pessoas...</td></tr> : pessoasVisiveis.map((pessoa) => <tr key={pessoa.id} className="border-t border-foreground/10"><td className="py-3">{pessoa.nome}</td><td>{pessoa.papeis.join(", ") || "sem papel"}</td><td><div className="flex flex-wrap gap-3 py-1"><button type="button" onClick={() => setAlvo(pessoa.id)} disabled={carregando} className="cursor-pointer rounded-lg border border-primary/20 px-3 py-2 text-primary transition-colors hover:bg-primary/10 disabled:cursor-wait disabled:opacity-50">{alvo === pessoa.id ? "Selecionado" : "Selecionar"}</button><button type="button" onClick={() => void abrirDetalhes(pessoa.id)} disabled={carregandoDetalhes} className="cursor-pointer rounded-lg border border-foreground/15 px-3 py-2 transition-colors hover:bg-foreground/10 disabled:cursor-wait disabled:opacity-50">{carregandoDetalhes && alvo === pessoa.id ? "Carregando..." : "Detalhes"}</button></div></td></tr>)}
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
            <div className="flex gap-3"><button type="button" disabled={carregando || Boolean(bloqueioProjetado) || (!alvo && (!nome || !email))} onClick={() => void executar("conceder")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">{carregando && acaoEmAndamento === "conceder" ? "Concedendo..." : "Conceder papel"}</button><button type="button" disabled={carregando || !alvo || !motivo.trim()} onClick={() => setConfirmacao(true)} className="px-4 py-2 rounded-lg border border-red-500 text-red-700 disabled:opacity-50">{carregando && acaoEmAndamento === "revogar" ? "Revogando..." : "Revogar papel"}</button></div>
            {confirmacao && <div role="dialog" aria-label="Confirmar revogação" className="border border-red-500/40 rounded-lg p-4 space-y-3"><p>Revogar <strong>{papel}</strong> de <strong>{selecionada?.nome ?? "esta pessoa"}</strong>? A operação será auditada e pode desativar a conta se for o último papel.</p><div className="flex gap-3"><button type="button" onClick={() => setConfirmacao(false)} className="px-3 py-2 rounded-lg border">Cancelar</button><button type="button" disabled={carregando} onClick={() => { setConfirmacao(false); void executar("revogar"); }} className="px-3 py-2 rounded-lg bg-red-600 text-white">Confirmar revogação</button></div></div>}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}

export default function PessoasPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background p-6" aria-busy="true">Carregando diretório de pessoas...</main>}>
      <PessoasContent />
    </Suspense>
  );
}

"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { sendEmailVerification } from "firebase/auth";
import Link from "next/link";
import {
  chaveIntencaoAceite,
  assinaturaIntencaoAceite,
  obterIntencaoPersistida,
  limparIntencao,
} from "@/lib/intencaoOperacao";

function ConviteConteudo() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const idConvite = searchParams.get("id")?.trim() || "";
  const tokenConvite = searchParams.get("token")?.trim() || "";

  const [nomeInformado, setNomeInformado] = useState("");
  const [matriculaInformada, setMatriculaInformada] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<{
    criouMatricula: boolean;
    idTurma: string | null;
  } | null>(null);
  const [emailVerificacaoEnviado, setEmailVerificacaoEnviado] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-foreground/60 animate-pulse">Carregando sessão...</p>
      </div>
    );
  }

  if (!idConvite || !tokenConvite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-card border border-border rounded-2xl shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold">Link de Convite Inválido</h1>
          <p className="text-sm text-foreground/60">
            Este link não possui os identificadores necessários de convite e token.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirectUrl = `/convite?id=${encodeURIComponent(idConvite)}&token=${encodeURIComponent(tokenConvite)}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-card border border-border rounded-2xl shadow-xl text-center space-y-4">
          <h1 className="text-2xl font-bold">Convite de Aluno</h1>
          <p className="text-sm text-foreground/60">
            Você recebeu um convite para ingressar no sistema LCQUI. Faça login com sua conta institucional para aceitá-lo.
          </p>
          <button
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`)}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Entrar com minha conta
          </button>
        </div>
      </div>
    );
  }

  if (!user.emailVerified) {
    const handleReenviarVerificacao = async () => {
      try {
        await sendEmailVerification(user);
        setEmailVerificacaoEnviado(true);
      } catch {
        setErro("Não foi possível enviar o e-mail de verificação no momento.");
      }
    };

    const handleAtualizarSessao = async () => {
      try {
        await user.reload();
        window.location.reload();
      } catch {
        window.location.reload();
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-card border border-border rounded-2xl shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">
            @
          </div>
          <h1 className="text-xl font-bold">E-mail Não Verificado</h1>
          <p className="text-sm text-foreground/60">
            A norma de segurança do LCQUI exige que a sua conta de autenticação (<strong>{user.email}</strong>) possua e-mail verificado antes de aceitar um convite.
          </p>
          {emailVerificacaoEnviado ? (
            <p className="text-xs text-green-600 font-semibold bg-green-500/10 p-3 rounded-lg">
              E-mail de verificação reenviado. Verifique sua caixa de entrada e clique no link de confirmação.
            </p>
          ) : (
            <button
              onClick={handleReenviarVerificacao}
              className="w-full py-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground font-medium rounded-xl text-sm"
            >
              Reenviar E-mail de Verificação
            </button>
          )}
          <button
            onClick={handleAtualizarSessao}
            className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm"
          >
            Já verifiquei (Atualizar)
          </button>
        </div>
      </div>
    );
  }

  const handleAceitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    try {
      const session = typeof window !== "undefined" ? window.sessionStorage : null;
      const chave = chaveIntencaoAceite(idConvite);
      const assinatura = assinaturaIntencaoAceite(idConvite, tokenConvite);
      const intencao = session
        ? obterIntencaoPersistida(session, chave, assinatura, () => crypto.randomUUID())
        : { idOperacao: crypto.randomUUID(), assinatura };

      const functions = getFunctions();
      const aceitar = httpsCallable(functions, "aceitarConviteAluno");

      const res = await aceitar({
        idOperacao: intencao.idOperacao,
        idConvite,
        tokenConvite,
        nomeInformado: nomeInformado.trim() || undefined,
        matriculaInformada: matriculaInformada.trim() || undefined,
      });

      if (session) limparIntencao(session, chave);

      const dados = res.data as { criouMatricula: boolean; idTurma: string | null };
      setSucesso({
        criouMatricula: Boolean(dados.criouMatricula),
        idTurma: dados.idTurma ?? null,
      });
    } catch (err: unknown) {
      console.error("Erro ao aceitar convite:", err);
      const msg = err instanceof Error ? err.message : "Não foi possível aceitar o convite. Verifique se o convite não expirou.";
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-card border border-border rounded-2xl shadow-xl text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold">Convite Aceito!</h1>
          <p className="text-sm text-foreground/60">
            {sucesso.criouMatricula
              ? "Você foi matriculado na turma com sucesso e seu perfil de aluno foi habilitado."
              : "Seu cadastro foi habilitado com sucesso no sistema LCQUI."}
          </p>
          <div className="pt-2">
            <Link
              href={sucesso.criouMatricula ? "/turmas" : "/alunos"}
              className="inline-block w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors"
            >
              {sucesso.criouMatricula ? "Acessar Minhas Turmas" : "Ir para o Painel"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 bg-card border border-border rounded-2xl shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Aceitar Convite de Aluno</h1>
          <p className="text-xs text-foreground/60">
            Conectado como <strong>{user.email}</strong> (verificado)
          </p>
        </div>

        {erro && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs font-medium">
            {erro}
          </div>
        )}

        <form onSubmit={handleAceitar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Nome Completo (caso ainda não cadastrado)
            </label>
            <input
              type="text"
              value={nomeInformado}
              onChange={(e) => setNomeInformado(e.target.value)}
              placeholder={user.displayName || "Seu nome completo"}
              className="w-full px-3 py-2 rounded-xl bg-background border border-foreground/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Número de Matrícula (se solicitado pelo convite)
            </label>
            <input
              type="text"
              value={matriculaInformada}
              onChange={(e) => setMatriculaInformada(e.target.value)}
              placeholder="Ex: 0020261234"
              className="w-full px-3 py-2 rounded-xl bg-background border border-foreground/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-foreground/50 mt-1">
              Preserva zeros iniciais e formatação textual institucional.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Processando aceite..." : "Confirmar e Ingressar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ConvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <p className="text-foreground/60 animate-pulse">Carregando convite...</p>
        </div>
      }
    >
      <ConviteConteudo />
    </Suspense>
  );
}

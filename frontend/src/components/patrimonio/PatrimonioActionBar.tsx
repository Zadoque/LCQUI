import React from "react";
import Link from "next/link";

interface PatrimonioActionBarProps {
  isChefe: boolean;
  hasManagementAccess: boolean;
  canRequestAddition: boolean;
  onNovoBem: () => void;
  onNotificacoes: () => void;
  onRelatorios: () => void;
}

export function PatrimonioActionBar({
  isChefe,
  hasManagementAccess,
  canRequestAddition,
  onNovoBem,
  onNotificacoes,
  onRelatorios,
}: PatrimonioActionBarProps) {
  return (
    <div className="space-y-4">
      {/* Visão do Chefe Geral: Aba Bens Patrimoniais (Seção 6.4) */}
      {isChefe && (
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
          <div className="flex items-center gap-3 flex-wrap">
            <button className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Novo Gestor de Bens Patrimoniais
            </button>
            <div className="h-8 w-px bg-foreground/10 hidden sm:block" />
            <button className="px-4 py-2 rounded-lg bg-foreground/5 text-sm font-medium hover:bg-foreground/10 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Gerenciar Gestores de Bens
            </button>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400/60">
            Ações de Chefe Geral
          </span>
        </div>
      )}

      {/* Visão do Gestor de Bens Patrimoniais (Seção 6.8) */}
      {(hasManagementAccess || canRequestAddition) && (
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-5 bg-foreground/5 rounded-2xl border border-foreground/10">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onNotificacoes}
              className="relative p-3 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors"
              title="Notificações — Requisições de professores"
            >
              <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
            </button>
            <div className="h-10 w-px bg-foreground/20 hidden sm:block" />
            {canRequestAddition && (
              <button
                onClick={onNovoBem}
                className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" d="M12 4v16m8-8H4" />
                </svg>
                Requisitar Adição de Bem
              </button>
            )}
            <button
              onClick={onRelatorios}
              className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Gerar Relatórios
            </button>
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <Link href="/patrimonio/requisicoes" className="flex-1 lg:flex-none">
              <button className="w-full px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Analisar Requisições
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

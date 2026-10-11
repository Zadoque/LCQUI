"use client";

import React, { useState } from "react";

export interface ReagentesActionBarProps {
  isChefe: boolean;
  hasManagementAccess: boolean;
  onNovoAlmoxarifado: () => void;
  onNovaMateria: () => void;
  onGerenciarGestores: () => void;
  onNovoGestor: () => void;
  onNovaSubstancia: () => void;
  onNovoReagente: () => void;
  onNovaEspecificacao: () => void;
  onImprimirEtiquetas: () => void;
  onAbrirRelatorios: () => void;
  onRegistrarRetirada: () => void;
  onRegistrarDevolucao: () => void;
}

export function ReagentesActionBar({
  isChefe,
  hasManagementAccess,
  onNovoAlmoxarifado,
  onNovaMateria,
  onGerenciarGestores,
  onNovoGestor,
  onNovaSubstancia,
  onNovoReagente,
  onNovaEspecificacao,
  onImprimirEtiquetas,
  onAbrirRelatorios,
  onRegistrarRetirada,
  onRegistrarDevolucao,
}: ReagentesActionBarProps) {
  const [isCadastroMenuOpen, setIsCadastroMenuOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Barra de Ações do Chefe Geral */}
      {isChefe && (
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onNovoAlmoxarifado}
              data-testid="almox-btn-novo-almoxarifado-header"
              className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Novo Almoxarifado
            </button>
            <button
              onClick={onNovaMateria}
              className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              Nova Matéria
            </button>
            <div className="h-8 w-px bg-foreground/10 hidden sm:block"></div>
            <button
              onClick={onGerenciarGestores}
              className="px-4 py-2 rounded-lg bg-foreground/5 text-sm font-medium hover:bg-foreground/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Gerenciar Gestores de Almoxarifado
            </button>
            <button
              onClick={onNovoGestor}
              data-testid="btn-novo-gestor-almoxarifado"
              className="px-4 py-2 rounded-lg bg-foreground/5 text-sm font-medium hover:bg-foreground/10 transition-colors flex items-center gap-2"
            >
              Novo Gestor de Almoxarifado
            </button>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400/60">Ações de Chefe Geral</span>
        </div>
      )}

      {/* Barra de Gestão do Almoxarifado */}
      {hasManagementAccess && (
        <div className="flex flex-col min-[1572px]:flex-row gap-4 items-center justify-between p-5 bg-foreground/5 rounded-2xl border border-foreground/10">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setIsCadastroMenuOpen(!isCadastroMenuOpen)}
                className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">Cadastrar Reagente</span>
                <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {isCadastroMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCadastroMenuOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-foreground/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-1">
                      <button onClick={() => { onNovaSubstancia(); setIsCadastroMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-foreground/5 rounded-lg flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">1</span>
                        <div>
                          <div className="font-bold">Substância Química Base</div>
                          <div className="text-[10px] text-foreground/50">Crie o registro base (ex: NaCl)</div>
                        </div>
                      </button>
                      <button onClick={() => { onNovoReagente(); setIsCadastroMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-foreground/5 rounded-lg flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">2</span>
                        <div>
                          <div className="font-bold">Resumo de Reagente</div>
                          <div className="text-[10px] text-foreground/50">Item agrupador de catálogo</div>
                        </div>
                      </button>
                      <button onClick={() => { onNovaEspecificacao(); setIsCadastroMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-foreground/5 rounded-lg flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">3</span>
                        <div>
                          <div className="font-bold">Especificação Comercial</div>
                          <div className="text-[10px] text-foreground/50">Produto físico (ex: NaCl P.A. 99%)</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button onClick={onImprimirEtiquetas} className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 flex items-center gap-2 border border-foreground/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              <span className="hidden sm:inline">Imprimir Etiquetas</span>
            </button>
            <div className="h-4 w-px bg-foreground/20 hidden sm:block mx-1"></div>
            <button onClick={onAbrirRelatorios} className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-500/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="hidden sm:inline">Relatórios</span>
            </button>
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            <button onClick={onRegistrarRetirada} className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
              <svg className="hidden sm:inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              Registrar Retirada
            </button>
            <button onClick={onRegistrarDevolucao} className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
              <svg className="hidden sm:inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Registrar Devolução
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

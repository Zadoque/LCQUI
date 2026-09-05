"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// Ícones SVG inline simples
const icons = {
  beaker: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  patrimonio: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  student: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  alert: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  exchange: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  menu: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  close: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export default function Sidebar() {
  const { roles } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Ícones do chevron para o botão de toggle
  const chevronLeft = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
    </svg>
  );
  const chevronRight = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
    </svg>
  );

  const isChefe = roles.includes("Chefe_Geral");
  const isGestorAlmox = roles.includes("Gestor_Almoxarifado");
  const isGestorPatr = roles.includes("Gestor_Bens_Patrimoniais");
  const isProfessor = roles.includes("Professor");
  const isAluno = roles.includes("Aluno");
  const isBolsista = roles.includes("Bolsista");

  // Constrói grupos de navegação conforme o papel (Seção 6 do main.tex)
  const groups: NavGroup[] = [];

  if (isChefe) {
    groups.push({
      title: "Gestão Geral",
      items: [
        { label: "Almoxarifados", href: "/reagentes", icon: icons.beaker },
        { label: "Bens Patrimoniais", href: "/patrimonio", icon: icons.patrimonio },
        { label: "Professores", href: "/professores", icon: icons.users },
        { label: "Turmas", href: "/turmas", icon: icons.book },
        { label: "Alunos", href: "/alunos", icon: icons.student },
      ],
    });
  }

  if (isGestorAlmox && !isChefe) {
    groups.push({
      title: "Almoxarifado",
      items: [
        { label: "Estoque (Reagentes)", href: "/reagentes", icon: icons.beaker },
        { label: "Movimentações", href: "/movimentacoes", icon: icons.exchange },
        { label: "Descartes / Alertas", href: "/alertas-almox", icon: icons.alert },
      ],
    });
  }

  if (isGestorPatr && !isChefe) {
    groups.push({
      title: "Patrimônio",
      items: [
        { label: "Patrimônio Geral", href: "/patrimonio", icon: icons.patrimonio },
        { label: "Requisições", href: "/requisicoes", icon: icons.clipboard },
        { label: "Alertas (Inservíveis)", href: "/alertas-patrimonio", icon: icons.alert },
      ],
    });
  }

  if (isProfessor && !isChefe) {
    groups.push({
      title: "Visualizar",
      items: [
        { label: "Reagentes", href: "/reagentes", icon: icons.beaker },
        { label: "Bens Patrimoniais", href: "/patrimonio", icon: icons.patrimonio },
      ],
    });
    groups.push({
      title: "Turmas",
      items: [
        { label: "Turmas", href: "/turmas", icon: icons.book },
      ],
    });
  }

  if (isAluno && !isChefe && !isProfessor) {
    if (isBolsista) {
      groups.push({
        title: "Visualizar",
        items: [
          { label: "Reagentes", href: "/reagentes", icon: icons.beaker },
        ],
      });
    }
    groups.push({
      title: "Turmas",
      items: [
        { label: "Turmas", href: "/turmas", icon: icons.book },
      ],
    });
  }

  if (groups.length === 0) return null;



  const sidebarContent = (
    <nav className="flex flex-col h-full relative">
      {/* Botão de Toggle (Apenas Desktop) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute -right-3.5 top-6 z-50 w-7 h-7 bg-background border border-foreground/10 rounded-full items-center justify-center text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors shadow-sm"
        title={isCollapsed ? "Expandir menu" : "Encolher menu"}
      >
        {isCollapsed ? chevronRight : chevronLeft}
      </button>

      <div className={`p-4 border-b border-foreground/10 flex items-center h-[73px] transition-all overflow-hidden ${isCollapsed ? "justify-center px-0" : "gap-3"}`}>
        <div className="w-8 h-8 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        {!isCollapsed && <span className="font-bold text-foreground text-lg whitespace-nowrap animate-in fade-in duration-300">LCQUI</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6 overflow-x-hidden">
        {groups.map((group, gi) => (
          <div key={gi}>
            <h3 className={`text-[10px] uppercase font-bold tracking-widest text-foreground/40 mb-2 whitespace-nowrap transition-all duration-300 ${isCollapsed ? "opacity-0 h-0 overflow-hidden" : "px-3 opacity-100"}`}>
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                          : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                      } ${isCollapsed ? "justify-center px-0 w-12 mx-auto" : "px-3"}`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!isCollapsed && <span className="animate-in fade-in duration-300">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );

  return (
    <>
      {/* Botão hambúrguer para mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-colors lg:hidden"
        aria-label="Abrir menu"
      >
        {icons.menu}
      </button>

      {/* Sidebar Desktop — fixa à esquerda */}
      <aside className={`hidden lg:flex flex-col min-h-screen bg-background border-r border-foreground/10 sticky top-0 shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-64"}`}>
        {sidebarContent}
      </aside>

      {/* Sidebar Mobile — overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-background border-r border-foreground/10 shadow-2xl animate-in slide-in-from-left">
            <div className="absolute top-4 right-4">
              <button onClick={() => setIsOpen(false)} className="p-1 text-foreground/50 hover:text-foreground">
                {icons.close}
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

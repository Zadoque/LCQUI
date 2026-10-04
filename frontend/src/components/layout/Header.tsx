"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import { NotificacoesDropdown } from "./NotificacoesDropdown";
import { PerfilDrawer } from "./PerfilDrawer";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function Header() {
  const { user, roles, papelAtivo, setPapelAtivo } = useAuth();
  const [showPerfil, setShowPerfil] = useState(false);
  const { theme, setTheme, systemTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!user) return null;

  return (
    <header className="w-full bg-background border-b border-foreground/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex flex-col flex-1 ml-12 lg:ml-0 min-w-0 mr-4">
        <div className="marquee-container">
          <span className="text-xl font-bold text-foreground marquee-text pr-4">
            Olá, {user.displayName || user.email?.split("@")[0] || "Usuário"}
          </span>
        </div>
        {roles && roles.length > 0 && (
          roles.length > 1 ? (
            <div className="flex gap-2 mt-1 flex-wrap" data-testid="seletor-papel" role="group" aria-label="Seletor de papel ativo">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPapelAtivo(r)}
                  data-testid={`papel-opcao-${r}`}
                  aria-pressed={papelAtivo === r}
                  className={"text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full transition-colors " + (papelAtivo === r ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20")}
                >
                  {r.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 mt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {roles[0].replace(/_/g, " ")}
              </span>
            </div>
          )
          )}
      </div>

      <nav className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
        {(roles.includes("Chefe_Geral") || roles.includes("Gestor_Almoxarifado") || roles.includes("Professor") || roles.includes("Bolsista")) && (
          <Link href="/reagentes" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
            Reagentes
          </Link>
        )}
        {(roles.includes("Chefe_Geral") || roles.includes("Gestor_Bens_Patrimoniais") || roles.includes("Professor") || roles.includes("Bolsista")) && (
          <Link href="/patrimonio" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
            Patrimônio
          </Link>
        )}
        {(roles.includes("Chefe_Geral") || roles.includes("Professor") || roles.includes("Bolsista")) && (
          <Link href="/turmas" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
            Turmas
          </Link>
        )}
        {(roles.includes("Chefe_Geral") || roles.includes("Professor")) && (
          <Link href="/alunos" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
            Alunos
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-4 relative">
        <NotificacoesDropdown />

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full border border-foreground/10 text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            title="Alternar tema"
          >
            {theme === 'dark' || (theme === 'system' && systemTheme === 'dark') ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        )}

        <button
          onClick={() => setShowPerfil(true)}
          aria-label="Menu do usuário"
          data-testid="header-user-menu"
          className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt="Perfil"
              width={40}
              height={40}
              unoptimized
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-foreground/10 flex items-center justify-center text-foreground font-bold">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
            </div>
          )}
        </button>

        <PerfilDrawer isOpen={showPerfil} onClose={() => setShowPerfil(false)} />
      </div>
    </header>
  );
}

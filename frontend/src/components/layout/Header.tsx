"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";

export default function Header() {
  const { user, roles } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <header className="w-full bg-background border-b border-foreground/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex flex-col">
        <span className="text-xl font-bold text-foreground">
          Olá, {user.displayName || user.email?.split("@")[0] || "Usuário"}
        </span>
        {roles && roles.length > 0 && (
          <div className="flex gap-2 mt-1">
            {roles.map(r => (
              <span key={r} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {r.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt="Perfil" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-foreground/10 flex items-center justify-center text-foreground font-bold">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
            </div>
          )}
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
            <div className="absolute right-0 mt-2 w-48 bg-background border border-foreground/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
              <div className="p-3 border-b border-foreground/10">
                <p className="text-sm font-semibold truncate">{user.displayName || "Usuário"}</p>
                <p className="text-xs text-foreground/50 truncate">{user.email}</p>
              </div>
              <div className="p-2">
                <button 
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
                  onClick={() => { setShowDropdown(false); }}
                >
                  Perfil de Usuário
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors mt-1 font-medium"
                >
                  Sair
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

"use client";

import React, { useState } from "react";
import { buscarUsuariosParaRetirada, type UsuarioRetirada } from "@/services/usuarios/usuariosService";

interface SeletorUsuarioReagenteProps {
  label: string;
  value: string;
  onChange: (usuario: UsuarioRetirada | null) => void;
  testIdPrefix: string;
}

/** UI-07: pesquisa autorizada por inicial; o UID nunca é digitado pelo operador. */
export function SeletorUsuarioReagente({ label, value, onChange, testIdPrefix }: SeletorUsuarioReagenteProps) {
  const [letra, setLetra] = useState("");
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<UsuarioRetirada[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buscar = async () => {
    const inicial = letra.trim().toUpperCase();
    if (!/^[A-Z]$/.test(inicial)) {
      setError("Informe uma letra inicial de A a Z.");
      setResultados([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResultados(await buscarUsuariosParaRetirada({ letra: inicial, termo: termo.trim() || undefined }));
    } catch (err: unknown) {
      setResultados([]);
      setError(err instanceof Error ? err.message : "Não foi possível pesquisar os usuários autorizados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <fieldset className="space-y-2 rounded-lg border border-foreground/10 p-3" data-testid={`${testIdPrefix}-seletor`}>
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-[5rem_1fr_auto] gap-2">
        <input
          aria-label="Letra inicial do nome"
          data-testid={`${testIdPrefix}-letra`}
          maxLength={1}
          placeholder="A"
          value={letra}
          onChange={(e) => setLetra(e.target.value.toUpperCase())}
          className="w-full rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2"
        />
        <input
          aria-label="Nome do retirante"
          data-testid={`${testIdPrefix}-termo`}
          placeholder="Nome contém (opcional)"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          className="w-full rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2"
        />
        <button type="button" onClick={buscar} disabled={loading} data-testid={`${testIdPrefix}-buscar`} className="rounded-lg bg-foreground/10 px-3 py-2 text-sm">
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>
      <p className="text-xs text-foreground/50">A busca consulta apenas usuários ativos com papel Professor ou Bolsista.</p>
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
      {resultados.length > 0 && (
        <div className="max-h-32 space-y-1 overflow-y-auto" role="radiogroup" aria-label={label}>
          {resultados.map((usuario) => (
            <button
              type="button"
              key={usuario.id}
              role="radio"
              aria-checked={value === usuario.id}
              data-testid={`${testIdPrefix}-usuario-${usuario.id}`}
              onClick={() => onChange(usuario)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${value === usuario.id ? "bg-orange-500/20 ring-1 ring-orange-500" : "bg-foreground/5"}`}
            >
              <span className="font-medium">{usuario.nome}</span>
              <span className="ml-2 text-xs text-foreground/60">{usuario.papeis.join(" / ")}</span>
            </button>
          ))}
        </div>
      )}
      {value && <p className="text-xs text-green-600">Usuário selecionado.</p>}
    </fieldset>
  );
}

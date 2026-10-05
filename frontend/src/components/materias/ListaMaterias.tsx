"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export interface MateriaItem {
  id: string;
  nome: string;
  codigo: string;
}

interface ListaMateriasProps {
  modo: "listagem" | "selecao";
  selectedIds?: string[];
  onToggle?: (id: string) => void;
  onNovaMateria?: () => void;
  onEditar?: (materia: { id: string; nome: string; codigo: string }) => void;
}

/**
 * Casca externa: controla o reload via remontagem (key) para que o
 * componente interno possa reinicializar estados sem setState em effect.
 */
export function ListaMaterias(props: ListaMateriasProps) {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <ListaMateriasAssinatura
      key={reloadKey}
      {...props}
      onRecarregar={() => setReloadKey((k) => k + 1)}
    />
  );
}

interface ListaMateriasAssinaturaProps extends ListaMateriasProps {
  onRecarregar: () => void;
}

function ListaMateriasAssinatura({
  modo,
  selectedIds = [],
  onToggle,
  onNovaMateria,
  onEditar,
  onRecarregar,
}: ListaMateriasAssinaturaProps) {
  const [materias, setMaterias] = useState<MateriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "Materia"), orderBy("nome", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((doc) => ({
          id: doc.id,
          nome: (doc.data().nome ?? "") as string,
          codigo: (doc.data().codigo_materia ?? "") as string,
        }));
        setMaterias(lista);
        setLoading(false);
        setStale(snapshot.metadata.fromCache === true);
      },
      (err) => {
        setLoading(false);
        if (
          typeof err.code === "string" &&
          err.code.includes("permission-denied")
        ) {
          setPermissionDenied(true);
        } else {
          setError(err.message ?? "Erro ao carregar matérias.");
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggle = (id: string) => {
    onToggle?.(id);
  };

  if (loading) {
    return (
      <div
        data-testid="lista-materias"
        className="flex items-center justify-center py-8"
      >
        <div
          data-testid="estado-carregando"
          className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-primary"
          aria-label="Carregando matérias"
        />
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div
        data-testid="lista-materias"
        className="p-4 text-center text-red-500 text-sm"
        role="alert"
      >
        <p className="font-semibold">
          Você não tem permissão para visualizar as matérias.
        </p>
        {onNovaMateria && (
          <button
            data-testid="btn-nova-materia"
            onClick={onNovaMateria}
            className="mt-2 text-xs bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md font-bold transition-colors"
          >
            + Nova Matéria
          </button>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="lista-materias"
        className="p-4 text-center text-red-500 text-sm"
        role="alert"
      >
        <p>{error}</p>
        <button
          onClick={onRecarregar}
          className="mt-2 text-xs bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md font-bold transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div data-testid="lista-materias">
      {onNovaMateria && materias.length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            data-testid="btn-nova-materia"
            onClick={onNovaMateria}
            className="text-xs bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md font-bold transition-colors"
          >
            + Nova Matéria
          </button>
        </div>
      )}

      {stale && (
        <div
          data-testid="estado-desatualizado"
          className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs px-3 py-2 rounded-lg mb-3"
          role="status"
        >
          <span>Dados possivelmente desatualizados</span>
          <button
            onClick={onRecarregar}
            className="ml-2 font-bold hover:underline"
          >
            Recarregar
          </button>
        </div>
      )}

      {materias.length === 0 ? (
        <div
          data-testid="estado-vazio"
          className="p-6 text-center text-foreground/50 text-sm"
        >
          <p>Nenhuma matéria cadastrada.</p>
          {onNovaMateria && (
            <button
              data-testid="btn-nova-materia"
              onClick={onNovaMateria}
              className="mt-2 text-xs bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md font-bold transition-colors"
            >
              + Nova Matéria
            </button>
          )}
        </div>
      ) : modo === "listagem" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-foreground/70 border-b border-foreground/10">
              <tr>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">
                  Código
                </th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">
                  Nome
                </th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {materias.map((m) => (
                <tr
                  key={m.id}
                  data-testid={`materia-item-${m.id}`}
                  className="hover:bg-foreground/5 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-bold">
                    {m.codigo}
                  </td>
                  <td className="px-4 py-3 font-semibold">{m.nome}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      data-testid={`btn-editar-materia-${m.id}`}
                      onClick={() => onEditar?.(m)}
                      className="text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded border border-primary/20 transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto border border-foreground/10 rounded-lg bg-background">
          {materias.map((m) => (
            <label
              key={m.id}
              data-testid={`materia-item-${m.id}`}
              className="flex items-center gap-3 p-3 hover:bg-foreground/5 border-b border-foreground/5 last:border-0 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(m.id)}
                onChange={() => handleToggle(m.id)}
                className="rounded border-foreground/30 text-primary focus:ring-primary w-4 h-4"
              />
              <div>
                <span className="font-bold text-sm block">{m.codigo}</span>
                <span className="text-xs text-foreground/60">{m.nome}</span>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

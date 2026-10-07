"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export interface LocalItem {
  id: string;
  predio: string;
  andar: string;
  sala: string;
}

interface ListaLocaisProps {
  modo: "listagem" | "selecao";
  selectedId?: string;
  onSelecionar?: (id: string, local: LocalItem) => void;
  onEditar?: (local: LocalItem) => void;
  onNovoLocal?: () => void;
  /** Prefixo para data-testids, evitando colisão quando múltiplos ListaLocais coexistem. */
  testIdPrefix?: string;
}

/**
 * Casca externa: controla o reload via remontagem (key) para que o
 * componente interno possa reinicializar estados sem setState em effect.
 */
export function ListaLocais(props: ListaLocaisProps) {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <ListaLocaisAssinatura
      key={reloadKey}
      {...props}
      testIdPrefix={props.testIdPrefix ?? ""}
      onRecarregar={() => setReloadKey((k) => k + 1)}
    />
  );
}

interface ListaLocaisAssinaturaProps extends ListaLocaisProps {
  onRecarregar: () => void;
  testIdPrefix: string;
}

function ListaLocaisAssinatura({
  modo,
  selectedId,
  onSelecionar,
  onEditar,
  onNovoLocal,
  onRecarregar,
  testIdPrefix: p,
}: ListaLocaisAssinaturaProps) {
  const [locais, setLocais] = useState<LocalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "Local"), orderBy("predio", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((doc) => ({
          id: doc.id,
          predio: (doc.data().predio ?? "") as string,
          andar: (doc.data().andar ?? "") as string,
          sala: (doc.data().sala ?? "") as string,
        }));
        setLocais([...new Map(lista.map((local) => [local.id, local])).values()]);
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
          setError(err.message ?? "Erro ao carregar locais.");
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div
        data-testid={`${p}lista-locais`}
        className="flex items-center justify-center py-8"
      >
        <div
          className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-primary"
          aria-label="Carregando locais"
        />
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div
        data-testid={`${p}lista-locais`}
        className="p-4 text-center text-red-500 text-sm"
        role="alert"
      >
        <p className="font-semibold">
          Você não tem permissão para visualizar os locais.
        </p>
        {onNovoLocal && (
          <button
            data-testid={`${p}btn-novo-local`}
            onClick={onNovoLocal}
            className="mt-2 text-xs bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md font-bold transition-colors"
          >
            + Novo Local
          </button>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid={`${p}lista-locais`}
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
    <div data-testid={`${p}lista-locais`}>
      {onNovoLocal && locais.length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            data-testid={`${p}btn-novo-local`}
            onClick={onNovoLocal}
            className="text-xs bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md font-bold transition-colors"
          >
            + Novo Local
          </button>
        </div>
      )}

      {stale && (
        <div
          data-testid={`${p}estado-desatualizado`}
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

      {locais.length === 0 ? (
        <div
          data-testid={`${p}estado-vazio`}
          className="p-6 text-center text-foreground/50 text-sm"
        >
          <p>Nenhum local cadastrado.</p>
          {onNovoLocal && (
            <button
              data-testid={`${p}btn-novo-local`}
              onClick={onNovoLocal}
              className="mt-2 text-xs bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md font-bold transition-colors"
            >
              + Novo Local
            </button>
          )}
        </div>
      ) : modo === "listagem" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-foreground/70 border-b border-foreground/10">
              <tr>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">
                  Prédio
                </th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">
                  Andar
                </th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs">
                  Sala
                </th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-xs text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {locais.map((loc, indice) => (
                <tr
                  key={`local-listagem-${indice}-${loc.id}`}
                  data-testid={`${p}local-item-${loc.id}`}
                  className="hover:bg-foreground/5 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold">{loc.predio}</td>
                  <td className="px-4 py-3">{loc.andar}</td>
                  <td className="px-4 py-3">{loc.sala}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      data-testid={`${p}btn-editar-local-${loc.id}`}
                      onClick={() => onEditar?.(loc)}
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
          {locais.map((loc, indice) => (
            <button
              key={`local-selecao-${indice}-${loc.id}`}
              data-testid={`${p}local-item-${loc.id}`}
              type="button"
              onClick={() => onSelecionar?.(loc.id, loc)}
              className={`w-full text-left flex items-center gap-3 p-3 hover:bg-foreground/5 border-b border-foreground/5 last:border-0 cursor-pointer transition-colors ${
                selectedId === loc.id
                  ? "bg-primary/10 border-l-2 border-l-primary"
                  : ""
              }`}
            >
              <div>
                <span className="font-bold text-sm block">
                  {loc.predio} · {loc.andar}
                </span>
                <span className="text-xs text-foreground/60">{loc.sala}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

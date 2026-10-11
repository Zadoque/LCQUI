import React from "react";
import { ResumoReagente } from "@/types/reagentes";
import { AccordionRow } from "@/components/reagentes/AccordionRow";

interface CatalogoReagentesTableProps {
  loading: boolean;
  displayedReagentes: ResumoReagente[];
  filteredReagentesCount: number;
  limiteExibicao: number;
  onExibirMais: () => void;
  onAction: (action: string, payload: any) => void;
  readOnly: boolean;
}

export function CatalogoReagentesTable({
  loading,
  displayedReagentes,
  filteredReagentesCount,
  limiteExibicao,
  onExibirMais,
  onAction,
  readOnly,
}: CatalogoReagentesTableProps) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl border border-foreground/10">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-foreground/5 text-foreground/70 border-b border-foreground/10">
            <tr>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Nome do Reagente</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Tipo</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Natureza</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Estado Físico</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
                </td>
              </tr>
            ) : displayedReagentes.length > 0 ? (
              displayedReagentes.map((reagente) => (
                <AccordionRow
                  key={reagente.id}
                  reagente={reagente}
                  onAction={onAction}
                  readOnly={readOnly}
                />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                  Nenhum reagente encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Expansão progressiva (UI-04) */}
      {filteredReagentesCount > limiteExibicao && (
        <div className="p-4 text-center border-t border-foreground/10">
          <button
            type="button"
            onClick={onExibirMais}
            className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
          >
            Exibir mais resultados ({displayedReagentes.length} de {filteredReagentesCount})
          </button>
        </div>
      )}
    </div>
  );
}

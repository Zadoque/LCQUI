import React from "react";
import Link from "next/link";
import { BemPatrimonial } from "@/types/patrimonio";

interface TabelaBensPatrimoniaisProps {
  loading: boolean;
  filteredBens: BemPatrimonial[];
  hasSearched: boolean;
  bensCount: number;
  searchQuery: string;
}

export function TabelaBensPatrimoniais({
  loading,
  filteredBens,
  hasSearched,
  bensCount,
  searchQuery,
}: TabelaBensPatrimoniaisProps) {
  return (
    <div className="space-y-2">
      <div className="glass-panel overflow-hidden rounded-2xl border border-foreground/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-foreground/70 border-b border-foreground/10">
              <tr>
                <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Nome do Equipamento</th>
                <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Nº Patrimônio</th>
                <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Conservação</th>
                <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Local</th>
                <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Responsável SEI</th>
                <th className="px-5 py-4 font-medium uppercase tracking-wider text-xs">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
                  </td>
                </tr>
              ) : filteredBens.length > 0 ? (
                filteredBens.map((bem) => (
                  <tr key={bem.id} className="hover:bg-foreground/5 transition-colors">
                    <td className="px-5 py-4 font-semibold">{bem.nome_equipamento || "Sem nome"}</td>
                    <td className="px-5 py-4 font-mono text-foreground/70">{bem.numero_patrimonio}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          bem.status === "Ativo"
                            ? "bg-green-500/15 text-green-500"
                            : bem.status === "Inservivel"
                            ? "bg-orange-500/15 text-orange-500"
                            : "bg-red-500/15 text-red-500"
                        }`}
                      >
                        {bem.status === "Ja_dado_baixa" ? "Dado Baixa" : bem.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          bem.estado_conservacao === "BOM"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : bem.estado_conservacao === "REGULAR"
                            ? "bg-yellow-500/10 text-yellow-600"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {bem.estado_conservacao}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-foreground/70 text-xs">
                      {bem.predio && <span>{bem.predio}</span>}
                      {bem.andar && <span> · {bem.andar}º</span>}
                      {bem.sala && <span> · {bem.sala}</span>}
                    </td>
                    <td className="px-5 py-4 text-foreground/70 truncate max-w-[150px]">{bem.nome_responsavel_sei}</td>
                    <td className="px-5 py-4">
                      <Link href={`/patrimonio/${bem.id}`}>
                        <button className="text-primary hover:underline text-sm font-medium">Ver Detalhes</button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-foreground/50">
                    {hasSearched
                      ? "Nenhum bem patrimonial encontrado para este filtro."
                      : 'Selecione ao menos um filtro e clique em "Buscar no Banco" para carregar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasSearched && !loading && (
        <div className="text-xs text-foreground/40 text-right">
          {filteredBens.length} {filteredBens.length === 1 ? "resultado" : "resultados"}
          {searchQuery && ` (filtrados de ${bensCount} do banco)`}
        </div>
      )}
    </div>
  );
}

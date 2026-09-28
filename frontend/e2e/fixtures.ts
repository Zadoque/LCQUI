import { test as base, expect } from "@playwright/test";

/**
 * Guarda de observabilidade: falha o teste em erros inesperados de console ou
 * exceções não tratadas da página. Testes negativos declaram explicitamente os
 * padrões esperados com `guardaConsole.permitir(...)`, de modo que erros
 * desconhecidos permaneçam fatais.
 */
export interface GuardaConsole {
  permitir: (...padroes: (string | RegExp)[]) => void;
  erros: () => string[];
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Avisos explicitamente conhecidos e benignos.
 *
 * O SDK do Firestore emite esta mensagem em `console.error` quando a primeira
 * conexão WebChannel ainda não completou durante o cold start do emulador. É
 * ruído de transporte que se recupera; não é `permission-denied` nem erro de
 * validação. Qualquer outra mensagem de erro continua fatal.
 */
const PERMITIDOS_POR_PADRAO: RegExp[] = [
  /@firebase\/firestore: Firestore \([\d.]+\): Could not reach Cloud Firestore backend/,
];

export const test = base.extend<{ guardaConsole: GuardaConsole }>({
  guardaConsole: [
    async ({ page }, use) => {
      const erros: string[] = [];
      const permitidos: RegExp[] = [...PERMITIDOS_POR_PADRAO];

      page.on("console", (mensagem) => {
        if (mensagem.type() === "error") erros.push(mensagem.text());
      });
      page.on("pageerror", (erro) => erros.push(erro.message));

      const guarda: GuardaConsole = {
        permitir: (...padroes) => {
          for (const padrao of padroes) {
            permitidos.push(
              typeof padrao === "string" ? new RegExp(escaparRegex(padrao)) : padrao
            );
          }
        },
        erros: () => [...erros],
      };

      await use(guarda);

      const inesperados = erros.filter(
        (texto) => !permitidos.some((regex) => regex.test(texto))
      );
      expect(
        inesperados,
        `Erros de console/page inesperados:\n${inesperados.join("\n")}`
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

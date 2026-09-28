import fs from "node:fs";

/**
 * No NixOS os browsers do Playwright não ficam no cache do usuário, mas em uma
 * store path derivada (`playwright-driver.browsers`). O `AGENTS.md` do projeto
 * exige que apenas a instalação local versionada seja usada. Quando a variável
 * de ambiente não estiver presente (ex.: shell não-interativo), resolvemos a
 * store path do Nix de forma determinística, sem instalar nada.
 */
export function resolverPlaywrightBrowsersPath(): string | undefined {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return undefined;
  try {
    const candidatos = fs
      .readdirSync("/nix/store")
      .filter((nome) => nome.endsWith("-playwright-browsers"))
      .map((nome) => `/nix/store/${nome}`)
      .filter((caminho) => {
        try {
          return fs
            .readdirSync(caminho)
            .some((entrada) => entrada.startsWith("chromium") || entrada.startsWith("firefox"));
        } catch {
          return false;
        }
      });
    if (candidatos.length === 0) return undefined;
    return candidatos[candidatos.length - 1];
  } catch {
    return undefined;
  }
}

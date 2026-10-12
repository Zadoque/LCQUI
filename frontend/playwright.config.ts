import { defineConfig, devices } from "@playwright/test";
import { resolverPlaywrightBrowsersPath } from "./e2e/helpers/browsers";

const browsersPath = resolverPlaywrightBrowsersPath();
if (browsersPath) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
}

const BASE_URL = process.env.LCQUI_E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/specs",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: `${BASE_URL}/login`,
    // O servidor dos testes sempre recebe a flag explícita do Emulator.
    // Não reutilizar um Next já iniciado evita que um processo de homologação
    // seja confundido com a aplicação isolada dos testes.
    reuseExistingServer: false,
    env: {
      ...process.env,
      NEXT_PUBLIC_FIREBASE_USE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.LCQUI_E2E_PROJECT_ID ?? "lcqui-dev",
    },
    timeout: 120_000,
  },
});

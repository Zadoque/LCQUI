import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  AUTH_EMULATOR,
  FIRESTORE_EMULATOR,
  FUNCTIONS_EMULATOR,
  PROJECT_ID,
  emuladoresDisponiveis,
} from "./helpers/emulator";

/**
 * Estado canônico do Firebase Emulator Suite antes da suíte.
 *
 * O seed canônico (`functions/scripts/seed.ts`) é a única fonte de fixtures.
 * O reset é explícito e aborta a suíte se os emuladores não estiverem ativos,
 * sem qualquer fallback para Firebase real.
 */
export default async function globalSetup(): Promise<void> {
  const indisponiveis = await emuladoresDisponiveis();
  if (indisponiveis.length > 0) {
    throw new Error(
      [
        "Firebase Emulator Suite não está totalmente disponível.",
        `Indisponíveis: ${indisponiveis.join(", ")}.`,
        `Esperado: Auth ${AUTH_EMULATOR}, Firestore ${FIRESTORE_EMULATOR}, Functions ${FUNCTIONS_EMULATOR}.`,
        "Suba os emuladores (ex.: `npm run test:e2e:emulators`) antes de `npm run test:e2e`.",
      ].join(" ")
    );
  }

  const functionsDir = path.resolve(__dirname, "..", "..", "functions");
  const tsx = path.join(functionsDir, "node_modules", ".bin", "tsx");

  execFileSync(tsx, ["scripts/seed.ts", "--reset"], {
    cwd: functionsDir,
    env: {
      ...process.env,
      GCLOUD_PROJECT: PROJECT_ID,
      FIRESTORE_EMULATOR_HOST: FIRESTORE_EMULATOR.replace(/^https?:\/\//, ""),
      FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR.replace(/^https?:\/\//, ""),
    },
    stdio: "inherit",
  });
}

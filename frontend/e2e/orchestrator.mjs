import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Sobe o Firebase Emulator Suite, executa a suíte Playwright e derruba os
 * emuladores ao final. Usado por `npm run test:e2e:emulators`; o caminho
 * `npm run test:e2e` pressupõe ambiente já ativo (o globalSetup apenas reinicia
 * e semeia o estado).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const frontendDir = path.resolve(__dirname, "..");

const PROJECT_ID = process.env.LCQUI_E2E_PROJECT_ID ?? "lcqui-uenf";
const PORTS = [9099, 8080, 5001, 9199];

function binFirebase() {
  const local = path.join(repoRoot, "functions", "node_modules", ".bin", "firebase");
  return fs.existsSync(local) ? local : "firebase";
}

function esperarPorta(porta, timeoutMs = 90_000) {
  const inicio = Date.now();
  return new Promise((resolve, reject) => {
    const tentar = () => {
      const socket = net.connect({ host: "127.0.0.1", port: porta }, () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - inicio > timeoutMs) {
          reject(new Error(`Timeout aguardando a porta ${porta}.`));
          return;
        }
        setTimeout(tentar, 500);
      });
    };
    tentar();
  });
}

async function main() {
  const emuladores = spawn(
    binFirebase(),
    [
      "emulators:start",
      "--project",
      PROJECT_ID,
      "--only",
      "auth,firestore,functions,storage",
    ],
    { cwd: repoRoot, stdio: "inherit", detached: true }
  );

  const encerrar = (sinal) => {
    try {
      process.kill(-emuladores.pid, sinal);
    } catch {
      // processo já encerrado
    }
  };

  const codigoSaida = await new Promise((resolve) => {
    process.on("SIGINT", () => {
      encerrar("SIGINT");
      resolve(130);
    });

    (async () => {
      for (const porta of PORTS) await esperarPorta(porta);
      const testes = spawn("npx", ["--no-install", "playwright", "test"], {
        cwd: frontendDir,
        stdio: "inherit",
        env: {
          ...process.env,
          LCQUI_E2E_PROJECT_ID: PROJECT_ID,
          GCLOUD_PROJECT: PROJECT_ID,
        },
      });
      testes.on("exit", (codigo) => resolve(codigo ?? 1));
    })().catch((erro) => {
      console.error(String(erro));
      resolve(1);
    });
  });

  encerrar("SIGTERM");
  process.exit(codigoSaida);
}

main();

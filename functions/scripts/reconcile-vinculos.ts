import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { reconciliarVinculos } from "../src/manutencao/vinculos";

/**
 * CLI de reconciliação de vínculos legados.
 *
 * Segurança operacional:
 * - dry-run por padrão (sem escrita);
 * - `--apply` é obrigatório para escrever;
 * - recusa execução remota/produção sem `--allow-remote`; exige o emulador por
 *   padrão. Nenhuma execução automática no deploy.
 */
async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const allowRemote = process.argv.includes("--allow-remote");
  const noEmulator = !process.env.FIRESTORE_EMULATOR_HOST;
  if (noEmulator && !allowRemote) {
    console.error(
      "Refusando executar fora do emulador sem --allow-remote (proteção contra produção)."
    );
    process.exit(1);
  }

  initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "lcqui-uenf" });
  const db = getFirestore();

  const resultado = await reconciliarVinculos(db, { apply });
  console.log(
    JSON.stringify(
      {
        modo: apply ? "apply" : "dry-run",
        examinados: resultado.examinados,
        corrigidos: resultado.corrigidos,
        conflitos: resultado.conflitos,
        alteracoes: resultado.alteracoes,
      },
      null,
      2
    )
  );
  if (resultado.conflitos.length > 0) {
    console.error("Conflitos encontrados: nenhuma correção arbitrária foi aplicada a eles.");
    process.exit(2);
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});

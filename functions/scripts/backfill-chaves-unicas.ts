import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { backfillChavesUnicas } from "../src/manutencao/chavesUnicas";

/**
 * CLI de backfill de `Chaves_Unicas`.
 *
 * Segurança operacional:
 * - dry-run por padrão (sem escrita);
 * - `--apply` é obrigatório para escrever;
 * - recusa execução fora do emulador sem `--allow-remote`. Nenhuma execução
 *   automática no deploy.
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

  const resultado = await backfillChavesUnicas(db, { apply });
  console.log(
    JSON.stringify(
      {
        modo: apply ? "apply" : "dry-run",
        examinados: resultado.examinados,
        planejadas: resultado.planejadas,
        criadas: resultado.criadas,
        jaExistentes: resultado.jaExistentes,
        conflitos: resultado.conflitos,
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

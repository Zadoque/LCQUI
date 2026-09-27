import * as admin from "firebase-admin";

/**
 * Reconciliação idempotente de vínculos legados `Turma/{id}/Alunos/{uid}`:
 * - remove campos proibidos pela projeção mínima (e-mail e matrícula);
 * - acrescenta `id_turma` (derivável do path) e `id_aluno` (derivável do docId)
 *   quando ausentes.
 *
 * Nunca inventa `nome` nem fabrica fatos históricos. Dry-run por padrão.
 */

export interface AlteracaoVinculo {
  caminho: string;
  camposRemovidos: string[];
  camposAdicionados: string[];
}

export interface ResultadoReconciliacaoVinculos {
  examinados: number;
  corrigidos: number;
  alteracoes: AlteracaoVinculo[];
  conflitos: string[];
}

const CAMPOS_PROIBIDOS = ["email", "numero_matricula"] as const;

export async function reconciliarVinculos(
  db: admin.firestore.Firestore,
  opcoes: { apply: boolean }
): Promise<ResultadoReconciliacaoVinculos> {
  const resultado: ResultadoReconciliacaoVinculos = {
    examinados: 0,
    corrigidos: 0,
    alteracoes: [],
    conflitos: [],
  };

  const turmas = await db.collection("Turma").get();
  for (const turma of turmas.docs) {
    const alunos = await turma.ref.collection("Alunos").get();
    for (const aluno of alunos.docs) {
      resultado.examinados += 1;
      const dados = aluno.data();
      const caminho = aluno.ref.path;

      const camposRemovidos = CAMPOS_PROIBIDOS.filter(
        (campo) => dados[campo] !== undefined
      );
      const camposAdicionados: string[] = [];
      const patch: Record<string, unknown> = {};

      if (dados.id_turma === undefined) {
        patch.id_turma = turma.id;
        camposAdicionados.push("id_turma");
      } else if (dados.id_turma !== turma.id) {
        resultado.conflitos.push(
          `${caminho}: id_turma (${String(dados.id_turma)}) diverge do path (${turma.id}).`
        );
        continue;
      }
      if (dados.id_aluno === undefined) {
        patch.id_aluno = aluno.id;
        camposAdicionados.push("id_aluno");
      } else if (dados.id_aluno !== aluno.id) {
        resultado.conflitos.push(
          `${caminho}: id_aluno (${String(dados.id_aluno)}) diverge do docId (${aluno.id}).`
        );
        continue;
      }
      for (const campo of camposRemovidos) {
        patch[campo] = admin.firestore.FieldValue.delete();
      }

      if (camposRemovidos.length === 0 && camposAdicionados.length === 0) continue;

      resultado.alteracoes.push({ caminho, camposRemovidos, camposAdicionados });
      resultado.corrigidos += 1;
      if (opcoes.apply) {
        await aluno.ref.update(patch);
      }
    }
  }

  return resultado;
}

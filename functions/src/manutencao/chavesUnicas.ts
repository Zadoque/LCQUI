import * as admin from "firebase-admin";
import {
  TIPO_CHAVE_LOCAL,
  TIPO_CHAVE_MATERIA,
  TIPO_CHAVE_TURMA,
  chaveLocal,
  chaveMateria,
  chaveTurmaCodigo,
  normalizarCodigoMateria,
} from "../chaves";

/**
 * Backfill idempotente de `Chaves_Unicas` para registros preexistentes.
 * Usa as MESMAS funções de derivação do runtime (`src/chaves.ts`).
 *
 * - dry-run por padrão (o chamador decide via `apply`);
 * - fail-closed: duplicidade na origem ou chave existente apontando para outro
 *   recurso vira CONFLITO, sem escolha arbitrária nem sobrescrita.
 */

export interface ChavePlanejada {
  chave: string;
  tipo: string;
  id_recurso: string;
}

export interface ResultadoBackfillChaves {
  examinados: number;
  planejadas: ChavePlanejada[];
  criadas: string[];
  jaExistentes: string[];
  conflitos: string[];
}

interface Derivada {
  chave: string;
  tipo: string;
  id_recurso: string;
  origem: string;
}

function chaveRef(db: admin.firestore.Firestore, chave: string) {
  return db.collection("Chaves_Unicas").doc(chave);
}

export async function backfillChavesUnicas(
  db: admin.firestore.Firestore,
  opcoes: { apply: boolean }
): Promise<ResultadoBackfillChaves> {
  const resultado: ResultadoBackfillChaves = {
    examinados: 0,
    planejadas: [],
    criadas: [],
    jaExistentes: [],
    conflitos: [],
  };

  const derivadas: Derivada[] = [];

  const materias = await db.collection("Materia").get();
  for (const doc of materias.docs) {
    resultado.examinados += 1;
    const codigo = doc.data().codigo_materia;
    if (typeof codigo !== "string" || codigo.trim().length === 0) {
      resultado.conflitos.push(`Materia/${doc.id}: codigo_materia ausente/inválido.`);
      continue;
    }
    derivadas.push({
      chave: chaveMateria(normalizarCodigoMateria(codigo)),
      tipo: TIPO_CHAVE_MATERIA,
      id_recurso: doc.id,
      origem: `Materia/${doc.id}`,
    });
  }

  const locais = await db.collection("Local").get();
  for (const doc of locais.docs) {
    resultado.examinados += 1;
    const { predio, andar, sala } = doc.data();
    if (
      typeof predio !== "string" || predio.trim().length === 0 ||
      typeof andar !== "string" || andar.trim().length === 0 ||
      typeof sala !== "string" || sala.trim().length === 0
    ) {
      resultado.conflitos.push(`Local/${doc.id}: predio/andar/sala ausente/inválido.`);
      continue;
    }
    derivadas.push({
      chave: chaveLocal(predio, andar, sala),
      tipo: TIPO_CHAVE_LOCAL,
      id_recurso: doc.id,
      origem: `Local/${doc.id}`,
    });
  }

  const turmas = await db.collection("Turma").get();
  for (const doc of turmas.docs) {
    resultado.examinados += 1;
    const codigo = doc.data().codigo_turma;
    if (typeof codigo !== "string" || codigo.trim().length === 0) {
      resultado.conflitos.push(`Turma/${doc.id}: codigo_turma ausente/inválido.`);
      continue;
    }
    derivadas.push({
      chave: chaveTurmaCodigo(codigo),
      tipo: TIPO_CHAVE_TURMA,
      id_recurso: doc.id,
      origem: `Turma/${doc.id}`,
    });
  }

  // Duplicidade na origem.
  const porChave = new Map<string, Derivada[]>();
  for (const d of derivadas) {
    const lista = porChave.get(d.chave) ?? [];
    lista.push(d);
    porChave.set(d.chave, lista);
  }

  for (const [chave, lista] of porChave.entries()) {
    if (lista.length > 1) {
      resultado.conflitos.push(
        `Chave ${chave} duplicada na origem: ${lista.map((l) => l.origem).join(", ")}.`
      );
      continue;
    }
    const derivada = lista[0];
    const existente = await chaveRef(db, chave).get();
    if (!existente.exists) {
      resultado.planejadas.push({ chave, tipo: derivada.tipo, id_recurso: derivada.id_recurso });
      if (opcoes.apply) {
        await chaveRef(db, chave).set({
          tipo: derivada.tipo,
          id_recurso: derivada.id_recurso,
          criado_em: admin.firestore.FieldValue.serverTimestamp(),
        });
        resultado.criadas.push(chave);
      }
    } else if (existente.data()?.id_recurso === derivada.id_recurso) {
      resultado.jaExistentes.push(chave);
    } else {
      resultado.conflitos.push(
        `Chave ${chave} já aponta para ${String(existente.data()?.id_recurso)}, esperado ${derivada.id_recurso}.`
      );
    }
  }

  return resultado;
}

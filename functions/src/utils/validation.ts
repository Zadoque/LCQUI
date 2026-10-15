import { HttpsError } from "firebase-functions/v2/https";
import { ZodSchema, ZodError } from "zod";

/**
 * Valida o payload de entrada contra um Schema do Zod.
 * Lança um erro formatado HttpsError (invalid-argument) se a validação falhar.
 * Retorna os dados tipados e já tratados pelo Zod se a validação passar.
 *
 * @param schema Schema Zod definido para a função
 * @param data O payload (request.data)
 * @returns Os dados processados e inferidos do Schema
 */
export function validatePayload<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const detalhes = error.issues.length > 0
        ? error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(" | ")
        : error.message;
      throw new HttpsError("invalid-argument", `Erro de validação: ${detalhes}`);
    }
    // Caso seja um erro não mapeado
    throw new HttpsError("invalid-argument", "Falha inesperada na validação dos dados de entrada.");
  }
}

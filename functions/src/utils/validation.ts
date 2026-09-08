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
  } catch (error) {
    if (error instanceof ZodError) {
      // Mapeia os erros para uma mensagem descritiva
      const detalhes = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(" | ");
      throw new HttpsError("invalid-argument", `Erro de validação: ${detalhes}`);
    }
    // Caso seja um erro não mapeado
    throw new HttpsError("invalid-argument", "Falha inesperada na validação dos dados de entrada.");
  }
}

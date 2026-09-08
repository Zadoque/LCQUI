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
  } catch (error: any) {
    if (error instanceof ZodError || (error && error.name === "ZodError")) {
      // ZodError exposes .issues or .errors
      const issues = error.issues || error.errors || [];
      const detalhes = issues.length > 0 
        ? issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(" | ")
        : error.message;
      throw new HttpsError("invalid-argument", `Erro de validação: ${detalhes}`);
    }
    // Caso seja um erro não mapeado
    throw new HttpsError("invalid-argument", "Falha inesperada na validação dos dados de entrada.");
  }
}

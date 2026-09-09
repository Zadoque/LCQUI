"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePayload = validatePayload;
const https_1 = require("firebase-functions/v2/https");
const zod_1 = require("zod");
/**
 * Valida o payload de entrada contra um Schema do Zod.
 * Lança um erro formatado HttpsError (invalid-argument) se a validação falhar.
 * Retorna os dados tipados e já tratados pelo Zod se a validação passar.
 *
 * @param schema Schema Zod definido para a função
 * @param data O payload (request.data)
 * @returns Os dados processados e inferidos do Schema
 */
function validatePayload(schema, data) {
    try {
        return schema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.ZodError || (error && error.name === "ZodError")) {
            // ZodError exposes .issues or .errors
            const issues = error.issues || error.errors || [];
            const detalhes = issues.length > 0
                ? issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(" | ")
                : error.message;
            throw new https_1.HttpsError("invalid-argument", `Erro de validação: ${detalhes}`);
        }
        // Caso seja um erro não mapeado
        throw new https_1.HttpsError("invalid-argument", "Falha inesperada na validação dos dados de entrada.");
    }
}
//# sourceMappingURL=validation.js.map
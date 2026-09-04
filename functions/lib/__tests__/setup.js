"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEnv = void 0;
const firebaseFunctionsTest = require("firebase-functions-test");
// Inicializa o ambiente de testes offline (sem atingir o banco de dados de produção)
exports.testEnv = firebaseFunctionsTest();
//# sourceMappingURL=setup.js.map
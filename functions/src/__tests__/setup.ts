import firebaseFunctionsTest = require('firebase-functions-test');

// Inicializa o ambiente de testes offline (sem atingir o banco de dados de produção)
export const testEnv = firebaseFunctionsTest();

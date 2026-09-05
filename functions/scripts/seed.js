"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
var auth_1 = require("firebase-admin/auth");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
var app = (0, app_1.initializeApp)({ projectId: "lcqui-dev" });
var db = (0, firestore_1.getFirestore)(app);
var auth = (0, auth_1.getAuth)(app);
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var user, error_1, almox, esp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Iniciando seed no emulador...");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, auth.createUser({
                            uid: "usuario123",
                            email: "chefe@uenf.br",
                            password: "password123",
                            displayName: "Dr. Chefe Geral",
                        })];
                case 2:
                    user = _a.sent();
                    return [4 /*yield*/, auth.setCustomUserClaims(user.uid, { roles: ["Chefe_Geral"] })];
                case 3:
                    _a.sent();
                    console.log("Usuário chefe@uenf.br criado com sucesso!");
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    if (error_1.code === 'auth/email-already-exists') {
                        console.log("Usuário chefe@uenf.br já existe.");
                    }
                    else {
                        console.error("Erro ao criar usuário:", error_1);
                    }
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, db.collection("Almoxarifado").add({
                        nome_almoxarifado: "Almoxarifado Central",
                        predio: "P5",
                        andar: "1",
                        sala: "101"
                    })];
                case 6:
                    almox = _a.sent();
                    // Reagente / Frasco
                    return [4 /*yield*/, db.collection("Resumo_Reagente").add({
                            nome: "Etanol Absoluto",
                            estado_fisico: "Líquido",
                            natureza_quimica: "ORGANICO",
                            letra_inicial: "E",
                            tipo_substancia: "PURA"
                        })];
                case 7:
                    // Reagente / Frasco
                    _a.sent();
                    return [4 /*yield*/, db.collection("Especificacao_Reagente").add({
                            nome: "Etanol Absoluto",
                            pureza: "99%",
                            densidade: 0.789
                        })];
                case 8:
                    esp = _a.sent();
                    return [4 /*yield*/, db.collection("Lote").add({
                            id_especificacao_reagente: esp.id,
                            nome_reagente: "Etanol Absoluto",
                            marca: "Merck",
                            validade_lote: new Date(2030, 0, 1)
                        })];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, db.collection("Emprestimo_Reagente").add({
                            id_almoxarifado: almox.id,
                            medida_utilizada: 500,
                            unidade_medida_utilizada: "ml",
                            data_devolucao_efetuada: new Date(),
                            id_usuario_retirou: "usuario123",
                            finalidade_uso: "Aula Prática",
                            status: "CONCLUIDO"
                        })];
                case 10:
                    _a.sent();
                    // Patrimônio
                    return [4 /*yield*/, db.collection("Bem_Patrimonial").add({
                            numero_patrimonio: "LCQUI-001",
                            nome_equipamento: "Espectrofotômetro UV-Vis",
                            predio: "P5",
                            andar: "1",
                            sala: "101",
                            status: "Ativo",
                            estado_conservacao: "Bom",
                            nome_responsavel_sei: "Prof. Silva"
                        })];
                case 11:
                    // Patrimônio
                    _a.sent();
                    return [4 /*yield*/, db.collection("Bem_Patrimonial").add({
                            numero_patrimonio: "LCQUI-002",
                            nome_equipamento: "Agitador Magnético Quebrado",
                            predio: "P5",
                            andar: "1",
                            sala: "101",
                            status: "Inservível",
                            estado_conservacao: "Ruim",
                            nome_responsavel_sei: "Prof. Silva"
                        })];
                case 12:
                    _a.sent();
                    console.log("Seed concluído!");
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
seed().catch(console.error);

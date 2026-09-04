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
var admin = require("firebase-admin");
// Conecta ao emulador
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
admin.initializeApp({
    projectId: "lcqui-dev"
});
var db = admin.firestore();
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var email, password, user, error_1, reagenteRef, frascoRef, bemRef, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Iniciando o Seeding de dados...");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 11, , 12]);
                    email = "chefe@uenf.br";
                    password = "password123";
                    user = void 0;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, admin.auth().getUserByEmail(email)];
                case 3:
                    user = _a.sent();
                    console.log("Usuário já existe:", user.uid);
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _a.sent();
                    return [4 /*yield*/, admin.auth().createUser({
                            email: email,
                            password: password,
                            displayName: "Dr. Chefe Geral",
                        })];
                case 5:
                    user = _a.sent();
                    console.log("Usuário criado com sucesso:", user.uid);
                    return [3 /*break*/, 6];
                case 6: 
                // Definir a Custom Claim para passar pelo ProtectedRoute
                return [4 /*yield*/, admin.auth().setCustomUserClaims(user.uid, { roles: ["Chefe_Geral"] })];
                case 7:
                    // Definir a Custom Claim para passar pelo ProtectedRoute
                    _a.sent();
                    console.log("Custom Claim [Chefe_Geral] injetada no token!");
                    reagenteRef = db.collection("Resumo_Reagente").doc("SEED_R1");
                    return [4 /*yield*/, reagenteRef.set({
                            nome_reagente: "Ácido Sulfúrico",
                            formula_quimica: "H2SO4",
                            estado_fisico: "Líquido",
                            periculosidade: ["Corrosivo", "Tóxico"],
                            quantidade_total_mg_ml: 1000,
                            unidade_medida: "mL"
                        })];
                case 8:
                    _a.sent();
                    frascoRef = db.collection("Frasco_Reagente").doc("SEED_F1");
                    return [4 /*yield*/, frascoRef.set({
                            id_resumo_reagente: "SEED_R1",
                            estado_fisico_frasco: "FECHADO",
                            disponibilidade: "DISPONIVEL",
                            vencido: false,
                            em_quarentena: false,
                            lote: "LOTE-123",
                            quantidade_atual_mg_ml: 1000,
                            quantidade_inicial_mg_ml: 1000,
                            unidade_medida: "mL",
                            fornecedor: "Sigma Aldrich"
                        })];
                case 9:
                    _a.sent();
                    bemRef = db.collection("Bem_Patrimonial").doc("SEED_P1");
                    return [4 /*yield*/, bemRef.set({
                            nome_equipamento: "Microscópio Óptico Binocular",
                            numero_patrimonio: "987654",
                            estado_conservacao: "Bom estado, manutenção em dia",
                            predio: "P5",
                            andar: "Térreo",
                            sala: "Laboratório 102",
                            nome_responsavel_sei: "Prof. Alberto",
                            status: "Ativo"
                        })];
                case 10:
                    _a.sent();
                    console.log("Mock Data populado no Firestore Emulator com sucesso!");
                    process.exit(0);
                    return [3 /*break*/, 12];
                case 11:
                    error_2 = _a.sent();
                    console.error("Erro durante o seeding:", error_2);
                    process.exit(1);
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
seed();

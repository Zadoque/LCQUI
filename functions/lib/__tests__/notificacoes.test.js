"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";
const admin = __importStar(require("firebase-admin"));
const firebase_functions_test_1 = __importDefault(require("firebase-functions-test"));
const notificacoes_1 = require("../notificacoes");
const testEnv = (0, firebase_functions_test_1.default)({ projectId: "lcqui-dev" });
describe("Módulo de Notificações", () => {
    let db;
    beforeAll(() => {
        if (!admin.apps.length) {
            admin.initializeApp({ projectId: "lcqui-dev" });
        }
        db = admin.firestore();
    });
    afterAll(() => {
        testEnv.cleanup();
    });
    const mockRequest = (data, uid) => ({
        data,
        auth: {
            uid,
            token: { roles: [] }
        },
        rawRequest: {}
    });
    it("deve marcar notificação como lida", async () => {
        const notifRef = db.collection("Usuarios").doc("user_notif").collection("Notificacoes").doc("notif1");
        await notifRef.set({
            lida: false,
            tipo: "POST"
        });
        const wrapped = testEnv.wrap(notificacoes_1.marcarNotificacaoComoLida);
        await wrapped(mockRequest({ idNotificacao: "notif1" }, "user_notif"));
        const snap = await notifRef.get();
        expect(snap.data()?.lida).toBe(true);
        expect(snap.data()?.lida_em).toBeDefined();
    });
    it("deve falhar ao marcar notificação inexistente como lida", async () => {
        const wrapped = testEnv.wrap(notificacoes_1.marcarNotificacaoComoLida);
        await expect(wrapped(mockRequest({ idNotificacao: "nao_existe" }, "user_notif")))
            .rejects.toThrow(/não encontrada/i);
    });
});
//# sourceMappingURL=notificacoes.test.js.map
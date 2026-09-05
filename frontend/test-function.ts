import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from "firebase/auth";

const app = initializeApp({ projectId: "lcqui-dev", apiKey: "fake-api-key" });
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099");

const functions = getFunctions(app);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

async function test() {
  try {
    await signInWithEmailAndPassword(auth, "prof@lcqui.ufsc.br", "password123");
    const criarTurmaFn = httpsCallable(functions, "criarTurma");
    
    console.log("Chamando criarTurma...");
    const res = await criarTurmaFn({
      idMateria: "MAT_TEMP_ID",
      nomeMateria: "Matéria Temporária",
      nomeTurma: "Quimica A",
      ano: 2026,
      semestre: 1,
      capacidade: 40
    });
    console.log("Sucesso:", res.data);
  } catch (e: any) {
    console.error("ERRO RECEBIDO:", e.message);
  }
}

test();

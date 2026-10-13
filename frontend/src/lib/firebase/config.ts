import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "lcqui-dev.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "lcqui-dev",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "lcqui-dev.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
/**
 * Mantém as consultas já materializadas no IndexedDB entre navegações.
 * O listener ainda é reaberto ao retornar à tela, mas o SDK pode entregar o
 * snapshot do cache e sincronizar somente alterações; isso reduz leituras
 * repetidas sem transformar o cache em fonte de autoridade.
 */
const db = (() => {
  if (typeof window === "undefined") return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // HMR, navegador sem IndexedDB ou outra instância já inicializada:
    // preservar a execução online com o cache padrão do SDK.
    return getFirestore(app);
  }
})();
const storage = getStorage(app);
const functions = getFunctions(app);

const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";

// O emulador só é usado quando o ambiente de teste o solicita explicitamente.
// NODE_ENV=development também é usado na homologação local contra o Firebase real.
const firebaseRuntime = globalThis as typeof globalThis & {
  __lcquiFirebaseEmulatorsConnected?: boolean;
};

if (useEmulators && !firebaseRuntime.__lcquiFirebaseEmulatorsConnected) {
  // O aviso visual padrão do SDK fica sobre a interface e intercepta cliques
  // em modais; o modo de emulador já é indicado pelo ambiente de testes.
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  firebaseRuntime.__lcquiFirebaseEmulatorsConnected = true;
}

export { app, auth, db, storage, functions };

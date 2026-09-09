const admin = require("firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

admin.initializeApp({
  projectId: "lcqui-uenf"
});

const db = admin.firestore();
const auth = admin.auth();

async function seed() {
  console.log("Iniciando seed do Emulador...");
  
  const email = "chefe@lcqui.com";
  const password = "password123";

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: "Chefe Geral (Seed)",
    });

    const uid = userRecord.uid;
    console.log(`Usuário criado no Auth com UID: ${uid}`);

    await db.collection("Usuarios").doc(uid).set({
      nome: "Chefe Geral (Seed)",
      email: email,
      ativo: true,
      criado_em: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Usuário inserido na coleção Usuarios.`);

    await db.collection("Chefe_Geral").doc(uid).set({
      nome: "Chefe Geral (Seed)",
      email: email
    });
    console.log(`Usuário inserido na coleção Chefe_Geral.`);

    await auth.setCustomUserClaims(uid, { roles: ["Chefe_Geral"] });
    console.log(`Custom Claims (roles: ['Chefe_Geral']) configuradas.`);

    console.log("Seed concluído com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro durante o seed:", error);
    process.exit(1);
  }
}

seed();

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Conectar ao emulador
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

initializeApp({ projectId: "lcqui-uenf" });

async function seed() {
  const auth = getAuth();
  const db = getFirestore();

  console.log("🌱 Iniciando seed...");

  // Criar Professor
  try {
    const profUser = await auth.createUser({
      uid: "prof-teste",
      email: "prof@lcqui.ufsc.br",
      password: "password123",
      displayName: "Professor Teste",
    });
    await auth.setCustomUserClaims(profUser.uid, { roles: ["Professor"] });
    
    await db.collection("Usuario").doc(profUser.uid).set({
      nome: "Professor Teste",
      email: "prof@lcqui.ufsc.br",
      papeis: ["Professor"],
      data_criacao: new Date()
    });
    
    await db.collection("Professor").doc(profUser.uid).set({
      id_usuario: profUser.uid,
      departamento: "Química"
    });
    console.log("✅ Professor Teste criado (prof@lcqui.ufsc.br / password123)");
  } catch (e: any) {
    if (e.code === 'auth/uid-already-exists') console.log("Professor já existe.");
    else console.error(e);
  }

  // Criar Chefe Geral
  try {
    const chefeUser = await auth.createUser({
      uid: "chefe-teste",
      email: "zadoquepiresdedeus@gmail.com",
      password: "password123",
      displayName: "Chefe Geral (Zadoque)",
    });
    await auth.setCustomUserClaims(chefeUser.uid, { roles: ["Chefe_Geral"] });
    await db.collection("Usuario").doc(chefeUser.uid).set({
      nome: "Chefe Geral (Zadoque)",
      email: "zadoquepiresdedeus@gmail.com",
      papeis: ["Chefe_Geral"],
      data_criacao: new Date()
    });
    console.log("✅ Chefe Geral criado (zadoquepiresdedeus@gmail.com / password123)");
  } catch (e: any) {
    if (e.code === 'auth/uid-already-exists') console.log("Chefe já existe.");
    else console.error(e);
  }

  // Criar Gestor Almoxarifado
  try {
    const gestorUser = await auth.createUser({
      uid: "gestor-teste",
      email: "gestor@lcqui.ufsc.br",
      password: "password123",
      displayName: "Gestor Almoxarifado",
    });
    await auth.setCustomUserClaims(gestorUser.uid, { roles: ["Gestor_Almoxarifado"] });
    await db.collection("Usuario").doc(gestorUser.uid).set({
      nome: "Gestor Almoxarifado Teste",
      email: "gestor@lcqui.ufsc.br",
      papeis: ["Gestor_Almoxarifado"],
      data_criacao: new Date()
    });
    // E atribuir a ele um almoxarifado no mock
    await db.collection("Almoxarifado").doc("almox_principal").set({
      nome_almoxarifado: "Almoxarifado Central",
      predio: "Reitoria",
      sala: "101"
    });
    await db.collection("Gestor_Almoxarifado_x_Almoxarifado").add({
      id_gestor_almoxarifado: gestorUser.uid,
      id_almoxarifado: "almox_principal",
      papel_neste_almoxarifado: "TITULAR",
      vinculado_em: new Date()
    });
    console.log("✅ Gestor de Almoxarifado criado (gestor@lcqui.ufsc.br / password123)");
  } catch (e: any) {
    if (e.code === 'auth/uid-already-exists') console.log("Gestor já existe.");
    else console.error(e);
  }

  // Criar Aluno
  try {
    const alunoUser = await auth.createUser({
      uid: "aluno-teste",
      email: "aluno@lcqui.ufsc.br",
      password: "password123",
      displayName: "Aluno Teste",
    });
    await auth.setCustomUserClaims(alunoUser.uid, { roles: ["Aluno"] });

    await db.collection("Usuario").doc(alunoUser.uid).set({
      nome: "Aluno Teste",
      email: "aluno@lcqui.ufsc.br",
      papeis: ["Aluno"],
      data_criacao: new Date()
    });
    
    await db.collection("Aluno").doc(alunoUser.uid).set({
      id_usuario: alunoUser.uid,
      numero_matricula: "20261001",
      curso: "Química Licenciatura"
    });
    console.log("✅ Aluno Teste criado (aluno@lcqui.ufsc.br / password123)");
  } catch (e: any) {
    if (e.code === 'auth/uid-already-exists') console.log("Aluno já existe.");
    else console.error(e);
  }

  console.log("✨ Seed finalizado!");
}

seed().catch(console.error);

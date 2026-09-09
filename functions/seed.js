const admin = require("firebase-admin");

process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

// O id do projeto precisa coincidir com o do emulador
admin.initializeApp({ projectId: "lcqui-uenf" });

const auth = admin.auth();
const db = admin.firestore();

const testUsers = [
  { email: "chefe@uenf.br", password: "password", displayName: "Chefe Geral (Admin)", role: "Chefe_Geral" },
  { email: "prof@uenf.br", password: "password", displayName: "Professor Teste", role: "Professor" },
  { email: "almoxarifado@uenf.br", password: "password", displayName: "Gestor Almoxarifado", role: "Gestor_Almoxarifado" },
  { email: "patrimonio@uenf.br", password: "password", displayName: "Gestor Patrimônio", role: "Gestor_Bens_Patrimoniais" },
  { email: "aluno@uenf.br", password: "password", displayName: "Aluno Teste", role: "Aluno" }
];

async function seed() {
  console.log("Iniciando seeder de usuários de teste no emulador...");
  for (const u of testUsers) {
    try {
      // 1. Criar usuário no Auth
      const userRecord = await auth.createUser({
        email: u.email,
        password: u.password,
        displayName: u.displayName,
      });
      
      // 2. Setar a claim (role) para o controle de acesso funcionar no frontend e security rules
      await auth.setCustomUserClaims(userRecord.uid, { roles: [u.role] });
      
      // 3. Salvar documento no Firestore
      await db.collection("Usuarios").doc(userRecord.uid).set({
        email: u.email,
        nome: u.displayName,
        roles: [u.role],
        criado_em: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Criado: ${u.email} com a role [${u.role}] (senha: password)`);
    } catch (e) {
      console.error(`❌ Erro ao criar ${u.email}:`, e.message);
    }
  }
  console.log("Seeding concluído!");
  process.exit(0);
}

seed();

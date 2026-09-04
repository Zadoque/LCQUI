import * as admin from 'firebase-admin';

// Conecta ao emulador
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

admin.initializeApp({
  projectId: "lcqui-dev"
});

const db = admin.firestore();

async function seed() {
  console.log("Iniciando o Seeding de dados...");

  try {
    // 1. Criar um usuário Chefe Geral no Firebase Auth Emulator
    const email = "chefe@uenf.br";
    const password = "password123";
    let user;
    
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log("Usuário já existe:", user.uid);
    } catch (error) {
      user = await admin.auth().createUser({
        email,
        password,
        displayName: "Dr. Chefe Geral",
      });
      console.log("Usuário criado com sucesso:", user.uid);
    }

    // Definir a Custom Claim para passar pelo ProtectedRoute
    await admin.auth().setCustomUserClaims(user.uid, { roles: ["Chefe_Geral"] });
    console.log("Custom Claim [Chefe_Geral] injetada no token!");

    // 2. Popular o Banco (Reagentes e Patrimônio)
    
    // Reagentes
    const reagenteRef = db.collection("Resumo_Reagente").doc("SEED_R1");
    await reagenteRef.set({
      nome: "Ácido Sulfúrico",
      letra_inicial: "A",
      natureza_quimica: "INORGANICO",
      formula_quimica: "H2SO4",
      estado_fisico: "Líquido",
      riscos: ["Corrosivo", "Tóxico"],
      quantidade_total_mg_ml: 1000,
      unidade_medida: "mL"
    });

    const frascoRef = db.collection("Frasco_Reagente").doc("SEED_F1");
    await frascoRef.set({
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
    });

    // Patrimônio
    const bemRef = db.collection("Bem_Patrimonial").doc("SEED_P1");
    await bemRef.set({
      nome_equipamento: "Microscópio Óptico Binocular",
      numero_patrimonio: "987654",
      estado_conservacao: "Bom",
      predio: "P5",
      andar: "Térreo",
      sala: "Laboratório 102",
      nome_responsavel_sei: "Prof. Alberto",
      status: "Ativo"
    });

    console.log("Mock Data populado no Firestore Emulator com sucesso!");
    process.exit(0);

  } catch (error) {
    console.error("Erro durante o seeding:", error);
    process.exit(1);
  }
}

seed();

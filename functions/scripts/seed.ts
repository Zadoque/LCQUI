import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

const app = initializeApp({ projectId: "lcqui-dev" });
const db = getFirestore(app);
const auth = getAuth(app);

async function seed() {
  console.log("Iniciando seed no emulador...");

  // Criar Usuário Chefe
  try {
    const user = await auth.createUser({
      uid: "usuario123",
      email: "chefe@uenf.br",
      password: "password123",
      displayName: "Dr. Chefe Geral",
    });
    await auth.setCustomUserClaims(user.uid, { roles: ["Chefe_Geral"] });
    console.log("Usuário chefe@uenf.br criado com sucesso!");
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists' || error.code === 'auth/uid-already-exists') {
      console.log("Usuário chefe@uenf.br já existe.");
    } else {
      console.error("Erro ao criar usuário:", error);
    }
  }

  // Almoxarifado
  const almox = await db.collection("Almoxarifado").add({
    nome_almoxarifado: "Almoxarifado Central",
    predio: "P5",
    andar: "1",
    sala: "101"
  });

  // Reagente / Frasco
  await db.collection("Resumo_Reagente").add({
    nome: "Etanol Absoluto",
    estado_fisico: "Líquido",
    natureza_quimica: "ORGANICO",
    letra_inicial: "E",
    tipo_substancia: "PURA"
  });

  const esp = await db.collection("Especificacao_Reagente").add({
    nome: "Etanol Absoluto",
    pureza: "99%",
    densidade: 0.789
  });

  await db.collection("Lote").add({
    id_especificacao_reagente: esp.id,
    nome_reagente: "Etanol Absoluto",
    marca: "Merck",
    validade_lote: new Date(2030, 0, 1)
  });

  await db.collection("Emprestimo_Reagente").add({
    id_almoxarifado: almox.id,
    medida_utilizada: 500,
    unidade_medida_utilizada: "ml",
    data_devolucao_efetuada: new Date(),
    id_usuario_retirou: "usuario123",
    finalidade_uso: "Aula Prática",
    status: "CONCLUIDO"
  });

  // Patrimônio
  await db.collection("Bem_Patrimonial").add({
    numero_patrimonio: "987654",
    nome_equipamento: "Espectrofotômetro UV-Vis",
    predio: "P5",
    andar: "1",
    sala: "101",
    status: "Ativo",
    estado_conservacao: "Bom",
    nome_responsavel_sei: "Prof. Silva"
  });

  await db.collection("Bem_Patrimonial").add({
    numero_patrimonio: "987655",
    nome_equipamento: "Agitador Magnético Quebrado",
    predio: "P5",
    andar: "1",
    sala: "101",
    status: "Inservível",
    estado_conservacao: "Ruim",
    nome_responsavel_sei: "Prof. Silva"
  });

  console.log("Seed concluído!");
  process.exit(0);
}

seed().catch(console.error);

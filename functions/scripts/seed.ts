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

  // ==========================================
  // INJEÇÃO DE DADOS DE TESTE - FICHA DE CONFERÊNCIA
  // ==========================================
  console.log("📦 Injetando Resumos e Lotes de Reagente...");
  
  // 1. Resumos e Especificações
  await db.collection("Resumo_Reagente").doc("resumo_1").set({
    nome: "Ácido Sulfúrico",
    letra_inicial: "A",
    estado_fisico: "LIQUIDO",
    natureza_quimica: "INORGANICO"
  });
  
  await db.collection("Resumo_Reagente").doc("resumo_1").collection("Especificacoes").doc("espec_1").set({
    descricao: "Ácido Sulfúrico P.A. 98%",
    estado_fisico: "LIQUIDO",
    unidade_de_medida: "ml",
    fabricante: "Merck"
  });

  await db.collection("Resumo_Reagente").doc("resumo_2").set({
    nome: "Cloreto de Sódio",
    letra_inicial: "C",
    estado_fisico: "SOLIDO",
    natureza_quimica: "INORGANICO"
  });
  
  await db.collection("Resumo_Reagente").doc("resumo_2").collection("Especificacoes").doc("espec_2").set({
    descricao: "NaCl P.A. ACS",
    estado_fisico: "SOLIDO",
    unidade_de_medida: "g",
    fabricante: "Synth"
  });

  // 2. Lotes
  await db.collection("Lote").doc("lote_1").set({
    id_especificacao_reagente: "espec_1",
    nome_reagente: "Ácido Sulfúrico",
    numero_lote: "LOTE-VALIDO-2028",
    data_validade: new Date(2028, 0, 1)
  });

  await db.collection("Lote").doc("lote_2").set({
    id_especificacao_reagente: "espec_2",
    nome_reagente: "Cloreto de Sódio",
    numero_lote: "LOTE-VENCIDO-2020",
    data_validade: new Date(2020, 0, 1)
  });

  // 3. Frascos
  console.log("🧪 Injetando Frascos de Reagente...");

  // Frasco 1: LCQUI-1 (Com lote, com histórico, válido)
  const dataCadastroFrasco1 = new Date(); dataCadastroFrasco1.setHours(dataCadastroFrasco1.getHours() - 72);
  await db.collection("Frasco_Reagente").doc("frasco_1").set({
    codigo_frasco: "LCQUI-1",
    id_almoxarifado: "almox_principal",
    id_lote: "lote_1",
    id_especificacao_reagente: null,
    id_resumo_reagente: "resumo_1",
    nome_reagente: "Ácido Sulfúrico",
    unidade_medida: "ml",
    conteudo_nominal: 1000,
    peso_no_cadastrado: 1500,
    peso_atual: 1450,
    estado_fisico_frasco: "ABERTO",
    disponibilidade: "DISPONIVEL",
    vencido: false,
    cadastrado_em: dataCadastroFrasco1,
    cadastrado_por: "gestor-teste"
  });

  // Histórico Frasco 1
  const t1 = new Date(); t1.setHours(t1.getHours() - 48);
  const t2 = new Date(); t2.setHours(t2.getHours() - 24);
  const t3 = new Date(); t3.setHours(t3.getHours() - 2);
  
  await db.collection("Historico_Frasco_Reagente").add({
    id_frasco_reagente: "frasco_1", id_almoxarifado: "almox_principal", id_gestor: "gestor-teste",
    tipo: "CADASTRO", timestamp: dataCadastroFrasco1, peso_anterior: 0, peso_novo: 1500
  });
  await db.collection("Historico_Frasco_Reagente").add({
    id_frasco_reagente: "frasco_1", id_almoxarifado: "almox_principal", id_gestor: "gestor-teste",
    tipo: "SAIU", timestamp: t1, peso_anterior: 1500, peso_novo: 1500
  });
  await db.collection("Historico_Frasco_Reagente").add({
    id_frasco_reagente: "frasco_1", id_almoxarifado: "almox_principal", id_gestor: "gestor-teste",
    tipo: "ENTROU", timestamp: t2, peso_anterior: 1500, peso_novo: 1455, medida_ajustada: 45, unidade: "ml"
  });
  await db.collection("Historico_Frasco_Reagente").add({
    id_frasco_reagente: "frasco_1", id_almoxarifado: "almox_principal", id_gestor: "gestor-teste",
    tipo: "AJUSTE", timestamp: t3, peso_anterior: 1455, peso_novo: 1450, medida_ajustada: 5, unidade: "ml"
  });
  // Último empréstimo do Frasco 1
  await db.collection("Emprestimo_Reagente").add({
    id_frasco_reagente: "frasco_1", id_usuario_retirou: "prof-teste", nome_usuario_retirou: "Professor Teste",
    id_almoxarifado: "almox_principal", nome_reagente: "Ácido Sulfúrico", status: "DEVOLVIDO",
    data_retirada: t1, data_devolucao_efetuada: t2, peso_saida: 1500, peso_retorno: 1455
  });

  // Frasco 2: LCQUI-2 (Sem lote, direto na especificação, sem histórico extra)
  const dataCadastroFrasco2 = new Date();
  await db.collection("Frasco_Reagente").doc("frasco_2").set({
    codigo_frasco: "LCQUI-2",
    id_almoxarifado: "almox_principal",
    id_lote: null,
    id_especificacao_reagente: "espec_2",
    id_resumo_reagente: "resumo_2",
    nome_reagente: "Cloreto de Sódio",
    unidade_medida: "g",
    conteudo_nominal: 500,
    peso_no_cadastrado: 550,
    peso_atual: 550,
    estado_fisico_frasco: "FECHADO",
    disponibilidade: "DISPONIVEL",
    vencido: false,
    cadastrado_em: dataCadastroFrasco2,
    cadastrado_por: "gestor-teste"
  });
  await db.collection("Historico_Frasco_Reagente").add({
    id_frasco_reagente: "frasco_2", id_almoxarifado: "almox_principal", id_gestor: "gestor-teste",
    tipo: "CADASTRO", timestamp: dataCadastroFrasco2, peso_anterior: 0, peso_novo: 550
  });

  // Frasco 3: LCQUI-3 (Com lote vencido)
  const dataCadastroFrasco3 = new Date();
  await db.collection("Frasco_Reagente").doc("frasco_3").set({
    codigo_frasco: "LCQUI-3",
    id_almoxarifado: "almox_principal",
    id_lote: "lote_2",
    id_especificacao_reagente: null,
    id_resumo_reagente: "resumo_2",
    nome_reagente: "Cloreto de Sódio",
    unidade_medida: "g",
    conteudo_nominal: 500,
    peso_no_cadastrado: 550,
    peso_atual: 550,
    estado_fisico_frasco: "FECHADO",
    disponibilidade: "DISPONIVEL",
    vencido: true,
    em_quarentena: true,
    cadastrado_em: dataCadastroFrasco3,
    cadastrado_por: "gestor-teste"
  });
  await db.collection("Historico_Frasco_Reagente").add({
    id_frasco_reagente: "frasco_3", id_almoxarifado: "almox_principal", id_gestor: "gestor-teste",
    tipo: "CADASTRO", timestamp: dataCadastroFrasco3, peso_anterior: 0, peso_novo: 550
  });

  console.log("✨ Seed finalizado!");
}

seed().catch(console.error);

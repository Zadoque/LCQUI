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

  console.log("🌱 Iniciando seed único...");

  // 1. Criar Papéis de Gestão e Administrativos
  const roles = [
    { email: "chefe@lcqui.uenf.br", nome: "Chefe Geral", role: "Chefe_Geral" },
    { email: "almoxarifado@lcqui.uenf.br", nome: "Gestor Almoxarifado", role: "Gestor_Almoxarifado" },
    { email: "patrimonio@lcqui.uenf.br", nome: "Gestor Bens Patrimoniais", role: "Gestor_Bens_Patrimoniais" },
    { email: "bolsista@lcqui.uenf.br", nome: "Bolsista", role: "Bolsista" },
  ];

  for (const r of roles) {
    let uid;
    try {
      const user = await auth.createUser({ email: r.email, password: "password123", displayName: r.nome });
      uid = user.uid;
      console.log(`✅ ${r.role} criado (${r.email} / senha: password123)`);
    } catch (e: any) {
      if (e.code === 'auth/email-already-exists') {
        const user = await auth.getUserByEmail(r.email);
        uid = user.uid;
        console.log(`ℹ️ ${r.role} já existe (${r.email}).`);
      } else {
        console.error(e);
        continue;
      }
    }

    await auth.setCustomUserClaims(uid, { roles: [r.role] });
    await db.collection("Usuarios").doc(uid).set({
      nome: r.nome, email: r.email, papeis: [r.role], data_criacao: new Date()
    });
    await db.collection(r.role).doc(uid).set({
      id_usuario: uid, 
      ...(r.role === 'Gestor_Almoxarifado' ? { departamento: "Química" } : {})
    });
  }

  // 2. Criar 3 Professores
  const professores = [];
  for (let i = 1; i <= 3; i++) {
    const email = `prof${i}@lcqui.uenf.br`;
    let uid;
    try {
      const user = await auth.createUser({ email, password: "password123", displayName: `Professor ${i}` });
      uid = user.uid;
      console.log(`✅ Professor ${i} criado (${email} / senha: password123)`);
    } catch (e: any) {
      if (e.code === 'auth/email-already-exists') {
        const user = await auth.getUserByEmail(email);
        uid = user.uid;
        console.log(`ℹ️ Professor ${i} já existe.`);
      } else {
        console.error(e);
        continue;
      }
    }

    professores.push(uid);
    await auth.setCustomUserClaims(uid, { roles: ["Professor"] });
    await db.collection("Usuarios").doc(uid).set({
      nome: `Professor ${i}`, email, papeis: ["Professor"], data_criacao: new Date()
    });
    await db.collection("Professor").doc(uid).set({ id_usuario: uid, departamento: "Química" });
  }

  // 3. Criar 6 Alunos
  const alunos = [];
  for (let i = 1; i <= 6; i++) {
    const email = `aluno${i}@lcqui.uenf.br`;
    let uid;
    try {
      const user = await auth.createUser({ email, password: "password123", displayName: `Aluno ${i}` });
      uid = user.uid;
      console.log(`✅ Aluno ${i} criado (${email} / senha: password123)`);
    } catch (e: any) {
      if (e.code === 'auth/email-already-exists') {
        const user = await auth.getUserByEmail(email);
        uid = user.uid;
        console.log(`ℹ️ Aluno ${i} já existe.`);
      } else {
        console.error(e);
        continue;
      }
    }

    alunos.push(uid);
    await auth.setCustomUserClaims(uid, { roles: ["Aluno"] });
    await db.collection("Usuarios").doc(uid).set({
      nome: `Aluno ${i}`, email, papeis: ["Aluno"], data_criacao: new Date()
    });
    await db.collection("Aluno").doc(uid).set({
      id_usuario: uid, numero_matricula: `2026${i.toString().padStart(4, '0')}`, curso: "Química"
    });
  }

  // 4. Criar 3 Turmas para cada Professor
  console.log("🏫 Criando Turmas...");
  for (const profId of professores) {
    for (let t = 1; t <= 3; t++) {
      const turmaId = `turma-${profId}-${t}`;
      const nomeTurma = `Química ${t} - Prof ${profId.replace('prof-', '')}`;
      await db.collection("Turma").doc(turmaId).set({
        id_professor: profId,
        nome_disciplina: nomeTurma,
        codigo_disciplina: `QUI${t}00`,
        semestre: "2026.1",
        horario: "14:00 - 16:00",
        local: "Sala 101",
        ativa: true
      });
    }
  }
  console.log("✅ Turmas criadas (3 por professor).");

  // 5. Criar 10 Substâncias Químicas PURAS e 10 MISTURAS
  console.log("🧪 Criando Substâncias Químicas Base...");
  const puras = [
    "Água (H2O)", "Etanol", "Metanol", "Ácido Clorídrico", "Ácido Sulfúrico", 
    "Hidróxido de Sódio", "Hidróxido de Potássio", "Cloreto de Sódio", "Sulfato de Cobre", "Nitrato de Prata"
  ];
  for (let i = 0; i < 10; i++) {
    await db.collection("Substancia_Quimica").doc(`pura-${i}`).set({
      nome: puras[i], cas_number: `1000-${i}-0`, formula_quimica: "Var", ativo: true
    });
  }

  const misturas = [
    "Álcool 70%", "Solução de NaOH 1M", "Solução de HCl 0.1M", "Álcool Absoluto", "Tampão Fosfato pH 7", 
    "Solução de NaCl 0.9%", "Solução de CuSO4 10%", "Solução de AgNO3 5%", "Ácido Sulfúrico Diluído 10%", "Reagente de Tollens"
  ];
  for (let i = 0; i < 10; i++) {
    await db.collection("Substancia_Quimica").doc(`mistura-${i}`).set({
      nome: misturas[i], cas_number: `2000-${i}-0`, formula_quimica: "Mistura", ativo: true
    });
  }
  console.log("✅ 20 Substâncias químicas base criadas (10 Puras, 10 Misturas).");

  console.log("✨ Seed finalizado com sucesso!");
}

seed().catch(console.error);

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'lcqui-uenf' });
async function main() {
  const db = admin.firestore();
  const col = await db.collection('Usuarios').limit(1).get();
  console.log('Usuarios empty:', col.empty);
  const alunoCol = await db.collection('Aluno').limit(1).get();
  console.log('Aluno empty:', alunoCol.empty);
  const profCol = await db.collection('Professor').limit(1).get();
  console.log('Professor empty:', profCol.empty);
}
main();

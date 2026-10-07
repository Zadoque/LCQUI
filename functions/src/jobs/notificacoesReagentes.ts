import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue } from "firebase-admin/firestore";

const TIME_ZONE = "America/Sao_Paulo";

function dataCivilSaoPaulo(agora: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

/**
 * Autoridade temporal de M8: só este job transforma validade efetiva expirada
 * em `vencido=true` e emite o alerta diário para gestores vinculados.
 */
export async function executarVerificacaoVencimentos(): Promise<void> {
  const db = admin.firestore();
  const agora = new Date();
  const candidatos = await db.collection("Frasco_Reagente")
    .where("vencido", "==", false)
    .where("validade_efetiva", "<=", agora)
    .get();

  if (candidatos.empty) return;

  const porAlmoxarifado = new Map<string, number>();
  const batch = db.batch();
  for (const doc of candidatos.docs) {
    const dados = doc.data();
    const idAlmoxarifado = dados.id_almoxarifado;
    if (typeof idAlmoxarifado !== "string" || idAlmoxarifado.length === 0) {
      throw new Error(`Frasco ${doc.id} sem id_almoxarifado; job interrompido fail-closed.`);
    }
    batch.update(doc.ref, { vencido: true });
    const historico = db.collection("Historico_Frasco_Reagente").doc();
    batch.set(historico, {
      id_frasco_reagente: doc.id,
      id_almoxarifado: idAlmoxarifado,
      id_gestor: "__SISTEMA__",
      tipo: "VENCEU",
      timestamp: FieldValue.serverTimestamp(),
    });
    porAlmoxarifado.set(idAlmoxarifado, (porAlmoxarifado.get(idAlmoxarifado) ?? 0) + 1);
  }
  await batch.commit();

  const dataCivil = dataCivilSaoPaulo(agora);
  let notificacoesCriadas = 0;
  for (const [idAlmoxarifado, quantidade] of porAlmoxarifado) {
    const gestores = await db.collection("Gestor_Almoxarifado_x_Almoxarifado")
      .where("id_almoxarifado", "==", idAlmoxarifado)
      .get();
    for (const gestor of gestores.docs) {
      const uid = gestor.data().id_gestor_almoxarifado;
      if (typeof uid !== "string" || uid.length === 0) {
        throw new Error(`Vínculo ${gestor.id} sem gestor; job interrompido fail-closed.`);
      }
      const ref = db.collection("Usuarios").doc(uid).collection("Notificacoes")
        .doc(`vencidos_${idAlmoxarifado}_${dataCivil}`);
      const criou = await db.runTransaction(async (tx) => {
        const existente = await tx.get(ref);
        if (existente.exists) return false;
        tx.create(ref, {
          id_destinatario: uid,
          papel_destinatario: "Gestor_Almoxarifado",
          tipo: "FRASCOS_VENCIDOS",
          id_quem_fez_acao: null,
          id_turma: null,
          quantidade,
          entidade_alvo: "Almoxarifado",
          id_alvo: idAlmoxarifado,
          mensagem_customizada: null,
          lida: false,
          lida_em: null,
          emitida_em: FieldValue.serverTimestamp(),
          expira_em: null,
          contem_conteudo_protegido: false,
        });
        return true;
      });
      if (criou) notificacoesCriadas += 1;
    }
  }
  console.info("Vencimentos de frascos processados", {
    frascosAtualizados: candidatos.size,
    notificacoesCriadas,
  });
}

export const verificarVencimentosFrascos = onSchedule({
  schedule: "every day 03:00",
  timeZone: TIME_ZONE,
}, async () => executarVerificacaoVencimentos());

export { dataCivilSaoPaulo };

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

async function criarNotificacaoSeAusente(
  db: admin.firestore.Firestore,
  uid: string,
  idNotificacao: string,
  dados: Record<string, unknown>
): Promise<boolean> {
  const ref = db.collection("Usuarios").doc(uid).collection("Notificacoes").doc(idNotificacao);
  return db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return false;
    tx.create(ref, {
      id_destinatario: uid,
      id_quem_fez_acao: null,
      id_turma: null,
      lida: false,
      lida_em: null,
      emitida_em: FieldValue.serverTimestamp(),
      contem_conteudo_protegido: false,
      ...dados,
    });
    return true;
  });
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
      const criou = await criarNotificacaoSeAusente(db, uid, `vencidos_${idAlmoxarifado}_${dataCivil}`, {
        papel_destinatario: "Gestor_Almoxarifado",
        tipo: "FRASCOS_VENCIDOS",
        quantidade,
        entidade_alvo: "Almoxarifado",
        id_alvo: idAlmoxarifado,
        mensagem_customizada: null,
        expira_em: null,
      });
      if (criou) notificacoesCriadas += 1;
    }
  }
  console.info("Vencimentos de frascos processados", {
    frascosAtualizados: candidatos.size,
    notificacoesCriadas,
  });
}

export async function executarVerificacaoEscassez(): Promise<void> {
  const db = admin.firestore();
  const agora = new Date();
  const dataCivil = dataCivilSaoPaulo(agora);
  const almoxarifados = await db.collection("Almoxarifado").where("ativo", "==", true).get();
  let notificacoesCriadas = 0;

  for (const almoxarifado of almoxarifados.docs) {
    const idAlmoxarifado = almoxarifado.id;
    const configuracoes = await almoxarifado.ref.collection("Estoques_Configurados")
      .where("ativo", "==", true)
      .where("notificacao_ativa", "==", true)
      .get();
    if (configuracoes.empty) continue;

    const gestores = await db.collection("Gestor_Almoxarifado_x_Almoxarifado")
      .where("id_almoxarifado", "==", idAlmoxarifado).get();
    const gestoresIds = gestores.docs.map((doc) => doc.data().id_gestor_almoxarifado)
      .filter((uid): uid is string => typeof uid === "string" && uid.length > 0);

    for (const configuracao of configuracoes.docs) {
      const config = configuracao.data();
      const limite = config.qtd_limiar_escassez;
      if (!Number.isInteger(limite) || limite < 0) {
        throw new Error(`Configuração ${configuracao.ref.path} tem limiar inválido; job interrompido fail-closed.`);
      }
      const base = db.collection("Frasco_Reagente")
        .where("id_almoxarifado", "==", idAlmoxarifado)
        .where("id_resumo_reagente", "==", config.id_resumo_reagente)
        .where("id_especificacao_reagente", "==", config.id_especificacao_reagente)
        .where("situacao_localizacao", "==", "LOCALIZADO")
        .where("disponibilidade", "==", "DISPONIVEL")
        .where("estado_fisico_frasco", "in", ["FECHADO", "ABERTO"])
        .where("em_quarentena", "==", false);
      const [naoVencidos, vencidosAutorizados] = await Promise.all([
        base.where("vencido", "==", false).count().get(),
        base.where("vencido", "==", true).where("uso_vencido_autorizado", "==", true).count().get(),
      ]);
      const quantidade = naoVencidos.data().count + vencidosAutorizados.data().count;
      if (quantidade >= limite) continue;

      for (const uid of gestoresIds) {
        const criou = await criarNotificacaoSeAusente(
          db,
          uid,
          `escassez_${idAlmoxarifado}_${configuracao.id}_${dataCivil}`,
          {
            papel_destinatario: "Gestor_Almoxarifado",
            tipo: "ESCASSEZ_ESTOQUE",
            quantidade,
            entidade_alvo: "Almoxarifado",
            id_alvo: idAlmoxarifado,
            mensagem_customizada: null,
            expira_em: null,
          }
        );
        if (criou) notificacoesCriadas += 1;
      }
    }
  }
  console.info("Escassez de estoque processada", { notificacoesCriadas });
}

export const verificarEscassezDeEstoque = onSchedule({
  schedule: "every day 04:00",
  timeZone: TIME_ZONE,
}, async () => executarVerificacaoEscassez());

function dataCivilDoCampo(valor: unknown): string | null {
  const data = valor && typeof (valor as { toDate?: () => Date }).toDate === "function"
    ? (valor as { toDate: () => Date }).toDate()
    : valor instanceof Date ? valor : typeof valor === "string" ? new Date(valor) : null;
  if (!data || Number.isNaN(data.getTime())) return null;
  return data.toISOString().slice(0, 10);
}

function deslocarDataCivil(dataCivil: string, dias: number): string {
  const data = new Date(`${dataCivil}T12:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export async function executarVerificacaoDevolucoes(): Promise<void> {
  const db = admin.firestore();
  const hoje = dataCivilSaoPaulo(new Date());
  const amanha = deslocarDataCivil(hoje, 1);
  const emprestimos = await db.collection("Emprestimo_Reagente")
    .where("status", "==", "EM_USO").get();
  const atrasadosPorAlmox = new Map<string, number>();
  const batch = db.batch();
  let atualizados = 0;

  for (const emprestimo of emprestimos.docs) {
    const dados = emprestimo.data();
    const prevista = dataCivilDoCampo(dados.data_devolucao_prevista);
    if (!prevista) throw new Error(`Empréstimo ${emprestimo.id} sem data de devolução válida.`);
    if (prevista < hoje) {
      batch.update(emprestimo.ref, { status: "ATRASADO" });
      atualizados += 1;
      if (typeof dados.id_almoxarifado === "string") {
        atrasadosPorAlmox.set(
          dados.id_almoxarifado,
          (atrasadosPorAlmox.get(dados.id_almoxarifado) ?? 0) + 1
        );
      }
      continue;
    }
    if (prevista !== hoje && prevista !== amanha) continue;

    const uid = dados.id_usuario_retirou;
    if (typeof uid !== "string" || uid.length === 0) {
      throw new Error(`Empréstimo ${emprestimo.id} sem retirante; job interrompido fail-closed.`);
    }
    const professor = await db.collection("Professor").doc(uid).get();
    const bolsista = await db.collection("Bolsista").doc(uid).get();
    const papel = professor.exists ? "Professor" : bolsista.exists ? "Bolsista" : null;
    if (!papel) throw new Error(`Retirante ${uid} sem papel Professor/Bolsista.`);
    const janela = prevista === hoje ? "VENCE_HOJE" : "VENCE_AMANHA";
    await criarNotificacaoSeAusente(db, uid, `${emprestimo.id}--${janela}`, {
      papel_destinatario: papel,
      tipo: "DATA_DEVOLUCAO_REAGENTE",
      quantidade: null,
      entidade_alvo: "Emprestimo",
      id_alvo: emprestimo.id,
      mensagem_customizada: `A devolução do empréstimo vence ${prevista === hoje ? "hoje" : "amanhã"}.`,
      expira_em: null,
    });
  }
  if (atualizados > 0) await batch.commit();

  for (const [idAlmoxarifado, quantidade] of atrasadosPorAlmox) {
    const gestores = await db.collection("Gestor_Almoxarifado_x_Almoxarifado")
      .where("id_almoxarifado", "==", idAlmoxarifado).get();
    for (const gestor of gestores.docs) {
      const uid = gestor.data().id_gestor_almoxarifado;
      if (typeof uid !== "string" || uid.length === 0) {
        throw new Error(`Vínculo ${gestor.id} sem gestor; job interrompido fail-closed.`);
      }
      await criarNotificacaoSeAusente(db, uid, `atraso_${idAlmoxarifado}_${hoje}`, {
        papel_destinatario: "Gestor_Almoxarifado",
        tipo: "ENTREGA_ATRASADA",
        quantidade,
        entidade_alvo: "Almoxarifado",
        id_alvo: idAlmoxarifado,
        mensagem_customizada: `${quantidade} empréstimo(s) estão atrasados para devolução.`,
        expira_em: null,
      });
    }
  }
  console.info("Devoluções preventivas processadas", { atualizados, atrasados: atrasadosPorAlmox.size });
}

export const verificarVencimentosEAtrasos = onSchedule({
  schedule: "every day 03:00",
  timeZone: TIME_ZONE,
}, async () => executarVerificacaoDevolucoes());

export const verificarVencimentosFrascos = onSchedule({
  schedule: "every day 03:00",
  timeZone: TIME_ZONE,
}, async () => executarVerificacaoVencimentos());

export { dataCivilSaoPaulo };

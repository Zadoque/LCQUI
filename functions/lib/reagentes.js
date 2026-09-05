"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarDevolucao = exports.registrarRetirada = exports.registrarAberturaFrasco = exports.cadastrarFrascoAberto = exports.cadastrarFrascoFechado = void 0;
exports.calcularValidadeEfetivaNaAbertura = calcularValidadeEfetivaNaAbertura;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./auth");
exports.cadastrarFrascoFechado = (0, https_1.onCall)(async (request) => {
    const dados = request.data;
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    await (0, auth_1.validarGestorDoAlmoxarifado)(request.auth.uid, request.auth.token, dados.idAlmoxarifado);
    const especSnap = await admin.firestore().collection("Especificacao_Reagente").doc(dados.idEspecificacaoReagente).get();
    if (!especSnap.exists)
        throw new https_1.HttpsError("not-found", "Especificação de reagente não encontrada.");
    const densidade = especSnap.data().densidade;
    const estadoFisico = especSnap.data().estado_fisico;
    let pesoVazio;
    if (estadoFisico === "LIQUIDO") {
        if (!densidade || densidade <= 0)
            throw new https_1.HttpsError("failed-precondition", "Líquido exige densidade positiva.");
        pesoVazio = dados.pesoTotal - (dados.volumeNominal * densidade);
    }
    else {
        pesoVazio = dados.pesoTotal - dados.volumeNominal; // g
    }
    if (pesoVazio <= 0) {
        throw new https_1.HttpsError("invalid-argument", "Peso total incompatível com o volume nominal para esta densidade.");
    }
    const agora = new Date();
    const validadeFechado = dados.validadeFechado ? new Date(dados.validadeFechado) : null;
    const validadeEfetiva = dados.validadeDesconhecida ? null : validadeFechado;
    const venceuNoCadastro = Boolean(validadeEfetiva && validadeEfetiva <= agora);
    if (venceuNoCadastro && !dados.decisaoSeJaVencido) {
        throw new https_1.HttpsError("failed-precondition", "O frasco está vencido no cadastro e exige uma decisão do gestor.");
    }
    if (dados.decisaoSeJaVencido === "QUARENTENA" && !dados.detalheStatus) {
        throw new https_1.HttpsError("invalid-argument", "A entrada em quarentena exige detalhe_status.");
    }
    const contadorRef = admin.firestore().collection("Contador_Codigo_Frasco").doc("singleton");
    const frascoRef = admin.firestore().collection("Frasco_Reagente").doc();
    return admin.firestore().runTransaction(async (tx) => {
        const contadorSnap = await tx.get(contadorRef);
        const proximoNumero = (contadorSnap.data()?.ultimo_codigo_gerado || 0) + 1;
        const codigoFrasco = `LCQUI-${proximoNumero}`;
        tx.update(contadorRef, { ultimo_codigo_gerado: proximoNumero });
        tx.set(frascoRef, {
            id_almoxarifado: dados.idAlmoxarifado,
            id_lote: dados.idLote ?? null,
            id_especificacao_reagente: dados.idLote ? null : dados.idEspecificacaoReagente,
            codigo_frasco: codigoFrasco,
            conteudo_nominal: dados.volumeNominal,
            peso_no_cadastrado: dados.pesoTotal,
            peso_atual: dados.pesoTotal,
            peso_frasco_vazio: pesoVazio,
            medida_usada: 0,
            estado_fisico_frasco: "FECHADO",
            disponibilidade: "DISPONIVEL",
            validade_fechado: validadeEfetiva,
            validade_efetiva: validadeEfetiva,
            validade_desconhecida: dados.validadeDesconhecida ?? false,
            vencido: venceuNoCadastro,
            em_quarentena: venceuNoCadastro && dados.decisaoSeJaVencido === "QUARENTENA",
            uso_vencido_autorizado: venceuNoCadastro && dados.decisaoSeJaVencido === "DISPONIVEL",
            detalhe_status: venceuNoCadastro ? (dados.detalheStatus ?? (dados.decisaoSeJaVencido === "PENDENTE_DE_DESCARTE" ? "Frasco vencido aguardando processo institucional de descarte." : null)) : null,
            cadastrado_em: admin.firestore.FieldValue.serverTimestamp(),
            cadastrado_por: request.auth.uid,
        });
        return { idFrasco: frascoRef.id, codigoFrasco, pesoVazioCalculado: pesoVazio, venceuNoCadastro };
    });
});
exports.cadastrarFrascoAberto = (0, https_1.onCall)(async (request) => {
    const dados = request.data;
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    await (0, auth_1.validarGestorDoAlmoxarifado)(request.auth.uid, request.auth.token, dados.idAlmoxarifado);
    const especSnap = await admin.firestore().collection("Especificacao_Reagente").doc(dados.idEspecificacaoReagente).get();
    if (!especSnap.exists)
        throw new https_1.HttpsError("not-found", "Especificação não encontrada.");
    const especData = especSnap.data();
    const estadoFisico = especData.estado_fisico;
    const densidade = especData.densidade ?? null;
    let pesoVazio;
    let conteudoNominal;
    if (estadoFisico === "SOLIDO") {
        if (dados.modalidade === "ESTIMA_VOLUME")
            throw new https_1.HttpsError("invalid-argument", "Apenas LÍQUIDOS podem usar ESTIMA_VOLUME.");
        if (dados.modalidade === "CONHECE_TARA") {
            if (dados.pesoFrascoVazioInformado == null)
                throw new https_1.HttpsError("invalid-argument", "CONHECE_TARA exige pesoFrascoVazioInformado.");
            pesoVazio = dados.pesoFrascoVazioInformado;
            conteudoNominal = dados.pesoTotalBalanca - pesoVazio;
        }
        else {
            if (dados.massaAtualEstimada == null)
                throw new https_1.HttpsError("invalid-argument", "ESTIMA_MASSA exige massaAtualEstimada.");
            conteudoNominal = dados.massaAtualEstimada;
            pesoVazio = dados.pesoTotalBalanca - conteudoNominal;
        }
        if (pesoVazio <= 0)
            throw new https_1.HttpsError("invalid-argument", "Massa atual maior que o peso total medido na balança.");
    }
    else {
        if (dados.modalidade === "ESTIMA_MASSA")
            throw new https_1.HttpsError("invalid-argument", "Apenas SÓLIDOS podem usar ESTIMA_MASSA.");
        if (!densidade || densidade <= 0)
            throw new https_1.HttpsError("failed-precondition", "Líquido exige densidade positiva cadastrada na especificação.");
        if (dados.modalidade === "CONHECE_TARA") {
            if (dados.pesoFrascoVazioInformado == null)
                throw new https_1.HttpsError("invalid-argument", "CONHECE_TARA exige pesoFrascoVazioInformado.");
            pesoVazio = dados.pesoFrascoVazioInformado;
            conteudoNominal = (dados.pesoTotalBalanca - pesoVazio) / densidade;
        }
        else {
            if (dados.volumeAtualEstimado == null)
                throw new https_1.HttpsError("invalid-argument", "ESTIMA_VOLUME exige volumeAtualEstimado.");
            conteudoNominal = dados.volumeAtualEstimado;
            pesoVazio = dados.pesoTotalBalanca - (conteudoNominal * densidade);
        }
        if (conteudoNominal <= 0 || pesoVazio <= 0)
            throw new https_1.HttpsError("invalid-argument", "Dados de volume/peso inconsistentes com a densidade.");
    }
    const agora = new Date();
    const validade = dados.validadeAberto ? new Date(dados.validadeAberto) : null;
    const validadeEfetiva = dados.validadeDesconhecida ? null : validade;
    const jaVencido = Boolean(validadeEfetiva && validadeEfetiva <= agora);
    if (jaVencido && !dados.decisaoSeJaVencido)
        throw new https_1.HttpsError("failed-precondition", "O frasco está vencido no cadastro e exige uma decisão do gestor.");
    if (dados.decisaoSeJaVencido === "QUARENTENA" && !dados.detalheStatus)
        throw new https_1.HttpsError("invalid-argument", "A entrada em quarentena exige detalhe_status.");
    const contadorRef = admin.firestore().collection("Contador_Codigo_Frasco").doc("singleton");
    const frascoRef = admin.firestore().collection("Frasco_Reagente").doc();
    return admin.firestore().runTransaction(async (tx) => {
        const contadorSnap = await tx.get(contadorRef);
        const proximoNumero = (contadorSnap.data()?.ultimo_codigo_gerado || 0) + 1;
        const codigoFrasco = `LCQUI-${proximoNumero}`;
        tx.update(contadorRef, { ultimo_codigo_gerado: proximoNumero });
        tx.set(frascoRef, {
            id_almoxarifado: dados.idAlmoxarifado,
            id_lote: dados.idLote ?? null,
            id_especificacao_reagente: dados.idLote ? null : dados.idEspecificacaoReagente,
            codigo_frasco: codigoFrasco,
            conteudo_nominal: conteudoNominal,
            peso_no_cadastrado: dados.pesoTotalBalanca,
            peso_atual: dados.pesoTotalBalanca,
            peso_frasco_vazio: pesoVazio,
            medida_usada: 0,
            data_abertura: agora,
            estado_fisico_frasco: "ABERTO",
            disponibilidade: "DISPONIVEL",
            validade_efetiva: validadeEfetiva,
            validade_desconhecida: dados.validadeDesconhecida ?? false,
            vencido: jaVencido,
            em_quarentena: jaVencido && dados.decisaoSeJaVencido === "QUARENTENA",
            uso_vencido_autorizado: jaVencido && dados.decisaoSeJaVencido === "DISPONIVEL",
            detalhe_status: jaVencido
                ? (dados.detalheStatus ?? (dados.decisaoSeJaVencido === "PENDENTE_DE_DESCARTE"
                    ? "Frasco vencido aguardando processo institucional de descarte." : null))
                : null,
            cadastrado_em: admin.firestore.FieldValue.serverTimestamp(),
            cadastrado_por: request.auth.uid,
        });
        return { idFrasco: frascoRef.id, codigoFrasco, conteudoNominal, pesoVazio, venceuNoCadastro: jaVencido };
    });
});
function calcularValidadeEfetivaNaAbertura(frasco, dataAbertura) {
    if (frasco.validade_desconhecida)
        return null;
    const validadeFechado = frasco.validade_fechado
        ? (typeof frasco.validade_fechado.toDate === "function"
            ? frasco.validade_fechado.toDate()
            : new Date(frasco.validade_fechado))
        : null;
    const diasDepoisDeAberto = frasco.validade_apos_aberto_dias;
    const validadeDepoisDaAbertura = diasDepoisDeAberto != null
        ? new Date(dataAbertura.getTime() + diasDepoisDeAberto * 24 * 60 * 60 * 1000)
        : null;
    if (validadeFechado && validadeDepoisDaAbertura) {
        return validadeFechado <= validadeDepoisDaAbertura ? validadeFechado : validadeDepoisDaAbertura;
    }
    return validadeFechado ?? validadeDepoisDaAbertura;
}
exports.registrarAberturaFrasco = (0, https_1.onCall)(async (request) => {
    const dados = request.data;
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(dados.idFrasco);
    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(frascoRef);
        if (!snap.exists)
            throw new https_1.HttpsError("not-found", "Frasco não encontrado.");
        const frasco = snap.data();
        await (0, auth_1.validarGestorDoAlmoxarifado)(request.auth.uid, request.auth.token, frasco.id_almoxarifado);
        if (frasco.estado_fisico_frasco !== "FECHADO") {
            throw new https_1.HttpsError("failed-precondition", "Somente um frasco FECHADO pode ser aberto por esta operação.");
        }
        if (frasco.disponibilidade !== "DISPONIVEL") {
            throw new https_1.HttpsError("failed-precondition", "Somente frascos DISPONIVEL podem ser abertos.");
        }
        const agora = new Date();
        const validadeEfetiva = calcularValidadeEfetivaNaAbertura(frasco, agora);
        const venceu = Boolean(validadeEfetiva && validadeEfetiva <= agora);
        if (venceu && !dados.destinoSeVencerNaAbertura) {
            throw new https_1.HttpsError("failed-precondition", "A abertura tornou o frasco vencido. O gestor deve escolher o destino do frasco.");
        }
        if (venceu && dados.destinoSeVencerNaAbertura === "QUARENTENA" && !dados.detalheStatus) {
            throw new https_1.HttpsError("invalid-argument", "A entrada em quarentena exige detalhe_status.");
        }
        tx.update(frascoRef, {
            estado_fisico_frasco: "ABERTO",
            data_abertura: agora,
            validade_efetiva: validadeEfetiva,
            vencido: venceu,
            em_quarentena: venceu && dados.destinoSeVencerNaAbertura === "QUARENTENA",
            uso_vencido_autorizado: venceu && dados.destinoSeVencerNaAbertura === "DISPONIVEL",
            detalhe_status: venceu
                ? (dados.detalheStatus ?? (dados.destinoSeVencerNaAbertura === "PENDENTE_DE_DESCARTE"
                    ? "Frasco vencido aguardando processo institucional de descarte."
                    : null))
                : null,
        });
        return { validadeEfetiva, venceu, destino: dados.destinoSeVencerNaAbertura ?? null };
    });
});
exports.registrarRetirada = (0, https_1.onCall)(async (request) => {
    const dados = request.data;
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const [profSnap, bolsSnap] = await Promise.all([
        admin.firestore().collection("Professor").doc(dados.idUsuarioRetirou).get(),
        admin.firestore().collection("Bolsista").doc(dados.idUsuarioRetirou).get(),
    ]);
    if (!profSnap.exists && !bolsSnap.exists) {
        throw new https_1.HttpsError("failed-precondition", "Usuário selecionado não é Professor nem Bolsista.");
    }
    const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(dados.idFrasco);
    return admin.firestore().runTransaction(async (tx) => {
        const frascoSnap = await tx.get(frascoRef);
        if (!frascoSnap.exists)
            throw new https_1.HttpsError("not-found", "Frasco não encontrado.");
        const frasco = frascoSnap.data();
        await (0, auth_1.validarGestorDoAlmoxarifado)(request.auth.uid, request.auth.token, frasco.id_almoxarifado);
        if (frasco.disponibilidade !== "DISPONIVEL") {
            throw new https_1.HttpsError("failed-precondition", "Frasco não está disponível para retirada.");
        }
        if (frasco.em_quarentena) {
            throw new https_1.HttpsError("failed-precondition", "Frasco em quarentena não pode ser retirado.");
        }
        const agora = new Date();
        let frascoVencido = frasco.vencido;
        let validadeEfetiva = frasco.validade_efetiva ? (typeof frasco.validade_efetiva.toDate === "function" ? frasco.validade_efetiva.toDate() : new Date(frasco.validade_efetiva)) : null;
        if (dados.abrirNoEmprestimo && frasco.estado_fisico_frasco === "FECHADO") {
            validadeEfetiva = calcularValidadeEfetivaNaAbertura(frasco, agora);
            frascoVencido = Boolean(validadeEfetiva && validadeEfetiva <= agora);
            tx.update(frascoRef, {
                estado_fisico_frasco: "ABERTO",
                data_abertura: agora,
                validade_efetiva: validadeEfetiva,
                vencido: frascoVencido,
            });
        }
        if (frascoVencido && !frasco.uso_vencido_autorizado && !dados.confirmarUsoVencido) {
            throw new https_1.HttpsError("failed-precondition", "Frasco vencido requer confirmação explícita de uso didático.");
        }
        const finalidade = frascoVencido ? "DIDATICO_DEMONSTRACAO" : dados.finalidadeUso;
        const emprestimoRef = admin.firestore().collection("Emprestimo_Reagente").doc();
        tx.set(emprestimoRef, {
            id_frasco_reagente: dados.idFrasco,
            id_usuario_retirou: dados.idUsuarioRetirou,
            id_almoxarifado: frasco.id_almoxarifado,
            status: "EM_USO",
            data_retirada: admin.firestore.FieldValue.serverTimestamp(),
            data_devolucao_prevista: new Date(dados.dataDevolucaoPrevista),
            id_local_usado: dados.idLocalUsado,
            peso_saida: dados.pesoSaida,
            uso_vencido_aceito: Boolean(frascoVencido),
            finalidade_uso: finalidade,
        });
        tx.update(frascoRef, { disponibilidade: "EMPRESTADO" });
        const historicoRef = admin.firestore().collection("Historico_Frasco_Reagente").doc();
        tx.set(historicoRef, {
            id_frasco_reagente: dados.idFrasco,
            id_almoxarifado: frasco.id_almoxarifado,
            id_gestor: request.auth.uid,
            tipo: "SAIU",
            id_emprestimo_reagente: emprestimoRef.id,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { idEmprestimo: emprestimoRef.id };
    });
});
async function resolverDensidadeDoFrasco(frasco) {
    let idEspec = frasco.id_especificacao_reagente;
    if (!idEspec && frasco.id_lote) {
        const loteSnap = await admin.firestore().collection("Lote").doc(frasco.id_lote).get();
        if (loteSnap.exists)
            idEspec = loteSnap.data()?.id_especificacao_reagente;
    }
    if (!idEspec)
        return null;
    const especSnap = await admin.firestore().collection("Especificacao_Reagente").doc(idEspec).get();
    return especSnap.exists ? especSnap.data()?.densidade ?? null : null;
}
exports.registrarDevolucao = (0, https_1.onCall)(async (request) => {
    const dados = request.data;
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const emprestimoRef = admin.firestore().collection("Emprestimo_Reagente").doc(dados.idEmprestimo);
    return admin.firestore().runTransaction(async (tx) => {
        const emprestimoSnap = await tx.get(emprestimoRef);
        if (!emprestimoSnap.exists)
            throw new https_1.HttpsError("not-found", "Empréstimo não encontrado.");
        const emprestimo = emprestimoSnap.data();
        if (emprestimo.status === "DEVOLVIDO" || emprestimo.status === "DEVOLVIDO_COM_ATRASO") {
            throw new https_1.HttpsError("failed-precondition", "Empréstimo já foi devolvido.");
        }
        const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(emprestimo.id_frasco_reagente);
        const frascoSnap = await tx.get(frascoRef);
        const frasco = frascoSnap.data();
        await (0, auth_1.validarGestorDoAlmoxarifado)(request.auth.uid, request.auth.token, frasco.id_almoxarifado);
        const densidade = await resolverDensidadeDoFrasco(frasco);
        const pesoConsumido = Math.max(0, emprestimo.peso_saida - dados.pesoRetorno);
        const MARGEM_HIGROSCOPICA = 0.02;
        const limiteMaxRetorno = emprestimo.peso_saida * (1 + MARGEM_HIGROSCOPICA);
        if (dados.pesoRetorno > limiteMaxRetorno) {
            throw new https_1.HttpsError("invalid-argument", `Peso de retorno (${dados.pesoRetorno}g) excede 102% da massa de saída (${emprestimo.peso_saida}g). Verifique se há contaminação ou erro na balança.`);
        }
        const avisoHigroscopico = dados.pesoRetorno > emprestimo.peso_saida;
        const volumeUtilizado = densidade ? pesoConsumido / densidade : pesoConsumido;
        const agora = new Date();
        const dataPrevistaObj = typeof emprestimo.data_devolucao_prevista.toDate === "function" ? emprestimo.data_devolucao_prevista.toDate() : new Date(emprestimo.data_devolucao_prevista);
        const prazoLimite = new Date(dataPrevistaObj);
        prazoLimite.setHours(23, 59, 59, 999);
        const atrasado = agora > prazoLimite;
        const validadeEfetiva = frasco.validade_efetiva?.toDate?.() ?? frasco.validade_efetiva ?? null;
        const venceuAgora = Boolean(validadeEfetiva && validadeEfetiva <= agora);
        const frascoVencido = Boolean(frasco.vencido || venceuAgora);
        const atualizacaoFrasco = {
            disponibilidade: "DISPONIVEL",
            data_ultima_pesagem: admin.firestore.FieldValue.serverTimestamp(),
            peso_atual: dados.pesoRetorno,
            medida_usada: admin.firestore.FieldValue.increment(volumeUtilizado),
            vencido: frascoVencido,
        };
        if (frascoVencido && dados.destinoPosDevolucao === "QUARENTENA") {
            atualizacaoFrasco.em_quarentena = true;
            atualizacaoFrasco.uso_vencido_autorizado = false;
            atualizacaoFrasco.detalhe_status = "Frasco vencido retido em quarentena após devolução.";
        }
        else if (frascoVencido && dados.destinoPosDevolucao === "DISPONIVEL") {
            atualizacaoFrasco.em_quarentena = false;
            atualizacaoFrasco.uso_vencido_autorizado = true;
        }
        tx.update(emprestimoRef, {
            status: atrasado ? "DEVOLVIDO_COM_ATRASO" : "DEVOLVIDO",
            data_devolucao_efetuada: admin.firestore.FieldValue.serverTimestamp(),
            id_usuario_devolveu: request.auth.uid,
            peso_retorno: dados.pesoRetorno,
            medida_utilizada: volumeUtilizado,
            unidade_medida_utilizada: densidade ? "ml" : "g",
            ...(avisoHigroscopico && { aviso: "higroscopico_suspeito" }),
        });
        tx.update(frascoRef, atualizacaoFrasco);
        const histRef = admin.firestore().collection("Historico_Frasco_Reagente").doc();
        tx.set(histRef, {
            id_frasco_reagente: emprestimo.id_frasco_reagente,
            id_almoxarifado: frasco.id_almoxarifado,
            id_gestor: request.auth.uid,
            tipo: "ENTROU",
            id_emprestimo_reagente: emprestimoRef.id,
            peso_anterior: emprestimo.peso_saida,
            peso_novo: dados.pesoRetorno,
            medida_ajustada: volumeUtilizado,
            unidade_medida_ajustada: densidade ? "ml" : "g",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { pesoConsumido, volumeUtilizado, atrasado, frascoVencido,
            avisoHigroscopico: avisoHigroscopico || false };
    });
});
//# sourceMappingURL=reagentes.js.map
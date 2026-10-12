import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { validarAutoridadePersistida } from "./auth";
import { validatePayload } from "./utils/validation";
import { ResolverCatalogoPorIdsSchema } from "./schemas/catalogo.schema";

export interface CatalogoEspecificacaoJSON {
  id: string;
  descricao?: string;
  fabricante?: string;
  codigo_produto_fabricante?: string;
  grau_pureza?: string;
  densidade?: number;
  unidade_de_medida?: string;
  classe_inflamabilidade?: string;
  eh_controlado_pf?: boolean;
  eh_controlado_eb?: boolean;
  link_fds_fispq?: string;
  id_substancia_quimica?: string;
  composicao?: Array<{
    id_substancia_quimica: string;
    valor_min: number | null;
    valor_max: number | null;
    tipo_concentracao: string;
    notacao_original_fabricante: string | null;
  }>;
}

export interface CatalogoResumoJSON {
  id: string;
  nome: string;
  tipo_substancia?: string;
  natureza_quimica?: string;
  estado_fisico?: string;
  eh_higroscopico?: boolean;
  especificacoes: Record<string, CatalogoEspecificacaoJSON>;
}

export interface CatalogoReagentesJSON {
  schema_version: number;
  catalog_version: number;
  resumos: Record<string, CatalogoResumoJSON>;
}

const estadoCatalogoRef = () => admin.firestore().collection("Sistema_Catalogo_Reagentes").doc("estado");

/** Incrementa a fonte na mesma transação da mutação canônica do catálogo. */
export async function incrementarVersaoFonteTx(tx: admin.firestore.Transaction): Promise<void> {
  const ref = estadoCatalogoRef();
  const snap = await tx.get(ref);
  const atual = snap.data() ?? {};
  const versaoFonte = Number.isInteger(atual?.versao_fonte) ? Number(atual.versao_fonte) : 0;
  tx.set(ref, {
    versao_fonte: versaoFonte + 1,
    versao_publicada: Number.isInteger(atual?.versao_publicada) ? Number(atual.versao_publicada) : 0,
    schema_version: 1,
  }, { merge: true });
}

function jsonDeterministico(catalogo: CatalogoReagentesJSON): string {
  return JSON.stringify(catalogo, null, 2);
}

/**
 * Monta e publica o catálogo canônico de reagentes no Storage e atualiza Sistema_Catalogo_Reagentes/estado.
 */
export async function montarEGravarCatalogoReagentes(): Promise<CatalogoReagentesJSON> {
  const db = admin.firestore();
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const estadoRef = estadoCatalogoRef();
    const estadoSnap = await estadoRef.get();
    const estadoAtual = estadoSnap.data() ?? {};
    const versaoFonte = Number.isInteger(estadoAtual.versao_fonte)
      ? Number(estadoAtual.versao_fonte)
      : Math.max(Number(estadoAtual.versao_publicada ?? 0), 1);
    const versaoPublicada = Number(estadoAtual.versao_publicada ?? 0);

    if (estadoAtual.catalogo_embutido && versaoPublicada >= versaoFonte && estadoAtual.sha256 && estadoAtual.storage_path) {
      return estadoAtual.catalogo_embutido as CatalogoReagentesJSON;
    }

    const resumosSnap = await db.collection("Resumo_Reagente").get();
    const resumosMap: Record<string, CatalogoResumoJSON> = {};
    for (const doc of [...resumosSnap.docs].sort((a, b) => a.id.localeCompare(b.id))) {
      const data = doc.data();
      const especsSnap = await doc.ref.collection("Especificacoes").get();
      const especsMap: Record<string, CatalogoEspecificacaoJSON> = {};
      for (const eDoc of [...especsSnap.docs].sort((a, b) => a.id.localeCompare(b.id))) {
        const eData = eDoc.data();
        especsMap[eDoc.id] = {
          id: eDoc.id,
          descricao: eData.descricao ?? "",
          fabricante: eData.fabricante ?? "",
          ...(eData.codigo_produto_fabricante ? { codigo_produto_fabricante: eData.codigo_produto_fabricante } : {}),
          ...(eData.grau_pureza ? { grau_pureza: eData.grau_pureza } : {}),
          ...(typeof eData.densidade === "number" ? { densidade: eData.densidade } : {}),
          ...(eData.unidade_de_medida ? { unidade_de_medida: eData.unidade_de_medida } : {}),
          ...(eData.classe_inflamabilidade ? { classe_inflamabilidade: eData.classe_inflamabilidade } : {}),
          ...(typeof eData.eh_controlado_pf === "boolean" ? { eh_controlado_pf: eData.eh_controlado_pf } : {}),
          ...(typeof eData.eh_controlado_eb === "boolean" ? { eh_controlado_eb: eData.eh_controlado_eb } : {}),
          ...(eData.link_fds_fispq ? { link_fds_fispq: eData.link_fds_fispq } : {}),
          ...(eData.id_substancia_quimica ? { id_substancia_quimica: eData.id_substancia_quimica } : {}),
          ...(Array.isArray(eData.composicao) ? { composicao: eData.composicao } : {}),
        };
      }
      resumosMap[doc.id] = {
        id: doc.id,
        nome: data.nome ?? "",
        tipo_substancia: data.tipo_substancia ?? "PURA",
        natureza_quimica: data.natureza_quimica ?? "INORGANICO",
        estado_fisico: data.estado_fisico ?? "SOLIDO",
        eh_higroscopico: Boolean(data.eh_higroscopico),
        especificacoes: especsMap,
      };
    }

    const catalogo: CatalogoReagentesJSON = {
      schema_version: 1,
      catalog_version: versaoFonte,
      resumos: resumosMap,
    };
    const payload = jsonDeterministico(catalogo);
    const sha256 = createHash("sha256").update(payload).digest("hex");
    const storagePath = `catalogo-reagentes/v${versaoFonte}-${sha256}.json`;

    try {
      const bucketName = process.env.STORAGE_BUCKET || admin.app().options.storageBucket || "lcqui-dev.appspot.com";
      const file = admin.storage().bucket(bucketName).file(storagePath);
      const [exists] = await file.exists();
      if (!exists) {
        await file.save(payload, {
          resumable: false,
          contentType: "application/json",
          metadata: { metadata: { schema_version: "1", catalog_version: String(versaoFonte), sha256 } },
        });
      }
    } catch (err) {
      console.error("Storage upload do catálogo não concluído:", err);
      throw new HttpsError("unavailable", "Não foi possível publicar o catálogo no Storage.");
    }

    let publicado = false;
    try {
      await db.runTransaction(async (tx) => {
        const atualSnap = await tx.get(estadoRef);
        const atual = atualSnap.data() ?? {};
        const fonteCorrente = Number(atual.versao_fonte ?? versaoFonte);
        if (fonteCorrente !== versaoFonte) throw new Error("CATALOGO_SOURCE_CHANGED");
        const publicadaCorrente = Number(atual.versao_publicada ?? 0);
        if (publicadaCorrente > versaoFonte) return;
        tx.set(estadoRef, {
          versao_fonte: versaoFonte,
          versao_publicada: versaoFonte,
          storage_path: storagePath,
          sha256,
          gerado_em: FieldValue.serverTimestamp(),
          publicado_em: FieldValue.serverTimestamp(),
          schema_version: 1,
          catalogo_embutido: catalogo,
        }, { merge: true });
        publicado = true;
      });
    } catch (err) {
      if (err instanceof Error && err.message === "CATALOGO_SOURCE_CHANGED") continue;
      throw err;
    }
    if (publicado) return catalogo;
  }
  throw new HttpsError("aborted", "O catálogo mudou durante a publicação; tente novamente.");
}

export const gerarCatalogoReagentes = onCall(async (request) => {
  await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);

  const catalogo = await montarEGravarCatalogoReagentes();
  return {
    status: "OK",
    versaoPublicada: catalogo.catalog_version,
    schemaVersion: catalogo.schema_version,
    totalResumos: Object.keys(catalogo.resumos).length,
  };
});

export const obterCatalogoReagentes = onCall(async (request) => {
  // Papéis permitidos conforme matriz da Seção 3 e M9: Chefe_Geral, Gestor_Almoxarifado, Professor, Aluno, Bolsista
  await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Aluno", "Bolsista"]);

  const db = admin.firestore();
  const estadoRef = db.collection("Sistema_Catalogo_Reagentes").doc("estado");
  const estadoSnap = await estadoRef.get();

  const estadoAtual = estadoSnap.data() ?? {};
  const necessitaPublicacao = !estadoSnap.exists
    || !estadoAtual.catalogo_embutido
    || Number(estadoAtual.versao_publicada ?? 0) < Number(estadoAtual.versao_fonte ?? 0);

  if (necessitaPublicacao) {
    // Se o seed ou uma mutação deixou a fonte pendente, compila na primeira leitura autorizada.
    const catalogo = await montarEGravarCatalogoReagentes();
    const estadoAtualizado = await estadoRef.get();
    const estadoPublicado = estadoAtualizado.data() ?? {};
    return {
      versaoPublicada: catalogo.catalog_version,
      schemaVersion: catalogo.schema_version,
      storagePath: estadoPublicado.storage_path,
      catalogo,
    };
  }

  const estado = estadoSnap.data()!;
  return {
    versaoPublicada: estado.versao_publicada,
    schemaVersion: estado.schema_version,
    storagePath: estado.storage_path,
    catalogo: estado.catalogo_embutido ?? null,
  };
});

export const resolverCatalogoPorIds = onCall(async (request) => {
  const dados = validatePayload(ResolverCatalogoPorIdsSchema, request.data);

  await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Aluno", "Bolsista"]);

  const db = admin.firestore();
  const resumoRef = db.collection("Resumo_Reagente").doc(dados.idResumo);
  const resumoSnap = await resumoRef.get();

  if (!resumoSnap.exists) {
    throw new HttpsError("not-found", `Erro de integridade referencial: Resumo ${dados.idResumo} inexistente no catálogo.`);
  }

  const especRef = resumoRef.collection("Especificacoes").doc(dados.idEspecificacao);
  const especSnap = await especRef.get();

  if (!especSnap.exists) {
    throw new HttpsError("not-found", `Erro de integridade referencial: Especificação ${dados.idEspecificacao} inexistente no resumo.`);
  }

  return {
    resumo: {
      id: resumoSnap.id,
      ...resumoSnap.data(),
    },
    especificacao: {
      id: especSnap.id,
      ...especSnap.data(),
    },
  };
});

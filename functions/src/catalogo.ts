import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { extrairClaimsAutoridade, validarAutoridadePersistida } from "./auth";
import { validatePayload } from "./utils/validation";
import { ResolverCatalogoPorIdsSchema } from "./schemas/catalogo.schema";

export interface CatalogoEspecificacaoJSON {
  id: string;
  descricao?: string;
  fabricante?: string;
  densidade?: number;
  unidade_de_medida?: string;
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
  gerado_em?: string;
  resumos: Record<string, CatalogoResumoJSON>;
}

/**
 * Monta e publica o catálogo canônico de reagentes no Storage e atualiza Sistema_Catalogo_Reagentes/estado.
 */
export async function montarEGravarCatalogoReagentes(): Promise<CatalogoReagentesJSON> {
  const db = admin.firestore();
  const estadoRef = db.collection("Sistema_Catalogo_Reagentes").doc("estado");

  const estadoSnap = await estadoRef.get();
  const versaoAtual = estadoSnap.exists ? (estadoSnap.data()?.versao_publicada ?? 0) : 0;
  const novaVersao = versaoAtual + 1;

  const resumosSnap = await db.collection("Resumo_Reagente").get();
  const resumosMap: Record<string, CatalogoResumoJSON> = {};

  for (const doc of resumosSnap.docs) {
    const data = doc.data();
    const especsSnap = await doc.ref.collection("Especificacoes").get();
    const especsMap: Record<string, CatalogoEspecificacaoJSON> = {};

    for (const eDoc of especsSnap.docs) {
      const eData = eDoc.data();
      especsMap[eDoc.id] = {
        id: eDoc.id,
        descricao: eData.descricao ?? "",
        fabricante: eData.fabricante ?? "",
        ...(typeof eData.densidade === "number" ? { densidade: eData.densidade } : {}),
        ...(eData.unidade_de_medida ? { unidade_de_medida: eData.unidade_de_medida } : {}),
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
    catalog_version: novaVersao,
    gerado_em: new Date().toISOString(),
    resumos: resumosMap,
  };

  const storagePath = `catalogo/reagentes_v${novaVersao}.json`;

  try {
    const bucketName = process.env.STORAGE_BUCKET || admin.app().options.storageBucket || "lcqui-dev.appspot.com";
    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(storagePath);
    await file.save(JSON.stringify(catalogo, null, 2), {
      contentType: "application/json",
      metadata: {
        schema_version: "1",
        catalog_version: String(novaVersao),
      },
    });
  } catch (err) {
    // O estado publicado só pode apontar para um artefato que existe no Storage.
    // Falhar fechado evita anunciar uma versão inexistente após erro de upload.
    console.error("Storage upload do catálogo não concluído:", err);
    throw new HttpsError("unavailable", "Não foi possível publicar o catálogo no Storage.");
  }

  await estadoRef.set({
    versao_publicada: novaVersao,
    versao_fonte: novaVersao,
    schema_version: 1,
    storage_path: storagePath,
    catalogo_embutido: catalogo,
    publicado_em: FieldValue.serverTimestamp(),
  });

  return catalogo;
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
  const claims = extrairClaimsAutoridade(request);

  // Papéis permitidos conforme matriz da Seção 3 e M9: Chefe_Geral, Gestor_Almoxarifado, Professor, Aluno, Bolsista
  const papeisPermitidos = ["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Aluno", "Bolsista"];
  const autorizado = claims.papeis.some((p) => papeisPermitidos.includes(p));

  if (!autorizado) {
    throw new HttpsError("permission-denied", "Usuário não possui autoridade para consultar o catálogo de reagentes.");
  }

  const db = admin.firestore();
  const estadoRef = db.collection("Sistema_Catalogo_Reagentes").doc("estado");
  const estadoSnap = await estadoRef.get();

  if (!estadoSnap.exists) {
    // Se o catálogo ainda não foi gerado, compila na primeira chamada
    const catalogo = await montarEGravarCatalogoReagentes();
    return {
      versaoPublicada: catalogo.catalog_version,
      schemaVersion: catalogo.schema_version,
      storagePath: `catalogo/reagentes_v${catalogo.catalog_version}.json`,
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
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(ResolverCatalogoPorIdsSchema, request.data);

  const papeisPermitidos = ["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Aluno", "Bolsista"];
  const autorizado = claims.papeis.some((p) => papeisPermitidos.includes(p));

  if (!autorizado) {
    throw new HttpsError("permission-denied", "Usuário não possui autoridade para consultar o catálogo de reagentes.");
  }

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

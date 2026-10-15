import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { validarAutoridadePersistida } from "./auth";
import { validatePayload } from "./utils/validation";
import { verificarRateLimitCallable } from "./utils/rateLimit";
import { ResolverCatalogoPorIdsSchema } from "./schemas/catalogo.schema";

export type CatalogoNome = "resumos" | "especificacoes" | "substancias" | "materias";

export interface CatalogoEspecificacaoJSON {
  id: string;
  id_resumo_reagente: string;
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
  requer_pesagem_frequente?: boolean;
  frequencia_pesagem_dias?: number | null;
  qtd_em_que_e_considerado_escasso?: number;
  letra_inicial?: string;
}

export interface CatalogoSubstanciaJSON {
  id: string;
  nome: string;
  cas_number?: string | null;
  formula_quimica?: string | null;
  ativo?: boolean;
}

export interface CatalogoMateriaJSON {
  id: string;
  nome: string;
  codigo_materia: string;
}

export interface CatalogoDescriptorJSON {
  versao_fonte: number;
  versao_publicada: number;
  storage_path: string | null;
  sha256: string | null;
}

export interface CatalogoManifestoJSON {
  schema_version: 2;
  manifesto_version: number;
  compatibilidade: Record<CatalogoNome, number>;
  catalogos: Record<CatalogoNome, CatalogoDescriptorJSON>;
}

export interface CatalogoReagentesJSON {
  schema_version: 2;
  catalog_version: number;
  manifesto_version: number;
  manifesto: CatalogoManifestoJSON;
  resumos: Record<string, CatalogoResumoJSON>;
  especificacoes: Record<string, CatalogoEspecificacaoJSON>;
}

export interface CatalogoSubstanciasJSON {
  schema_version: 2;
  catalog_version: number;
  manifesto_version: number;
  manifesto: CatalogoManifestoJSON;
  substancias: Record<string, CatalogoSubstanciaJSON>;
}

export interface CatalogoMateriasJSON {
  schema_version: 2;
  catalog_version: number;
  manifesto_version: number;
  manifesto: CatalogoManifestoJSON;
  materias: Record<string, CatalogoMateriaJSON>;
}

type CatalogoConteudo =
  | Record<string, CatalogoResumoJSON>
  | Record<string, CatalogoEspecificacaoJSON>
  | Record<string, CatalogoSubstanciaJSON>
  | Record<string, CatalogoMateriaJSON>;

interface EstadoCatalogo {
  versao_fonte?: number;
  versao_publicada?: number;
  schema_version?: number;
  manifesto_version?: number;
  manifesto_storage_path?: string | null;
  manifesto_sha256?: string | null;
  manifesto?: CatalogoManifestoJSON | null;
  catalogos?: Partial<Record<CatalogoNome, CatalogoDescriptorJSON>>;
  catalogos_embutidos?: Partial<Record<CatalogoNome, CatalogoConteudo>>;
  storage_path?: string | null;
  sha256?: string | null;
  catalogo_embutido?: CatalogoReagentesJSON | null;
}

const estadoCatalogoRef = () => admin.firestore().collection("Sistema_Catalogo_Reagentes").doc("estado");

const catalogoConfig: Record<CatalogoNome, { colecao: string; prefixo: string }> = {
  resumos: { colecao: "Resumo_Reagente", prefixo: "catalogo-resumos" },
  especificacoes: { colecao: "Especificacao_Reagente", prefixo: "catalogo-especificacoes" },
  substancias: { colecao: "Substancia_Quimica", prefixo: "catalogo-substancias" },
  materias: { colecao: "Materia", prefixo: "catalogo-materias" },
};

function numeroVersao(valor: unknown, padrao = 0): number {
  return Number.isInteger(valor) && Number(valor) >= 0 ? Number(valor) : padrao;
}

function estadoFonte(atual: EstadoCatalogo, nome: CatalogoNome): number {
  const descritor = atual.catalogos?.[nome];
  if (descritor) return numeroVersao(descritor.versao_fonte, 1);
  // Compatibilidade de migração: o seed V1 tinha uma única versão para os
  // dois catálogos de reagentes e nenhum descritor para matérias/substâncias.
  return nome === "resumos" || nome === "especificacoes"
    ? Math.max(numeroVersao(atual.versao_fonte, 1), 1)
    : 1;
}

/** Incrementa apenas o catálogo afetado pela mutação canônica. */
export async function incrementarVersaoCatalogoTx(tx: admin.firestore.Transaction, nome: CatalogoNome): Promise<void> {
  const ref = estadoCatalogoRef();
  const snap = await tx.get(ref);
  const atual = (snap.data() ?? {}) as EstadoCatalogo;
  const versao = estadoFonte(atual, nome);
  const catalogos = { ...(atual.catalogos ?? {}) };
  catalogos[nome] = {
    versao_fonte: versao + 1,
    versao_publicada: numeroVersao(catalogos[nome]?.versao_publicada, 0),
    storage_path: catalogos[nome]?.storage_path ?? null,
    sha256: catalogos[nome]?.sha256 ?? null,
  };
  tx.set(ref, {
    schema_version: 2,
    catalogos,
    // Campos legados preservados para leitores V1 durante a migração.
    versao_fonte: Math.max(...Object.values(catalogos).map((item) => numeroVersao(item?.versao_fonte, 0))),
    versao_publicada: Math.min(...Object.values(catalogos).map((item) => numeroVersao(item?.versao_publicada, 0))),
  }, { merge: true });
}

/** Compatibilidade para chamadas antigas: mutações de resumo usavam este nome. */
export async function incrementarVersaoFonteTx(tx: admin.firestore.Transaction): Promise<void> {
  await incrementarVersaoCatalogoTx(tx, "resumos");
}

function jsonDeterministico(valor: unknown): string {
  return JSON.stringify(valor, null, 2);
}

function descriptor(atual: EstadoCatalogo, nome: CatalogoNome): CatalogoDescriptorJSON {
  const item = atual.catalogos?.[nome];
  return {
    versao_fonte: estadoFonte(atual, nome),
    versao_publicada: numeroVersao(item?.versao_publicada, 0),
    storage_path: item?.storage_path ?? null,
    sha256: item?.sha256 ?? null,
  };
}

function manifestoDe(atual: EstadoCatalogo): CatalogoManifestoJSON {
  const catalogos = {} as Record<CatalogoNome, CatalogoDescriptorJSON>;
  for (const nome of Object.keys(catalogoConfig) as CatalogoNome[]) catalogos[nome] = descriptor(atual, nome);
  return {
    schema_version: 2,
    manifesto_version: numeroVersao(atual.manifesto_version, 0),
    compatibilidade: Object.fromEntries((Object.keys(catalogoConfig) as CatalogoNome[]).map((nome) => [nome, catalogos[nome].versao_publicada])) as Record<CatalogoNome, number>,
    catalogos,
  };
}

function normalizeResumo(id: string, data: admin.firestore.DocumentData): CatalogoResumoJSON {
  return {
    id,
    nome: data.nome ?? "",
    tipo_substancia: data.tipo_substancia ?? "PURA",
    natureza_quimica: data.natureza_quimica ?? "INORGANICO",
    estado_fisico: data.estado_fisico ?? "SOLIDO",
    eh_higroscopico: Boolean(data.eh_higroscopico),
    requer_pesagem_frequente: Boolean(data.requer_pesagem_frequente),
    frequencia_pesagem_dias: data.frequencia_pesagem_dias ?? null,
    qtd_em_que_e_considerado_escasso: data.qtd_em_que_e_considerado_escasso ?? 0,
    letra_inicial: data.letra_inicial ?? String(data.nome ?? "").charAt(0).toUpperCase(),
  };
}

function normalizeEspecificacao(id: string, data: admin.firestore.DocumentData): CatalogoEspecificacaoJSON {
  return {
    id,
    id_resumo_reagente: String(data.id_resumo_reagente ?? ""),
    descricao: data.descricao ?? "",
    fabricante: data.fabricante ?? "",
    ...(data.codigo_produto_fabricante ? { codigo_produto_fabricante: data.codigo_produto_fabricante } : {}),
    ...(data.grau_pureza ? { grau_pureza: data.grau_pureza } : {}),
    ...(typeof data.densidade === "number" ? { densidade: data.densidade } : {}),
    ...(data.unidade_de_medida ? { unidade_de_medida: data.unidade_de_medida } : {}),
    ...(data.classe_inflamabilidade ? { classe_inflamabilidade: data.classe_inflamabilidade } : {}),
    ...(typeof data.eh_controlado_pf === "boolean" ? { eh_controlado_pf: data.eh_controlado_pf } : {}),
    ...(typeof data.eh_controlado_eb === "boolean" ? { eh_controlado_eb: data.eh_controlado_eb } : {}),
    ...(data.link_fds_fispq ? { link_fds_fispq: data.link_fds_fispq } : {}),
    ...(data.id_substancia_quimica ? { id_substancia_quimica: data.id_substancia_quimica } : {}),
    ...(Array.isArray(data.composicao) ? { composicao: data.composicao } : {}),
  };
}

async function montarConteudo(nome: CatalogoNome): Promise<CatalogoConteudo> {
  const snap = await admin.firestore().collection(catalogoConfig[nome].colecao).get();
  const conteudo: Record<string, unknown> = {};
  for (const doc of [...snap.docs].sort((a, b) => a.id.localeCompare(b.id))) {
    const data = doc.data();
    if (nome === "resumos") conteudo[doc.id] = normalizeResumo(doc.id, data);
    else if (nome === "especificacoes") conteudo[doc.id] = normalizeEspecificacao(doc.id, data);
    else if (nome === "substancias") conteudo[doc.id] = {
      id: doc.id,
      nome: data.nome ?? "",
      cas_number: data.cas_number ?? null,
      formula_quimica: data.formula_quimica ?? null,
      ativo: data.ativo !== false,
    } satisfies CatalogoSubstanciaJSON;
    else conteudo[doc.id] = {
      id: doc.id,
      nome: data.nome ?? "",
      codigo_materia: data.codigo_materia ?? "",
    } satisfies CatalogoMateriaJSON;
  }
  return conteudo as CatalogoConteudo;
}

async function salvarObjetoStorage(path: string, payload: string, catalogVersion: number, sha256: string): Promise<void> {
  try {
    const bucketName = process.env.STORAGE_BUCKET || admin.app().options.storageBucket || "lcqui-dev.appspot.com";
    const file = admin.storage().bucket(bucketName).file(path);
    const [exists] = await file.exists();
    if (!exists) await file.save(payload, {
      resumable: false,
      contentType: "application/json",
      metadata: { metadata: { schema_version: "2", catalog_version: String(catalogVersion), sha256 } },
    });
  } catch (err) {
    console.error(`Storage upload do catálogo ${path} não concluído:`, err);
    throw new HttpsError("unavailable", "Não foi possível publicar o catálogo no Storage.");
  }
}

async function publicarCatalogo(nome: CatalogoNome, estado: EstadoCatalogo): Promise<EstadoCatalogo> {
  const atual = descriptor(estado, nome);
  const embutido = estado.catalogos_embutidos?.[nome];
  if (embutido && atual.versao_publicada >= atual.versao_fonte && atual.storage_path && atual.sha256) return estado;

  const versao = atual.versao_fonte;
  const conteudo = await montarConteudo(nome);
  const payload = jsonDeterministico({ schema_version: 2, catalog_version: versao, [nome]: conteudo });
  const sha256 = createHash("sha256").update(payload).digest("hex");
  const storagePath = `${catalogoConfig[nome].prefixo}/v${versao}-${sha256}.json`;
  await salvarObjetoStorage(storagePath, payload, versao, sha256);

  const ref = estadoCatalogoRef();
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const corrente = (snap.data() ?? {}) as EstadoCatalogo;
    const correnteVersao = estadoFonte(corrente, nome);
    if (correnteVersao !== versao) throw new Error("CATALOGO_SOURCE_CHANGED");
    const catalogos = { ...(corrente.catalogos ?? {}) };
    catalogos[nome] = { versao_fonte: versao, versao_publicada: versao, storage_path: storagePath, sha256 };
    const catalogosEmbutidos = { ...(corrente.catalogos_embutidos ?? {}) };
    catalogosEmbutidos[nome] = conteudo;
    tx.set(ref, {
      schema_version: 2,
      catalogos,
      catalogos_embutidos: catalogosEmbutidos,
      // Compatibilidade de leitura transitória para a V1.
      ...(nome === "resumos" ? { versao_fonte: versao, versao_publicada: versao, storage_path: storagePath, sha256, catalogo_embutido: { schema_version: 2, catalog_version: versao, resumos: conteudo } } : {}),
      gerado_em: FieldValue.serverTimestamp(),
      publicado_em: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return (await ref.get()).data() as EstadoCatalogo;
}

async function publicarManifesto(estado: EstadoCatalogo): Promise<EstadoCatalogo> {
  const manifestoAnterior = manifestoDe(estado);
  const semVersao = { ...manifestoAnterior, manifesto_version: 0 };
  const hashSemVersao = createHash("sha256").update(jsonDeterministico(semVersao)).digest("hex");
  if (estado.manifesto_sha256 === hashSemVersao && estado.manifesto) return estado;

  const versao = numeroVersao(estado.manifesto_version, 0) + 1;
  const manifesto = { ...manifestoAnterior, manifesto_version: versao } satisfies CatalogoManifestoJSON;
  const payload = jsonDeterministico(manifesto);
  const sha256 = createHash("sha256").update(payload).digest("hex");
  const storagePath = `catalogo-manifestos/v${versao}-${sha256}.json`;
  await salvarObjetoStorage(storagePath, payload, versao, sha256);
  await estadoCatalogoRef().set({
    schema_version: 2,
    manifesto_version: versao,
    manifesto,
    manifesto_storage_path: storagePath,
    manifesto_sha256: hashSemVersao,
  }, { merge: true });
  return (await estadoCatalogoRef().get()).data() as EstadoCatalogo;
}

async function publicarTodosCatalogos(): Promise<EstadoCatalogo> {
  let estado = (await estadoCatalogoRef().get()).data() as EstadoCatalogo | undefined;
  estado = estado ?? { schema_version: 2 };
  for (const nome of Object.keys(catalogoConfig) as CatalogoNome[]) estado = await publicarCatalogo(nome, estado);
  return publicarManifesto(estado);
}

// Uma mutação pode disparar a regeneração explícita enquanto a tela ainda
// conclui uma leitura do catálogo. Compartilhar a mesma promessa evita que
// essas chamadas concorrentes disputem a transação do documento de estado.
let publicacaoCatalogosEmAndamento: Promise<EstadoCatalogo> | null = null;

function publicarCatalogosSerializado(): Promise<EstadoCatalogo> {
  if (!publicacaoCatalogosEmAndamento) {
    publicacaoCatalogosEmAndamento = publicarTodosCatalogos().finally(() => {
      publicacaoCatalogosEmAndamento = null;
    });
  }
  return publicacaoCatalogosEmAndamento;
}

function reagentesDaEstado(estado: EstadoCatalogo): CatalogoReagentesJSON {
  const manifesto = estado.manifesto ?? manifestoDe(estado);
  return {
    schema_version: 2,
    catalog_version: manifesto.compatibilidade.resumos,
    manifesto_version: manifesto.manifesto_version,
    manifesto,
    resumos: (estado.catalogos_embutidos?.resumos ?? {}) as Record<string, CatalogoResumoJSON>,
    especificacoes: (estado.catalogos_embutidos?.especificacoes ?? {}) as Record<string, CatalogoEspecificacaoJSON>,
  };
}

export async function montarEGravarCatalogoReagentes(): Promise<CatalogoReagentesJSON> {
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    try {
      const estado = await publicarCatalogosSerializado();
      return reagentesDaEstado(estado);
    } catch (err) {
      if (err instanceof Error && err.message === "CATALOGO_SOURCE_CHANGED") continue;
      throw err;
    }
  }
  throw new HttpsError("aborted", "Os catálogos mudaram durante a publicação; tente novamente.");
}

async function carregarEstadoPublicado(): Promise<EstadoCatalogo> {
  const estado = await estadoCatalogoRef().get();
  const dados = (estado.data() ?? {}) as EstadoCatalogo;
  const pendente = (Object.keys(catalogoConfig) as CatalogoNome[]).some((nome) => {
    const item = descriptor(dados, nome);
    return !estado.exists || !dados.catalogos_embutidos?.[nome] || item.versao_publicada < item.versao_fonte;
  });
  return pendente ? await publicarCatalogosSerializado() : dados;
}

export const gerarCatalogoReagentes = onCall(async (request) => {
  const autoridade = await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
  await verificarRateLimitCallable(autoridade.uid, "catalogo-geracao");
  const catalogo = await montarEGravarCatalogoReagentes();
  return {
    status: "OK",
    versaoPublicada: catalogo.manifesto.compatibilidade.resumos,
    schemaVersion: catalogo.schema_version,
    manifestoVersion: catalogo.manifesto_version,
    totalResumos: Object.keys(catalogo.resumos).length,
    totalEspecificacoes: Object.keys(catalogo.especificacoes).length,
  };
});

export const obterCatalogoReagentes = onCall(async (request) => {
  const autoridade = await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Aluno", "Bolsista"]);
  await verificarRateLimitCallable(autoridade.uid, "catalogo-leitura");
  const estado = await carregarEstadoPublicado();
  const catalogo = reagentesDaEstado(estado);
  return {
    versaoPublicada: catalogo.manifesto.compatibilidade.resumos,
    schemaVersion: catalogo.schema_version,
    manifestoVersion: catalogo.manifesto_version,
    storagePath: estado.manifesto_storage_path ?? null,
    manifesto: catalogo.manifesto,
    catalogo: { resumos: catalogo.resumos, especificacoes: catalogo.especificacoes },
  };
});

export const obterCatalogoSubstancias = onCall(async (request) => {
  const autoridade = await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
  await verificarRateLimitCallable(autoridade.uid, "catalogo-leitura");
  const estado = await carregarEstadoPublicado();
  const manifesto = estado.manifesto ?? manifestoDe(estado);
  return {
    versaoPublicada: manifesto.compatibilidade.substancias,
    schemaVersion: 2,
    manifestoVersion: manifesto.manifesto_version,
    manifesto,
    catalogo: { substancias: (estado.catalogos_embutidos?.substancias ?? {}) as Record<string, CatalogoSubstanciaJSON> },
  };
});

export const obterCatalogoMaterias = onCall(async (request) => {
  const autoridade = await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Aluno", "Bolsista"]);
  await verificarRateLimitCallable(autoridade.uid, "catalogo-leitura");
  const estado = await carregarEstadoPublicado();
  const manifesto = estado.manifesto ?? manifestoDe(estado);
  return {
    versaoPublicada: manifesto.compatibilidade.materias,
    schemaVersion: 2,
    manifestoVersion: manifesto.manifesto_version,
    manifesto,
    catalogo: { materias: (estado.catalogos_embutidos?.materias ?? {}) as Record<string, CatalogoMateriaJSON> },
  };
});

export const resolverCatalogoPorIds = onCall(async (request) => {
  const dados = validatePayload(ResolverCatalogoPorIdsSchema, request.data);
  const autoridade = await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado", "Professor", "Aluno", "Bolsista"]);
  await verificarRateLimitCallable(autoridade.uid, "catalogo-resolucao");

  const db = admin.firestore();
  const resumoRef = db.collection("Resumo_Reagente").doc(dados.idResumo);
  const resumoSnap = await resumoRef.get();
  if (!resumoSnap.exists) throw new HttpsError("not-found", `Erro de integridade referencial: Resumo ${dados.idResumo} inexistente no catálogo.`);

  const especRef = resumoRef.collection("Especificacoes").doc(dados.idEspecificacao);
  const especSnap = await especRef.get();
  if (!especSnap.exists) throw new HttpsError("not-found", `Erro de integridade referencial: Especificação ${dados.idEspecificacao} inexistente no resumo.`);

  return {
    resumo: { id: resumoSnap.id, ...resumoSnap.data() },
    especificacao: { id: especSnap.id, ...especSnap.data() },
  };
});

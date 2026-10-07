/**
 * Acesso de teste ao Firebase Emulator Suite.
 *
 * Nenhuma chamada aqui toca produção: hosts, projectId e endpoints são
 * exclusivamente de emulador. As funções administrativas (rules bypass no
 * Firestore e recuperação de OOB codes no Auth) representam apenas observação
 * de efeitos e o transporte de e-mail do emulador — jamais substituem as
 * validações de domínio exercitadas via callables/UI.
 */

export const PROJECT_ID = process.env.LCQUI_E2E_PROJECT_ID ?? "lcqui-uenf";
export const AUTH_EMULATOR = process.env.LCQUI_E2E_AUTH_EMULATOR ?? "http://127.0.0.1:9099";
export const FIRESTORE_EMULATOR =
  process.env.LCQUI_E2E_FIRESTORE_EMULATOR ?? "http://127.0.0.1:8080";
export const FUNCTIONS_EMULATOR =
  process.env.LCQUI_E2E_FUNCTIONS_EMULATOR ?? "http://127.0.0.1:5001";

const FIRESTORE_DOCS = `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type ValorFirestore = Record<string, unknown>;

function converterValor(valor: ValorFirestore): unknown {
  if ("nullValue" in valor) return null;
  if ("stringValue" in valor) return valor.stringValue;
  if ("booleanValue" in valor) return valor.booleanValue;
  if ("integerValue" in valor) return Number(valor.integerValue);
  if ("doubleValue" in valor) return Number(valor.doubleValue);
  if ("timestampValue" in valor) return valor.timestampValue;
  if ("mapValue" in valor) {
    const campos = (valor.mapValue as { fields?: Record<string, ValorFirestore> }).fields ?? {};
    return converterCampos(campos);
  }
  if ("arrayValue" in valor) {
    const valores = (valor.arrayValue as { values?: ValorFirestore[] }).values ?? [];
    return valores.map(converterValor);
  }
  return undefined;
}

function converterCampos(campos: Record<string, ValorFirestore>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(campos)) {
    saida[chave] = converterValor(valor);
  }
  return saida;
}

export interface DocumentoEmulado {
  id: string;
  data: Record<string, unknown>;
}

async function firestoreFetch(caminho: string): Promise<Response> {
  return fetch(`${FIRESTORE_DOCS}/${caminho}`, {
    headers: { Authorization: "Bearer owner" },
  });
}

export async function lerDocumento(caminho: string): Promise<DocumentoEmulado | null> {
  const resposta = await firestoreFetch(caminho);
  if (resposta.status === 404) return null;
  if (!resposta.ok) {
    throw new Error(`Firestore Emulator ${caminho}: HTTP ${resposta.status}`);
  }
  const json = (await resposta.json()) as {
    name: string;
    fields?: Record<string, ValorFirestore>;
  };
  return {
    id: json.name.split("/").pop()!,
    data: converterCampos(json.fields ?? {}),
  };
}

export async function listarColecao(caminho: string): Promise<DocumentoEmulado[]> {
  const resposta = await firestoreFetch(caminho);
  if (!resposta.ok) {
    throw new Error(`Firestore Emulator (list) ${caminho}: HTTP ${resposta.status}`);
  }
  const json = (await resposta.json()) as {
    documents?: { name: string; fields?: Record<string, ValorFirestore> }[];
  };
  return (json.documents ?? []).map((doc) => ({
    id: doc.name.split("/").pop()!,
    data: converterCampos(doc.fields ?? {}),
  }));
}

export async function criarNotificacaoEmulada(
  uid: string,
  id: string,
  dados: {
    tipo: string;
    idAlvo: string;
    entidadeAlvo: string;
    mensagem: string;
  }
): Promise<void> {
  const resposta = await fetch(
    `${FIRESTORE_DOCS}/Usuarios/${uid}/Notificacoes/${id}?currentDocument.exists=false`,
    {
      method: "PATCH",
      headers: {
        Authorization: "Bearer owner",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          tipo: { stringValue: dados.tipo },
          papel_destinatario: { stringValue: "Professor" },
          id_destinatario: { stringValue: uid },
          id_alvo: { stringValue: dados.idAlvo },
          entidade_alvo: { stringValue: dados.entidadeAlvo },
          id_turma: { nullValue: null },
          id_quem_fez_acao: { stringValue: "seed-professor-alpha" },
          lida: { booleanValue: false },
          lida_em: { nullValue: null },
          emitida_em: { timestampValue: new Date().toISOString() },
          expira_em: { nullValue: null },
          mensagem_customizada: { stringValue: dados.mensagem },
        },
      }),
    }
  );
  if (!resposta.ok) {
    throw new Error(`Falha ao criar notificação de teste (HTTP ${resposta.status}).`);
  }
}

export async function removerDocumentoEmulado(caminho: string): Promise<void> {
  const resposta = await fetch(`${FIRESTORE_DOCS}/${caminho}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer owner" },
  });
  if (!resposta.ok && resposta.status !== 404) {
    throw new Error(`Falha ao remover documento de teste (HTTP ${resposta.status}).`);
  }
}

export interface OobCode {
  email: string;
  requestType: string;
  oobCode: string;
  oobLink: string;
}

export async function listarOobCodes(): Promise<OobCode[]> {
  const resposta = await fetch(
    `${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/oobCodes`
  );
  if (!resposta.ok) {
    throw new Error(`Auth Emulator oobCodes: HTTP ${resposta.status}`);
  }
  const json = (await resposta.json()) as { oobCodes?: OobCode[] };
  return json.oobCodes ?? [];
}

export async function ultimoOobPara(
  email: string,
  requestType: "PASSWORD_RESET" | "VERIFY_EMAIL"
): Promise<OobCode> {
  const codigos = (await listarOobCodes()).filter(
    (codigo) => codigo.email === email && codigo.requestType === requestType
  );
  if (codigos.length === 0) {
    throw new Error(
      `Nenhum OOB ${requestType} emitido para ${email}. O convite externo deve emitir o OOB real.`
    );
  }
  return codigos[codigos.length - 1];
}

export function extrairContinueUrl(oobLink: string): string {
  const url = new URL(oobLink);
  const continueUrl = url.searchParams.get("continueUrl");
  if (!continueUrl) {
    throw new Error(`OOB link sem continueUrl: ${oobLink}`);
  }
  return continueUrl;
}

/**
 * Consome o OOB de definição de credencial no Auth Emulator. O emulator é o
 * transporte do e-mail; esta etapa apenas define a senha, sem burlar nenhuma
 * regra de domínio do LCQUI.
 */
export async function definirSenhaViaOob(oobLink: string, novaSenha: string): Promise<void> {
  const resposta = await fetch(`${oobLink}&newPassword=${encodeURIComponent(novaSenha)}`, {
    redirect: "manual",
  });
  if (resposta.status >= 400) {
    const corpo = await resposta.text();
    throw new Error(`Falha ao definir senha via OOB (HTTP ${resposta.status}): ${corpo}`);
  }
}

export async function emuladoresDisponiveis(): Promise<string[]> {
  const alvos: [string, string][] = [
    ["Auth", `${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/oobCodes`],
    ["Firestore", `${FIRESTORE_EMULATOR}/`],
    ["Functions", `${FUNCTIONS_EMULATOR}/`],
  ];
  const indisponiveis: string[] = [];
  for (const [nome, url] of alvos) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(2000) });
    } catch {
      indisponiveis.push(`${nome} (${url})`);
    }
  }
  return indisponiveis;
}

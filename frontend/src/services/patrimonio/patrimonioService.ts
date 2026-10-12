import { ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { functions, storage } from "@/lib/firebase/config";
import type {
  CriarRequisicaoAdicaoBemInput,
  CriarRequisicaoEdicaoBemInput,
  GerarRelatorioBensParams,
  RegistrarBaixaBemInput,
  RelatorioPdfResponse,
} from "@/types/patrimonioApi";

export async function criarRequisicaoEdicaoBem(payload: CriarRequisicaoEdicaoBemInput): Promise<void> {
  const fn = httpsCallable<CriarRequisicaoEdicaoBemInput, Record<string, never>>(functions, "criarRequisicaoEdicaoBem");
  await fn(payload);
}

export async function registrarBaixaBemPatrimonial(payload: RegistrarBaixaBemInput): Promise<void> {
  const fn = httpsCallable<RegistrarBaixaBemInput, Record<string, never>>(functions, "registrarBaixaBemPatrimonial");
  await fn(payload);
}

export async function enviarFotoRequisicaoPatrimonial(uid: string, foto: File): Promise<string> {
  const nomeSeguro = foto.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const caminho = `requisicoes/${uid}/${crypto.randomUUID()}-${nomeSeguro}`;
  await uploadBytes(ref(storage, caminho), foto, {
    contentType: foto.type,
    customMetadata: { owner: uid },
  });
  return caminho;
}

export async function criarRequisicaoAdicaoBem(payload: CriarRequisicaoAdicaoBemInput): Promise<void> {
  const fn = httpsCallable<CriarRequisicaoAdicaoBemInput, Record<string, never>>(functions, "criarRequisicaoAdicaoBem");
  await fn(payload);
}

export async function gerarRelatorioBensPredio(params: GerarRelatorioBensParams): Promise<string> {
  const fn = httpsCallable<GerarRelatorioBensParams, RelatorioPdfResponse>(functions, "gerarRelatorioBensPredio");
  return (await fn(params)).data.base64;
}

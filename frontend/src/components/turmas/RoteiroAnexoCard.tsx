import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { FileText } from "lucide-react";
import {
  limparIntencao,
  obterIntencaoPersistida,
  chaveIntencaoEmitirUrl,
  assinaturaIntencaoEmitirUrl,
} from "@/lib/intencaoOperacao";
import type { RoteiroAnexo } from "@/types/turmas";

export type { RoteiroAnexo };

interface RoteiroAnexoCardProps {
  anexo: RoteiroAnexo;
  idTurma: string;
  idPost: string;
  roles: string[];
  onErro: (msg: string) => void;
}

export function RoteiroAnexoCard({
  anexo,
  idTurma,
  idPost,
  roles,
  onErro,
}: RoteiroAnexoCardProps) {
  const [loading, setLoading] = useState(false);
  const isAlunoBolsista = roles.includes("Aluno") || roles.includes("Bolsista");

  const handleDownload = async () => {
    setLoading(true);
    try {
      const fn = getFunctions();
      const emitir = httpsCallable(fn, "emitirUrlDownloadRoteiro");

      const idTurmaParaIntencao = isAlunoBolsista ? idTurma : null;
      const idPostParaIntencao = isAlunoBolsista ? idPost : null;
      const session = typeof window !== "undefined" ? window.sessionStorage : null;
      const chave = chaveIntencaoEmitirUrl(anexo.id_roteiro, idTurmaParaIntencao, idPostParaIntencao);
      const assinatura = assinaturaIntencaoEmitirUrl(anexo.id_roteiro, idTurmaParaIntencao, idPostParaIntencao);
      const intencao = session
        ? obterIntencaoPersistida(session, chave, assinatura, () => crypto.randomUUID())
        : { idOperacao: crypto.randomUUID(), assinatura };

      const payload: Record<string, string> = {
        idOperacao: intencao.idOperacao,
        idRoteiro: anexo.id_roteiro,
      };
      if (isAlunoBolsista) {
        payload.idTurma = idTurma;
        payload.idPost = idPost;
      }

      const res = await emitir(payload);
      const data = res.data as { url: string };
      window.open(data.url, "_blank");
      if (session) limparIntencao(session, chave);
    } catch (err) {
      console.error("Erro ao emitir URL de download:", err);
      onErro("Erro ao gerar link de download do roteiro.");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      data-testid="roteiro-anexo-card"
      className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-500" />
        <div>
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            Anexo: {anexo.nome_arquivo}
          </p>
          <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
            {formatBytes(anexo.tamanho_bytes)}
          </p>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={loading}
        data-testid="botao-download-roteiro"
        className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
      >
        {loading ? "Gerando..." : "Baixar PDF"}
      </button>
    </div>
  );
}

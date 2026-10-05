"use client";

import React, { useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { functions } from "@/lib/firebase/config";
import {
  obterIntencaoPersistida,
  limparIntencao,
  CHAVE_INTENCAO_LOCAL,
  assinaturaIntencaoLocal,
  type CamposIntencaoLocal,
} from "@/lib/intencaoOperacao";

interface LocalEditavel {
  id: string;
  predio: string;
  andar: string;
  sala: string;
}

interface NovaLocalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSucesso: (id: string) => void;
  /** Se informado, o modal entra em modo edição. */
  localEditavel?: LocalEditavel;
}

/**
 * Casca externa: renderiza o conteúdo apenas quando aberto e usa `key`
 * para reinicializar os campos a cada abertura sem setState em effect.
 */
export function NovaLocalModal({
  isOpen,
  onClose,
  onSucesso,
  localEditavel,
}: NovaLocalModalProps) {
  if (!isOpen) return null;
  return (
    <NovaLocalModalConteudo
      key={localEditavel?.id ?? "nova"}
      onClose={onClose}
      onSucesso={onSucesso}
      localEditavel={localEditavel}
    />
  );
}

interface NovaLocalModalConteudoProps {
  onClose: () => void;
  onSucesso: (id: string) => void;
  localEditavel?: LocalEditavel;
}

function NovaLocalModalConteudo({
  onClose,
  onSucesso,
  localEditavel,
}: NovaLocalModalConteudoProps) {
  const { user } = useAuth();
  const [predio, setPredio] = useState(localEditavel?.predio ?? "");
  const [andar, setAndar] = useState(localEditavel?.andar ?? "");
  const [sala, setSala] = useState(localEditavel?.sala ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unicidadeError, setUnicidadeError] = useState("");
  const predioInputRef = useRef<HTMLInputElement>(null);

  // Foco no primeiro campo ao abrir
  useEffect(() => {
    const timer = setTimeout(() => {
      predioInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Escape fecha o modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isEdit = !!localEditavel;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError("");
    setUnicidadeError("");

    const predioTrim = predio.trim();
    const andarTrim = andar.trim();
    const salaTrim = sala.trim();

    if (!predioTrim || !andarTrim || !salaTrim) {
      setError("Todos os campos são obrigatórios.");
      setLoading(false);
      return;
    }

    try {
      const campos: CamposIntencaoLocal = {
        predio: predioTrim,
        andar: andarTrim,
        sala: salaTrim,
        ...(isEdit ? { idLocal: localEditavel.id } : {}),
      };

      const intencao = obterIntencaoPersistida(
        sessionStorage,
        CHAVE_INTENCAO_LOCAL,
        assinaturaIntencaoLocal(campos),
        () => crypto.randomUUID()
      );

      const gerenciarLocalFn = httpsCallable(functions, "gerenciarLocal");

      const result = await gerenciarLocalFn({
        acao: isEdit ? "EDITAR" : "CRIAR",
        predio: predioTrim,
        andar: andarTrim,
        sala: salaTrim,
        idOperacao: intencao.idOperacao,
        ...(isEdit ? { idLocal: localEditavel.id } : {}),
      });

      const data = result.data as { id?: string } | undefined;
      limparIntencao(sessionStorage, CHAVE_INTENCAO_LOCAL);
      onSucesso(data?.id ?? localEditavel?.id ?? "");
    } catch (err) {
      const falha = err as { code?: string; message?: string };
      const codigo = typeof falha?.code === "string" ? falha.code : "";
      if (codigo.includes("already-exists")) {
        setUnicidadeError("Local já cadastrado com este prédio, andar e sala.");
        predioInputRef.current?.focus();
      } else {
        setError(falha?.message ?? "Erro ao salvar local.");
      }
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = isEdit ? "Editar Local" : "Novo Local";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      data-testid="modal-local"
    >
      <div className="bg-background w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-foreground/10">
        <div className="flex items-center justify-between p-4 border-b border-foreground/10">
          <h2 className="text-lg font-bold">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-foreground/70"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Banner genérico de erro */}
          {error && (
            <div
              id="erro-local-banner"
              data-testid="erro-campo-local"
              className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg border border-red-500/20"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Erro de unicidade */}
          {unicidadeError && (
            <div
              id="erro-unicidade-local"
              data-testid="erro-campo-local"
              className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg border border-red-500/20"
              role="alert"
            >
              {unicidadeError}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1 text-foreground/80">
              Prédio
            </label>
            <input
              ref={predioInputRef}
              required
              type="text"
              data-testid="input-predio"
              value={predio}
              onChange={(e) => {
                setPredio(e.target.value);
                if (unicidadeError) setUnicidadeError("");
              }}
              maxLength={30}
              className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                unicidadeError
                  ? "border-red-500"
                  : "border-foreground/20"
              }`}
              placeholder="Ex: P5, CCT..."
              aria-invalid={!!unicidadeError}
              aria-describedby={unicidadeError ? "erro-unicidade-local" : undefined}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-foreground/80">
              Andar
            </label>
            <input
              required
              type="text"
              data-testid="input-andar"
              value={andar}
              onChange={(e) => setAndar(e.target.value)}
              maxLength={10}
              className="w-full px-4 py-2 bg-background border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Térreo, 1, 2..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-foreground/80">
              Sala
            </label>
            <input
              required
              type="text"
              data-testid="input-sala"
              value={sala}
              onChange={(e) => setSala(e.target.value)}
              maxLength={30}
              className="w-full px-4 py-2 bg-background border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: 101, Lab. Orgânica..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-foreground/5 rounded-lg transition-colors text-foreground/70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="btn-salvar-local"
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : isEdit ? (
                "Salvar Alterações"
              ) : (
                "Salvar Local"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

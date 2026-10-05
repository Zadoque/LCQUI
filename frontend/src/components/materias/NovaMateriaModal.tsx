"use client";

import React, { useEffect, useRef, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NovaMateriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se informado, o modal entra em modo edição. */
  idMateria?: string;
  /** Nome pré-preenchido (para edição ou sugestão). */
  nomeInicial?: string;
  /** Código pré-preenchido (para edição ou sugestão). */
  codigoInicial?: string;
}

/**
 * Casca externa: renderiza o conteúdo apenas quando aberto e usa `key`
 * para reinicializar os campos a cada abertura sem setState em effect.
 */
export function NovaMateriaModal({
  isOpen,
  onClose,
  idMateria,
  nomeInicial = "",
  codigoInicial = "",
}: NovaMateriaModalProps) {
  if (!isOpen) return null;
  return (
    <NovaMateriaModalConteudo
      key={`${idMateria ?? "nova"}|${codigoInicial}|${nomeInicial}`}
      onClose={onClose}
      idMateria={idMateria}
      nomeInicial={nomeInicial}
      codigoInicial={codigoInicial}
    />
  );
}

interface NovaMateriaModalConteudoProps {
  onClose: () => void;
  idMateria?: string;
  nomeInicial: string;
  codigoInicial: string;
}

function NovaMateriaModalConteudo({
  onClose,
  idMateria,
  nomeInicial,
  codigoInicial,
}: NovaMateriaModalConteudoProps) {
  const { user } = useAuth();
  const [nome, setNome] = useState(nomeInicial);
  const [codigoMateria, setCodigoMateria] = useState(codigoInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codigoError, setCodigoError] = useState("");
  const codigoInputRef = useRef<HTMLInputElement>(null);
  const nomeInputRef = useRef<HTMLInputElement>(null);

  // Foco no primeiro campo ao abrir
  useEffect(() => {
    const timer = setTimeout(() => {
      (codigoInputRef.current ?? nomeInputRef.current)?.focus();
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

  const isEdit = !!idMateria;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError("");
    setCodigoError("");

    const codigoNormalizado = codigoMateria.trim().toUpperCase();

    try {
      const functions = getFunctions();
      const gerenciarMateria = httpsCallable(functions, "gerenciarMateria");

      await gerenciarMateria({
        acao: isEdit ? "EDITAR" : "CRIAR",
        ...(isEdit ? { idMateria } : {}),
        nome: nome.trim(),
        codigoMateria: codigoNormalizado,
      });

      onClose();
      setNome("");
      setCodigoMateria("");
    } catch (err) {
      const falha = err as { code?: string; message?: string };
      const codigo = typeof falha?.code === "string" ? falha.code : "";
    if (codigo.includes("already-exists")) {
        setCodigoError("Código de matéria já cadastrado");
        // Foco no campo de código com erro
        codigoInputRef.current?.focus();
      } else {
        setError(falha?.message ?? "Erro ao salvar matéria.");
      }
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = isEdit ? "Editar Matéria" : "Nova Matéria";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      data-testid="modal-materia"
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
              id="erro-materia-banner"
              data-testid="erro-materia"
              className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg border border-red-500/20"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1 text-foreground/80">
              Código da Matéria
            </label>
            <input
              ref={codigoInputRef}
              required
              type="text"
              data-testid="input-codigo-materia"
              value={codigoMateria}
              onChange={(e) => {
                setCodigoMateria(e.target.value);
                if (codigoError) setCodigoError("");
              }}
              maxLength={10}
              className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase ${
                codigoError
                  ? "border-red-500"
                  : "border-foreground/20"
              }`}
              placeholder="Ex: QMC101"
              aria-invalid={!!codigoError}
              aria-describedby={codigoError ? "erro-codigo-materia" : undefined}
            />
            {codigoError && (
              <p
                id="erro-codigo-materia"
                data-testid="erro-campo-codigo"
                className="text-red-500 text-xs mt-1"
                role="alert"
              >
                {codigoError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-foreground/80">
              Nome da Matéria
            </label>
            <input
              ref={nomeInputRef}
              required
              type="text"
              data-testid="input-nome-materia"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2 bg-background border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Química Analítica I"
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
              data-testid="btn-salvar-materia"
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
                "Salvar Matéria"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

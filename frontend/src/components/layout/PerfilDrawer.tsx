"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { auth, storage, functions } from "@/lib/firebase/config";
import { signOut, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";

interface PerfilDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerfilDrawer({ isOpen, onClose }: PerfilDrawerProps) {
  const { user, roles } = useAuth();

  const [nome, setNome] = useState(user?.displayName ?? "");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Reseta o formulário quando o drawer abre
  useEffect(() => {
    if (isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setNome(user?.displayName ?? "");
      setFotoFile(null);
      setFotoPreview(null);
      setRemoverFoto(false);
      setErro(null);
      setSucesso(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen, user?.displayName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFotoFile(file);
    setRemoverFoto(false);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setFotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFotoPreview(null);
    }
  };

  const handleRemoverFoto = () => {
    setRemoverFoto(true);
    setFotoFile(null);
    setFotoPreview(null);
  };

  const handleSalvar = async () => {
    if (!user) return;

    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("Nome é obrigatório.");
      return;
    }

    setSalvando(true);
    setErro(null);
    setSucesso(false);

    try {
      // 2. Upload de foto, se houver
      if (fotoFile) {
        if (!fotoFile.type.startsWith("image/")) {
          setErro("O arquivo deve ser uma imagem.");
          setSalvando(false);
          return;
        }
        if (fotoFile.size >= 5 * 1024 * 1024) {
          setErro("A imagem deve ter tamanho inferior a 5 MiB.");
          setSalvando(false);
          return;
        }
        const storageRef = ref(
          storage,
          `fotos_perfil/${user.uid}/${Date.now()}_${fotoFile.name}`
        );
        await uploadBytes(storageRef, fotoFile);
        const url = await getDownloadURL(storageRef);
        await updateProfile(auth.currentUser!, { photoURL: url });
      }

      // 3. Remover foto
      if (removerFoto) {
        await updateProfile(auth.currentUser!, { photoURL: null });
      }

      // 4. Callable atualizarPerfil
      const fn = httpsCallable(functions, "atualizarPerfil");
      await fn({ nome: nomeLimpo });

      // 5. Reload + sucesso
      await auth.currentUser?.reload();
      setSucesso(true);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao salvar perfil. Tente novamente.";
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  if (!isOpen) return null;

  const fotoExibida = fotoPreview ?? (removerFoto ? null : user?.photoURL);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Perfil"
        className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l border-foreground/10 z-50 flex flex-col shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
          <h2 className="text-lg font-semibold text-foreground">Perfil</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-foreground/50 hover:text-foreground transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* E-mail somente leitura */}
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              E-mail
            </label>
            <p
              data-testid="perfil-email"
              className="text-sm text-foreground/50 bg-foreground/5 rounded-lg px-3 py-2"
            >
              {user?.email ?? "—"}
            </p>
          </div>

          {/* Papéis */}
          {roles && roles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Papéis
              </label>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <span
                    key={r}
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                  >
                    {r.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nome */}
          <div>
            <label
              htmlFor="perfil-nome"
              className="block text-sm font-medium text-foreground/70 mb-1"
            >
              Nome
            </label>
            <input
              id="perfil-nome"
              type="text"
              required
              maxLength={150}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              data-testid="perfil-nome"
              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Seu nome"
            />
          </div>

          {/* Foto */}
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              Foto
            </label>
            {fotoExibida ? (
              <Image
                src={fotoExibida}
                alt="Prévia da foto"
                width={80}
                height={80}
                unoptimized
                className="w-20 h-20 rounded-full object-cover border-2 border-foreground/10 mb-2"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center text-foreground/40 font-bold text-2xl mb-2">
                {nome ? nome.charAt(0).toUpperCase() : "?"}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              data-testid="perfil-foto-input"
              className="block w-full text-sm text-foreground/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {fotoExibida && (
              <button
                type="button"
                onClick={handleRemoverFoto}
                data-testid="perfil-remover-foto"
                className="mt-2 text-xs text-red-500 hover:text-red-400 transition-colors"
              >
                Remover foto
              </button>
            )}
          </div>

          {/* Erro / Sucesso */}
          {erro && (
            <p className="text-sm text-red-500" role="alert">
              {erro}
            </p>
          )}
          {sucesso && (
            <p className="text-sm text-green-500" role="status">
              Perfil atualizado com sucesso.
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-foreground/10 px-6 py-4 space-y-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-foreground/10 text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              data-testid="perfil-salvar"
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full px-4 py-2 rounded-lg text-sm font-medium text-red-500 border border-red-500/20 hover:bg-red-500/10 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </>
  );
}

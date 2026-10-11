"use client";
import { ModalAlmoxarifado } from "./ModalAlmoxarifado";
import type { AlmoxarifadoItem } from "@/types/cadastros";
export function GerenciarGestoresAlmoxarifadoModal({ isOpen, onClose, item, onSuccess }: { isOpen: boolean; onClose: () => void; item?: AlmoxarifadoItem; onSuccess: () => void }) {
  return <ModalAlmoxarifado isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} item={item} />;
}

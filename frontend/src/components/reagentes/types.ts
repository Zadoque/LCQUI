import type { ResumoReagente } from "@/types/reagentes";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  idResumoReagente?: string;
  idEspecificacaoReagente?: string;
  idAlmoxarifado?: string;
  onSuccess?: () => void | Promise<void>;
  resumoSelecionado?: Pick<ResumoReagente, "tipo_substancia" | "estado_fisico">;
}

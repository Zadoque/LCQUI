export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  idResumoReagente?: string;
  idEspecificacaoReagente?: string;
  idAlmoxarifado?: string;
  onSuccess?: () => void;
}

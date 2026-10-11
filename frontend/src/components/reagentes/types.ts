export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  idResumoReagente?: string;
  idEspecificacaoReagente?: string;
  idAlmoxarifado?: string;
  onSuccess?: () => void | Promise<void>;
  resumoSelecionado?: {
    tipo_substancia?: string;
    estado_fisico?: string;
  };
}

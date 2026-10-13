import type { AlmoxarifadoItem, GestorAlmoxarifado, MateriaItem } from "@/types/cadastros";

export interface GerenciarMateriaInput {
  acao: "CRIAR" | "EDITAR";
  idMateria?: string;
  nome: string;
  codigoMateria: string;
}

export interface GerenciarLocalInput {
  acao: "CRIAR" | "EDITAR";
  predio: string;
  andar: string;
  sala: string;
  idOperacao: string;
  idLocal?: string;
}

export interface GerenciarLocalResponse {
  id?: string;
}

export interface GerenciarAlmoxarifadoInput {
  acao: "CRIAR" | "EDITAR";
  idOperacao: string;
  idAlmoxarifado?: string;
  idLocal: string;
  nome: string;
  descricao: string;
  gestores: string[];
  ativo?: boolean;
}

export interface BuscarGestoresAlmoxarifadoResponse {
  gestores: GestorAlmoxarifado[];
}

export interface VínculoGestorAlmoxarifado {
  id_gestor_almoxarifado: string;
  id_almoxarifado: string;
}

export type { AlmoxarifadoItem, GestorAlmoxarifado, MateriaItem };

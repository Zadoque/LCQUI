import type { Papel } from "@/types/usuarios";

export interface BuscarUsuariosParams { termo?: string; papel?: Papel; letra?: string; }
export interface ConcederPapelParams { idOperacao: string; papel: Papel; uidAlvo?: string; nome?: string; email?: string; }
export interface ConcederPapelResult { uid: string; ativo: boolean; contaAuthCriada?: boolean; emailEnviado?: boolean; }
export interface RevogarPapelParams { idOperacao: string; uidAlvo: string; papel: Papel; motivo: string; }
export interface ObterDetalhesParams { uid: string; }
export interface ConvidarProfessorParams { idOperacao?: string; uidAlvo?: string; email?: string; nome?: string; centro: string; laboratorio: string; materias: string[]; }
export interface ConvidarProfessorResult { uid: string; ativo: boolean; contaAuthCriada?: boolean; emailEnviado?: boolean; }
export interface ConvidarProfessorRequest extends ConvidarProfessorParams { papel: "Professor"; }
export interface BuscarAlunosParams { letra: string; termo?: string; }

export interface UsuarioRetirada {
  id: string;
  nome: string;
  papeis: string[];
}

export interface BuscarUsuariosRetiradaParams {
  letra: string;
  termo?: string;
}

import type { MateriaItem } from "@/types/cadastros";
import type { Professor } from "@/types/usuarios";
import type { RoteiroProjecao, Turma } from "@/types/turmas";

export interface CriarTurmaInput {
  idOperacao: string;
  idMateria: string;
  nomeTurma: string;
  ano: number;
  semestre: number;
  capacidade: number;
  idProfessor?: string;
}

export interface CriarPostParams { idOperacao: string; idTurma: string; titulo: string; descricao: string; idRoteiroExperimento?: string; }
export interface EditarPostParams { idOperacao: string; idTurma: string; idPost: string; titulo: string; descricao: string; idRoteiroExperimento?: string | null; }
export interface RemoverPostParams { idOperacao: string; idTurma: string; idPost: string; motivo: string; }
export interface ArquivarTurmaParams { idTurma: string; }
export interface ListarComentariosResult { comentarios: import("@/types/turmas").ComentarioItem[]; visao: import("@/types/turmas").VisaoComentario; }
export interface AdicionarComentarioParams { idTurma: string; idPost: string; texto: string; }
export interface ModerarComentarioParams { idTurma: string; idPost: string; idComentario: string; motivo: string; }
export interface EditarComentarioParams { idTurma: string; idPost: string; idComentario: string; texto: string; }
export interface EmitirUrlDownloadRoteiroParams { idRoteiro: string; idTurma?: string | null; idPost?: string | null; isAlunoBolsista?: boolean; }
export interface RemoverAlunoTurmaParams { idTurma: string; idAluno: string; }

export interface IngressarTurmaInput {
  idOperacao: string;
  codigoTurma: string;
}

export interface AlterarStatusTurmaInput {
  idOperacao: string;
  idTurma: string;
  status: "Ativo" | "Arquivada";
}

export interface BuscarAlunosInput {
  letra: string;
  termo: string;
}

export interface AdicionarAlunoTurmaInput {
  idOperacao: string;
  idTurma: string;
  idAluno: string;
}

export interface ConvidarAlunoInput {
  idOperacao: string;
  email: string;
  idTurma?: string | null;
  matricula?: string;
  excederCapacidade?: boolean;
  justificativaExcecao?: string;
}

export interface RoteiroUploadInput {
  idOperacao: string;
  nome: string;
  descricao: string;
  storagePath: string;
  nomeArquivo: string;
}

export interface RoteiroIdInput {
  idOperacao: string;
  idRoteiro: string;
}

export interface CompartilharRoteiroInput extends RoteiroIdInput {
  uidProfessor: string;
}

export interface RoteiroRegistradoResponse {
  idRoteiro: string;
}

export interface ProfessorListaResponse {
  professores: Professor[];
}

export interface AlunosListaResponse {
  alunos: Array<{ id: string; nome: string }>;
}

export interface MateriaRelacao {
  id_materia: string;
}

export type { MateriaItem, RoteiroProjecao, Turma };

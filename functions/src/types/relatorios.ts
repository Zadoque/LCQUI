import type PDFDocumentWithTables from "pdfkit-table";

/**
 * Tipo do documento PDF usado pelos relatórios. O pacote pdfkit-table amplia
 * o documento do PDFKit com o método `table`, portanto o tipo continua sendo
 * o contrato público do PDFKit e não um objeto sem forma.
 */
export type DocumentoPdf = PDFDocumentWithTables;

/**
 * Dados persistidos nas coleções de relatório. Firestore permite campos
 * adicionais por coleção; DocumentData preserva esse contrato dinâmico sem
 * introduzir uma tipagem sem contrato no código da aplicação.
 */
export type RegistroFirestore = FirebaseFirestore.DocumentData;

export interface FrascoRelatorio extends RegistroFirestore {
  id: string;
  id_especificacao_reagente?: string;
  codigo_frasco?: string;
  nome_reagente?: string;
  cadastrado_em?: string | FirebaseFirestore.Timestamp;
  historico?: Array<RegistroFirestore>;
  numero_lote?: string;
}

export interface EventoHistoricoRelatorio extends RegistroFirestore {
  timestamp?: string;
  tipo?: string;
  gestor?: string;
  peso_anterior?: number | null;
  peso_novo?: number | null;
  medida_ajustada?: number | null;
  unidade?: string;
}

export interface FrascoFichaRelatorio extends FrascoRelatorio {
  historico?: EventoHistoricoRelatorio[];
}

export interface MovimentacaoControladaRelatorio {
  h: RegistroFirestore;
  frasco: RegistroFirestore;
  espec: RegistroFirestore;
}

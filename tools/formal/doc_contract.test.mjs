// Guard de contrato documental da reconciliação pré-M5.
// Verifica por inspeção normalizada que os contratos decididos nesta rodada
// continuam presentes nas fontes normativas e que as regressões proibidas não
// voltaram. Não substitui os gates CUE/Alloy/Rust; é a camada executável para
// os contratos que vivem apenas no texto/pseudocódigo (catálogo JSON e
// autoridade de vencimento na devolução).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = p => fs.readFileSync(p, 'utf8');
const S = 'documentation/Section-';
const flow = read(`${S}10-Tecnologia-e-Relatorios-Vercel-Firebase/Section-10-Subsection-5-Fluxo-de-Reagentes.tex`);
const jobs = read(`${S}10-Tecnologia-e-Relatorios-Vercel-Firebase/Section-10-Subsection-7-Jobs-Agendados.tex`);
const sec7 = read(`${S}7-Requisitos-e-Regras-de-Negocio.tex`);
const sec11 = read(`${S}11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex`);
const sec12 = read(`${S}12-Implementacoes-em-Estudo-para-Versoes-Futuras.tex`);

const mustContain = (source, needle, label) => {
  assert.ok(source.includes(needle), `Contrato ausente (${label}): ${needle}`);
};
const mustNotContain = (source, needle, label) => {
  assert.ok(!source.includes(needle), `Regressão reintroduzida (${label}): ${needle}`);
};

test('devolução não recalcula vencimento pelo relógio e classifica o retorno', () => {
  const devolucao = flow.slice(flow.indexOf('export const registrarDevolucao'), flow.indexOf('interface StatusExtraordinario'));
  mustContain(flow, 'AUTORIDADE DE VENCIMENTO', 'autoridade na devolução');
  mustContain(flow, 'frasco.vencido === true', 'leitura do vencido persistido');
  mustContain(flow, 'emprestimo.vencido_na_retirada', 'snapshot na classificação');
  mustContain(flow, 'VENCEU_DURANTE_EMPRESTIMO', 'caso A');
  mustContain(flow, 'JA_ESTAVA_VENCIDO', 'caso B');
  mustContain(flow, 'VALIDADE_DESCONHECIDA', 'caso C');
  mustContain(flow, 'Frasco venceu durante o empréstimo', 'mensagem A');
  mustContain(flow, 'Devolução de frasco vencido', 'mensagem B');
  mustContain(flow, 'Devolução de frasco de validade desconhecida', 'mensagem C');
  mustContain(flow, 'vencido_na_retirada: frascoVencido', 'gravação do snapshot na retirada');
  mustNotContain(devolucao, 'frasco.vencido || venceuAgora', 'segunda autoridade de vencimento na devolução');
  mustNotContain(sec7, 'recalcular o vencimento com a hora atual', 'recálculo síncrono na devolução');
  mustContain(jobs, 'Autoridade do vencimento', 'job como autoridade');
});

test('catálogo JSON é projeção de busca e nunca autoridade operacional', () => {
  mustContain(flow, 'Catálogo JSON de Resumos', 'projeção JSON');
  mustContain(flow, 'Firestore é a fonte canônica', 'fonte canônica');
  mustContain(flow, 'projeção materializada de busca/apresentação', 'papel do JSON');
  mustContain(flow, 'cópia descartável', 'cache local');
  mustContain(flow, 'O JSON \\textbf{não} é fonte canônica', 'JSON não é autoridade');
  mustContain(flow, 'Sistema\\_Catalogo\\_Reagentes/estado', 'estado server-owned');
  mustContain(flow, 'versao\\_fonte', 'versão da fonte');
  mustContain(flow, 'versao\\_publicada', 'versão publicada');
  mustContain(flow, 'obterCatalogoReagentes', 'cloud function de download');
  mustContain(flow, 'resolverCatalogoPorIds', 'fallback canônico por ID');
  mustContain(flow, 'ERRO DE INTEGRIDADE REFERENCIAL', 'erro de integridade referencial');
  mustContain(flow, 'objetos indexados por ID', 'formato canônico por ID');
  mustContain(flow, 'Object.values(catalogo.resumos)', 'derivação de arrays em memória');
  mustContain(flow, 'Não existe \\texttt{Usuarios/\\{uid\\}.catalogo\\_version}', 'proibição de catalogo_version no usuário');
  mustContain(sec11, 'storage\\_path', 'locator seguro no lugar de URL pública');
  mustContain(sec11, 'não armazena um', 'ausência de downloadURL permanente');
  mustContain(sec11, 'Sistema\\_Catalogo\\_Reagentes', 'rules do catálogo');
  mustContain(sec11, 'allow write: if false', 'escrita negada ao cliente');
});

test('V2 registra edição de resumo/especificação e as três correções de validade', () => {
  mustContain(sec12, 'Edição de Resumo e Especificação de Reagente', 'edição V2');
  mustContain(sec12, 'EditSession', 'sem EditSession na V1');
  mustContain(sec12, 'DESCONHECIDA\\_PARA\\_CONHECIDA', 'modalidade 1');
  mustContain(sec12, 'DATA\\_INCORRETA\\_PARA\\_DATA\\_CORRETA', 'modalidade 2');
  mustContain(sec12, 'CONHECIDA\\_PARA\\_DESCONHECIDA', 'modalidade 3');
  mustContain(sec12, 'não oferecer edição genérica', 'proibição de edição genérica');
});

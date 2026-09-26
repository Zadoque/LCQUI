import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
	m13Model, m13CopiedModel, m13AcademicTypes,
	checkM13CompositionTrace, checkM13AcademicTypes,
} from './m13_composition.mjs';
const read = p => fs.readFileSync(p, 'utf8');
const DOC = 'documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex';
const TEX = 'documentation/Formal-Spec-M13.tex';
const CUE = 'specification/cue/domain/formal_m13.cue';

test('M13 trace accepts original composition and rejects independent drift', () => {
	checkM13CompositionTrace(read);
	for (const [file, before, after] of [
		[m13CopiedModel, 's.roteiroStatus[r] = Publicavel', 's.roteiroStatus[r] = Validado'],
		[m13CopiedModel, 'p not in s.postRemovido', 'p in s.postRemovido'],
		[m13Model, 'u in s.alunos\n\tp in s.posts', 'u in s.professores\n\tp in s.posts'],
	]) {
		const modified = read(file).replace(before, after);
		assert.notEqual(modified, read(file), `mutação não aplicada em ${file}: ${before}`);
		assert.throws(() => checkM13CompositionTrace(p => p === file ? modified : read(p)), /Drift/);
	}
});

test('M13 academic-type guard accepts all six and rejects an omitted type per layer', () => {
	checkM13AcademicTypes(read);
	for (const [file, before, after] of [
		[CUE, ' ||\n\t\ttipo == "TURMA_DESARQUIVADA"', ''],
		[m13Model, 'TArquivada + TDesarquivada', 'TDesarquivada'],
		[DOC, '\\texttt{TURMA\\_ARQUIVADA}, \\texttt{TURMA\\_DESARQUIVADA}) e \\textbf{nulo} para os',
			'\\texttt{TURMA\\_DESARQUIVADA}) e \\textbf{nulo} para os'],
		[TEX, '\\texttt{TURMA\\_ARQUIVADA} e \\texttt{TURMA\\_DESARQUIVADA}, e',
			'\\texttt{TURMA\\_DESARQUIVADA}, e'],
	]) {
		const modified = read(file).replace(before, after);
		assert.notEqual(modified, read(file), `mutação acadêmica não aplicada em ${file}`);
		assert.throws(() => checkM13AcademicTypes(p => p === file ? modified : read(p)),
			/tipo acadêmico ausente/);
	}
	assert.equal(m13AcademicTypes.length, 6);
});

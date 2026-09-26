// Contrato exato M13 (Notificação unificada), independente das saídas do solver.
export const m13Model = 'specification/alloy/operations/notificacoes_m13.als';

// Predicados efetivamente copiados de composition_m12.als (que por sua vez
// reproduz M12.1/M12.2/M9/M11) e reutilizados por M13. O guard compara os blocos
// por token após o rename explícito `EstadoIntegrado -> EstadoM13`.
export const m13CopiedModel = 'specification/alloy/operations/composition_m12.als';
export const m13CopiedPreds = [
	'versaoCorrente', 'authOk', 'temVinculo', 'proprietario', 'compartilhadoAtual',
	'roteiroPublicavel', 'acessoProfessorRoteiro', 'alunoAcessoPost', 'alunoPodeBaixar',
	'escopoQ13', 'podeEmitirUrl',
];

// Origens registradas no receipt: fatias cuja semântica M13 compõe/refina.
export const m13BridgeOrigins = [
	'specification/alloy/operations/composition_m12.als',
	'specification/alloy/operations/posts_m12_1.als',
	'specification/alloy/operations/roteiros_m12_2.als',
	'specification/alloy/operations/authorization_m9.als',
	'specification/alloy/operations/idempotency_m7.als',
	'specification/alloy/reagents/stock_cache_scarcity_m8.als',
];

// Seis tipos acadêmicos (RN-M13-07) e seu mapeamento exato entre camadas.
export const m13AcademicTypes = [
	'COMENTARIO', 'POST', 'ADICIONADO', 'REMOVIDO', 'TURMA_ARQUIVADA', 'TURMA_DESARQUIVADA',
];
const m13AcademicAlloy = [
	'TComentario', 'TPost', 'TAdicionado', 'TRemovido', 'TArquivada', 'TDesarquivada',
];

export const m13Expected = [
	{id:"M13-INV-001", name:"TransicoesPreservamCoerencia", type:"check", scope:"check TransicoesPreservamCoerencia for 4", overall:4},
	{id:"M13-INV-002", name:"NaoLeCaixaAlheia", type:"check", scope:"check NaoLeCaixaAlheia for 4", overall:4},
	{id:"M13-INV-003", name:"PapelVisualNaoFiltraCaixa", type:"check", scope:"check PapelVisualNaoFiltraCaixa for 4", overall:4},
	{id:"M13-INV-004", name:"BolsistaVeCaixa", type:"check", scope:"check BolsistaVeCaixa for 4", overall:4},
	{id:"M13-INV-005", name:"MarcarSoProprias", type:"check", scope:"check MarcarSoProprias for 4", overall:4},
	{id:"M13-INV-006", name:"MarcaIdempotente", type:"check", scope:"check MarcaIdempotente for 4", overall:4},
	{id:"M13-INV-007", name:"MarcaNaoReverte", type:"check", scope:"check MarcaNaoReverte for 4", overall:4},
	{id:"M13-INV-008", name:"LoteSoProprias", type:"check", scope:"check LoteSoProprias for 4", overall:4},
	{id:"M13-INV-009", name:"SemDelete", type:"check", scope:"check SemDelete for 4", overall:4},
	{id:"M13-INV-010", name:"LimparTudoCorteEstavel", type:"check", scope:"check LimparTudoCorteEstavel for 5", overall:5},
	{id:"M13-INV-011", name:"ExpiracaoDistingueNull", type:"check", scope:"check ExpiracaoDistingueNull for 4", overall:4},
	{id:"M13-INV-012", name:"ExpiradoForaDoAtivo", type:"check", scope:"check ExpiradoForaDoAtivo for 4", overall:4},
	{id:"M13-INV-013", name:"AlvoInvalidoNaoNavega", type:"check", scope:"check AlvoInvalidoNaoNavega for 4", overall:4},
	{id:"M13-INV-014", name:"AlertaNaoContornaAcl", type:"check", scope:"check AlertaNaoContornaAcl for 4", overall:4},
	{id:"M13-INV-015", name:"RotaAcademicaExigePapel", type:"check", scope:"check RotaAcademicaExigePapel for 4", overall:4},
	{id:"M13-INV-016", name:"ChefeLegadoNaoUsaAcademico", type:"check", scope:"check ChefeLegadoNaoUsaAcademico for 4", overall:4},
	{id:"M13-INV-017", name:"SemVinculoNaoRestaura", type:"check", scope:"check SemVinculoNaoRestaura for 4", overall:4},
	{id:"M13-INV-018", name:"ProfessorDonoMantemAcesso", type:"check", scope:"check ProfessorDonoMantemAcesso for 4", overall:4},
	{id:"M13-INV-019", name:"CompartilhamentoSoProfessor", type:"check", scope:"check CompartilhamentoSoProfessor for 4", overall:4},
	{id:"M13-INV-020", name:"ChefeAdminNaoHerdaAcademico", type:"check", scope:"check ChefeAdminNaoHerdaAcademico for 4", overall:4},
	{id:"M13-INV-021", name:"ChefeSemEscopoNaoEmiteUrl", type:"check", scope:"check ChefeSemEscopoNaoEmiteUrl for 4", overall:4},
	{id:"M13-INV-022", name:"EscopoEncerradoImpedeNovaEmissao", type:"check", scope:"check EscopoEncerradoImpedeNovaEmissao for 4", overall:4},
	{id:"M13-INV-023", name:"EncerramentoEscopoPreservaRoteiro", type:"check", scope:"check EncerramentoEscopoPreservaRoteiro for 4", overall:4},
	{id:"M13-INV-024", name:"RoteiroAlunoExigePostEAnexo", type:"check", scope:"check RoteiroAlunoExigePostEAnexo for 4", overall:4},
	{id:"M13-INV-025", name:"PonteRotaChefeRoteiroRefinaUrl", type:"check", scope:"check PonteRotaChefeRoteiroRefinaUrl for 4", overall:4},
	{id:"M13-INV-026", name:"NotificacaoNaoExpoeOriginal", type:"check", scope:"check NotificacaoNaoExpoeOriginal for 4", overall:4},
	{id:"M13-INV-027", name:"ColegaVeAviso", type:"check", scope:"check ColegaVeAviso for 4", overall:4},
	{id:"M13-INV-028", name:"AutorVeOriginal", type:"check", scope:"check AutorVeOriginal for 4", overall:4},
	{id:"M13-INV-029", name:"AuditorVeOriginal", type:"check", scope:"check AuditorVeOriginal for 4", overall:4},
	{id:"M13-INV-030", name:"EmissaoMesmaIdentidadeNaoDuplica", type:"check", scope:"check EmissaoMesmaIdentidadeNaoDuplica for 4", overall:4},
	{id:"M13-INV-031", name:"ErroEmissaoNaoViraSucesso", type:"check", scope:"check ErroEmissaoNaoViraSucesso for 4", overall:4},
	{id:"M13-INV-032", name:"ComposicaoM7RetryNaoDuplica", type:"check", scope:"check ComposicaoM7RetryNaoDuplica for 4", overall:4},
	{id:"M13-INV-033", name:"IdTurmaAcademicoObrigatorio", type:"check", scope:"check IdTurmaAcademicoObrigatorio for 4", overall:4},
	{id:"M13-INV-034", name:"IdTurmaOperacionalNulo", type:"check", scope:"check IdTurmaOperacionalNulo for 4", overall:4},
	{id:"M13-WIT-035", name:"WitnessCaixaMultiRole", type:"run", scope:"run WitnessCaixaMultiRole for 4", overall:4},
	{id:"M13-WIT-036", name:"WitnessBolsistaVeAlerta", type:"run", scope:"run WitnessBolsistaVeAlerta for 4", overall:4},
	{id:"M13-WIT-037", name:"WitnessMarcarLidaPropria", type:"run", scope:"run WitnessMarcarLidaPropria for 4", overall:4},
	{id:"M13-WIT-038", name:"WitnessMarcacaoIdempotente", type:"run", scope:"run WitnessMarcacaoIdempotente for 4", overall:4},
	{id:"M13-WIT-039", name:"WitnessLimparTudoProprias", type:"run", scope:"run WitnessLimparTudoProprias for 4", overall:4},
	{id:"M13-WIT-040", name:"WitnessLimparTudoRetry", type:"run", scope:"run WitnessLimparTudoRetry for 5", overall:5},
	{id:"M13-WIT-041", name:"WitnessLimparTudoCorteComNovaEmissao", type:"run", scope:"run WitnessLimparTudoCorteComNovaEmissao for 5", overall:5},
	{id:"M13-WIT-042", name:"WitnessExpiraAtivo", type:"run", scope:"run WitnessExpiraAtivo for 4", overall:4},
	{id:"M13-WIT-043", name:"WitnessNullNaoExpira", type:"run", scope:"run WitnessNullNaoExpira for 4", overall:4},
	{id:"M13-WIT-044", name:"WitnessAlvoInvalidoNaoNavega", type:"run", scope:"run WitnessAlvoInvalidoNaoNavega for 4", overall:4},
	{id:"M13-WIT-045", name:"WitnessRotaAcademicaValida", type:"run", scope:"run WitnessRotaAcademicaValida for 4", overall:4},
	{id:"M13-WIT-046", name:"WitnessArquivamentoTurma", type:"run", scope:"run WitnessArquivamentoTurma for 4", overall:4},
	{id:"M13-WIT-047", name:"WitnessDesarquivamentoTurma", type:"run", scope:"run WitnessDesarquivamentoTurma for 4", overall:4},
	{id:"M13-WIT-048", name:"WitnessChefeLegadoNaoUsaAcademico", type:"run", scope:"run WitnessChefeLegadoNaoUsaAcademico for 4", overall:4},
	{id:"M13-WIT-049", name:"WitnessSemVinculoClaimAtual", type:"run", scope:"run WitnessSemVinculoClaimAtual for 4", overall:4},
	{id:"M13-WIT-050", name:"WitnessProfessorDonoPost", type:"run", scope:"run WitnessProfessorDonoPost for 4", overall:4},
	{id:"M13-WIT-051", name:"WitnessCompartilhamentoRoteiro", type:"run", scope:"run WitnessCompartilhamentoRoteiro for 4", overall:4},
	{id:"M13-WIT-052", name:"WitnessChefeComEscopo", type:"run", scope:"run WitnessChefeComEscopo for 4", overall:4},
	{id:"M13-WIT-053", name:"WitnessEscopoEncerrado", type:"run", scope:"run WitnessEscopoEncerrado for 4", overall:4},
	{id:"M13-WIT-054", name:"WitnessEmissaoUnica", type:"run", scope:"run WitnessEmissaoUnica for 4", overall:4},
	{id:"M13-WIT-055", name:"EmissaoChaveDistintaEmite", type:"run", scope:"run EmissaoChaveDistintaEmite for 4", overall:4},
	{id:"M13-WIT-056", name:"WitnessErroNaoEmite", type:"run", scope:"run WitnessErroNaoEmite for 4", overall:4},
	{id:"M13-WIT-057", name:"WitnessColegaVeAviso", type:"run", scope:"run WitnessColegaVeAviso for 4", overall:4},
	{id:"M13-WIT-058", name:"WitnessAutorVeOriginal", type:"run", scope:"run WitnessAutorVeOriginal for 4", overall:4},
	{id:"M13-WIT-059", name:"WitnessAuditorVeOriginal", type:"run", scope:"run WitnessAuditorVeOriginal for 4", overall:4},
];

function block(source, kind, name) {
	source = source.replace(/\/\/[^\n]*/g, '');
	const match = new RegExp(`\\b${kind}\\s+${name}\\b`).exec(source);
	if (!match) throw new Error(`Bloco ausente: ${kind} ${name}`);
	let i = source.indexOf('{', match.index), depth = 1;
	for (i++; depth && i < source.length; i++) {
		if (source[i] === '{') depth++;
		if (source[i] === '}') depth--;
	}
	if (depth) throw new Error(`Bloco incompleto: ${name}`);
	return source.slice(match.index, i);
}
const rename = (s, names) => s.replace(/\b\w+\b/g, word => names[word] ?? word);
const tokens = s => s.replace(/\/\/[^\n]*/g, '').match(/[A-Za-z_][A-Za-z_0-9]*|->|!=|\+\+|[^\s]/g)?.join(' ');

// Comparação lexical conservadora: mesmos tokens após o rename explícito.
export function checkM13CompositionTrace(read) {
	const composition = read(m13Model).toString();
	const source = read(m13CopiedModel).toString();
	const mapping = {EstadoIntegrado: 'EstadoM13'};
	for (const name of m13CopiedPreds) {
		const expected = rename(block(source, 'pred', name), mapping);
		const actual = block(composition, 'pred', name);
		if (tokens(expected) !== tokens(actual))
			throw new Error(`Drift de composição M13: ${m13CopiedModel} ${name}`);
	}
}

// Guard de completude acadêmica: os seis tipos de RN-M13-07 devem estar
// presentes, sem omissão, em CUE, Alloy, fonte normativa e capítulo LaTeX.
export function checkM13AcademicTypes(read) {
	const cue = read('specification/cue/domain/formal_m13.cue').toString();
	const cueMatch = /if tipo == "COMENTARIO"[\s\S]*?\{/.exec(cue);
	if (!cueMatch) throw new Error('M13 CUE: condição acadêmica ausente');
	for (const t of m13AcademicTypes)
		if (!cueMatch[0].includes(`"${t}"`)) throw new Error(`M13 CUE: tipo acadêmico ausente: ${t}`);

	const alloy = read(m13Model).toString();
	const academico = block(alloy, 'pred', 'academico');
	for (const t of m13AcademicAlloy)
		if (!new RegExp(`\\b${t}\\b`).test(academico))
			throw new Error(`M13 Alloy: tipo acadêmico ausente em academico: ${t}`);

	const docs = read('documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex').toString();
	const regra = /\\begin\{regra\}\[Condições específicas de contexto \(RN-M13-07\)\]([\s\S]*?)\\end\{regra\}/.exec(docs);
	if (!regra) throw new Error('M13 doc: RN-M13-07 ausente');
	for (const t of m13AcademicTypes) {
		const escaped = t.replace(/_/g, '\\_');
		if (!regra[1].includes(`\\texttt{${escaped}}`))
			throw new Error(`M13 doc: tipo acadêmico ausente em RN-M13-07: ${t}`);
	}

	const tex = read('documentation/Formal-Spec-M13.tex').toString();
	for (const t of m13AcademicTypes)
		if (!tex.includes(t) && !tex.includes(t.replace(/_/g, '\\_')))
			throw new Error(`M13 LaTeX: tipo acadêmico ausente no capítulo: ${t}`);
}

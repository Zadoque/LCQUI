// Contrato exato M13 (Notificação unificada), independente das saídas do solver.
export const m13Model = 'specification/alloy/operations/notificacoes_m13.als';

// Predicados efetivamente copiados de M12.1 (que os reproduz de M9) e
// reutilizados pela composição M13. O guard compara os blocos por token após o
// rename explícito `Estado -> EstadoM13`/`Usuario -> Uid`.
export const m13CopiedModel = 'specification/alloy/operations/posts_m12_1.als';
export const m13CopiedPreds = ['versaoCorrente', 'authOk', 'temVinculo'];

// Origens registradas no receipt: as fatias cuja semântica M13 compõe/refina.
// Não são reabertas nem reexecutadas; servem de registro de drift por hash.
export const m13BridgeOrigins = [
	'specification/alloy/operations/posts_m12_1.als',
	'specification/alloy/operations/authorization_m9.als',
	'specification/alloy/operations/idempotency_m7.als',
	'specification/alloy/reagents/stock_cache_scarcity_m8.als',
	'specification/alloy/operations/roteiros_m12_2.als',
];

export const m13Expected = [
	{id:"M13-INV-001", name:"TransicoesPreservamCoerencia", type:"check", scope:"check TransicoesPreservamCoerencia for 4", overall:4},
	{id:"M13-INV-002", name:"NaoLeCaixaAlheia", type:"check", scope:"check NaoLeCaixaAlheia for 4", overall:4},
	{id:"M13-INV-003", name:"PapelVisualNaoFiltraCaixa", type:"check", scope:"check PapelVisualNaoFiltraCaixa for 4", overall:4},
	{id:"M13-INV-004", name:"BolsistaVeCaixa", type:"check", scope:"check BolsistaVeCaixa for 4", overall:4},
	{id:"M13-INV-005", name:"PapelVisualNaoConcedeRecurso", type:"check", scope:"check PapelVisualNaoConcedeRecurso for 4", overall:4},
	{id:"M13-INV-006", name:"MarcarSoProprias", type:"check", scope:"check MarcarSoProprias for 4", overall:4},
	{id:"M13-INV-007", name:"MarcaIdempotente", type:"check", scope:"check MarcaIdempotente for 4", overall:4},
	{id:"M13-INV-008", name:"LoteSoProprias", type:"check", scope:"check LoteSoProprias for 4", overall:4},
	{id:"M13-INV-009", name:"SemDelete", type:"check", scope:"check SemDelete for 4", overall:4},
	{id:"M13-INV-010", name:"LimparTudoCorteEstavel", type:"check", scope:"check LimparTudoCorteEstavel for 5", overall:5},
	{id:"M13-INV-011", name:"MarcaNaoReverte", type:"check", scope:"check MarcaNaoReverte for 4", overall:4},
	{id:"M13-INV-012", name:"ExpiracaoDistingueNull", type:"check", scope:"check ExpiracaoDistingueNull for 4", overall:4},
	{id:"M13-INV-013", name:"ExpiradoForaDoAtivo", type:"check", scope:"check ExpiradoForaDoAtivo for 4", overall:4},
	{id:"M13-INV-014", name:"AlvoInvalidoNaoNavega", type:"check", scope:"check AlvoInvalidoNaoNavega for 4", overall:4},
	{id:"M13-INV-015", name:"UrlArbitrariaNaoNavega", type:"check", scope:"check UrlArbitrariaNaoNavega for 4", overall:4},
	{id:"M13-INV-016", name:"AlertaNaoContornaAcl", type:"check", scope:"check AlertaNaoContornaAcl for 4", overall:4},
	{id:"M13-INV-017", name:"RevogacaoCortaClique", type:"check", scope:"check RevogacaoCortaClique for 4", overall:4},
	{id:"M13-INV-018", name:"VinculoCanonicoRequerido", type:"check", scope:"check VinculoCanonicoRequerido for 4", overall:4},
	{id:"M13-INV-019", name:"ObjetoRemovidoNaoNavega", type:"check", scope:"check ObjetoRemovidoNaoNavega for 4", overall:4},
	{id:"M13-INV-020", name:"ChefeSemEscopoNaoAcessa", type:"check", scope:"check ChefeSemEscopoNaoAcessa for 4", overall:4},
	{id:"M13-INV-021", name:"NotificacaoNaoExpoeOriginal", type:"check", scope:"check NotificacaoNaoExpoeOriginal for 4", overall:4},
	{id:"M13-INV-022", name:"EmissaoMesmaIdentidadeNaoDuplica", type:"check", scope:"check EmissaoMesmaIdentidadeNaoDuplica for 4", overall:4},
	{id:"M13-INV-023", name:"ErroEmissaoNaoViraSucesso", type:"check", scope:"check ErroEmissaoNaoViraSucesso for 4", overall:4},
	{id:"M13-INV-024", name:"ComposicaoM7RetryNaoDuplica", type:"check", scope:"check ComposicaoM7RetryNaoDuplica for 4", overall:4},
	{id:"M13-INV-025", name:"IdTurmaAcademicoObrigatorio", type:"check", scope:"check IdTurmaAcademicoObrigatorio for 4", overall:4},
	{id:"M13-INV-026", name:"IdTurmaOperacionalNulo", type:"check", scope:"check IdTurmaOperacionalNulo for 4", overall:4},
	{id:"M13-INV-027", name:"PonteM9ExigeAuth", type:"check", scope:"check PonteM9ExigeAuth for 4", overall:4},
	{id:"M13-INV-028", name:"PonteM12NaoAfrouxaAcl", type:"check", scope:"check PonteM12NaoAfrouxaAcl for 4", overall:4},
	{id:"M13-WIT-029", name:"WitnessCaixaMultiRole", type:"run", scope:"run WitnessCaixaMultiRole for 4", overall:4},
	{id:"M13-WIT-030", name:"WitnessBolsistaVeAlerta", type:"run", scope:"run WitnessBolsistaVeAlerta for 4", overall:4},
	{id:"M13-WIT-031", name:"WitnessMarcarLidaPropria", type:"run", scope:"run WitnessMarcarLidaPropria for 4", overall:4},
	{id:"M13-WIT-032", name:"WitnessMarcacaoIdempotente", type:"run", scope:"run WitnessMarcacaoIdempotente for 4", overall:4},
	{id:"M13-WIT-033", name:"WitnessLimparTudoProprias", type:"run", scope:"run WitnessLimparTudoProprias for 4", overall:4},
	{id:"M13-WIT-034", name:"WitnessLimparTudoRetry", type:"run", scope:"run WitnessLimparTudoRetry for 5", overall:5},
	{id:"M13-WIT-035", name:"WitnessLimparTudoCorteComNovaEmissao", type:"run", scope:"run WitnessLimparTudoCorteComNovaEmissao for 5", overall:5},
	{id:"M13-WIT-036", name:"WitnessExpiraAtivo", type:"run", scope:"run WitnessExpiraAtivo for 4", overall:4},
	{id:"M13-WIT-037", name:"WitnessNullNaoExpira", type:"run", scope:"run WitnessNullNaoExpira for 4", overall:4},
	{id:"M13-WIT-038", name:"WitnessNavegaAlvoValido", type:"run", scope:"run WitnessNavegaAlvoValido for 4", overall:4},
	{id:"M13-WIT-039", name:"WitnessAlvoInvalidoNaoNavega", type:"run", scope:"run WitnessAlvoInvalidoNaoNavega for 4", overall:4},
	{id:"M13-WIT-040", name:"WitnessRevogacaoPreservaFato", type:"run", scope:"run WitnessRevogacaoPreservaFato for 4", overall:4},
	{id:"M13-WIT-041", name:"WitnessEmissaoUnica", type:"run", scope:"run WitnessEmissaoUnica for 4", overall:4},
	{id:"M13-WIT-042", name:"EmissaoChaveDistintaEmite", type:"run", scope:"run EmissaoChaveDistintaEmite for 4", overall:4},
	{id:"M13-WIT-043", name:"WitnessErroNaoEmite", type:"run", scope:"run WitnessErroNaoEmite for 4", overall:4},
	{id:"M13-WIT-044", name:"WitnessChefeComEscopo", type:"run", scope:"run WitnessChefeComEscopo for 4", overall:4},
	{id:"M13-WIT-045", name:"WitnessIdTurmaAcademico", type:"run", scope:"run WitnessIdTurmaAcademico for 4", overall:4},
	{id:"M13-WIT-046", name:"WitnessIdTurmaOperacional", type:"run", scope:"run WitnessIdTurmaOperacional for 4", overall:4},
];

// Comparação lexical conservadora: mesmos tokens após o rename explícito.
export function checkM13CompositionTrace(read) {
	const composition = read(m13Model).toString();
	const source = read(m13CopiedModel).toString();
	const mapping = {Estado: 'EstadoM13', Usuario: 'Uid'};
	for (const name of m13CopiedPreds) {
		const expected = rename(block(source, 'pred', name), mapping);
		const actual = block(composition, 'pred', name);
		if (tokens(expected) !== tokens(actual))
			throw new Error(`Drift de composição M13: ${m13CopiedModel} ${name}`);
	}
}
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

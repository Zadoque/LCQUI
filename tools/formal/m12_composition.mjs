// Contrato exato M12 (composição M12.1 x M12.2), independente das saídas do solver.
export const composedModelM12 = 'specification/alloy/operations/composition_m12.als';
export const originsM12 = [
  'specification/alloy/operations/posts_m12_1.als',
  'specification/alloy/operations/roteiros_m12_2.als',
];
// Blocos reproduzidos das fontes e comparados por token. `coerente` NÃO é
// reproduzido: a composição usa `coerenteComposta` própria. Os predicados de
// autorização de fronteira são idênticos às fontes (apenas Estado->EstadoIntegrado).
const m12Names = {Estado: 'EstadoIntegrado'};
const m12_1Preds = [
  'versaoCorrente', 'authOk', 'temVinculo', 'ehDono', 'participa',
  'podeCriarPost', 'podeEditarPost', 'podeRemoverPost', 'acessoRoteiroValidado',
];
const m12_2Preds = [
  'versaoCorrente', 'authOk', 'temVinculo', 'proprietario', 'compartilhadoAtual',
  'roteiroPublicavel', 'acessoProfessorRoteiro', 'alunoAcessoPost',
  'alunoPodeBaixar', 'escopoQ13', 'podeEmitirUrl', 'podeUsarUrl',
];
export const composedExpectedM12 = [
  {id:"M12-INV-001", name:"PublicacaoCompostaExigeDono", type:"check", scope:"check PublicacaoCompostaExigeDono for 4", overall:4},
  {id:"M12-INV-002", name:"PublicacaoCompostaRefinaAcessoM12_1", type:"check", scope:"check PublicacaoCompostaRefinaAcessoM12_1 for 4", overall:4},
  {id:"M12-INV-003", name:"SemAcessoM12_1NaoPublicaComposto", type:"check", scope:"check SemAcessoM12_1NaoPublicaComposto for 4", overall:4},
  {id:"M12-INV-004", name:"PublicacaoCompostaProvaGeracao", type:"check", scope:"check PublicacaoCompostaProvaGeracao for 4", overall:4},
  {id:"M12-INV-005", name:"AnexoCompostoUsaGeracaoCanonica", type:"check", scope:"check AnexoCompostoUsaGeracaoCanonica for 4", overall:4},
  {id:"M12-INV-006", name:"TerceiroNaoPublicaComAnexo", type:"check", scope:"check TerceiroNaoPublicaComAnexo for 4", overall:4},
  {id:"M12-INV-007", name:"ProvisorioNaoPublicaComAnexo", type:"check", scope:"check ProvisorioNaoPublicaComAnexo for 4", overall:4},
  {id:"M12-INV-008", name:"ValidadoNaoPublicaComAnexo", type:"check", scope:"check ValidadoNaoPublicaComAnexo for 4", overall:4},
  {id:"M12-INV-009", name:"GeracaoDivergenteNaoPublicaComAnexo", type:"check", scope:"check GeracaoDivergenteNaoPublicaComAnexo for 4", overall:4},
  {id:"M12-INV-010", name:"CompartilhamentoCompostoSoPublicavel", type:"check", scope:"check CompartilhamentoCompostoSoPublicavel for 4", overall:4},
  {id:"M12-INV-011", name:"AcessoCompartilhadoFundamentaM12_1", type:"check", scope:"check AcessoCompartilhadoFundamentaM12_1 for 4", overall:4},
  {id:"M12-INV-012", name:"RevogacaoCompostaPreservaPost", type:"check", scope:"check RevogacaoCompostaPreservaPost for 4", overall:4},
  {id:"M12-INV-013", name:"RevogacaoCompostaPreservaAnexo", type:"check", scope:"check RevogacaoCompostaPreservaAnexo for 4", overall:4},
  {id:"M12-INV-014", name:"RevogacaoCompostaPreservaObjeto", type:"check", scope:"check RevogacaoCompostaPreservaObjeto for 4", overall:4},
  {id:"M12-INV-015", name:"RevogacaoCompostaPreservaUrls", type:"check", scope:"check RevogacaoCompostaPreservaUrls for 4", overall:4},
  {id:"M12-INV-016", name:"RevogadoNaoMantemAnexoSemAcesso", type:"check", scope:"check RevogadoNaoMantemAnexoSemAcesso for 4", overall:4},
  {id:"M12-INV-017", name:"DesvinculacaoNaoExigeAcesso", type:"check", scope:"check DesvinculacaoNaoExigeAcesso for 4", overall:4},
  {id:"M12-INV-018", name:"HistoricoAnexoCompostoPreservado", type:"check", scope:"check HistoricoAnexoCompostoPreservado for 4", overall:4},
  {id:"M12-INV-019", name:"DesvinculoConservaObjeto", type:"check", scope:"check DesvinculoConservaObjeto for 4", overall:4},
  {id:"M12-INV-020", name:"RotaAcademicaExigePapelEVinculo", type:"check", scope:"check RotaAcademicaExigePapelEVinculo for 4", overall:4},
  {id:"M12-INV-021", name:"PostRemovidoNaoBaixaComposto", type:"check", scope:"check PostRemovidoNaoBaixaComposto for 4", overall:4},
  {id:"M12-INV-022", name:"ChefeComVinculoLegadoNaoBaixaComposto", type:"check", scope:"check ChefeComVinculoLegadoNaoBaixaComposto for 4", overall:4},
  {id:"M12-INV-023", name:"ClaimAntigaNaoAutorizaComposto", type:"check", scope:"check ClaimAntigaNaoAutorizaComposto for 4", overall:4},
  {id:"M12-INV-024", name:"UrlEmitidaCompostaSobreviveRevogacao", type:"check", scope:"check UrlEmitidaCompostaSobreviveRevogacao for 4", overall:4},
  {id:"M12-INV-025", name:"UrlExpiradaNaoUsavelComposto", type:"check", scope:"check UrlExpiradaNaoUsavelComposto for 4", overall:4},
  {id:"M12-INV-026", name:"UrlAtivaUsavelComposto", type:"check", scope:"check UrlAtivaUsavelComposto for 4", overall:4},
  {id:"M12-INV-027", name:"ChefeNaoPublicaPostComposto", type:"check", scope:"check ChefeNaoPublicaPostComposto for 4", overall:4},
  {id:"M12-INV-028", name:"ChefeNaoCompartilhaComposto", type:"check", scope:"check ChefeNaoCompartilhaComposto for 4", overall:4},
  {id:"M12-INV-029", name:"ChefeSemEscopoNaoEmiteComposto", type:"check", scope:"check ChefeSemEscopoNaoEmiteComposto for 4", overall:4},
  {id:"M12-INV-030", name:"EscopoQ13CompostoExigePostRemovido", type:"check", scope:"check EscopoQ13CompostoExigePostRemovido for 4", overall:4},
  {id:"M12-INV-031", name:"TurmaArquivadaNegaEscritaComposta", type:"check", scope:"check TurmaArquivadaNegaEscritaComposta for 4", overall:4},
  {id:"M12-INV-032", name:"ChefeAnexoSoQ13", type:"check", scope:"check ChefeAnexoSoQ13 for 4", overall:4},
  {id:"M12-INV-033", name:"PrimeiraExecucaoCompostaProduzReceipt", type:"check", scope:"check PrimeiraExecucaoCompostaProduzReceipt for 4", overall:4},
  {id:"M12-INV-034", name:"RetryCompostoNaoDuplicaFato", type:"check", scope:"check RetryCompostoNaoDuplicaFato for 4", overall:4},
  {id:"M12-INV-035", name:"ReusoIncompativelCompostoNaoHerda", type:"check", scope:"check ReusoIncompativelCompostoNaoHerda for 4", overall:4},
  {id:"M12-INV-036", name:"RevogacaoVinculoCompostaImpedeCommit", type:"check", scope:"check RevogacaoVinculoCompostaImpedeCommit for 4", overall:4},
  {id:"M12-INV-037", name:"PromoverChefeCompostoPreservaVinculo", type:"check", scope:"check PromoverChefeCompostoPreservaVinculo for 4", overall:4},
  {id:"M12-WIT-038", name:"WitnessEstadoComposto", type:"run", scope:"run WitnessEstadoComposto for 4", overall:4},
  {id:"M12-WIT-039", name:"WitnessTrajetoriaCompartilhaRevoga", type:"run", scope:"run WitnessTrajetoriaCompartilhaRevoga for 5", overall:5},
  {id:"M12-WIT-040", name:"WitnessPublicaRoteiroCompartilhado", type:"run", scope:"run WitnessPublicaRoteiroCompartilhado for 4", overall:4},
  {id:"M12-WIT-041", name:"WitnessProvisorioNaoPublica", type:"run", scope:"run WitnessProvisorioNaoPublica for 4", overall:4},
  {id:"M12-WIT-042", name:"WitnessValidadoNaoPublica", type:"run", scope:"run WitnessValidadoNaoPublica for 4", overall:4},
  {id:"M12-WIT-043", name:"WitnessAlunoBaixaAtivo", type:"run", scope:"run WitnessAlunoBaixaAtivo for 4", overall:4},
  {id:"M12-WIT-044", name:"WitnessAlunoBaixaArquivada", type:"run", scope:"run WitnessAlunoBaixaArquivada for 4", overall:4},
  {id:"M12-WIT-045", name:"WitnessExAlunoNaoBaixa", type:"run", scope:"run WitnessExAlunoNaoBaixa for 5", overall:5},
  {id:"M12-WIT-046", name:"WitnessPostRemovidoNaoBaixa", type:"run", scope:"run WitnessPostRemovidoNaoBaixa for 4", overall:4},
  {id:"M12-WIT-047", name:"WitnessRevogacaoPreservaHistorico", type:"run", scope:"run WitnessRevogacaoPreservaHistorico for 4", overall:4},
  {id:"M12-WIT-048", name:"WitnessDesvinculaSemAcesso", type:"run", scope:"run WitnessDesvinculaSemAcesso for 4", overall:4},
  {id:"M12-WIT-049", name:"WitnessChefeComEscopoQ13", type:"run", scope:"run WitnessChefeComEscopoQ13 for 5", overall:5},
  {id:"M12-WIT-050", name:"WitnessChefeSemEscopoNaoEmite", type:"run", scope:"run WitnessChefeSemEscopoNaoEmite for 4", overall:4},
  {id:"M12-WIT-051", name:"WitnessChefeComVinculoLegado", type:"run", scope:"run WitnessChefeComVinculoLegado for 4", overall:4},
  {id:"M12-WIT-052", name:"WitnessUrlAtivaAposRevogacao", type:"run", scope:"run WitnessUrlAtivaAposRevogacao for 4", overall:4},
  {id:"M12-WIT-053", name:"WitnessTurmaArquivadaNegaEscrita", type:"run", scope:"run WitnessTurmaArquivadaNegaEscrita for 4", overall:4},
  {id:"M12-WIT-054", name:"WitnessRetryComposto", type:"run", scope:"run WitnessRetryComposto for 4", overall:4},
  {id:"M12-WIT-055", name:"WitnessReusoIncompativelComposto", type:"run", scope:"run WitnessReusoIncompativelComposto for 4", overall:4},
];

// Comparação lexical conservadora: mesmos tokens após renome explícito.
export function checkM12CompositionTrace(read) {
  const composition = read(composedModelM12).toString();
  const sources = originsM12.map(p => read(p).toString());
  const compare = (index, kind, names, mapping = {}) => {
    for (const name of names) {
      const expected = rename(block(sources[index], kind, name), mapping);
      const actual = block(composition, kind, mapping[name] ?? name);
      if (tokens(expected) !== tokens(actual))
        throw new Error(`Drift de composição M12: ${originsM12[index]} ${name}`);
    }
  };
  compare(0, 'pred', m12_1Preds, m12Names);
  compare(1, 'pred', m12_2Preds, m12Names);
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

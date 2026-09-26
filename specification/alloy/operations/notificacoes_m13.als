module operations/notificacoes_m13

open util/integer

// M13 — Notificação unificada (entidade `Notificacao` e caixa UI-12).
//
// Modelo abstrato composto. NÃO reabre as provas isoladas de M7/M8/M9/M12:
// compõe a caixa única por UID, a leitura pelo destinatário, a marcação de
// leitura e o "Limpar tudo" paginado/reentrante com corte estável, a expiração,
// o alvo/deep link com revalidação corrente, a privacidade do payload e a
// emissão/deduplicação (identidade M7 ou chave determinística M8).
//
// Os predicados de autorização `versaoCorrente`/`authOk`/`temVinculo` são
// reproduzidos de M12.1 (que por sua vez os reproduz de M9) e um guard de drift
// (tools/formal/m13_composition.mjs) prova a reprodução. A ponte `acessoAtual`
// exige autenticação/atividade/versão corrente e uma base concreta de posse,
// vínculo canônico, compartilhamento ou escopo Q13; nenhuma notificação concede
// autorização por si.
//
// Limite: escopos `for 4`/`for 5` (bounded). Não modela Firebase, Firestore,
// Rules, relógio real, paginação real, concorrência, entrega externa nem a
// aplicação.

// ---- Identidades e domínios fechados ----------------------------------------

sig Uid {}
sig Turma {}

abstract sig EntidadeAlvo {}
one sig ETurma, EPost, EComentario, ERoteiro, EAlmoxarifado, EEmprestimo,
	EUrl extends EntidadeAlvo {}

sig Recurso { tipoRec: one EntidadeAlvo }

sig Vinculo {
	vAluno: one Uid,
	vTurma: one Turma
}

abstract sig Papel {}
one sig PAluno, PProfessor, PBolsista, PGestorBens, PGestorAlmox, PChefe extends Papel {}

abstract sig Tipo {}
one sig TPost, TComentario, TAdicionado, TRemovido, TRoteiro,
	TEscassez, TDataDevolucao extends Tipo {}

abstract sig Exp {}
one sig ENulo, EAtivo, EVencido extends Exp {}

abstract sig Bool {}
one sig True, False extends Bool {}

// Operação idempotente M7: identidade `(opUid, opTipo, opChave)`.
sig Chave {}
sig Operacao {
	opUid:   one Uid,
	opTipo:  one Tipo,
	opChave: one Chave
}

sig Notificacao {
	notDono:     one Uid,
	notTipo:     one Tipo,
	notPapel:    one Papel,
	notTurma:    lone Turma,
	notRecurso:  lone Recurso,
	notOperacao: lone Operacao
}

sig EstadoM13 {
	ativos:         set Uid,
	versaoPerm:     Uid -> one Int,
	claimVersao:    Uid -> lone Int,
	papeis:         Uid -> set Papel,
	papelVisual:    Uid -> one Papel,
	vinculos:       set Vinculo,
	emitidas:       set Notificacao,
	notLida:        Notificacao -> one Bool,
	notLidaEm:      Notificacao -> one Bool,
	notExpira:      Notificacao -> one Exp,
	notConteudo:    set Notificacao,
	donoRec:        Recurso -> lone Uid,
	recTurma:       Recurso -> lone Turma,
	removidos:      set Recurso,
	compartilhados: Uid -> Recurso,
	escoposQ13:     Uid -> Recurso,
	vinculosAlmox:  Uid -> Recurso,
	retirantes:     Recurso -> lone Uid,
	operacoes:      set Operacao
}

// ---- Classificação de tipos e rotas -----------------------------------------

pred academico[t: Tipo] {
	t in TPost + TComentario + TAdicionado + TRemovido
}

pred alvoValido[r: Recurso] { r.tipoRec != EUrl }

// ---- Autorização reproduzida de M12.1/M9 ------------------------------------

pred versaoCorrente[s: EstadoM13, u: Uid] {
	one s.claimVersao[u] and s.claimVersao[u] = s.versaoPerm[u]
}
pred authOk[s: EstadoM13, u: Uid] {
	u in s.ativos and versaoCorrente[s, u]
}
pred temVinculo[s: EstadoM13, u: Uid, t: Turma] {
	some v: s.vinculos | v.vAluno = u and v.vTurma = t
}
pred ehDonoRec[s: EstadoM13, u: Uid, r: Recurso] { s.donoRec[r] = u }
pred compartilhadoAtual[s: EstadoM13, u: Uid, r: Recurso] {
	r in s.compartilhados[u]
}
pred escopoQ13[s: EstadoM13, u: Uid, r: Recurso] { r in s.escoposQ13[u] }
pred alunoComVinculo[s: EstadoM13, u: Uid, r: Recurso] {
	some t: Turma | s.recTurma[r] = t and temVinculo[s, u, t] and r not in s.removidos
}

// Acesso corrente ao recurso alvo: autorização M9 + base concreta de domínio.
// A notificação nunca acrescenta autorização.
pred acessoAtual[s: EstadoM13, u: Uid, r: Recurso] {
	authOk[s, u]
	(
		(r.tipoRec = ETurma and some t: Turma | s.recTurma[r] = t and temVinculo[s, u, t])
		or (r.tipoRec in EPost + EComentario and
			(ehDonoRec[s, u, r] or alunoComVinculo[s, u, r] or escopoQ13[s, u, r]))
		or (r.tipoRec = ERoteiro and
			(ehDonoRec[s, u, r] or compartilhadoAtual[s, u, r] or escopoQ13[s, u, r]))
		or (r.tipoRec = EAlmoxarifado and (r in s.vinculosAlmox[u] or PChefe in s.papeis[u]))
		or (r.tipoRec = EEmprestimo and (s.retirantes[r] = u or PChefe in s.papeis[u]))
	)
}

// Caixa única por UID: a visibilidade normativa é a posse, independente do
// papel visual selecionado.
pred caixaDe[s: EstadoM13, u: Uid, n: Notificacao] {
	n in s.emitidas and n.notDono = u
}

pred navegar[s: EstadoM13, u: Uid, n: Notificacao] {
	caixaDe[s, u, n]
	some r: n.notRecurso | alvoValido[r] and acessoAtual[s, u, r]
}

fun caixa[s: EstadoM13, u: Uid]: set Notificacao {
	{ n: s.emitidas | n.notDono = u }
}
fun removidas[a, b: EstadoM13]: set Notificacao {
	{ n: a.emitidas | n not in b.emitidas }
}

// ---- Coerência --------------------------------------------------------------

pred coerente[s: EstadoM13] {
	all u: Uid | s.versaoPerm[u] >= 0
	// payload mínimo (RN-M13-05)
	no s.notConteudo
	// lida=false <=> lida_em=null (RN-M13-02)
	all n: Notificacao | s.notLida[n] = True iff s.notLidaEm[n] = True
	// id_turma acadêmico obrigatório e nulo fora dele (RN-M13-07)
	all n: s.emitidas | academico[n.notTipo] implies one n.notTurma
	all n: s.emitidas | not academico[n.notTipo] implies no n.notTurma
	// expira_em NULL em ESCASSEZ_ESTOQUE (RN-M13-03)
	all n: s.emitidas | n.notTipo = TEscassez implies s.notExpira[n] = ENulo
	// identidade de comando única e efeito único (M7)
	all disj o1, o2: s.operacoes |
		(o1.opUid = o2.opUid and o1.opTipo = o2.opTipo and o1.opChave = o2.opChave)
			implies o1 = o2
	all n: s.emitidas | one n.notOperacao and n.notOperacao in s.operacoes
	all disj n1, n2: s.emitidas | n1.notOperacao = n2.notOperacao implies n1 = n2
}

// ---- Frames parciais --------------------------------------------------------

pred fixo[a, b: EstadoM13] {
	b.ativos = a.ativos
	b.versaoPerm = a.versaoPerm
	b.claimVersao = a.claimVersao
	b.papeis = a.papeis
	b.papelVisual = a.papelVisual
	b.vinculos = a.vinculos
	b.donoRec = a.donoRec
	b.recTurma = a.recTurma
	b.removidos = a.removidos
	b.escoposQ13 = a.escoposQ13
	b.vinculosAlmox = a.vinculosAlmox
	b.retirantes = a.retirantes
}
pred preservaCompartilhados[a, b: EstadoM13] { b.compartilhados = a.compartilhados }
pred preservaEmitidas[a, b: EstadoM13] { b.emitidas = a.emitidas }
pred preservaLeitura[a, b: EstadoM13] {
	b.notLida = a.notLida and b.notLidaEm = a.notLidaEm
}
pred preservaExpira[a, b: EstadoM13] { b.notExpira = a.notExpira }
pred preservaConteudo[a, b: EstadoM13] { b.notConteudo = a.notConteudo }
pred preservaOperacoes[a, b: EstadoM13] { b.operacoes = a.operacoes }

// ---- Transições -------------------------------------------------------------

pred emitir[a, b: EstadoM13, n: Notificacao, o: Operacao] {
	coerente[a]
	n not in a.emitidas
	o not in a.operacoes
	no x: a.operacoes |
		x.opUid = o.opUid and x.opTipo = o.opTipo and x.opChave = o.opChave
	n.notOperacao = o
	b.emitidas = a.emitidas + n
	b.operacoes = a.operacoes + o
	b.notLida = a.notLida ++ n -> False
	b.notLidaEm = a.notLidaEm ++ n -> False
	fixo[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaCompartilhados[a, b]
	coerente[b]
}

pred retryEmissao[a, b: EstadoM13, o: Operacao] {
	coerente[a]
	o in a.operacoes
	fixo[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaCompartilhados[a, b]
	preservaOperacoes[a, b]
	coerente[b]
}

pred falhaEmissao[a, b: EstadoM13, o: Operacao] {
	coerente[a]
	o not in a.operacoes
	fixo[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaCompartilhados[a, b]
	preservaOperacoes[a, b]
	coerente[b]
}

pred marcarLida[a, b: EstadoM13, u: Uid, n: Notificacao] {
	coerente[a]
	n in a.emitidas
	n.notDono = u
	b.notLida = a.notLida ++ n -> True
	b.notLidaEm = a.notLidaEm ++ n -> True
	fixo[a, b]
	preservaEmitidas[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaCompartilhados[a, b]
	preservaOperacoes[a, b]
	coerente[b]
}

pred limparTudo[a, b: EstadoM13, u: Uid, corte: set Notificacao] {
	coerente[a]
	corte in a.emitidas
	all n: corte | n.notDono = u
	all n: corte | b.notLida[n] = True
	all n: a.emitidas - corte | b.notLida[n] = a.notLida[n]
	all n: a.emitidas - corte | b.notLidaEm[n] = a.notLidaEm[n]
	all n: corte | a.notLida[n] = False implies b.notLidaEm[n] = True
	all n: corte | a.notLida[n] = True implies b.notLidaEm[n] = a.notLidaEm[n]
	fixo[a, b]
	preservaEmitidas[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaCompartilhados[a, b]
	preservaOperacoes[a, b]
	coerente[b]
}

// Duas etapas: "Limpar tudo" em um corte e emissão posterior (fora do corte).
pred limparTudoDepoisEmite[a, b, c: EstadoM13, u: Uid, corte: set Notificacao,
		n: Notificacao, o: Operacao] {
	limparTudo[a, b, u, corte]
	n not in b.emitidas
	emitir[b, c, n, o]
}

pred expirar[a, b: EstadoM13, n: Notificacao] {
	coerente[a]
	n in a.emitidas
	a.notExpira[n] = EAtivo
	b.notExpira = a.notExpira ++ n -> EVencido
	fixo[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaConteudo[a, b]
	preservaCompartilhados[a, b]
	preservaOperacoes[a, b]
	coerente[b]
}

pred revogarAcesso[a, b: EstadoM13, u: Uid, r: Recurso] {
	coerente[a]
	r in a.compartilhados[u]
	b.compartilhados = a.compartilhados - u -> r
	fixo[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaOperacoes[a, b]
	coerente[b]
}

// ---- Verificação de preservação ---------------------------------------------

assert TransicoesPreservamCoerencia {
	all a, b: EstadoM13, n: Notificacao, o: Operacao, u: Uid, r: Recurso,
			corte: set Notificacao |
		coerente[a] and
		(emitir[a, b, n, o] or retryEmissao[a, b, o] or falhaEmissao[a, b, o] or
		 marcarLida[a, b, u, n] or limparTudo[a, b, u, corte] or
		 expirar[a, b, n] or revogarAcesso[a, b, u, r])
			implies coerente[b]
}

// ---- RN-M13-01: caixa única, papel visual, Bolsista/Q12 ---------------------

assert NaoLeCaixaAlheia {
	all s: EstadoM13, u, v: Uid, n: Notificacao |
		coerente[s] and u != v and n in caixa[s, v] implies not caixaDe[s, u, n]
}
assert PapelVisualNaoFiltraCaixa {
	all s: EstadoM13, u: Uid, n: Notificacao |
		coerente[s] and n in s.emitidas and n.notDono = u
			implies caixaDe[s, u, n]
}
assert BolsistaVeCaixa {
	all s: EstadoM13, u: Uid, n: Notificacao |
		coerente[s] and PBolsista in s.papeis[u] and n in s.emitidas and n.notDono = u
			implies caixaDe[s, u, n]
}
assert PapelVisualNaoConcedeRecurso {
	all s: EstadoM13, u: Uid, n: Notificacao, r: Recurso |
		coerente[s] and n.notRecurso = r and n.notPapel in s.papeis[u] and
		not acessoAtual[s, u, r] implies not navegar[s, u, n]
}

// ---- RN-M13-02: marcação e "Limpar tudo" ------------------------------------

assert MarcarSoProprias {
	all a, b: EstadoM13, u: Uid, n: Notificacao |
		marcarLida[a, b, u, n] implies n.notDono = u
}
assert MarcaIdempotente {
	all a, b: EstadoM13, u: Uid, n: Notificacao |
		marcarLida[a, b, u, n] and a.notLida[n] = True
			implies b.notLidaEm[n] = a.notLidaEm[n]
}
assert LoteSoProprias {
	all a, b: EstadoM13, u: Uid, corte: set Notificacao, n: Notificacao |
		limparTudo[a, b, u, corte] and n in corte implies n.notDono = u
}
assert SemDelete {
	all a, b: EstadoM13, u: Uid, corte: set Notificacao |
		limparTudo[a, b, u, corte] implies no removidas[a, b]
}
assert LimparTudoCorteEstavel {
	all a, b, c: EstadoM13, u: Uid, corte: set Notificacao,
			n: Notificacao, o: Operacao |
		limparTudoDepoisEmite[a, b, c, u, corte, n, o]
			implies c.notLida[n] = False
}
assert MarcaNaoReverte {
	all a, b: EstadoM13, u: Uid, n: Notificacao |
		marcarLida[a, b, u, n] and a.notLida[n] = True
			implies b.notLida[n] = True
}

// ---- RN-M13-03: expiração ---------------------------------------------------

assert ExpiracaoDistingueNull {
	all a, b: EstadoM13, n: Notificacao |
		a.notExpira[n] = ENulo implies not expirar[a, b, n]
}
assert ExpiradoForaDoAtivo {
	all a, b: EstadoM13, n: Notificacao |
		expirar[a, b, n] implies no removidas[a, b]
}

// ---- RN-M13-04: alvo, deep link e revalidação -------------------------------

assert AlvoInvalidoNaoNavega {
	all s: EstadoM13, u: Uid, n: Notificacao |
		coerente[s] and (some r: n.notRecurso | r.tipoRec = EUrl)
			implies not navegar[s, u, n]
}
assert UrlArbitrariaNaoNavega {
	all s: EstadoM13, u: Uid, n: Notificacao, r: Recurso |
		coerente[s] and n.notRecurso = r and r.tipoRec = EUrl
			implies not acessoAtual[s, u, r]
}
assert AlertaNaoContornaAcl {
	all s: EstadoM13, u: Uid, n: Notificacao |
		coerente[s] and navegar[s, u, n]
			implies some r: n.notRecurso | acessoAtual[s, u, r]
}
assert RevogacaoCortaClique {
	all a, b: EstadoM13, u: Uid, r: Recurso, n: Notificacao |
		revogarAcesso[a, b, u, r] and r.tipoRec = ERoteiro and
		not ehDonoRec[a, u, r] and not escopoQ13[a, u, r] and
		n.notRecurso = r and n.notDono = u and n in b.emitidas
			implies not navegar[b, u, n]
}
assert VinculoCanonicoRequerido {
	all s: EstadoM13, u: Uid, r: Recurso |
		coerente[s] and r.tipoRec in EPost + EComentario and
		not ehDonoRec[s, u, r] and not escopoQ13[s, u, r] and
		(no t: Turma | s.recTurma[r] = t and temVinculo[s, u, t])
			implies not acessoAtual[s, u, r]
}
assert ObjetoRemovidoNaoNavega {
	all s: EstadoM13, u: Uid, r: Recurso |
		coerente[s] and r.tipoRec in EPost + EComentario and r in s.removidos and
		not ehDonoRec[s, u, r] and not escopoQ13[s, u, r]
			implies not acessoAtual[s, u, r]
}
assert ChefeSemEscopoNaoAcessa {
	all s: EstadoM13, u: Uid, r: Recurso |
		coerente[s] and PChefe in s.papeis[u] and r.tipoRec = ERoteiro and
		not ehDonoRec[s, u, r] and not compartilhadoAtual[s, u, r] and
		not escopoQ13[s, u, r]
			implies not acessoAtual[s, u, r]
}

// ---- RN-M13-05: privacidade -------------------------------------------------

assert NotificacaoNaoExpoeOriginal {
	all s: EstadoM13 | coerente[s] implies no s.notConteudo
}

// ---- RN-M13-06: emissão e deduplicação --------------------------------------

assert EmissaoMesmaIdentidadeNaoDuplica {
	all a, b: EstadoM13, o: Operacao |
		retryEmissao[a, b, o]
			implies no n: Notificacao | n in b.emitidas and n not in a.emitidas
}
assert ErroEmissaoNaoViraSucesso {
	all a, b: EstadoM13, o: Operacao |
		falhaEmissao[a, b, o]
			implies b.emitidas = a.emitidas and o not in b.operacoes
}
assert ComposicaoM7RetryNaoDuplica {
	all a, b: EstadoM13, o: Operacao, n: Notificacao |
		retryEmissao[a, b, o] and n in a.emitidas implies n in b.emitidas
}

// ---- RN-M13-07: id_turma ----------------------------------------------------

assert IdTurmaAcademicoObrigatorio {
	all s: EstadoM13, n: Notificacao |
		coerente[s] and n in s.emitidas and academico[n.notTipo]
			implies one n.notTurma
}
assert IdTurmaOperacionalNulo {
	all s: EstadoM13, n: Notificacao |
		coerente[s] and n in s.emitidas and not academico[n.notTipo]
			implies no n.notTurma
}

// ---- Ponte com M9/M12: autorização abstrata não é afrouxada ----------------

assert PonteM9ExigeAuth {
	all s: EstadoM13, u: Uid, r: Recurso |
		coerente[s] and acessoAtual[s, u, r] implies authOk[s, u]
}
assert PonteM12NaoAfrouxaAcl {
	all s: EstadoM13, u: Uid, n: Notificacao, r: Recurso |
		coerente[s] and n.notRecurso = r and not acessoAtual[s, u, r]
			implies not navegar[s, u, n]
}

// ---- Testemunhas (SAT, alcançáveis) -----------------------------------------

pred WitnessCaixaMultiRole {
	some s: EstadoM13, u: Uid, disj n1, n2: Notificacao |
		coerente[s] and u in s.ativos and
		n1 in s.emitidas and n1.notDono = u and n1.notPapel = PAluno and
		n2 in s.emitidas and n2.notDono = u and n2.notPapel = PBolsista and
		s.papelVisual[u] = PAluno and
		caixaDe[s, u, n1] and caixaDe[s, u, n2]
}
pred WitnessBolsistaVeAlerta {
	some s: EstadoM13, u: Uid, n: Notificacao |
		coerente[s] and PBolsista in s.papeis[u] and n in s.emitidas and
		n.notDono = u and n.notPapel = PBolsista and caixaDe[s, u, n]
}
pred WitnessMarcarLidaPropria {
	some a, b: EstadoM13, u: Uid, n: Notificacao |
		marcarLida[a, b, u, n] and a.notLida[n] = False and b.notLida[n] = True
}
pred WitnessMarcacaoIdempotente {
	some a, b: EstadoM13, u: Uid, n: Notificacao |
		marcarLida[a, b, u, n] and a.notLida[n] = True and
		b.notLidaEm[n] = a.notLidaEm[n]
}
pred WitnessLimparTudoProprias {
	some a, b: EstadoM13, u: Uid, n: Notificacao |
		n in a.emitidas and n.notDono = u and a.notLida[n] = False and
		limparTudo[a, b, u, caixa[a, u]] and b.notLida[n] = True
}
pred WitnessLimparTudoRetry {
	some a, b, c: EstadoM13, u: Uid, n: Notificacao |
		n in a.emitidas and n.notDono = u and a.notLida[n] = False and
		limparTudo[a, b, u, caixa[a, u]] and n in b.emitidas and
		b.notLida[n] = True and limparTudo[b, c, u, caixa[b, u]]
}
pred WitnessLimparTudoCorteComNovaEmissao {
	some a, b, c: EstadoM13, u: Uid, corte: set Notificacao,
			n: Notificacao, o: Operacao |
		limparTudoDepoisEmite[a, b, c, u, corte, n, o] and c.notLida[n] = False
}
pred WitnessExpiraAtivo {
	some a, b: EstadoM13, n: Notificacao |
		expirar[a, b, n] and a.notExpira[n] = EAtivo and b.notExpira[n] = EVencido
}
pred WitnessNullNaoExpira {
	some s: EstadoM13, n: Notificacao |
		coerente[s] and n in s.emitidas and s.notExpira[n] = ENulo and
		n.notTipo = TEscassez and no n.notTurma
}
pred WitnessNavegaAlvoValido {
	some s: EstadoM13, u: Uid, n: Notificacao, r: Recurso |
		coerente[s] and n in s.emitidas and n.notDono = u and n.notRecurso = r and
		r.tipoRec = ERoteiro and ehDonoRec[s, u, r] and authOk[s, u] and
		navegar[s, u, n]
}
pred WitnessAlvoInvalidoNaoNavega {
	some s: EstadoM13, u: Uid, n: Notificacao, r: Recurso |
		coerente[s] and n in s.emitidas and n.notDono = u and n.notRecurso = r and
		r.tipoRec = EUrl and not navegar[s, u, n]
}
pred WitnessRevogacaoPreservaFato {
	some a, b: EstadoM13, u: Uid, r: Recurso, n: Notificacao |
		n in a.emitidas and n.notDono = u and n.notRecurso = r and
		r.tipoRec = ERoteiro and not ehDonoRec[a, u, r] and not escopoQ13[a, u, r] and
		r in a.compartilhados[u] and revogarAcesso[a, b, u, r] and
		n in b.emitidas and not navegar[b, u, n]
}
pred WitnessEmissaoUnica {
	some a, b: EstadoM13, n: Notificacao, o: Operacao |
		emitir[a, b, n, o] and n in b.emitidas and n not in a.emitidas
}
pred EmissaoChaveDistintaEmite {
	some a, b, c: EstadoM13, disj n1, n2: Notificacao, disj o1, o2: Operacao |
		o1.opUid = o2.opUid and o1.opTipo = o2.opTipo and o1.opChave != o2.opChave and
		emitir[a, b, n1, o1] and emitir[b, c, n2, o2]
}
pred WitnessErroNaoEmite {
	some a, b: EstadoM13, o: Operacao |
		falhaEmissao[a, b, o] and no removidas[a, b] and b.emitidas = a.emitidas
}
pred WitnessChefeComEscopo {
	some s: EstadoM13, u: Uid, r: Recurso, n: Notificacao |
		coerente[s] and PChefe in s.papeis[u] and r.tipoRec = ERoteiro and
		escopoQ13[s, u, r] and n in s.emitidas and n.notDono = u and n.notRecurso = r and
		acessoAtual[s, u, r] and navegar[s, u, n]
}
pred WitnessIdTurmaAcademico {
	some s: EstadoM13, n: Notificacao |
		coerente[s] and n in s.emitidas and n.notTipo = TPost and one n.notTurma
}
pred WitnessIdTurmaOperacional {
	some s: EstadoM13, n: Notificacao |
		coerente[s] and n in s.emitidas and n.notTipo = TEscassez and no n.notTurma
}

// ---- Comandos ---------------------------------------------------------------

check TransicoesPreservamCoerencia for 4
check NaoLeCaixaAlheia for 4
check PapelVisualNaoFiltraCaixa for 4
check BolsistaVeCaixa for 4
check PapelVisualNaoConcedeRecurso for 4
check MarcarSoProprias for 4
check MarcaIdempotente for 4
check LoteSoProprias for 4
check SemDelete for 4
check LimparTudoCorteEstavel for 5
check MarcaNaoReverte for 4
check ExpiracaoDistingueNull for 4
check ExpiradoForaDoAtivo for 4
check AlvoInvalidoNaoNavega for 4
check UrlArbitrariaNaoNavega for 4
check AlertaNaoContornaAcl for 4
check RevogacaoCortaClique for 4
check VinculoCanonicoRequerido for 4
check ObjetoRemovidoNaoNavega for 4
check ChefeSemEscopoNaoAcessa for 4
check NotificacaoNaoExpoeOriginal for 4
check EmissaoMesmaIdentidadeNaoDuplica for 4
check ErroEmissaoNaoViraSucesso for 4
check ComposicaoM7RetryNaoDuplica for 4
check IdTurmaAcademicoObrigatorio for 4
check IdTurmaOperacionalNulo for 4
check PonteM9ExigeAuth for 4
check PonteM12NaoAfrouxaAcl for 4

run WitnessCaixaMultiRole for 4
run WitnessBolsistaVeAlerta for 4
run WitnessMarcarLidaPropria for 4
run WitnessMarcacaoIdempotente for 4
run WitnessLimparTudoProprias for 4
run WitnessLimparTudoCorteComNovaEmissao for 5
run WitnessLimparTudoRetry for 5
run WitnessExpiraAtivo for 4
run WitnessNullNaoExpira for 4
run WitnessNavegaAlvoValido for 4
run WitnessAlvoInvalidoNaoNavega for 4
run WitnessRevogacaoPreservaFato for 4
run WitnessEmissaoUnica for 4
run EmissaoChaveDistintaEmite for 4
run WitnessErroNaoEmite for 4
run WitnessChefeComEscopo for 4
run WitnessIdTurmaAcademico for 4
run WitnessIdTurmaOperacional for 4

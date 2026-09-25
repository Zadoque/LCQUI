module operations/authorization_m9

open util/integer

// M9 abstrai somente a decisão: estado persistido, token/claim transportado,
// escopo, ownership e revalidação no commit. Não reproduz Firebase.
abstract sig Papel {}
one sig ChefeGeral, GestorAlmoxarifado, GestorBensPatrimoniais,
  Professor, Aluno, Bolsista extends Papel {}

abstract sig Operacao {}
one sig GerirUsuarios, OperarAlmoxarifado, OperarPatrimonio,
  OperarRecursoProprio, LerRecursoAcademico, EscreverServerOwned extends Operacao {}

abstract sig TipoRecurso {}
one sig RecursoAlmoxarifado, RecursoPatrimonio, RecursoAcademico,
  RecursoInterno extends TipoRecurso {}

abstract sig SimNao {}
one sig SIM, NAO extends SimNao {}

sig Usuario {}
sig Escopo {}
sig Recurso {
  tipo: one TipoRecurso,
  escopo: lone Escopo,
  dono: lone Usuario,
  dominioValido: one SimNao,
  serverOwned: one SimNao
}

sig Estado {
  autenticados: set Usuario,
  ativos: set Usuario,
  papeis: Usuario -> set Papel,
  versaoPermissoes: Usuario -> one Int,
  claimPapeis: Usuario -> set Papel,
  claimVersao: Usuario -> lone Int,
  vinculosAlmox: Usuario -> Escopo,
  matriculas: Usuario -> set Recurso
}

fact EstruturaPersistida {
  all s: Estado, u: Usuario | s.versaoPermissoes[u] >= 0
  all r: Recurso | r.tipo = RecursoAlmoxarifado implies one r.escopo
  all r: Recurso | r.tipo = RecursoAcademico implies one r.dono
}

pred versaoAtual[s: Estado, u: Usuario] {
  one s.claimVersao[u]
  s.claimVersao[u] = s.versaoPermissoes[u]
}

pred papelPermite[s: Estado, u: Usuario, o: Operacao, r: Recurso] {
  (ChefeGeral in s.papeis[u] and o in GerirUsuarios + OperarAlmoxarifado + OperarPatrimonio and r.tipo != RecursoInterno)
  or (GestorAlmoxarifado in s.papeis[u] and o = OperarAlmoxarifado and r.tipo = RecursoAlmoxarifado)
  or (GestorBensPatrimoniais in s.papeis[u] and o = OperarPatrimonio and r.tipo = RecursoPatrimonio)
  or (Professor in s.papeis[u] and o = OperarRecursoProprio and r.tipo = RecursoAcademico)
  or (Aluno in s.papeis[u] and o = LerRecursoAcademico and r.tipo = RecursoAcademico)
  or (Bolsista in s.papeis[u] and o = LerRecursoAcademico and r.tipo = RecursoAcademico)
}

pred escopoAtual[s: Estado, u: Usuario, r: Recurso] {
  r.tipo != RecursoAlmoxarifado or ChefeGeral in s.papeis[u] or r.escopo in s.vinculosAlmox[u]
}

pred ownershipAtual[s: Estado, u: Usuario, o: Operacao, r: Recurso] {
  (o = OperarRecursoProprio implies r.dono = u)
  (o = LerRecursoAcademico implies r in s.matriculas[u] or r.dono = u)
}

// Autoridade única de M9: papel persistido + estado atual + versão atual +
// escopo/ownership aplicáveis. Claim sozinha nunca satisfaz este predicado.
pred podeExecutar[s: Estado, u: Usuario, o: Operacao, r: Recurso] {
  u in s.autenticados
  u in s.ativos
  versaoAtual[s,u]
  papelPermite[s,u,o,r]
  escopoAtual[s,u,r]
  ownershipAtual[s,u,o,r]
  r.serverOwned = NAO
}

// O commit crítico depende da reavaliação em seu próprio estado, e também da
// precondição de domínio. Autorização é necessária, nunca suficiente.
pred podeCommitar[s: Estado, u: Usuario, o: Operacao, r: Recurso] {
  podeExecutar[s,u,o,r]
  r.dominioValido = SIM
}

pred revogarVinculo[a,b: Estado, u: Usuario, e: Escopo] {
  e in a.vinculosAlmox[u]
  b.autenticados = a.autenticados
  b.ativos = a.ativos
  b.papeis = a.papeis
  b.versaoPermissoes = a.versaoPermissoes ++ u->plus[a.versaoPermissoes[u], 1]
  b.claimPapeis = a.claimPapeis
  b.claimVersao = a.claimVersao
	b.vinculosAlmox = a.vinculosAlmox - (u->e)
  b.matriculas = a.matriculas
}

pred revogarPapel[a,b: Estado, u: Usuario, p: Papel] {
  p in a.papeis[u]
  b.autenticados = a.autenticados
  b.ativos = a.ativos
	b.papeis = a.papeis - (u->p)
  b.versaoPermissoes = a.versaoPermissoes ++ u->plus[a.versaoPermissoes[u], 1]
  b.claimPapeis = a.claimPapeis
  b.claimVersao = a.claimVersao
  b.vinculosAlmox = a.vinculosAlmox
  b.matriculas = a.matriculas
}

pred desativarUsuario[a,b: Estado, u: Usuario] {
  u in a.ativos
  b.autenticados = a.autenticados
  b.ativos = a.ativos - u
  b.papeis = a.papeis
  b.versaoPermissoes = a.versaoPermissoes ++ u->plus[a.versaoPermissoes[u], 1]
  b.claimPapeis = a.claimPapeis
  b.claimVersao = a.claimVersao
  b.vinculosAlmox = a.vinculosAlmox
  b.matriculas = a.matriculas
}

assert UsuarioInativoNuncaAutorizado {
  all s: Estado, u: Usuario, o: Operacao, r: Recurso |
    u not in s.ativos implies not podeExecutar[s,u,o,r]
}
assert PapelNaoPermitidoNaoAutoriza {
  all s: Estado, u: Usuario, r: Recurso |
    s.papeis[u] = Aluno implies not podeExecutar[s,u,OperarAlmoxarifado,r]
}
assert SemVinculoNecessarioNega {
  all s: Estado, u: Usuario, r: Recurso |
    r.tipo = RecursoAlmoxarifado and ChefeGeral not in s.papeis[u] and r.escopo not in s.vinculosAlmox[u]
      implies not podeExecutar[s,u,OperarAlmoxarifado,r]
}
assert OwnershipErradoNega {
  all s: Estado, u: Usuario, r: Recurso |
    r.tipo = RecursoAcademico and r.dono != u
      implies not podeExecutar[s,u,OperarRecursoProprio,r]
}
assert ClaimObsoletaNaoRestauraAutorizacao {
  all s: Estado, u: Usuario, o: Operacao, r: Recurso |
    s.claimVersao[u] != s.versaoPermissoes[u] implies not podeExecutar[s,u,o,r]
}
assert VinculoRevogadoRemoveAutorizacao {
  all a,b: Estado, u: Usuario, e: Escopo, r: Recurso |
    revogarVinculo[a,b,u,e] and ChefeGeral not in a.papeis[u]
      and r.tipo = RecursoAlmoxarifado and r.escopo = e
      implies not podeExecutar[b,u,OperarAlmoxarifado,r]
}
assert PapelRevogadoRemoveAutorizacao {
  all a,b: Estado, u: Usuario, r: Recurso |
    revogarPapel[a,b,u,GestorBensPatrimoniais] and ChefeGeral not in a.papeis[u]
      and r.tipo = RecursoPatrimonio
      implies not podeExecutar[b,u,OperarPatrimonio,r]
}
assert DesativacaoRemoveAutorizacao {
  all a,b: Estado, u: Usuario, o: Operacao, r: Recurso |
    desativarUsuario[a,b,u] implies not podeExecutar[b,u,o,r]
}
assert RevogadoAntesDoCommitNaoPodeCommitar {
  all a,b: Estado, u: Usuario, e: Escopo, r: Recurso |
    revogarVinculo[a,b,u,e] and ChefeGeral not in a.papeis[u]
      and r.tipo = RecursoAlmoxarifado and r.escopo = e
      implies not podeCommitar[b,u,OperarAlmoxarifado,r]
}
assert AutorizacaoNaoBypassaDominio {
  all s: Estado, u: Usuario, o: Operacao, r: Recurso |
    r.dominioValido = NAO implies not podeCommitar[s,u,o,r]
}
assert ChefeNaoBypassaDominio {
  all s: Estado, u: Usuario, o: Operacao, r: Recurso |
    ChefeGeral in s.papeis[u] and r.dominioValido = NAO implies not podeCommitar[s,u,o,r]
}
assert ServerOwnedNuncaEscritaCliente {
  all s: Estado, u: Usuario, r: Recurso |
    not podeExecutar[s,u,EscreverServerOwned,r]
}
assert RevalidacaoNoCommitPermiteSomenteAtual {
  all s: Estado, u: Usuario, o: Operacao, r: Recurso |
    podeCommitar[s,u,o,r] implies podeExecutar[s,u,o,r] and r.dominioValido = SIM
}

pred WitnessChefeGerenciaUsuario {
  some s: Estado, u: Usuario, r: Recurso |
    u in s.autenticados + s.ativos and ChefeGeral in s.papeis[u]
    and s.claimVersao[u] = s.versaoPermissoes[u]
    and r.tipo = RecursoPatrimonio and r.serverOwned = NAO and r.dominioValido = SIM
    and podeCommitar[s,u,GerirUsuarios,r]
}
pred WitnessGestorNoEscopo {
  some s: Estado, u: Usuario, e: Escopo, r: Recurso |
    u in s.autenticados + s.ativos and GestorAlmoxarifado in s.papeis[u]
    and s.claimVersao[u] = s.versaoPermissoes[u] and e in s.vinculosAlmox[u]
    and r.tipo = RecursoAlmoxarifado and r.escopo = e and r.serverOwned = NAO
    and r.dominioValido = SIM and podeCommitar[s,u,OperarAlmoxarifado,r]
}
pred WitnessProfessorProprio {
  some s: Estado, u: Usuario, r: Recurso |
    u in s.autenticados + s.ativos and Professor in s.papeis[u]
    and s.claimVersao[u] = s.versaoPermissoes[u]
    and r.tipo = RecursoAcademico and r.dono = u and r.serverOwned = NAO
    and r.dominioValido = SIM and podeCommitar[s,u,OperarRecursoProprio,r]
}
pred WitnessVersaoCorrente {
  some s: Estado, u: Usuario, r: Recurso |
    u in s.autenticados + s.ativos and GestorBensPatrimoniais in s.papeis[u]
    and versaoAtual[s,u] and r.tipo = RecursoPatrimonio and r.serverOwned = NAO
    and podeExecutar[s,u,OperarPatrimonio,r]
}
pred WitnessClaimAntigaAposRevogacao {
  some disj a,b: Estado, u: Usuario, e: Escopo, r: Recurso |
    revogarVinculo[a,b,u,e] and r.tipo = RecursoAlmoxarifado and r.escopo = e
    and GestorAlmoxarifado in b.claimPapeis[u] and b.claimVersao[u] != b.versaoPermissoes[u]
}
pred WitnessCommitPermitidoSemRevogacao {
  some s: Estado, u: Usuario, e: Escopo, r: Recurso |
    u in s.autenticados + s.ativos and GestorAlmoxarifado in s.papeis[u]
    and s.claimVersao[u] = s.versaoPermissoes[u] and e in s.vinculosAlmox[u]
    and r.tipo = RecursoAlmoxarifado and r.escopo = e and r.serverOwned = NAO
    and r.dominioValido = SIM and podeCommitar[s,u,OperarAlmoxarifado,r]
}
pred WitnessNegacaoPorEscopo {
  some s: Estado, u: Usuario, disj a,b: Escopo, r: Recurso |
    u in s.autenticados + s.ativos and GestorAlmoxarifado in s.papeis[u]
    and s.claimVersao[u] = s.versaoPermissoes[u] and a in s.vinculosAlmox[u]
    and r.tipo = RecursoAlmoxarifado and r.escopo = b and r.serverOwned = NAO
    and not podeExecutar[s,u,OperarAlmoxarifado,r]
}
pred WitnessNegacaoPorOwnership {
  some s: Estado, disj u,v: Usuario, r: Recurso |
    u in s.autenticados + s.ativos and Professor in s.papeis[u]
    and s.claimVersao[u] = s.versaoPermissoes[u]
    and r.tipo = RecursoAcademico and r.dono = v and r.serverOwned = NAO
    and not podeExecutar[s,u,OperarRecursoProprio,r]
}
pred WitnessChefeDominioInvalidoNaoComita {
  some s: Estado, u: Usuario, r: Recurso |
    u in s.autenticados + s.ativos and ChefeGeral in s.papeis[u]
    and s.claimVersao[u] = s.versaoPermissoes[u]
    and r.tipo = RecursoPatrimonio and r.serverOwned = NAO and r.dominioValido = NAO
    and podeExecutar[s,u,OperarPatrimonio,r] and not podeCommitar[s,u,OperarPatrimonio,r]
}

check UsuarioInativoNuncaAutorizado for 8 but exactly 2 Escopo
check PapelNaoPermitidoNaoAutoriza for 8 but exactly 2 Escopo
check SemVinculoNecessarioNega for 8 but exactly 2 Escopo
check OwnershipErradoNega for 8 but exactly 2 Escopo
check ClaimObsoletaNaoRestauraAutorizacao for 8 but exactly 2 Escopo
check VinculoRevogadoRemoveAutorizacao for 8 but exactly 2 Escopo
check PapelRevogadoRemoveAutorizacao for 8 but exactly 2 Escopo
check DesativacaoRemoveAutorizacao for 8 but exactly 2 Escopo
check RevogadoAntesDoCommitNaoPodeCommitar for 8 but exactly 2 Escopo
check AutorizacaoNaoBypassaDominio for 8 but exactly 2 Escopo
check ChefeNaoBypassaDominio for 8 but exactly 2 Escopo
check ServerOwnedNuncaEscritaCliente for 8 but exactly 2 Escopo
check RevalidacaoNoCommitPermiteSomenteAtual for 8 but exactly 2 Escopo
run WitnessChefeGerenciaUsuario for 8 but exactly 2 Escopo
run WitnessGestorNoEscopo for 8 but exactly 2 Escopo
run WitnessProfessorProprio for 8 but exactly 2 Escopo
run WitnessVersaoCorrente for 8 but exactly 2 Escopo
run WitnessClaimAntigaAposRevogacao for 8 but exactly 2 Escopo, exactly 2 Estado
run WitnessCommitPermitidoSemRevogacao for 8 but exactly 2 Escopo
run WitnessNegacaoPorEscopo for 8 but exactly 2 Escopo
run WitnessNegacaoPorOwnership for 8 but exactly 2 Escopo
run WitnessChefeDominioInvalidoNaoComita for 8 but exactly 2 Escopo

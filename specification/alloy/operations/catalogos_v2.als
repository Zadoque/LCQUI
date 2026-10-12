module lcqui/operations/catalogos_v2

abstract sig Catalogo {}
one sig Resumos, Especificacoes, Substancias, Materias extends Catalogo {}

sig Manifesto {
  versao: one Int,
  compatibilidade: Catalogo -> one Int
}

sig Estado {
  fonte: Catalogo -> one Int,
  publicada: Catalogo -> one Int,
  manifesto: one Manifesto
}

pred coerente[e: Estado] {
  all c: Catalogo |
    e.fonte[c] >= 1 and
    e.publicada[c] >= 1 and
    e.publicada[c] <= e.fonte[c] and
    e.manifesto.compatibilidade[c] = e.publicada[c]
  e.manifesto.versao >= 1
}

fact EstadosPublicados {
  all e: Estado | coerente[e]
}

// Uma mutação afeta somente a versão de fonte do catálogo que recebeu o fato.
// A publicação pode permanecer atrasada; ela nunca regride nem altera os
// catálogos não afetados.
pred mutacaoFonte[a, b: Estado, alvo: Catalogo] {
  b.fonte[alvo] = plus[a.fonte[alvo], 1]
  all c: Catalogo - alvo | b.fonte[c] = a.fonte[c]
  all c: Catalogo - alvo | b.publicada[c] = a.publicada[c]
  all c: Catalogo | b.publicada[c] >= a.publicada[c] and b.publicada[c] <= b.fonte[c]
  b.manifesto.versao > a.manifesto.versao
}

pred edicaoMateria[a, b: Estado] {
  mutacaoFonte[a, b, Materias]
  b.fonte[Materias] = plus[a.fonte[Materias], 1]
  all c: Catalogo - Materias | b.fonte[c] = a.fonte[c]
}

pred publicacaoIndependente[a, b: Estado, alvo: Catalogo] {
  a.fonte = b.fonte
  b.publicada[alvo] > a.publicada[alvo]
  b.publicada[alvo] <= b.fonte[alvo]
  all c: Catalogo - alvo | b.publicada[c] = a.publicada[c]
  b.manifesto.versao > a.manifesto.versao
}

assert ManifestoRefletePublicadas {
  all e: Estado | coerente[e]
}

assert MutacaoNaoVazaParaOutroCatalogo {
  all a, b: Estado, alvo: Catalogo |
    mutacaoFonte[a, b, alvo] implies
      all c: Catalogo - alvo | b.fonte[c] = a.fonte[c] and b.publicada[c] = a.publicada[c]
}

assert EdicaoDeMateriaNaoMexeNosDemais {
  all a, b: Estado |
    edicaoMateria[a, b] implies
      all c: Catalogo - Materias | b.fonte[c] = a.fonte[c] and b.publicada[c] = a.publicada[c]
}

assert PublicacaoNaoRegride {
  all a, b: Estado, alvo: Catalogo |
    publicacaoIndependente[a, b, alvo] implies
      all c: Catalogo | b.publicada[c] >= a.publicada[c]
}

pred WitnessMutacaoSomenteResumo { some a, b: Estado | mutacaoFonte[a, b, Resumos] }
pred WitnessMutacaoSomenteSubstancia { some a, b: Estado | mutacaoFonte[a, b, Substancias] }
pred WitnessEdicaoSomenteMateria { some a, b: Estado | edicaoMateria[a, b] }
pred WitnessPublicacaoEspecificacaoSemReleitura { some a, b: Estado | publicacaoIndependente[a, b, Especificacoes] }

check ManifestoRefletePublicadas for 6
check MutacaoNaoVazaParaOutroCatalogo for 6
check EdicaoDeMateriaNaoMexeNosDemais for 6
check PublicacaoNaoRegride for 6

run WitnessMutacaoSomenteResumo for 6 but exactly 2 Estado
run WitnessMutacaoSomenteSubstancia for 6 but exactly 2 Estado
run WitnessEdicaoSomenteMateria for 6 but exactly 2 Estado
run WitnessPublicacaoEspecificacaoSemReleitura for 6 but exactly 2 Estado

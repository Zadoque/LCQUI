# Alloy comportamental — M0

`reagents/withdrawal.als`: filtros físicos (INV-FRASCO-001) e coerência de
empréstimos após transição (INV-EMPRESTIMO-001). Coerência inicial é hipótese;
a final é assertion. Não há hipótese global impondo a conclusão.

```sh
alloy6 version
alloy6 help exec
alloy6 exec -q -c '*' -s sat4j -t json -o /tmp/lcqui-alloy-manual specification/alloy/reagents/withdrawal.als
node tools/formal/check.mjs alloy-check
```

O diretório manual de saída deve estar ausente. O wrapper usa diretório temporário
novo, exige os quatro comandos, tipos e scopes esperados e saída bem-sucedida.
Alloy 6.2.0 omite `solution` para UNSAT no receipt; SAT contém soluções. Dois
checks exigem UNSAT e duas testemunhas exigem SAT. Scope: 4, exatamente 2 Estado,
bitwidth 4, solver SAT4J. Ausência de contraexemplo é limitada a esse universo.

O receipt bruto contém timestamps/duração; o resultado normalizado os exclui e
inclui hashes do modelo e IR. Falhas retêm receipt e instâncias em /tmp; registrar
CONTRAEXEMPLO PÓS-3B no estado antes de corrigir. O vínculo CUE/Alloy é rastreado
por hash e vocabulário, sem alegar tradução automática ou equivalência completa.
`just alloy-check` atualiza `build/formal-validation.json`.

Com IR v2, o wrapper seleciona somente a entidade `frasco_reagente` para conferir
vocabulário. Os hashes vinculam o IR completo aos resultados, mas a presença de
Resumo/Especificação no IR não amplia o escopo dos checks Alloy M0.

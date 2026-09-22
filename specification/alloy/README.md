# Alloy comportamental — M0 e M2.2

`reagents/withdrawal.als` (M0): filtros físicos (INV-FRASCO-001) e coerência de
empréstimos após transição (INV-EMPRESTIMO-001). Coerência inicial é hipótese;
a final é assertion. Não há hipótese global impondo a conclusão.

`reagents/bottle_identity.als` (M2.2a): identidade química efetiva do frasco —
exatamente uma rota estrutural (XOR), resolução única por lote ou referência
direta e testemunhas SAT das duas rotas. Distingue `estruturaCoerente` (texto)
de `condicaoEstiloSql` (CHECK OR), explicitando M2-IDENTIDADE-001.

`reagents/bottle_state.als` (M2.2b/M2.2c): coerência de estado corrente —
terminais não mantêm desconhecimento, flag histórica nunca coexiste com FECHADO
e transições documentadas (extravio, quebra, descarte, esgotamento) preservam
coerência e as frame conditions registradas. `em_quarentena`, pesos, tara,
validade e empréstimo ficam fora deste módulo; a dimensão quarentena permanece
coberta pelo M0.

```sh
alloy6 version
alloy6 help exec
alloy6 exec -q -c '*' -s sat4j -t json -o /tmp/lcqui-alloy-manual specification/alloy/reagents/withdrawal.als
node tools/formal/check.mjs alloy-check
```

O diretório manual de saída deve estar ausente. O wrapper usa diretório temporário
novo, exige os comandos, tipos e scopes esperados de cada módulo e saída
bem-sucedida. Alloy 6.2.0 omite `solution` para UNSAT no receipt; SAT contém
soluções. Scope: 4 (identidade) e 4 com exatamente 2 Estado (estado), bitwidth 4,
solver SAT4J. Ausência de contraexemplo é limitada a esse universo; as assertions
centrais também foram reexecutadas em scope maior, sem contraexemplo.

O receipt bruto contém timestamps/duração; o resultado normalizado os exclui e
inclui hashes do modelo e IR. Falhas retêm receipt e instâncias em /tmp; registrar
CONTRAEXEMPLO PÓS-3B no estado antes de corrigir. O vínculo CUE/Alloy é rastreado
por hash e vocabulário, sem alegar tradução automática ou equivalência completa.
`just alloy-check` grava o recorte M0 em `build/formal-validation.json` (consumido
pelo gerador Rust, formato preservado) e os resultados M2.2 em
`build/formal-validation-m2.json`.

Com IR v2, o wrapper seleciona somente a entidade `frasco_reagente` para conferir
vocabulário no M0. Os hashes vinculam o IR completo aos resultados M0; o IR não
inclui M2.2, cujos resultados ainda não são renderizados (M2.3).

## M2.4 e M3

`reagents/bottle_composition.als` (M2.4) compõe M0 × M2.2 em um único universo,
com guard lexical contra drift das origens. `reagents/loan_state.als` (M3)
formaliza o ciclo de vida do Emprestimo_Reagente: ATIVOS = EM_USO + ATRASADO,
encerrados não reabrem, unicidade ativa por frasco, atraso só a partir de EM_USO
e frame de status. `just alloy-check` grava também
`build/formal-validation-m24.json` e `build/formal-validation-m3.json` (scopes
4 e 6).

`reagents/withdrawal_return.als` (M4) compõe Frasco e Emprestimo no mesmo
universo e formaliza retirada e devolução: `coerenteM4` reúne `coerenteM2`, a
unicidade ativa e a equivalência disponibilidade EMPRESTADO <=> um ativo; a
retirada cria um ativo `EM_USO` e a devolução sempre encerra a custódia
(normal/atraso/anomalia), com vazio e destinos de vencido. O guard
`tools/formal/withdrawal_return.mjs` compara as regras reproduzidas com as
origens. `just alloy-check` grava `build/formal-validation-m4.json`.

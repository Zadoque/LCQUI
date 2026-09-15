# M1 — Resumo_Reagente e Especificacao_Reagente

Branch `feat/formal-spec-cue-alloy`; HEAD de entrada `182447d3`.
Baseline semântico congelado: `db29ea2f17dc785fb0b44ffb3aec16db29c45e94`.
Fontes: Seção 4, entidades em linhas 215–304; Seção 5, dicionário em 303–343.

## Recorte

Registros normalizados com IDs relacionais inteiros, presença explícita e null
quando permitido. Não são payloads de criação nem documentos Firestore completos.
Schema de par: FK coerente com o resumo apresentado e densidade para líquido.
Não prova unicidade/existência global, imutabilidade ou transação Firebase.

Composição, estoque mínimo, identidade química global e autorização ainda não
migrados. Mapeamento Firestore documentado em notas; IDs string e composição
embutida não são confundidos com a representação relacional. Aplicação intacta.

## Validação executada

| Gate | Resultado |
|---|---|
| CUE fmt/vet, 7 fixtures M0 + 35 M1 | PASS |
| IR v2 com 3 entidades e exemplos unificados ao domínio | PASS |
| Alloy 6.2.0/SAT4J, assertions M0 | 2 UNSAT e 2 testemunhas SAT, scope 4/exatamente 2 Estado |
| Rust fmt/test/clippy | PASS, 4 testes |
| Leitura IR v1 e v2, versões desconhecidas e nomes inseguros/duplicados | PASS |
| Fragmentos Frasco/invariantes M0 | Bytes idênticos ao início da rodada |
| Geração repetida em cópia temporária | Bytes idênticos em comparação recursiva |
| Fragmento M1 adulterado em cópia temporária | --check rejeitou stale |
| docs-generate e docs-check | PASS |
| LaTeX | Exit 0, 216 páginas, zero erros/referências indefinidas |
| Inspeção visual | Páginas 214–216 aprovadas; nenhum novo Overfull |
| Aplicação/configurações/worklogs 3B | Diff vazio contra 182447d3 |

21 avisos Overfull herdados permanecem. PDF copiado de build/latex/main.pdf somente
após a inspeção. Não se executaram deploy ou testes Firebase Emulator. A aplicação
não mudou; os checks TypeScript/Jest do fechamento M0 não são apresentados como
nova execução nesta rodada. O gate formal é reexecutado para as mudanças M1.

## Problema de tradução corrigido

CONTRAEXEMPLO PÓS-3B CUE-M1-001 — TRADUCAO_INCORRETA, sem alteração da regra 3B.
Fixture resumo/invalid/nullable_ausente.json: frequência omitida com exigência
false foi inicialmente aceita por completação de null. A representação de linha
escolhida exige a chave. Corrigido com campos obrigatórios `!`, inclusive nas
condições; fixture agora rejeitada. Não era contraexemplo Alloy nem contradição
entre os documentos 3B. A definição de representação está explícita no README.

## Comandos de reprodução

```sh
just spec-check
just rust-check
just docs-check
just docs-build
just formal-check
```

Ambiente Nix/Cargo e próxima ação exata no FORMAL_SPEC_STATE.md. Não regenerar .tex
antes do gate stale quando a intenção é detectar divergência. IR/results são
recalculados, a saída .tex é apenas comparada por docs-check.

## Gate final e fechamento

`just formal-check` final: **PASS**, exit 0 (log local
`/tmp/lcqui-m1-final-check.log`). Generated já commitado; git diff --exit-code
passou. M1 **VALIDATED** no recorte acima; M2 **NOT_STARTED**.
Commits de implementação: `c38a7f67` (CUE), `f577dafb` (IR/Rust/artefatos).
Próximo passo salvo no arquivo de estado: expandir Frasco no M2 preservando a
fatia M0 e seus testes. Não migrar vários milestones na mesma rodada.

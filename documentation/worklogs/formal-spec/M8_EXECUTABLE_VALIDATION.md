# M8 — Estoque / Escassez / Notificações (formalização executável)

Estado: **VALIDATED**. Branch: `feat/formal-spec-cue-alloy`.

Cadeia executável concluída: CUE → IR → Alloy → receipt → Rust → geração
determinística → `Formal-Spec-M8.tex` → `main.tex` → `main.pdf`.

## 1. HEAD de entrada

`8661ceb2492d272e68a3f2b04f0bdde31276519c` (`docs(status): validate M8
documentation`), árvore limpa.

## 2. HEAD de saída

Registrado no encerramento da rodada (commit documental imediatamente posterior
ao do PDF); um commit não contém o próprio SHA.

## 3. Fontes de autoridade

`FORMAL_SPEC_STATE.md`; `documentation/STATUS_ATUAL.md`;
`documentation/worklogs/formal-spec/M8_DOCUMENTATION.md`; Seções 4, 5, 6, 7, 8,
9, 10.5/10.7 e 11; `M5_EXECUTABLE_VALIDATION.md`; `M6_EXECUTABLE_VALIDATION.md`;
`M7_EXECUTABLE_VALIDATION.md`. A implementação real em `functions/`, `frontend/`
e `firestore.rules` foi consultada apenas como evidência de divergência já
documentada (`M8-F07..F10`) e **não** foi alterada.

## 4. Arquitetura e responsabilidade das camadas

- **CUE** (`specification/cue/domain/formal_m8.cue`): shapes estruturais de
  configuração de estoque, resultado de estoque, cache e notificação;
  disjunção `#M8Contrato`. CUE não prova tempo real.
- **IR** (`build/spec-ir.json`): permanece **v3**; recebe a entidade aditiva
  `formal_m8_contrato`.
- **Alloy** (`specification/alloy/reagents/stock_cache_scarcity_m8.als`): modelo
  abstrato composto — aptidão, escassez, cache e notificações.
- **Rust** (`tools/spec-doc/src/validation_m8.rs`): proveniência exata do
  receipt, conjunto exato de checks/runs, limites determinísticos e agregação
  segregada.
- **LaTeX**: `Formal-Spec-M8.tex` + fragmentos gerados.

## 5. CUE

`#M8Configuracao`, `#M8Estoque`, `#M8Cache`, `#M8Notificacao`, união
`#M8Contrato` e descritores `#CamposM8`. `qtd_limiar_escassez` é inteiro
não negativo; `geracao` é inteira não negativa; `if !valido {resultado: null}`;
`escopo` restrito a `ESTOQUE__ALMOX`/`ESTOQUE__ALMOX__RESUMO`; notificação
`ESCASSEZ_ESTOQUE` com `expira_em` nulo.

## 6. Fixtures CUE M8

`specification/cue/tests/m8/{valid,invalid}` — 6 válidas e 7 inválidas:

- válidas: `configuracao_limiar_zero`, `configuracao_silenciada`,
  `estoque_resultado`, `cache_valido`, `cache_invalidado`,
  `notificacao_escassez`.
- inválidas: `configuracao_limiar_negativo`, `configuracao_limiar_decimal`,
  `configuracao_campo_ausente`, `cache_escopo_invalido`,
  `cache_geracao_negativa`, `cache_resultado_durante_invalidacao`,
  `notificacao_tipo_invalido`.

## 7. IR

Versão **anterior**: 3 (com 8 entidades, até `formal_m7_operacao`).
Versão **nova**: 3 (inalterada). **Motivo**: extensão puramente aditiva de
`entidades[]` com `formal_m8_contrato`; o contrato serializado v3 já suporta
entidades arbitrárias, sem necessidade de bump. **Compatibilidade**: leitura
v1/v2/v3 preservada; projeções M0–M7 intactas. Todos os receipts M0–M8 tiveram
`spec_ir_sha256` reconciliado mecanicamente para o novo hash do IR
(`16967d23...`), sem alterar resultados.

## 8. Alloy M8

Modelo composto `stock_cache_scarcity_m8.als` (siglas: `Frasco`, `Config`,
`Gestor`, `Resultado`, `Notificacao`, `Cache`, `Store`). Predicado único
`frascoAptoParaUso`; `aptos[s,c]`; `escassez[s,c]` com fronteira estritamente
menor; `invalidaCache`/`publicaCache` com geração; `emitirEscassez`/
`retryNotificacao` idempotentes. A transição `invalidaCache` usa
`plus[geracao, 1]` (evita a união de conjuntos acidental do operador `+`).

## 9. Checks M8 (25, todos UNSAT)

Aptidão: `ExtraviadoNuncaApto`, `QuarentenaNuncaApta`,
`FisicoImpedidoNuncaApto`, `EmprestadoNaoApto`, `PendenciaNuncaApta`,
`VencidoSemAutorizacaoNaoApto`, `AptoNuncaDescartado`.
Escassez: `AbaixoDoLimiarEhEscassez`, `IgualAoLimiarNaoEhEscassez`,
`AcimaDoLimiarNaoEhEscassez`, `AlmoxInativoNaoAvalia`,
`ConfigInativaNaoAvalia`.
Cache: `InvalidacaoMudaGeracaoEInvalida`, `InvalidacaoNaoRecalcula`,
`InvalidacaoImpedeHitValido`, `PublicacaoExigeMesmaGeracao`,
`CacheMudouGeracaoNaoPublica`, `PublicacaoNaoAlteraFatos`.
Notificações: `SemEscassezNaoNotifica`, `ConfigInativaNaoEmite`,
`NotificacaoDesativadaNaoEmite`, `GestorNaoVinculadoNaoRecebe`,
`AlmoxInativoNaoEmite`, `RetryNaoDuplicaNotificacao`,
`NotificacaoUnicaPorDia`.

## 10. Witnesses M8 (15, todos SAT)

`WitnessFechadoApto`, `WitnessAbertoApto`, `WitnessVencidoAutorizadoApto`,
`WitnessSaldoDesconhecidoApto`, `WitnessEscassezAbaixo`, `WitnessLimiteExato`,
`WitnessAcimaDoLimite`, `WitnessCacheMissCalculaEPublica`, `WitnessCacheHit`,
`WitnessInvalidacao`, `WitnessGeracaoMudou`,
`WitnessNovoCalculoAposInvalidacao`, `WitnessEscassezComNotificacao`,
`WitnessEscassezSilenciada`, `WitnessNovaNotificacaoOutroDia`.

## 11. Scopes

Checks de aptidão/escassez/notificações em `for 6`; checks de cache em `for 4`;
witnesses de frasco/cache em `for 4`; witness de notificação em
`for 6 but exactly 3 Store`. Solver `sat4j`, Alloy 6.2.0.

## 12. Receipt

`build/formal-validation-m8.json`, versão 1, `alloy` 6.2.0, `solver` sat4j,
`model` `specification/alloy/reagents/stock_cache_scarcity_m8.als`, 40
resultados (25 checks UNSAT + 15 runs SAT). Gerado pela execução real do
`tools/formal/check.mjs`, nunca escrito à mão.

## 13. Hashes

- IR: `16967d23f90fc4de6bad90d0def102952eab1f7414262ae53eb0315812276ba1`
- Modelo Alloy M8: ver `model_sha256` no receipt.
- Receipt M8: ver `formal_validation_m8_sha256` no `MANIFEST.json`.

## 14. Rust — validator e testes

`tools/spec-doc/src/validation_m8.rs`: valida versão, solver, hash do IR, hash
do modelo, modelo, IDs, conjunto exato e ordem dos 40 resultados, tipo
check/run, scope exato e status esperado.

Testes semânticos: fronteira de escassez (`<` estrito), validade do cache
(idade `< 30 s`; `30 s` inválido), rate limit (1ª..5ª permitidas; 6ª rejeitada),
chave determinística de cache e agregação que segrega desconhecido (nunca zero)
e não soma massa com volume.

Testes de adulteração: hash do IR errado, hash do modelo errado, modelo trocado,
resultado invertido, scope alterado, ID duplicado, resultado removido e
resultado extra — todos rejeitados.

## 15. Gerador Rust

`lcqui-spec-doc` versão `0.2.0` (inalterada). Emite
`documentation/generated/entities/formal_m8_contrato.tex` e
`documentation/generated/invariants/formal_m8.tex` a partir de IR + receipt.
Escapa o texto humano de escopo (`render_milestone`).

## 16. MANIFEST

`documentation/generated/MANIFEST.json` recebe `formal_validation_m8_sha256` e
as entradas de hash de `entities/formal_m8_contrato.tex` e
`invariants/formal_m8.tex`, além de `generator_version` e `spec_ir_sha256`.

## 17. Determinismo

Duas execuções consecutivas do gerador produziram conteúdo byte a byte
idêntico; `git diff --exit-code -- documentation/generated/` PASS.

## 18. LaTeX e PDF

`documentation/Formal-Spec-M8.tex` integrado ao `main.tex` após M7. Build
LaTeX: exit 0, **367 páginas**, zero erros, zero referências indefinidas,
**32 Overfull** (mesmo quantitativo herdado de antes de M8; nenhum novo).
Páginas 363–367 inspecionadas com Poppler: abertura, fragmento estrutural CUE,
lista de invariantes, evidência de aptidão/cache/escassez/notificações e página
de limites. Sem tabelas cortadas, underscores quebrados ou listings ilegíveis.

## 19. Regressão M0–M7

Fixtures anteriores inalteradas; checks/witnesses M0–M7 preservados; receipts
M0–M7 mudaram apenas em `spec_ir_sha256`, mantendo resultados e `model_sha256`;
validators Rust M0–M7 continuam passando; fragmentos M0–M7 byte a byte
idênticos. Nenhum modelo Alloy histórico foi alterado.

## 20. Limitações

A evidência formal M8 não certifica a implementação Firebase atual; não prova
disponibilidade física real, concorrência do motor Firestore, tempo contínuo de
TTL (abstraído e complementado por Rust) nem a execução do backfill legado
(pré-condição operacional declarada, não afirmada como cumprida).

## 21. Human Questions

Nenhuma HQ aberta. Todas as decisões decorrem do contrato M8 documental
validado.

## 22. Estado final

```text
M0–M7 = VALIDATED
M8    = VALIDATED
M9+   = NOT_STARTED
```

## 23. Próxima ação permitida

Avaliar a entrada em **M9 — autorização/usuários** em rodada separada. Não
iniciar M9 nesta sessão.

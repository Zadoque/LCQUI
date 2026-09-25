# M10 — Patrimônio (formalização executável)

Estado: **VALIDATED**. Cadeia aditiva concluída: CUE → IR → Alloy → receipt →
Rust → geração determinística → LaTeX → PDF. Não altera `functions/`, frontend,
Firestore Rules, Storage Rules nem inicia M11.

## 1. Entrada e fontes

- Branch: `feat/formal-spec-cue-alloy` (única utilizada).
- HEAD de entrada: `1be21d82fb8fa6f9528425578ddec86565cdb797`, árvore limpa e
  `origin/feat/formal-spec-cue-alloy` sincronizada (`0/0`).
- Fonte normativa: consolidação documental M10 vigente na HEAD — Seções 4, 5, 7,
  8, 9, 10.8 e `M10_DOCUMENTATION.md` (incluindo a reconciliação mecânica
  pós-auditoria `9208352a` que resolveu M10-F13..F17).
- `functions/src/patrimonio.ts` e Rules foram consultados apenas como evidência
  de divergência, nunca como autoridade.
- Baseline: `just formal-check` exit `0` antes das alterações; M0–M9 PASS.

## 2. CUE

`specification/cue/domain/formal_m10.cue` define `#M10Contrato` como união
fechada de shapes locais: `#M10ResumoBemPatrimonial`, `#M10BemPatrimonial`,
`#M10RequisicaoAdicao`, `#M10RequisicaoEdicao`, `#M10Lock`, `#M10Baixa`,
`#M10EventoHistorico` e `#M10Alteracao`. Enums fechados de status
(`Ativo`/`Inservivel`/`Ja_dado_baixa`), conservação (`BOM`/`REGULAR`/`RUIM`),
tipo de lock (`EDICAO`/`ADICAO`), tipo de histórico (`cadastro`/`edicao`/`baixa`)
e status de requisição. `numero_patrimonio` é não vazio e `<= 30` runes;
`versao >= 1`; o comprovante é nulo fora de `Ja_dado_baixa` e obrigatório no
estado terminal. CUE não prova concorrência temporal nem faz `trim/uppercase`.

Fixtures: **11 válidas** e **11 inválidas** em `specification/cue/tests/m10/`,
verificadas com `cue vet -c ... -d '#M10Contrato'`.

- Válidas: bem ativo, bem inservível, bem dado baixa com documento, resumo,
  requisição de adição (com proposto e normalizado), requisição de edição,
  lock ADICAO, lock EDICAO, baixa, evento histórico e alteração.
- Inválidas: plaqueta vazia, plaqueta com 31 caracteres, versão 0, versão
  negativa, status inválido, conservação inválida, baixa sem comprovante, lock
  sem `id_requisicao`, lock com tipo inválido, adição sem normalizado e edição
  sem `versao_bem_origem`.

Regras deliberadamente do Alloy (não duplicadas como fixture negativa):
unicidade concorrente, terminalidade, fan-out, composição M7/M9.

## 3. IR e versionamento

IR permanece na versão **3**: `formal_m10_patrimonio` é entidade aditiva e o
schema v3 já admite entidades arbitrárias. O `exemplo` do IR é validado pelo
Rust contra a canonicalização `N(s)` (ver §7). O hash global mudou de
`9c9a325b...` para `e2e22834a2a4325161d9ea9ad6e54b9afd3f566df191b0f4310d7a337fd7b7f6`.
Receipts M0–M9 foram regenerados e mudaram **somente** em `spec_ir_sha256`;
nenhum `model_sha256` ou resultado histórico mudou (verificado por diff
mecânico, 0 linhas divergentes fora de `spec_ir_sha256`).

## 4. Alloy

Modelo: `specification/alloy/operations/patrimony_m10.als`. Universo mínimo:
`Plaqueta`, `Nome`, `Endereco`, `Resumo`, `Local`, `Usuario`, `Bem`,
`Status`/`Conservacao`/`Papel`/`ReqStatus`/`TipoLock`/`TipoEvento` fechados,
`ReqAdicao`/`ReqEdicao`, `Lock`, `Evento`, `Comprovante` e `Estado` temporal.
`reservas` representa `Chaves_Unicas` como reserva permanente e é **distinta**
de `locks`.

Propriedades centrais verificadas: identidade Resumo × Bem (compartilhamento e
reclassificação individual); plaqueta canônica única e não reutilizável; máquina
V1 `Ativo -> Inservivel -> Ja_dado_baixa` sem salto/reversão e terminal; baixa
preserva bem e chave; conservação ortogonal; versão inicia em 1, incrementa uma
vez em mutação canônica e não por fan-out; conflito de versão não altera o bem;
uma edição pendente por bem e uma adição pendente por plaqueta; lock com
requerente/tipo/recurso, lock alheio não removido e lock ausente impedindo
resposta íntegra; histórico cadastro/edição/baixa exatamente uma vez; retry M7
sem duplicação; autorização M9 necessária e domínio não dispensado; coerência
preservada por todas as transições.

- **Checks:** 29 UNSAT.
- **Witnesses:** 17 SAT (incluindo dois bens com mesmo resumo, reclassificação
  individual, bem ativo, Ativo→Inservível, Inservível→Ja_dado_baixa, cadastro,
  edição aprovada/rejeitada, conflito de versão, conflito de unicidade, duas
  plaquetas, lock íntegro, fan-out sem versão, retry sem duplicação, baixa com
  histórico, bem baixado existente e conservação ortogonal).
- **Scopes/bitwidth:** a maioria `for 6`; `for 8` em 5 checks e 1 witness;
  `for 4` em 2 witnesses. Bitwidth inteiro padrão do Alloy 6.2.0 (`4`), sem
  overflow nos cenários válidos (`open util/integer`, `plus[...]` de 1).

## 5. Receipt

`build/formal-validation-m10.json`: versão 1, Alloy 6.2.0, solver `sat4j`,
modelo `specification/alloy/operations/patrimony_m10.als`, 46 resultados
(29 `check` UNSAT + 17 `run` SAT), IDs `M10-INV-001..029` e
`M10-WIT-030..046`, scopes preservados. Hash:
`8d44e7b5978dc1a0b6f374182ecc147bc2382c4da8a116413223a3fce974e1bb`.

## 6. Rust

`tools/spec-doc/src/validation_m10.rs` valida versão, Alloy, solver, caminho do
modelo, `spec_ir_sha256`, `model_sha256`, quantidade exata (46), IDs exatos,
ordem, tipo `check`/`run`, scopes e status. Adulterações rejeitadas no teste:
hash do IR alterado, hash do modelo alterado, model path trocado, check
removido, check adicional, ID duplicado, check↔run trocado (ambas direções),
status invertido e scope alterado. `main.rs` executa o validator e também
`m10_plaqueta_canonica`, que usa `normalizar_numero_patrimonio` para exigir que
a plaqueta do exemplo do IR seja `N(s)=trim().toUpperCase()`.

Canonicalização determinística (`normalizar_numero_patrimonio`): preserva zeros
iniciais, espaços internos e pontuação; rejeita vazio após `trim` e `> 30`
runes. Casos: `"abc-123" → "ABC-123"`, `" ABC-123 " → "ABC-123"`,
`"abc-123 " → "ABC-123"`, `" 00123 " → "00123"`, `""/"   " → inválido`,
31 runes → inválido. Testes Rust: **26** no total (23 históricos + 3 M10).

## 7. Findings independentes de M10 — segurança Rust (dead code)

Durante a rodada, identificou-se que o repositório usava `#[allow(dead_code)]`
em 11 funções e 3 campos de struct. Decisão: **nenhuma supressão é aceita**;
cada caso foi resolvido na causa.

| ID | Categoria | Evidência | Decisão |
|---|---|---|---|
| RUST-SAFETY-01 | CÓDIGO MORTO | `#[allow(dead_code)]` em `q06_*`/`evaporacao_valida`/`massa_consumida` (M6), `canonicalize`/`payload_hash` (M7), 6 funções de M8, `pode_executar_atual`/`pode_commit_atual` (M9). | As funções de referência determinística só eram exercidas pela suíte de testes; passaram a `#[cfg(test)]`, com uso real nos testes. Não são código de produção. **RESOLVIDO.** |
| RUST-SAFETY-02 | METADADOS NÃO LIDOS | `#[allow(dead_code)]` no struct `Campo`: `nao_negativo`, `positivo`, `maximo` nunca eram lidos (mas o schema exige os campos por `deny_unknown_fields`). | Adicionado `Campo::metadata_ok`, que valida que metadados numéricos só se aplicam a tipos numéricos e é chamado em `Ir::valid()`. **RESOLVIDO.** |
| RUST-SAFETY-03 | DIRETRIZ DE SEGURANÇA | Ausência de proibição de `unsafe` e de código morto. Ao ativar `#![forbid(dead_code)]`, surgiu `E0453`: sob `--test` o harness do rustc injeta `#[allow(dead_code)]` sobre o `fn main` do crate, conflitando com o `forbid`. | `main.rs` recebeu `#![forbid(dead_code)]`, `#![forbid(unsafe_code)]` e `#![deny(warnings)]`. O entrypoint de produção (`fn main` e o helper `fn list`) é `#[cfg(not(test))]`, deixando o harness gerar o próprio entrypoint de teste; nenhuma supressão de lint existe. **RESOLVIDO.** |

Observação: são findings **independentes de M10** (afetam M6–M9 e o IR); não
reabrem nem alteram os contratos históricos. `cargo build`, `cargo test` e
`cargo clippy --all-targets -- -D warnings` passam sem avisos.

## 8. Guard de drift e canonicalização

`tools/formal/m10_contract.test.mjs` (7 testes) compara enums de status,
conservação, lock e histórico, nomes canônicos e predicados centrais entre
documentação, CUE, Alloy e Rust, além de executar `N(s)` de forma determinística.
Incluído automaticamente por `node --test tools/formal/*.test.mjs`.

## 9. Gerador, MANIFEST e determinismo

`render.rs` (`render_m10`) emite `entities/formal_m10_patrimonio.tex` e
`invariants/formal_m10.tex`; `main.rs` vincula `formal_validation_m10_sha256` e
o novo hash do IR ao `MANIFEST.json`. Duas gerações consecutivas foram
comparadas recursivamente: **diff zero**. `docs-check` PASS.

## 10. LaTeX e PDF

`documentation/Formal-Spec-M10.tex` é incluído em `main.tex` após M9; M11 não é
iniciado. O capítulo cobre propósito, CUE, identidade Resumo × Bem, plaqueta
canônica, unicidade permanente, máquina de estado, conservação ortogonal,
versão, requisições, locks, histórico, baixa, fan-out, composição M7/M9 e
limites. `main.pdf` tem **389 páginas** (baseline documental: 382), exit `0`,
zero erros e zero referências indefinidas. Overfull: **29 ocorrências**, todas
herdadas/fora dos arquivos M10; os Overfull novos do capítulo M10 foram
corrigidos. Foram inspecionadas visualmente as páginas novas **383–389**
(títulos, fórmula, tabelas de campos, listings de evidência, underscores,
scopes e limites) sem corte ou sobreposição.

## 11. Regressão M0–M9

CUE antigo, Alloy antigo, validators, guards e fragmentos antigos PASS. Modelos
e resultados históricos inalterados; receipts M0–M9 mudaram somente em
`spec_ir_sha256`. Fragmentos gerados antigos byte a byte iguais (o único
acréscimo é M10). 26 testes Rust, 17 testes Node (10 históricos + 7 M10) e
Alloy de todos os milestones PASS.

## 12. Limites explícitos

Esta evidência não certifica `functions/src/patrimonio.ts`, frontend, Firestore
Rules, Storage Rules, Firebase, Admin SDK, IAM, App Check, transações reais sob
carga, Storage real, assinatura real dos arquivos, backfill de `Chaves_Unicas`,
índices, migração do histórico legado nem infraestrutura em produção. A prova é
do modelo formal declarado.

## 13. Gates e auditorias

Gates finais: `git diff --check` = 0; `cargo fmt --check` = 0;
`cargo test --locked` = 0 (26 testes); `cargo clippy --all-targets -- -D warnings`
= 0; `just formal-check` = 0. Determinismo de geração: diff zero.

Três auditorias integrais consecutivas, por conteúdo (não apenas `git diff`):

1. **Auditoria A — limpa:** paridade documentação → CUE → IR → Alloy, com
   checagem mecânica de enums/nomes/predicados (guard M10) e separações
   conceituais (`lock != Chaves_Unicas`, `versao != M7`, `Resumo != Bem`,
   `baixa != exclusão`).
2. **Auditoria B — limpa:** receipt ↔ validator Rust ↔ gerado ↔ MANIFEST ↔
   LaTeX ↔ PDF; conjunto exato de 46 resultados; determinismo de geração;
   regressão M0–M9 restrita a `spec_ir_sha256`.
3. **Auditoria C — limpa:** inspeção visual das páginas 383–389, limites
   declarados, ausência de M11 e revisão da decisão de segurança Rust.

Nenhum finding novo após as correções. HQs M10: **0** (contrato documental
fechado; nenhuma escolha de modelagem exigiu política de domínio).

## 14. Estado final e próxima ação

M0–M10 = **VALIDATED**; M11+ = **NOT_STARTED**. A consolidação executável está
pronta, mas **não commitada**: HEAD permanece
`1be21d82fb8fa6f9528425578ddec86565cdb797`; `documentation/generated/` foi
stageado apenas para satisfazer o gate de stale do `formal-check`. Um commit
não contém o próprio SHA.

Próxima ação permitida:

```text
AVALIAR A ENTRADA EM M11 — Turmas / demais domínios — em rodada separada.
```

Não iniciar M11 nesta rodada.

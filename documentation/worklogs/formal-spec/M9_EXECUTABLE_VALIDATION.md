# M9 — Autorização / usuários (formalização executável)

Estado: **VALIDATED**. Cadeia aditiva concluída: CUE → IR → Alloy → receipt →
Rust → geração determinística → LaTeX → PDF. Não altera `functions/`,
frontend, Firestore Rules, Storage Rules nem inicia M10.

## 1. Entrada e fontes

- Branch: `feat/formal-spec-cue-alloy`.
- HEAD de entrada: `d105bf8e05bf783c342a02cf4957637594258f5b`, árvore limpa.
- Fonte normativa: consolidação documental `dd5024ebd8987a65e18888a6508a79ef54e16431`,
  Seção 7/M9 e `M9_DOCUMENTATION.md`.
- M0--M8: baseline `just formal-check` PASS antes das alterações.

## 2. Arquitetura e CUE

IR permanece na versão **3**: a entidade `formal_m9_autorizacao` é aditiva e o
schema v3 já admite entidades arbitrárias. `formal_m9.cue` define shapes de
usuário, vínculo de almoxarifado, ownership acadêmico e decisão. Papéis fechados:
Chefe_Geral, Gestor_Almoxarifado, Gestor_Bens_Patrimoniais, Professor, Aluno e
Bolsista; UID é não vazio e versões são inteiras não negativas.

Fixtures CUE: 4 válidas (`usuario_gestor_corrente`, vínculo, ownership e decisão)
e 6 inválidas (UID ausente, papel inválido, versão negativa, vínculo sem escopo,
ownership incompatível e operação inválida). CUE não afirma atomicidade,
revogação Firebase, token refresh ou concorrência real.

## 3. Alloy e receipt

Modelo: `specification/alloy/operations/authorization_m9.als`. Autoridade única:
`podeExecutar(Estado, Usuario, Operacao, Recurso)`, que requer autenticação,
atividade, papel persistido, versão/claim corrente, escopo ou ownership aplicável
e recurso não server-owned. `podeCommitar` acrescenta domínio válido; autorização
nunca equivale a validade da operação.

Transições de revogação de vínculo, papel e conta incrementam a versão
persistida e deixam a claim antiga possível. O commit reavalia o estado novo;
TOCTOU é abstraído como `RevogadoAntesDoCommitNaoPodeCommitar`.

Receipt real: `build/formal-validation-m9.json`, versão 1, Alloy 6.2.0,
solver sat4j, 22 resultados: **13 checks UNSAT** e **9 witnesses SAT**.

Checks: inativo, papel inadequado, falta de escopo, ownership errado, claim
obsoleta, revogação de vínculo/papel/atividade, TOCTOU, domínio, limite da
Chefia, server-owned e revalidação. Witnesses: Chefia permitida, gestor no
escopo, professor proprietário, versão corrente, claim antiga após revogação,
commit sem revogação, negações de escopo/ownership e Chefia sem bypass de
domínio. Todos usam scope `for 8 but exactly 2 Escopo`; o witness de claim
antiga também fixa exatamente 2 Estados.

## 4. Rust, guard e geração

`validation_m9.rs` valida versão, solver, modelo, hashes, ordem e conjunto
exato de 22 resultados. As adulterações rejeitadas cobrem hash do IR, hash do
modelo, modelo trocado, check removido/adicionado, ID duplicado, tipo
check/run trocado, resultado invertido e scope alterado. Teste semântico Rust
complementa o Alloy para fail closed e para a separação autorização/domínio.

`m9_contract.test.mjs` é guard de drift dos seis papéis entre Seção 7, CUE e
Alloy e exige os predicados centrais de autorização/commit. O gerador emite
`entities/formal_m9_autorizacao.tex` e `invariants/formal_m9.tex`; MANIFEST
vincula receipt M9 e o novo hash global do IR. Receipts M0--M8 mudam apenas em
`spec_ir_sha256`; modelo, resultados e validators históricos permanecem.

## 5. LaTeX, limites e encerramento

`Formal-Spec-M9.tex` é incluído depois de M8. Declara CUE/Alloy/Rust, RBAC +
escopo + ownership, ativo, versões, claims obsoletas, revogação, TOCTOU, fail
closed e separação de domínio. A evidência não certifica Firebase, backend,
Rules, Storage, UI, Admin SDK, IAM/App Check implantados, refresh/latência de
token, atomicidade externa nem infraestrutura de produção.

Hashes finais: IR `9c9a325b807e5d392422d4112ac577692a859ed00209eba3fbee1643caf6c23d`;
modelo `ddd4db6fc9ecfc055cdbca89660fac974b3bb368a4d876311470c998148ac7cb`;
receipt M9 `5e65bcde3929f737da6ef9cc9942c1f7cc51bcea11e2fd8eae927cf55e664ef2`.
Uma segunda geração foi comparada byte a byte com a primeira, sem diferença.

PDF: `just docs-build` exit 0, 375 páginas (baseline M9 documental: 371),
zero erros e referências indefinidas; 28 Overfull herdados, nenhum M9. Páginas
372--375 foram renderizadas e inspecionadas: títulos, campos, underscores,
scopes e limites ficaram legíveis, sem corte ou sobreposição.

Auditoria final de composição confirmou: documentação → CUE → IR → Alloy →
receipt → Rust → generated → LaTeX → PDF; claims não são autoridade persistida,
papel não é autorização completa, autorização não é regra de domínio, UI não é
controle e Rules não protegem Admin SDK. `git diff --check`, `cargo fmt`, 23
testes Rust, clippy, CUE, 10 testes Node (incluindo guard M9), Alloy, docs-check
e docs-build passaram. M0--M8 mantêm modelos/resultados; os receipts antigos
mudaram apenas no hash global do IR. HQs abertas: nenhuma.

HEAD de consolidação executável antes do registro deste worklog, dos estados e
do PDF: `6a7424e2f9801e3b915e103670117bae3921f41d`. O SHA final será o commit
posterior do PDF; um commit não contém o próprio SHA.

## 6. Estado final e próxima ação

M0--M9 = VALIDATED; M10+ = NOT_STARTED. Próxima ação permitida: avaliar a
entrada em M10 — Patrimônio, em rodada separada. Não iniciar M10 nesta rodada.

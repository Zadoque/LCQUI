# M12 — fechamento (composição M12.1 × M12.2 e regressão M0–M12.2)

Estado: **VALIDATED**. A composição executável de Posts/Comentários (M12.1) e
Roteiros/Storage/compartilhamento (M12.2) foi provada em um único modelo Alloy,
com receipt verificável, validador Rust, guard de drift, geração determinística,
LaTeX e PDF. Nenhum backend, frontend, Rule real, M13 ou M14 foi iniciado.

## 1. Entrada e saída

- Branch: `feat/formal-spec-cue-alloy` (única).
- HEAD de entrada: `2922dd69a790e05aeeef776b4596e37e98d00401`, árvore limpa,
  `origin` sincronizada. HEAD de saída: commits desta rodada (executável +
  documental); ver `git log`.
- Baseline `just formal-check` **exit 0** antes das edições (com `just` e TeX Live
  do ambiente; 435 páginas).
- Confirmado que M12.1/M12.2 estavam `VALIDATED` e M12 `NOT_STARTED`.

## 2. Matriz regra → fonte M12.1 → fonte M12.2 → propriedade composta → witness

| Regra | Fonte M12.1 | Fonte M12.2 | Propriedade composta | Witness/contraexemplo |
|---|---|---|---|---|
| Identidade comum | `Usuario/Turma/Post`, `postTurma/postAutor` | `Roteiro`, `roteiroDono` | mesmo Post/Roteiro/vínculo/comando em `EstadoIntegrado` | `WitnessEstadoComposto` (SAT) |
| Acesso ao anexo | `acessoRoteiroValidado` | `acessoProfessorRoteiro` | `ponteAcessoRoteiro`: abstrato ⇒ concreto | `PublicacaoCompostaRefinaAcessoM12_1` (UNSAT) |
| Geração do snapshot | ausente (só encaixe abstrato) | `roteiroPublicavel` + `geracaoValida` | anexo com geração canônica | `PublicacaoCompostaProvaGeracao`, `AnexoCompostoUsaGeracaoCanonica` (UNSAT) |
| Publicar Post com Roteiro | `podeCriarPost` | posse/compartilhamento atual | só dono, objeto/geração coincidentes | `TerceiroNaoPublicaComAnexo`, `GeracaoDivergente…`, `WitnessPublicaRoteiroCompartilhado` |
| Proibição de não publicável | — | status `Provisorio/Validado` | não publica | `ProvisorioNaoPublicaComAnexo`, `ValidadoNaoPublicaComAnexo` (UNSAT) |
| Revogação Q09 | — | `revogarCompartilhamento` | preserva Post/snapshot/histórico/objeto/URL | `RevogacaoCompostaPreserva*` (UNSAT), `WitnessTrajetoriaCompartilhaRevoga` |
| Edição que mantém anexo | — | `acessoProfessorRoteiro` | falha sem acesso; desvincular não exige | `RevogadoNaoMantemAnexoSemAcesso`, `DesvinculacaoNaoExigeAcesso` |
| Download do aluno | `temVinculo`/`participa` | vínculo + anexo + Post | papel acadêmico **e** vínculo atual | `RotaAcademicaExigePapelEVinculo`, `WitnessAlunoBaixaAtivo/Arquivada` |
| Ex-aluno/claim antiga | revogação/claim | `authOk` | não obtém URL | `WitnessExAlunoNaoBaixa`, `ClaimAntigaNaoAutorizaComposto` |
| Post removido | `postRemovido` | `alunoAcessoPost` | não aparece | `PostRemovidoNaoBaixaComposto`, `WitnessPostRemovidoNaoBaixa` |
| URL já emitida | — | `urlsAtivas` | usável só até expirar | `WitnessUrlAtivaAposRevogacao`, `UrlExpiradaNaoUsavelComposto` |
| Chefe Q13 | `podeRemoverPost` (chefe) | `escopoQ13` | só sob auditoria em Post/Roteiro | `ChefeSemEscopoNaoEmiteComposto`, `WitnessChefeComEscopoQ13` |
| Papel × vínculo | `participa` | `alunos`/`vínculos` | Chefe com vínculo legado não usa rota acadêmica | `ChefeComVinculoLegadoNaoBaixaComposto`, `WitnessChefeComVinculoLegado` |
| M7 | `registraComando`/retry | idem | receipt, retry e reuso | `PrimeiraExecucaoCompostaProduzReceipt`, `RetryCompostoNaoDuplicaFato`, `ReusoIncompativelCompostoNaoHerda` |
| M9 | `authOk`/revogação | idem | revalidação impede commit | `RevogacaoVinculoCompostaImpedeCommit` |

Campos homônimos com sentidos distintos detectados e tratados: `coerente`
(M12.1/M12.2) não é reproduzido; a composição usa `coerenteComposta`. `Notif` é
efeito mínimo do Post (M12.1); o compartilhamento M12.2 é a própria relação
`Compartilhamento`, sem caixa de notificações (M13). `postRemovido` é o mesmo fato
nas duas fatias. Ponte antes omitida: `acessoRoteiro` (M12.1) versus ACL concreta
(M12.2), agora explícita em `ponteAcessoRoteiro`.

## 3. Decisões do item 2

### M12-CORR-01 — publicabilidade do compartilhamento (item 2a)

O worklog corretivo M12.2 afirmava que `compartilhar` chamava
`roteiroPublicavel[a,r]`, mas na HEAD a proibição era indireta (`coerente[b]` +
frame de `roteiroStatus`). A pré-condição foi tornada **explícita** em
`roteiros_m12_2.als`; o check `CompartilharExigePublicavel` e a testemunha
`WitnessCompartilhaPublicavel` reexecutam a evidência. Estados alcançáveis nos
três status: `WitnessProvisorioNaoCompartilha` e `WitnessValidadoNaoCompartilha`
(negativas, com dono e destinatário aptos) e `WitnessCompartilhaPublicavel`
(sucesso).

### M12-CORR-02 — Chefe, papel e vínculo persistido (item 2b)

Verificados M9 e M11: não existe transição que elimine/vede atomicamente
vínculos acadêmicos ao tornar-se Chefe (`revogarPapel`/`revogarAcesso` em M9 não
tocam `Turma/{id}/Alunos/{uid}`; M11 tem `removerAluno` explícito, não acoplado a
papel). A garantia **não** existe. Portanto:
- `roteiros_m12_2.als` deixou de pressupor `vAluno not in chefes` em `coerente` e
  passou a exigir o **papel acadêmico autorizado** (`alunos`) **e** o vínculo atual
  em `alunoAcessoPost`; `promoverChefe` modela a mudança de papel preservando
  vínculos legados.
- Checks `RotaAcademicaExigePapel`, `ChefeComVinculoLegadoNaoUsaRotaAcademica`,
  `PromoverChefePreservaVinculoLegado`, `PromoverChefePreservaCoerencia` e
  testemunha `WitnessPromocaoChefeMantemVinculo`.
- A regra determinística Rust `aluno_baixa` já exigia `papel == "ALUNO"`; a
  mudança alinha Alloy, CUE (`papel`) e Rust. O acesso do Chefe permanece só por
  Q13 registrado, vinculado a Post e Roteiro; a leitura da biblioteca não foi
  ampliada.

Nenhuma HQ bloqueante: as duas decisões são inferíveis de Q09/Q13/S11 e
fail-closed. **HQs M12 = 0.**

## 4. CUE/IR: justificativa de não acrescentar

A ponte de dados CUE já existe: `#M12_2RoteiroAnexo` embute
`#M12_1RoteiroAnexo` por projeção e `#M12_2AnexoVinculado` liga o snapshot à
referência canônica. Nenhum shape novo foi necessário; o IR v3 permanece
`b5671cb75609239db147d9fbe446aafa35d12f2d71ee91753f4d4cb630573fe1` e nenhuma
entidade foi adicionada. A composição é verificada em Alloy com guard de drift.

## 5. Evidência executável

- **Composição**: `specification/alloy/operations/composition_m12.als`
  (`EstadoIntegrado`, 15 transições compostas, ponte, 37 checks + 18 witnesses =
  **55 resultados**), escopos `for 4`/`for 5`. Todas as buscas `check` = UNSAT e
  todos os `run` = SAT no solver (`sat4j`), sem resultado escrito à mão.
  `model_sha256 = 2fa2d9f6f618d1ce8e074e3c55a89416db2c4f993230cbbab27f13504cb4c16e`.
- **Guard de drift**: `tools/formal/m12_composition.mjs` +
  `tools/formal/m12_composition.test.mjs` (blocos de autorização de M12.1/M12.2
  reproduzidos por token; mutações independentes rejeitadas) e
  `tools/formal/m12_contract.test.mjs`.
- **Receipt**: `build/formal-validation-m12.json` (versão 1, Alloy 6.2.0, sat4j,
  55 resultados, IDs `M12-INV-001..037`/`M12-WIT-038..055`,
  `origens` com hashes). sha256
  `c0e091d4210ec44ccf2447992000dd1539fdc130dafa911f1eaac1a92f1e1392`.
- **Rust**: `tools/spec-doc/src/validation_m12.rs` valida hashes do IR e do
  modelo, os dois hashes de origem, ID/ordem/tipo/status/scope exatos e rejeita
  adulterações (hash, modelo, ID/status/scope/tipo, remoção/extra/lista vazia).
- **Mudanças em M12.2** (item 2): `roteiros_m12_2.als` (52 checks UNSAT + 27
  witnesses SAT = **79 resultados**), receipt
  `build/formal-validation-m12-2.json` (sha256
  `e8da905ea00bae4e2bad2d1065ba65aaab174a822e1cdcb10a39bc9e353d64b4`,
  `model_sha256 = 19ca6ca07d294c3513e6adfd0adf444eb54eb0565121c8641d0ce0e634355436`),
  `validation_m12_2.rs`, `formal_m12_2.tex` e `m12_2_contract.test.mjs`
  regenerados sem alegar preservação byte a byte.
- **Geração LaTeX**: `render_m12` emite `invariants/formal_m12.tex`; MANIFEST
  vincula `formal_validation_m12_sha256`. Duas gerações consecutivas: bytes
  idênticos (`4944…`/`0254…`).
- **PDF**: `Formal-Spec-M12.tex` (capítulo 27) + fragmento gerado; PDF de **442
  páginas**, zero erros e zero referências indefinidas, 31 Overfull (iguais ao
  baseline); páginas 437–442 inspecionadas via extração de texto.

## 6. Contrato Section 7.7 × código

A Seção 7.7 foi ajustada para distinguir **papel** (RN-ROLE-01, papéis
exclusivos) de **vínculo canônico** persistido, exigindo papel acadêmico
autorizado na rota de download e negando o bypass de Q13 por Chefe com vínculo
legado. A regra de elegibilidade para compartilhamento já declarava publicável; o
código agora a torna pré-condição explícita.

## 7. Gates e regressão

- `just formal-check` final **exit 0**: `cargo fmt --check`; `cargo test --locked`
  (34 PASS); `cargo clippy --all-targets -- -D warnings`; 40 testes Node PASS;
  Alloy PASS; `docs-check` PASS; `git diff --exit-code -- documentation/generated/`
  PASS; `git diff --check` PASS.
- Regressão M0–M12.1: nenhum receipt, modelo ou fragmento de M0–M12.1 alterado;
  `spec_ir_sha256` inalterado, logo nenhum receipt antigo mudou por esse campo.
  Somente M12.2 (por decisão do item 2), MANIFEST, PDF, `main.tex`, Seção 7.7 e os
  novos artefatos M12 mudaram.
- Custo do solver: a rodada completa `alloy-check` levou ~15 min (o novo modelo de
  composição ~8,5 min). A remoção do invariante assumido em M12.2 foi compensada
  por uma invariante de domínio mais fraca (`vAluno in alunos ou chefes`), que
  reduziu o check `TurmaArquivadaNegaEscritaRoteiro` de 627 s para 92 s,
  preservando o caso legado.

## 8. Limites e dívidas

A prova é *bounded* (`for 4`/`for 5`) e não certifica `functions/`, frontend,
Firestore/Storage Rules, Auth, Storage real, bytes binários, HMAC, concorrência
nem atomicidade Firestore–Storage. Não confundir comportamento do solver com
garantia de transação ou de revogação instantânea de URL emitida. `M12.2` e
`M12.1` isolados permanecem válidos; a propriedade composta é a demonstração
desta rodada. M13 permanece `NOT_STARTED` (Notificação unificada: M7/M8/M9/M12,
reutilizando `ESCASSEZ_ESTOQUE` de M8); o fechamento global após M13 é um gate,
sem M14 automático.

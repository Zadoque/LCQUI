# M11 — Turma, matrícula e convite (formalização executável)

Estado: **VALIDATED**. Cadeia aditiva concluída: CUE → IR v3 → Alloy → receipt
verificável → validação Rust → geração determinística → LaTeX → PDF. Não altera
`functions/`, `frontend/`, Firestore Rules, Storage Rules, Auth, envio de
e-mail, índices nem inicia M12.

## 1. Entrada e fontes

- Branch: `feat/formal-spec-cue-alloy` (única utilizada; nenhuma branch nova).
- HEAD de entrada: `01fe84fde32aacee8e8c165f76faba40a5b2b786`, árvore limpa e
  `origin/feat/formal-spec-cue-alloy` sincronizada.
- Fonte normativa: subseção `\label{sec:regras-turmas-m11}` da Seção 7,
  reconciliada com Seções 3–5 e 8–11, Q08/Q13, HQ-M11-001 = A, M7, M9 e os
  worklogs M11 documental e pré-M11.
- Baseline: `just formal-check` exit `0` antes de editar (26 testes Rust, 17
  Node, Alloy PASS, gerador e PDF). M0–M10 preservados.
- `functions/src/turmas.ts` e Rules foram consultados apenas como evidência de
  divergência, nunca como autoridade; nada de aplicação foi alterado.

## 2. Micro-reconciliação normativa (pré-formalização)

Registrada em `PRE_M11_EXECUTABLE_RECONCILIATION.md`:
PRE11-01 capacidade (edição abaixo da ocupação proibida; `qtd_alunos >
capacidade` válido por exceção), PRE11-02 fronteira Auth (conta Auth do
solicitante já existe; criação condicional é Firestore; e-mail/claims externos
pós-commit), PRE11-03 identidade/histórico de convite (ID imutável × chave de
pendência HMAC), PRE11-04 idempotência (retry do mesmo ator/token/operação ×
tentativa divergente). Nenhuma HQ nova; nenhum modelo alterado nesta fase.

## 3. CUE

`specification/cue/domain/formal_m11.cue` define `#M11Contrato` como união
fechada de `#M11Turma`, `#M11VinculoCanonico`, `#M11EspelhoAlunoTurma`,
`#M11EventoHistorico`, `#M11Convite`, `#M11PendenciaConvite` e `#M11Aceitacao`.
Enums fechados de status (`Ativo`/`Arquivada`), convite
(`pendente`/`aceitado`/`expirado`), modo (`CODIGO`/`CONVITE`), evento
(`inclusao_aluno`/`exclusao_aluno`) e contexto (`TURMA`/`GLOBAL`). Condicionais:
justificativa obrigatória sse `exceder_capacidade`; autoria/instante no estado
aceito; `modo_ingresso` na inclusão e `removido_por` na exclusão; contexto
`GLOBAL` sse `id_turma` nulo. `capacidade >= 1`, `semestre` em {1, 2},
`qtd_alunos >= 0`, `versao >= 1`, `codigo_turma` até 20 e nome até 100.

Fixtures: **12 válidas** e **12 inválidas** em `specification/cue/tests/m11/`
(`cue vet -c ./domain … -d '#M11Contrato'`). As válidas incluem
`turma_excecao_ocupacao.json` (`qtd_alunos > capacidade`, estado alcançável por
exceção nominal) e `convite_aceito_excecao.json`; as inválidas incluem
capacidade zero, semestre 3, status inválido, contador negativo, código longo,
versão zero, exceção sem justificativa, aceite sem autoria, evento sem modo,
exclusão sem removido_por, contexto global com turma e e-mail não verificado.
Regras concorrentes e de transição ficam para o Alloy.

## 4. IR e versionamento

IR permanece na versão **3**; a fatia aditiva `formal_m11_turmas` foi
acrescentada em `specification/cue/docs/projection.cue` com `#CamposM11` e um
exemplo estrutural. O hash global do IR passou de
`e2e22834a2a4325161d9ea9ad6e54b9afd3f566df191b0f4310d7a337fd7b7f6` para
`2443afeb9697e217eeb78637301631d7e6319b17900f639cac6f4bf40b744c7d`.
Receipts M0–M10 foram regenerados e mudaram **somente** em `spec_ir_sha256`
(verificado mecanicamente: 0 divergências fora desse campo). Fragmentos gerados
M0–M10 permanecem byte a byte idênticos; só o MANIFEST e os dois fragmentos M11
são novos.

## 5. Alloy

Modelo: `specification/alloy/operations/turmas_m11.als`. Universo mínimo:
`Usuario`, `Turma`, `Materia`, `Codigo`, `Email`, `Just`, `Vinculo`, `Espelho`,
`Evento`, `Convite`, `Pendencia`, `Comando`/`OpId`/`Payload` (M7 abstrato),
enums fechados `StatusTurma`, `TipoEvento`, `ModoIngresso`, `StatusConvite`,
`SimNao`, e `Estado` temporal com contador, espelho como projeção exata,
autorização abstrata e recibo M7.

- **Checks:** 33 UNSAT.
- **Witnesses:** 17 SAT.
- **Escopos:** `for 6` na maioria; `for 8` nos casos de corrida, reingresso e
  composição ampliada; `for 4` nos cenários mínimos. Bitwidth inteiro padrão do
  Alloy 6.2.0, sem overflow nos cenários válidos (`open util/integer`).
- **Cobertura:** unicidade/reserva permanente de `codigo_turma`; arquivamento e
  desarquivamento preservando ID/membros/código/histórico e bloqueando ingresso
  e aceite de convite de turma enquanto arquivada; ingresso ordinário apenas em
  turma Ativa e com vaga estrita (sem vaga, nenhuma transição ordinária);
  exceção nominal válida que pode exceder a capacidade e não é bypass genérico;
  proibição de editar capacidade abaixo da ocupação (HQ-M11-001 = A); coerência
  vínculo canônico–contador–espelho ao fim de toda transição; remoção atualiza
  espelho e histórico, bloqueia código e o espelho não sobrevive à remoção;
  unicidade de pendência por (e-mail, contexto) com distinção GLOBAL/turma;
  aceite de turma cria vínculo, aceite global não matricula, consumo único;
  expiração libera pendência; reenvio mantém documento; novo convite após
  terminalidade preserva o histórico; revogação impede commit tardio;
  reuso incompatível de comando não herda receipt M7; transições preservam a
  coerência.

## 6. Receipt

`build/formal-validation-m11.json`: versão 1, Alloy 6.2.0, solver `sat4j`,
modelo `specification/alloy/operations/turmas_m11.als`, 50 resultados (33
`check` UNSAT + 17 `run` SAT), IDs `M11-INV-001..033` e `M11-WIT-034..050`,
scopes preservados. Hashes: receipt
`1ba2e7b395490c08d853822c0bdfaba5244dc47880f0cd6c5619719a8542bce5`, modelo
`5837bcfd083ae1cec28047b5b5a64e0948e54da6c287807283c49dcda7f45783`, IR
`2443afeb…4c7d`. O runner falha diante de remoção/adulteração de assertion,
witness, origem, tipo ou scope.

## 7. Rust

`tools/spec-doc/src/validation_m11.rs` valida versão, Alloy, solver, caminho do
modelo, `spec_ir_sha256`, `model_sha256`, quantidade exata (50), IDs exatos,
ordem, tipo `check`/`run`, scopes e status. Adulterações rejeitadas nos testes:
hash do IR, hash do modelo, caminho do modelo, check removido, check adicional,
ID duplicado, status invertido, scope alterado e troca `check`↔`run` nas duas
direções. Funções de referência determinística (mesmo contrato RUST-SAFETY-01,
`#[cfg(test)]`): `normalizar_email` (trim + lowercase, ≤ 150 runes),
`ingresso_permitido`, `edicao_capacidade_permitida` e `excecao_valida`.
`main.rs` acrescenta `m11_exemplo_valido`, que exige do exemplo do IR
`capacidade >= 1`, `semestre` em {1, 2}, `qtd_alunos >= 0`, `versao >= 1` e
`status` em {Ativo, Arquivada}. Testes Rust: **29** no total (26 históricos + 3
M11). `#![forbid(dead_code)]`, `#![forbid(unsafe_code)]` e `#![deny(warnings)]`
preservados; nenhum `#[allow(...)]`.

## 8. Guard de drift

`tools/formal/m11_contract.test.mjs` (7 testes) compara enums, nomes canônicos,
predicados/assertions centrais e a decisão HQ-M11-001 = A entre documentação,
CUE, Alloy e Rust, e executa as regras determinísticas de forma espelhada.
Incluído automaticamente por `node --test tools/formal/*.test.mjs` (24 testes
Node no total).

## 9. Gerador, MANIFEST e determinismo

`render.rs` (`render_m11`) emite `entities/formal_m11_turmas.tex` e
`invariants/formal_m11.tex`; `main.rs` vincula `formal_validation_m11_sha256` ao
`MANIFEST.json`. Duas gerações consecutivas foram comparadas recursivamente:
**diff zero**. `docs-check` PASS.

## 10. LaTeX e PDF

`documentation/Formal-Spec-M11.tex` é incluído em `main.tex` após M10. O
capítulo cobre propósito, CUE, identidade/ciclo de vida da turma, matrícula
canônica/contador/espelho, capacidade e exceção (HQ-M11-001 = A), convites e
idempotência, composição M7/M9, responsabilidade das camadas e limites.
`main.pdf` tem **405 páginas** (baseline: 398 após a micro-reconciliação
pré-M11), exit `0`, zero erros e zero referências indefinidas. Overfull: **30**
ocorrências (perfil herdado). Inspeção visual das páginas novas 399–405
(título, seções, fragmento de entidade e lista de 50 resultados) sem corte ou
sobreposição.

## 11. Regressão M0–M10

CUE antigo, Alloy antigo, validators, guards e fragmentos antigos PASS. Modelos
e resultados históricos inalterados; receipts M0–M10 mudaram somente em
`spec_ir_sha256`. 29 testes Rust, 24 Node e Alloy de todos os milestones PASS.

## 12. Gates e auditorias

Gates finais: `git diff --check` = 0; `cargo fmt --check` = 0;
`cargo test --locked` = 0 (29 testes); `cargo clippy --all-targets -- -D
warnings` = 0; `just formal-check` = 0. Determinismo de geração: diff zero.

Três auditorias integrais por conteúdo:

1. **Auditoria A — limpa:** paridade documentação → CUE → IR → Alloy → Rust,
   com guard mecânico de enums/nomes/predicados e verificação das separações
   (vínculo canônico ≠ espelho, contador ≠ leitura `COUNT`, exceção ≠ bypass,
   `codigo_turma` ≠ lock efêmero, retry ≠ reuso divergente).
2. **Auditoria B — limpa:** receipt ↔ validator Rust ↔ gerado ↔ MANIFEST ↔
   LaTeX ↔ PDF; conjunto exato de 50 resultados; determinismo de geração;
   regressão M0–M10 restrita a `spec_ir_sha256`.
3. **Auditoria C — limpa:** inspeção visual das páginas 399–405, limites
   declarados, ausência de M12 e preservação de M0–M10.

HQs M11 abertas: **0** (a HQ-M11-001 = A está resolvida e incorporada).

## 13. Limites explícitos

Esta evidência não certifica `functions/src/turmas.ts`, o frontend,
`firestore.rules`, `storage.rules`, Firebase, Auth, Admin SDK, App Check, envio
real de e-mail, o HMAC concreto, transações reais sob carga, índices nem a
infraestrutura em produção. A prova é do modelo formal declarado, não
homologação da aplicação.

## 14. Estado final e próxima ação

M0–M11 = **VALIDATED**; M12+ = **NOT_STARTED**. A fonte normativa e os
pseudocódigos ilustrativos continuam separados: a implementação real permanece
dívida de M11 registrada no worklog documental.

Próxima ação permitida:

```text
AVALIAR A ENTRADA EM M12 — DEMAIS DOMÍNIOS — EM RODADA SEPARADA.
```

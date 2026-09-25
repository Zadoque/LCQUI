# M11 — Turma, matrícula e convite: validação documental

## Estado, baseline e fontes

- **Branch:** `feat/formal-spec-cue-alloy` (a única utilizada; nenhuma branch
  criada).
- **HEAD de entrada:** `394b88e7c5f2abd5ca0467915bfcd35276bbc4a8`, árvore limpa
  e `origin/feat/formal-spec-cue-alloy` no mesmo SHA (`0/0`).
- **Baseline:** `just formal-check` (via
  `nix shell nixpkgs#texliveFull nixpkgs#just`) **exit 0** antes de editar:
  17 testes Node/guards, `alloy-check` PASS, `docs-check` do gerador,
  `documentation/generated/` sem diff e `git diff --check` limpo. M0–M10
  preservados.
- **Fontes lidas:** `FORMAL_SPEC_STATE.md`, `documentation/STATUS_ATUAL.md`,
  worklogs M7, M8, M9, M10 (documental e executável), M10 executável,
  `REAGENT_SEARCH_RECONCILIATION.md`, `MODIFICACOES_CONSOLIDADAS_LCQUI.md`
  (Q08, Q09, Q13), `justfile`, Seções 3--11 e a implementação real apenas como
  comparação (`functions/src/turmas.ts`, `firestore.rules`,
  `frontend/src/components/turmas`, `frontend/src/app/turmas`).

## Escopo desta rodada e fronteiras

Fatia M11: **Turma, matrícula ativa, vínculo Aluno--Turma e convite de
ingresso** (RF17, RF18, RN-TUR-01, UI-10). Matéria existente entra como
referência. Posts, comentários, roteiros e notificações acadêmicas entram
somente nas fronteiras afetadas (leitura de turma, arquivamento, remoção), sem
declarar formalização completa.

Fora de M11 / subfatia futura: formalização completa de Posts/Comentários/
Roteiros/notificações; cancelamento explícito de convite pendente (a pendência
sempre se encerra por aceitação, expiração ou reenvio); transferência de
ownership de turma; e a **formalização executável** CUE → IR → Alloy →
receipt → Rust → LaTeX → PDF, que ocorre em rodada separada. Esta rodada **não**
é `VALIDATED` executável.

## Mapa de impacto

Arquivos alterados (todos documentação, exceto o PDF):

| Arquivo | Motivo |
|---|---|
| `documentation/Section-7-...Regras-de-Negocio.tex` | Nova subseção 7.5 normativa de M11 e referência à HQ-M11-001. |
| `documentation/Section-4-...SQL-3FN.tex` | `Turma` com `qtd_alunos`/`versao`/`CHECK`; RN-TUR-01 reconciliada (COUNT × `qtd_alunos`, exceção, remoção/reingresso). |
| `documentation/Section-5-...Firestore.tex` | Mapeamento de `Turma` (código/`Chaves_Unicas`/`qtd_alunos`), `Convite_Aluno` (unicidade transacional/HMAC) e complemento de `Turma`. |
| `documentation/Section-8-...Dashboards.tex` | UI-10: expiração/reconciliação de convite, convite global, arquivamento preservando vínculos, redução de capacidade fail-closed, contador. |
| `documentation/Section-9-Exemplos-de-fluxos.tex` | Correção do fluxo de convite (não afirmar e-mail enviado) e seis fluxos/regressões M11. |
| `documentation/Section-10-...10-Consolidacao...tex` | Contrato M11 normativo e correção do rótulo `expirado` no pseudocódigo N-12. |
| `documentation/Section-11-...Security-Rules.tex` | Rules de `Turma`/`Alunos`/`Convite_Aluno`, vínculo canônico × espelho, arquivada somente leitura. |
| `documentation/Section-3-Stakeholders.tex` | Papel do Chefe na matriz de turmas delimitado por Q13 e M11. |
| `documentation/main.pdf` | PDF recompilado e publicado. |
| `documentation/STATUS_ATUAL.md`, `FORMAL_SPEC_STATE.md` | Status corrente. |

## Matriz `ação → ator/escopo → pré-condições → transação → efeito → auditoria → falha → UI`

Evidências por arquivo/linha antes da edição (linhas do estado de entrada):

| Ação | Ator/escopo | Pré-condição | Transação | Efeito | Auditoria | Falha | UI |
|---|---|---|---|---|---|---|---|
| Criar Turma (RF17) | Professor dono (`id_professor=uid`); Chefe só Q13 | matéria existente, nome ≤100, ano, semestre 1/2, capacidade>0 | cria `Turma` + `codigo_turma` único | turma Ativo, `qtd_alunos=0`, `versao` | `Registro_de_Auditoria`; notificação quando aplicável | código/esgotamento de tentativas, matéria inválida | UI-10 (`S8:269`), PRO-01 (`S9:237`) |
| Arquivar/desarquivar | Professor dono; Chefe por Q13 | turma existe, status válido | `status`+`versao`; fan-out idempotente do espelho (C006 `S10.4:199`) | turma somente leitura / reativa mesma ID | auditoria de status; notificação TURMA_ARQUIVADA/DESARQUIVADA | turma alheia, recurso ausente | UI-10 (`S8:272`), PRO-02 (`S9:240`), Q08 |
| Ingresso por código (RF18) | Aluno/Bolsista autenticado | código válido, turma Ativo, vaga, não removido | relê turma; `qtd_alunos < capacidade`; cria vínculo+espelho+evento+contador | matrícula ativa | `Historico_Alunos_Turma` (`S4:601`,`S5:534`); registro de auditoria | código inválido, lotada, arquivada, removido, corrida da última vaga | ALU-01 (`S9:267`), UI-10 (`S8:276`) |
| Convidar aluno (turma/global) | Professor dono (Aluno/Bolsista como papel Aluno) | e-mails válidos/deduplicados; matrícula opcional; global exige confirmação | unicidade de pendente por (e-mail,`id_turma`) / global NULL; grava convite com hash | convite `pendente` (sem matrícula) | convite + reenvio auditados | duplicidade, justificativa ausente na exceção | PRO-03 (`S9:243`), UI-10 (`S8:274`) |
| Aceitar convite | Aluno autenticado, e-mail verificado | pendente, não expirado, turma Ativo, vaga/exceção, identidade | consome convite; cria `Usuario`/`Aluno` se faltar; cria vínculo+espelho+evento+contador (só turma) | matrícula ativa; global não matricula | `aceitado_por/em`; histórico `modo_ingresso=CONVITE` | expirado, e-mail divergente, consumido, lotada | ALU-01 (`S9:267`), UI-10 (`S8:276`) |
| Remover aluno | Professor dono; Chefe por Q13 | vínculo existe | exclui vínculo+espelho; `exclusao_aluno`+`removido_por`; `qtd_alunos-1` | desvinculado, posts preservados | `Historico_Alunos_Turma`; auditoria | vínculo ausente (idempotente), alheio | PRO-04 (`S9:246`), UI-10 (`S8:276`) |
| Reingresso | Aluno removido | convite explícito (código bloqueado) | igual à aceitação | nova matrícula | histórico preservado | tentativa por código negada | ALU-01, UI-10 (`S8:276`) |
| Ler turma/membros/posts | dono, membro canônico atual, Chefe Q13 | vínculo canônico atual | — | projeção mínima a colegas | — | turma alheia/sem vínculo nega | UI-10, `S11:59-61` |

Fatos, inferências e decisões: os itens acima são **fatos documentais**. A
redução de capacidade abaixo da ocupação é **decisão humana pendente**
(HQ-M11-001). Não há inferência apresentada como regra.

## Achados e resoluções

| ID | Categoria | Evidência | Resolução/estado |
|---|---|---|---|
| M11-F01 | CONTRADICAO_DOCUMENTAL | `S4:587-593` definia capacidade por `COUNT(Aluno_x_Turma)`, enquanto `S5:814` exige `qtd_alunos` transacional e a implementação usa recontagem. | RN-TUR-01 reconciliada: `COUNT` 3FN e `qtd_alunos` são a mesma grandeza; autoridade transacional é `qtd_alunos`. **RESOLVIDO** (contrato). |
| M11-F02 | CONTRADICAO_DOCUMENTAL | `S8:276` dizia que aluno já matriculado "recebe acesso … sem duplicar contagem"; a implementação lança erro. | Contrato define retry/idempotência M7: devolve o resultado persistido e o acesso, sem duplicar contador. **RESOLVIDO** (implementação diverge: dívida). |
| M11-F03 | CONTRADICAO_DOCUMENTAL | `S9:57` afirmava no toast "acessos disparados por e-mail", contrariando `S8:274`. | Fluxo reescrito: criar registro ≠ enviar e-mail; resultado por destinatário. **RESOLVIDO**. |
| M11-F04 | LACUNA_DE_CONCORRENCIA | Remoção/`qtd_alunos` podia ficar negativo em retry/remoção concorrente. | Decremento só com vínculo existente; nunca abaixo de zero; remoção dupla idempotente. **RESOLVIDO** (contrato). |
| M11-F05 | LACUNA_DE_AUTORIDADE | Espelho `Usuarios/uid/Turmas/id` podia ser lido como autorização. | Reafirmado canônico `Turma/id/Alunos/uid`; espelho só consulta; leitura pós-remoção usa vínculo atual (M9). **RESOLVIDO**. |
| M11-F06 | LACUNA_DE_DOMINIO | Pendência de convite sem encerramento definido; `expirado` sem materialização. | Expiração invalida pendência e libera unicidade; reconciliação idempotente materializa `expirado`; reenvio substitui hash/expiração. **RESOLVIDO**. |
| M11-F07 | LACUNA_DE_DOMINIO | Redução de `capacidade` abaixo de `qtd_alunos` sem resultado. | Decisão humana **HQ-M11-001 = A**: proibido reduzir abaixo da ocupação; servidor rejeita fail-closed. **RESOLVIDO**. |
| M11-F08 | LACUNA_DE_FRONTEIRA | Limite Auth/Firestore/e-mail e idempotência de aceitação não explicitados. | Contrato define transação Firestore, etapas externas pós-commit recuperáveis e aceitação única idempotente (M7). **RESOLVIDO**. |
| M11-F09 | DIVERGENCIA_IMPLEMENTACAO | `functions/src/turmas.ts` decide por claims antes da transação; sem receipt M7/`Chaves_Unicas` de turma; `removido_por`/`modo_ingresso` ausentes; PII no vínculo; `versao` não incrementada em arquivar; `aceitarConviteAluno` inexistente. | Registrado como dívida; nenhuma alteração real nesta rodada. **ABERTO (implementação)**. |
| M11-F10 | DIVERGENCIA_IMPLEMENTACAO | `firestore.rules` permite `Turma` read a `isAuthenticated` e não cobre `Convite_Aluno` explicitamente; diverge do alvo da Seção 11. | Registrado; deny-all cobre convites. **ABERTO (implementação)**. |

## Human Questions

- **HQ-M11-001 — RESOLVED (A).** *Redução de `capacidade` abaixo de
  `qtd_alunos`.* Contexto: `capacidade` é "quantidade máxima ordinária de
  alunos", validada na transação de ingresso (`S4:578`, `S5:518`), sem regra
  para reduzi-la abaixo da ocupação corrente. Decisão humana: **não permitir**
  diminuir a capacidade para abaixo de `qtd_alunos`; o servidor rejeita,
  fail-closed, com erro recuperável e orienta remover membros antes ou manter a
  capacidade. As opções descartadas eram (B) manter excedentes bloqueando novos
  ingressos e (C) permitir exigindo remoção explícita na mesma operação. A
  decisão está incorporada à Seção 7.5 e à UI-10.

Nenhuma outra ambiguidade genuína foi encontrada; os demais casos têm
autoridade documental inequívoca (Seção 3, Seção 7/M9, Q08, Q13, DP-C03).

## Regressão M0–M10

- `just formal-check` antes e depois: exit `0`.
- `alloy-check` PASS; `docs-check` do gerador sem alteração de
  `documentation/generated/`; `git diff --check` limpo.
- Diff de `specification/`, `tools/`, `frontend/`, `functions/`,
  `firestore.rules`, `storage.rules`, `build/*.json` e
  `documentation/generated/`: **vazio**. Receipts antigos não foram regravados.

## Auditoria de consistência

1. **Auditoria A — 3FN × Firestore × RF/UI/fluxos:** reconciliação de
   `COUNT`/`qtd_alunos`, `Turma` com `qtd_alunos`/`versao`, unicidade de
   convite, arquivamento e remoção/contato. Achados M11-F01..F05 corrigidos.
   **Limpa** após correções.
2. **Auditoria B — M7/M9/Rules/concorrência:** idempotência, TOCTOU, decremento
   seguro, fronteira de autorização, Rules de convite/turma arquivada. Achados
   M11-F06, M11-F08 corrigidos; M11-F09/F10 são dívida de implementação.
   **Limpa** no plano normativo.
3. **Auditoria C — fronteira, nomenclatura, escopo, PDF:** `modo_ingresso`,
   `removido_por`, `exceder_capacidade`, `justificativa_excecao`,
   `codigo_turma`, `qtd_alunos`; status `expirado` (sem `cancelado`); `versao`
   não incrementa por inclusão/remoção de membro; HQ-M11-001 decidida (A).
   **Limpa** após as correções.

## Validação e PDF

- `just formal-check` final: exit `0` (rust-check, testes Node/guards,
  `alloy-check`, `docs-check`, build LaTeX, stale gate e `git diff --check`).
- PDF `documentation/main.pdf`: **397 páginas** (entrada 390), exit 0, 0 erros,
  0 referências indefinidas, 30 avisos Overfull herdados, 0 alterações em
  artefatos formais. Inspeção visual (Poppler): páginas 40 (Turma/RN-TUR-01),
  120--121 (Seção 7.5), 175 (UI-10), 193--194 (fluxos M11), 327 (contrato M11
  na Seção 10.10) e 338 (Rules) legíveis, sem corte ou sobreposição.

## Limites, estado final e próxima ação

Esta rodada não certifica `functions/`, frontend, Firestore/Storage Rules,
Firebase, IAM, App Check, objetos implantados, concorrência real nem
infraestrutura. M11 é contrato documental da fatia Turma/matrícula/convite, não
implementação. Sem HQ bloqueante, com a HQ-M11-001 resolvida (A) e três
auditorias de consistência sem novas falhas, **M11 =
DOCUMENTATION_VALIDATED** para a fatia documental explicitamente definida; a
formalização executável não foi iniciada nesta rodada. M0–M10 = **VALIDATED**;
M12 = **NOT_STARTED**.

Próxima ação exata:

```text
Executar a formalização executável M11 (CUE → IR → Alloy → receipt → Rust →
LaTeX → PDF) em rodada separada, a partir deste contrato documental.
```

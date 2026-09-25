# M8 — Estoque / Escassez / Notificações (documentação)

Estado: **DOCUMENTATION_VALIDATED**. Branch: `feat/formal-spec-cue-alloy`.

> **Supersessão (registro histórico preservado).** Este worklog registra a
> consolidação documental, que fechou em `M8 = DOCUMENTATION_VALIDATED`. Na
> sequência, a **formalização executável** foi concluída (CUE → IR → Alloy →
> receipt → Rust → LaTeX → PDF) e o estado corrente passou a
> `M8 = VALIDATED`. Ver
> [M8_EXECUTABLE_VALIDATION.md](M8_EXECUTABLE_VALIDATION.md). Os parágrafos
> abaixo não foram reescritos.

Esta rodada é **exclusivamente documental**. NÃO cria modelo Alloy M8, receipt
`formal-validation-m8.json`, validator Rust M8, fragmentos formais M8,
`Formal-Spec-M8.tex`, implementação real de backend/frontend, deploy, M9 nem
posterior. A formalização executável de M8 permanece para uma rodada separada.
`frontend/`, `functions/`, `firestore.rules`, `storage.rules`, `firebase.json`,
`.firebaserc`, `specification/`, `tools/`, `build/*.json`, `documentation/generated/`
não foram alterados.

## 1. HEAD de entrada

`4e142287536e4cde3077c0b3b72c13185734faed` (`test(formal): cover validated M6
consumption arithmetic`).

## 2. Branch

`feat/formal-spec-cue-alloy`.

## 3. Estado da árvore

Limpa na entrada (`git status --short` vazio).

## 4. Baseline `formal-check`

Antes das alterações, na HEAD intacta:

- `git diff --check`: PASS.
- `git diff --exit-code -- documentation/generated/`: PASS (geração estável).
- `cargo fmt --check`: PASS.
- `cargo test`: PASS, 15/15.
- `cargo clippy --all-targets -D warnings`: PASS.
- `docs-check` (`cargo run -- --check .`): PASS.
- `alloy-check` (`node --test tools/formal/*.test.mjs` + `check.mjs`): PASS (6 testes).
- `docs-build`: o `just`/`latexmk` não estavam no `PATH` corrente; o toolchain
  Nix histórico (`just 1.58.0` e `texlive-2025-r78234-final-env`) foi localizado
  e reutilizado. O baseline documental registrado pelo backfill pré-M8 é
  345 páginas com 33 ocorrências \textit{Overfull}. Nenhuma regressão M0–M7.

Nenhuma falha de baseline: M8 documental pôde iniciar.

## 5. Fontes lidas

`FORMAL_SPEC_STATE.md`; `documentation/STATUS_ATUAL.md`;
`documentation/worklogs/formal-spec/PRE_M8_FORMALIZATION_BACKFILL.md`;
`M5_DOCUMENTATION.md`/`M5_EXECUTABLE_VALIDATION.md`;
`M6_DOCUMENTATION.md`/`M6_EXECUTABLE_VALIDATION.md`;
`M7_DOCUMENTATION.md`/`M7_EXECUTABLE_VALIDATION.md`; fontes normativas das
Seções 3, 4, 5, 6, 7, 8, 9, 10.2/10.3/10.5/10.7, 11 e 12. Implementação
real lida apenas como evidência de divergência: `functions/` (`reagentes.ts`,
`schemas/reagentes_base.schema.ts`), `frontend/`
(`components/reagentes/ModaisReagentes.tsx`) e `firestore.rules`.

## 6. Mapa de impacto (M8)

Conceitos e locais normativos correntes:

| Conceito | Onde vive normativamente | Classificação |
|---|---|---|
| Estoque atual / autoridade Frasco | Seção 6.8; Seção 7.2.24 | NORMATIVA |
| Agregação `count()`/`sum()` protegida | Seção 6.8; Seção 10.2 | NORMATIVA |
| `saldo_aferido_g`/`saldo_aferido_ml` | Seção 5; Seção 6.8; Seção 7.2.24 | MAPEAMENTO_FIRESTORE/NORMATIVA |
| `saldo_desconhecido` | Seção 4/5; Seção 7.2.24 | NORMATIVA |
| Resumos FLOW `*_Diario` | Seção 6; Seção 10.7 | NORMATIVA |
| `Estoques_Configurados` | Seção 4/5; Seção 7.2.24; Seção 10.7 | NORMATIVA |
| `qtd_limiar_escassez` / `qtdAptos` | Seção 4/5; Seção 7.2.24; Seção 10.7 | NORMATIVA |
| `frascoAptoParaUso` | Seção 7.2.24 (novo) | NORMATIVA |
| `verificarEscassezDeEstoque` | Seção 10.7 | PSEUDOCODIGO |
| `Sistema_Cache_Dashboard` / escopos | Seção 6.8; Seção 11 | NORMATIVA/SEGURANCA |
| `Sistema_Rate_Limit_Dashboard` | Seção 6.8; Seção 11 | NORMATIVA/SEGURANCA |
| TTL 30 s / 5 req/min / 60 s | Seção 6.8 | NORMATIVA |
| `Notificacao` / `ESCASSEZ_ESTOQUE` | Seção 4/5; Seção 7.2.24; Seção 10.7; Seção 11 | NORMATIVA |
| Data civil `America/Sao_Paulo` | Seção 10.7 (invariante PDF-015) | NORMATIVA |
| `EXTRAVIADO`/`QUARENTENA`/`vencido` na aptidão | Seção 7.2.24; M5/M6 | NORMATIVA |
| Campos STOCK removidos dos resumos | Seção 6; STATUS_ATUAL | HISTORICA/SUPERSEDED |
| `qtdEmQueEConsideradoEscasso` | `functions/` | IMPLEMENTACAO_REAL |
| Rótulo "frascos ou ml/g" | `frontend/` | IMPLEMENTACAO_REAL |

## 7. Contratos herdados

- **M5**: `situacao_localizacao` é dimensão ortogonal; `EXTRAVIADO` preserva o
  estado físico e força `INDISPONIVEL`; reencontro impõe quarentena.
- **M6**: existência de pendência metrológica impeditiva mantém o frasco
  indisponível/quarentena; desconhecido ≠ zero; g e mL não se somam.
- **M7**: idempotência global `(uid, tipo_operacao, payload_hash)`; jobs por
  chave determinística (`create`) ou recomputação absoluta;
  `ALREADY_EXISTS`/`code 6` é a única duplicidade esperada.
- **HQ-M2-006 (RESOLVED)**: estoque atual via `Frasco_Reagente` + `count()/sum()`
  server-side; cache lazy de 30 s com invalidação transacional; resumos FLOW.

## 8. Findings

| ID | Categoria | Descrição | Evidência | Impacto | Resolução | Estado |
|---|---|---|---|---|---|---|
| M8-F01 | `ERRO_MECANICO` | Query de escassez (pseudocódigo Seção 10.7) não filtrava `situacao_localizacao = LOCALIZADO` após M5. | `Section-10.7`, `verificarEscassezDeEstoque`. | Frasco extraviado poderia contar como apto se `disponibilidade` estivesse inconsistente. | Filtro adicionado + referência ao predicado único. | RESOLVIDO |
| M8-F02 | `ERRO_MECANICO` | Job de escassez engolia erros diferentes de `ALREADY_EXISTS` (`console.error` sem `throw`). | `Section-10.7`, `.catch`. | Perda silenciosa de alerta de escassez. | `.catch` propaga tudo exceto `code 6`/`ALREADY_EXISTS`. | RESOLVIDO |
| M8-F03 | `LACUNA_DE_DOMINIO` | Não havia definição única de aptidão/`qtdAptos` compartilhada por dashboard, retirada e escassez. | Seção 6 (aptidão implícita), Seção 10.5, Seção 10.7. | Três noções poderiam divergir. | Predicado `frascoAptoParaUso` + `qtdAptos` na Seção 7.2.24, referenciado nas Seções 6/10.5/10.7. | RESOLVIDO |
| M8-F04 | `ERRO_MECANICO` | `registrarRetirada` não checava `situacao_localizacao` explicitamente. | `Section-10.5`. | Dependia só de `disponibilidade`; incoerente com a dimensão M5. | Guard `situacao_localizacao !== "LOCALIZADO"` adicionado. | RESOLVIDO |
| M8-F05 | `LACUNA_DE_DOMINIO` | Faltava afirmar que o job de escassez não pode decidir por `Sistema_Cache_Dashboard`. | Seção 6; Seção 10.7. | Decisão de escassez sobre dado possivelmente obsoleto. | Regra "Cache ≠ Escassez" adicionada (Seção 7.2.24 e 10.7). | RESOLVIDO |
| M8-F06 | `ERRO_MECANICO` | `Estoques_Configurados` ausente da matriz de Rules da Seção 11, embora `Notificacoes` já constasse. | `Section-11` tabela. | Lacuna de rastreabilidade de segurança (coberta por deny-all). | Linha adicionada (read por Chefe/Gestor vinculado; write negado). | RESOLVIDO |
| M8-F07 | `DIVERGENCIA_IMPLEMENTACAO` | `firestore.rules` permite `update, delete` do próprio dono em `Usuarios/{uid}/Notificacoes`. | `firestore.rules:46-50`. | Cliente pode apagar/fabricar estado local de notificação. | Não corrigido (Rules proibidas na rodada); dívida registrada. | DÍVIDA_REGISTRADA |
| M8-F08 | `DIVERGENCIA_IMPLEMENTACAO` | `functions/` usa `qtdEmQueEConsideradoEscasso` e não implementa `Estoques_Configurados`, `verificarEscassezDeEstoque`, `saldo_aferido_*` nem cache. | `functions/src/schemas/reagentes_base.schema.ts:16`; busca global. | Backend não corresponde ao alvo M8. | Dívida registrada; `functions/` intacto. | DÍVIDA_REGISTRADA |
| M8-F09 | `DIVERGENCIA_IMPLEMENTACAO` | Frontend rotula o limiar como "frascos ou ml/g". | `frontend/src/components/reagentes/ModaisReagentes.tsx:302`. | Ambiguidade de unidade na UI implementada. | Dívida registrada. | DÍVIDA_REGISTRADA |
| M8-F10 | `DIVERGENCIA_IMPLEMENTACAO` | Não há `Sistema_Cache_Dashboard`/agregação `count()`/`sum()` implementados. | busca global em `functions/`/`frontend/`. | Cache/agregação documentados ainda não existem no código. | Dívida registrada. | DÍVIDA_REGISTRADA |

Nenhum finding foi classificado como `LACUNA_DE_DOMINIO` bloqueante; portanto
**nenhuma HQ foi aberta**. As divergências de implementação são dívida futura,
não erro documental.

## 9. Decisões mecânicas

- Seção 4: `qtd_limiar_escassez` recebeu `CHECK (>= 0)` explícito (já era
  "não negativo" nas Seções 5/7) e a explicação passou a declarar a fronteira
  `qtdAptos < qtd_limiar`.
- Seção 6.8: a aptidão passou a referenciar o predicado único incluindo
  `situacao_localizacao = LOCALIZADO` e a não somar g com mL.
- Seção 10.5: `registrarRetirada` passou a checar `situacao_localizacao`.
- Seção 10.7: query de escassez com `situacao_localizacao`, contagem de aptos
  como "não vencidos + vencidos com `uso_vencido_autorizado = true`" (validade
  compatível do predicado), `.catch` que propaga, parágrafo de semântica das
  flags e distinção "especificar ≠ ativar" do backfill.
- Seção 5: índice composto de `Frasco_Reagente` para aptidão/escassez recebeu
  `situacao_localizacao` e `uso_vencido_autorizado`; a lista de índices foi
  reduzida a `\small` para eliminar overfull histórico.
- Seção 11: linha de `Estoques_Configurados` e nota de que marcar como lida é
  server-owned e `Limpar tudo` não é `DELETE`.
- Seção 8: UI-19 criada.
- Seção 9: casos de regressão M8 adicionados.

## 10. Human Questions

Nenhuma. Todas as decisões decorrem de contratos já vigentes (unidade em
frascos, `<` estrito, timezone IANA, desconhecido ≠ zero, aptidão conforme M5/M6,
idempotência M7, cache lazy 30 s, rate limit 5/min/UID).

## 11. Contrato final de estoque

`Frasco_Reagente` é a única autoridade do estoque atual; não existe view
persistente nem encadeamento D→D-1. `Resumo_Almoxarifado_Diario` e
`Resumo_Reagente_Diario` são projeções FLOW históricas. A agregação é
`navegador → backend protegido → count()/sum() → Frasco_Reagente`. Saldos
`saldo_aferido_g`/`saldo_aferido_ml` são server-owned; desconhecido/ausente/
inconsistente/não mensurável é `NULL`, nunca zero. Massa e volume não se somam.

## 12. Contrato final de cache

`Sistema_Cache_Dashboard` é coleção interna, efêmera, derivada, descartável e
server-owned; nunca autoridade. Escopos `ESTOQUE__ALMOX` e
`ESTOQUE__ALMOX__RESUMO` com IDs determinísticos; filtros que alteram resultado
entram na chave normalizada. Campos `escopo`, `resultado`, `calculado_em`,
`versao_calculo`, `geracao`, `valido`. `geracao` é token de invalidação.
Validade `idade < 30 s` com `calculado_em` no início do cálculo; TTL físico do
Firestore não é validade semântica; cache lazy, sem scheduler. Ordem
`App Check → Auth → RBAC/escopo → rate limit → cache/agregação`, inclusive em
cache hit. Rate limit `5 solicitações/minuto/UID`, janela deslizante de 60 s,
relógio server-side, UID como identidade. Publicação condicionada à geração:
`ler geração G → calcular → reler geração → publicar só se ainda G`; mutação do
domínio + incremento de geração + `valido = false` + `resultado = null` na mesma
unidade atômica, sem recalcular agregação; retry limitado; se a geração mudar
repetidamente, responder indisponibilidade temporária.

## 13. Matriz de invalidação

Ver Seção 7.2.24 (tabela). Resumo: cadastro/abertura/retirada/devoluções/
resolução/esgotamento/pesagem/evaporação/ajuste/recalibração/quebra/descarte/
extravio/reencontro/quarentena/vencimento invalidam `ESTOQUE__ALMOX` e
`ESTOQUE__ALMOX__RESUMO`; transferência/associação invalidam origem e destino
(condicional a contrato suportado); correção exclusivamente histórica não
invalida estoque atual; o job de escassez não invalida cache e gera notificação.

## 14. Contrato de escassez

Configuração em `Almoxarifado/{almoxId}/Estoques_Configurados/{configId}` com
chave `{id_resumo_reagente}_{id_especificacao_reagente}` e campos
`id_resumo_reagente`, `id_especificacao_reagente`, `id_almoxarifado`,
`qtd_limiar_escassez`, `ativo`, `notificacao_ativa`. `qtd_limiar_escassez` é
inteiro não negativo em frascos. Escassez sse `qtdAptos < qtd_limiar_escassez`
(estritamente menor). `ativo=false` não avalia; `notificacao_ativa=false` mantém
a configuração e suprime o alerta; `Almoxarifado.ativo=false` não executa.
Backfill legado é pré-condição operacional; especificar o job ≠ ativar a cron.

## 15. Definição exata de `qtdAptos`

```
qtdAptos = |{ f in Frasco_Reagente :
   f.id_almoxarifado = A
   ∧ f.id_resumo_reagente = R
   ∧ f.id_especificacao_reagente = E
   ∧ frascoAptoParaUso(f) }|
```

com

```
frascoAptoParaUso(f) :=
   f.situacao_localizacao = LOCALIZADO
   ∧ f.disponibilidade = DISPONIVEL
   ∧ f.estado_fisico_frasco ∈ {FECHADO, ABERTO}
   ∧ f.em_quarentena = false
   ∧ (f.vencido = false ∨ f.uso_vencido_autorizado = true)
   ∧ ¬existePendenciaMetrologica(f)
```

`qtdAptos` mede número de frascos (não g/mL) e é a base única do critério de
escassez.

## 16. Contrato de notificações

Tipo `ESCASSEZ_ESTOQUE` em `Usuarios/{uid}/Notificacoes/{id}`, com
`id_destinatario`, `papel_destinatario`, `tipo`, `entidade_alvo`, `id_alvo`,
`quantidade`, `lida`, `emitida_em`, `expira_em` (NULL para persistente).
Destinatários: gestores vinculados ao almoxarifado. Idempotência por docId
determinístico `escassez_{almox}_{config}_{dataCivil}` via `create()`; sem
`Date.now()`/UUID/`doc()` aleatório; apenas `ALREADY_EXISTS` é no-op e erros
diversos propagam. Data civil via IANA `America/Sao_Paulo`. Leitura própria;
escrita e marcação de lida server-owned; `Limpar tudo` marca lida sem `DELETE`.

## 17. Casos de regressão

Ver Seção 9 (casos M8) e a lista consolidada de 40+ itens nas categorias
Estoque, Escassez, Cache, Notificação e Interação M5/M6. Cobrem aptidão
(`ABERTO+EXTRAVIADO` não apto etc.), fronteiras de escassez, cache/rate
limit/geração, idempotência de notificação e bloqueios M5/M6.

## 18. Divergências de implementação

M8-F07 (`firestore.rules` notificações), M8-F08 (backend sem job/config/saldo/
cache), M8-F09 (rótulo "frascos ou ml/g"), M8-F10 (sem cache/`count()`/`sum()`
implementados). Nenhuma corrigida nesta rodada; `functions/`, `frontend/` e
Rules permanecem intactos.

## 19. Fronteiras M9+

- **M9 (autorização/usuários)**: M8 apenas usa as pré-condições já decididas
  (Auth, App Check, RBAC, escopo de almoxarifado; Chefe_Geral/Gestor vinculado)
  e não redesenha papéis.
- **M10 (patrimônio)**: mantém contrato próprio de snapshots; não afetado.
- **M12 (redução de duplicação)**: eventual consolidação dos pseudocódigos de
  saldo/cache/invalidação é dívida; nesta rodada o predicado único reduz a
  divergência conceitual entre as três consultas.

## 20. Validações executadas

- Baseline na HEAD intacta: `git diff --check` PASS; geração estável
  (`git diff --exit-code -- documentation/generated/`); rust-check (fmt, 15
  testes, clippy `-D warnings`) PASS; docs-check PASS; alloy-check PASS.
- Após as alterações: `just formal-check` PASS (exit 0), incluindo rust-check,
  docs-check, `docs-build`, `git diff --exit-code -- documentation/generated/`
  e `git diff --check`.
- PDF: exit 0, **362 páginas**, zero erros LaTeX, zero referências indefinidas,
  **32** ocorrências \textit{Overfull} (baseline pré-M8 = 33; a rodada removeu
  uma ao quebrar explicitamente o item de índice composto de `Frasco_Reagente`).
- Inspeção Poppler das páginas M8.
- `git diff --name-only` restrito a `.tex` documentais, status e ao worklog;
  diff zero em `frontend/`, `functions/`, `specification/`, `tools/`,
  `firestore.rules`, `documentation/generated/` e `build/*.json`.

## 21. Inspeção do PDF

Páginas inspecionadas com Poppler: 54–55 (índice composto de `Frasco_Reagente`
com `situacao_localizacao`/`uso_vencido_autorizado`), 134–138 (Seção 7.2.24:
autoridades, saldos, predicado, `qtdAptos`, configuração, fronteira,
cache × escassez, notificações e matriz de invalidação), 167 (UI-19), 177 (casos
de regressão M8), 270–271 (job de escassez, backfill, semântica das flags,
contagem não vencido + autorizado e `.catch`), 316 (Rules: `Notificacoes` e
`Estoques_Configurados`). Sem tabelas cortadas, listings ilegíveis, sobreposição
de texto ou quebra ruim nos trechos novos.

## 21b. Auditoria em ciclo até estabilidade

Após a consolidação e a última correção (quebra explícita do item de índice na
Seção 5), foram executadas **três auditorias integrais consecutivas**,
revisitando modelo (Seções 4/5), Firestore, Rules, UI (Seção 8), jobs (10.7),
cache (6.8), escassez, notificações, M5/M6/M7 e casos de fronteira. Contador
`limpo → +1`; qualquer finding novo o zeraria.

- **Auditoria 1.** Verificação mecânica: nenhum `qtdAptos <=`; query de escassez
  e retirada com `situacao_localizacao`; nenhum `Date.now()`/`documento()`
  aleatório na notificação de escassez; job não usa `Sistema_Cache_Dashboard`;
  timezone IANA; desconhecido ≠ zero; g e mL não somados. Releitura semântica da
  Seção 7.2.24, 6.8, 9 (regressão), 10.5 e 10.7. **0 findings.** Contador = 1.
- **Auditoria 2.** Foco em coerência cruzada entre seções e com M5/M6/M7:
  predicado × query × retirada; matriz de invalidação × texto; config
  `ativo`/`notificacao_ativa`; `<` estrito em todas as ocorrências; unidade em
  frascos; docId determinístico; `ALREADY_EXISTS` como única duplicidade.
  **0 findings.** Contador = 2.
- **Auditoria 3.** Foco em fronteiras, estados e registros: estado/worklog
  coerentes (`M8 = DOCUMENTATION_VALIDATED`, nenhuma HQ); arquivos proibidos
  inalterados; divergências de implementação M8-F07..F10 registradas; nenhuma
  feature declarada implementada por pseudocódigo. **0 findings.** Contador = 3.

Três passadas limpas consecutivas: critério satisfeito.

## 22. Estado final

```text
M0–M7 = VALIDATED
M8    = DOCUMENTATION_VALIDATED
M9+   = NOT_STARTED
```

Nenhuma HQ bloqueante; dívidas de implementação M8-F07..F10 registradas.

## 23. Próxima ação permitida

Formalização executável de M8 em rodada separada
(CUE → IR → Alloy → receipt → Rust → LaTeX → PDF). Não iniciar M9 nesta linha.

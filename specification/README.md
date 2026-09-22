# Especificação formal LCQUI

Camada aditiva à UI `frontend/`, backend `functions/` e Firestore. M0/M1 foram
validados historicamente contra `db29ea2f17dc785fb0b44ffb3aec16db29c45e94`,
evidência 3B `9d97ed30`. O baseline documental de entrada M2 é
`9df335bc977bfcf16668bca4baf5f9ed50c2da1a`, após as auditorias documentais.
A proveniência executável foi migrada em M2.3: o IR passou a declarar
proveniência estruturada (`baseline_historico_m0_m1` = `db29ea2f` e
`baseline_documental_m2` = `9df335bc`), validada por `main.rs`. M3 acrescenta
`baseline_documental_m3` = `158cb91f`. A distinção
evita reduzir histórias documentais distintas a um único SHA. Detalhes e
contraexemplo de identidade no
[worklog M2.0](../documentation/archive/formal-spec/M2_0_BASELINE_RECONCILIATION.md).
Comece por [estado de continuidade](../FORMAL_SPEC_STATE.md).

M0 cobre somente três dimensões de Frasco_Reagente, filtro físico de retirada e
unicidade em uma transição atômica abstrata. Não certifica autorização completa,
validade, Firestore ou concorrência real. M2.1d modela o Frasco completo no CUE;
M2.2 modela identidade e coerência de estado em Alloy; M2.3 migra o Frasco
completo e a evidência M2.2 para o IR/gerador. M2.4 acrescenta composição
aditiva em um único universo e integração dos fragmentos ao `main.tex`.
M3 modela o registro completo de Emprestimo_Reagente (33 colunas) e o ciclo de
vida abstrato do status; M4–M12 não migrados.

Na raiz, com CUE 0.17.1, Alloy 6.2.0, Node, Rust, just e TeX Live no PATH:

```sh
just spec-check
just docs-generate
just formal-check
```

`docs-generate` recalcula CUE/Alloy antes de renderizar; `formal-check` verifica
stale sem regenerar .tex. Resultados intermediários versionados em `build/`;
saída mecânica em `documentation/generated/`. O PDF de build fica em
`build/latex/main.pdf`; só copiar após inspeção visual, conforme guia documental.
Nenhum comando faz deploy ou altera a aplicação.

## Ampliação M1

M1 acrescenta registros normalizados de Resumo_Reagente e Especificacao_Reagente,
com enums, nulabilidade explícita, limites de texto/escala, frequência condicional
e validação de um par resumo/especificação. As projeções Firestore estão descritas
como notas de mapeamento; composição e schema completo dos documentos ficam para
continuidade. `just spec-check` valida todos os grupos. O Alloy M0 continua
preservado; M2.2 acrescenta `bottle_identity.als` e `bottle_state.als`, cujos
resultados ficam em `build/formal-validation-m2.json`, validados pelo gerador.

## Ampliação M2.3

O IR v3 transporta a projeção `frasco_reagente_m2` (Frasco completo, 29 colunas,
derivada de `frascoCompletoCampos`) ao lado da fatia M0 histórica, sem duplicar
o schema. O gerador 0.2.0 mantém byte a byte os fragmentos M0/M1 e acrescenta:

- `generated/entities/frasco_reagente_m2.tex` (registro relacional completo);
- `generated/invariants/frasco_reagente_m2.tex` (evidência Alloy M2.2).

Os fragmentos M2 são incluídos em `Formal-Spec-M2.tex`, após M1 no `main.tex`.
O `MANIFEST.json` vincula IR, evidência M0, M2.2 e M2.4. Os receipts standalone
continuam separados e preservados.

## Composição M2.4

`bottle_composition.als` reúne identidade, estado M2 e empréstimos ativos M0
no mesmo Frasco/EstadoIntegrado. `tools/formal/composition.mjs` confere os
predicados de origem após renomes explícitos e fixa os comandos/scopes esperados.
`alloy-check` executa scopes 4 e 6 e grava `build/formal-validation-m24.json`,
incluindo hashes do modelo composto e das três origens. Rust `validation_m24`
valida o contrato exato antes de gerar
`generated/invariants/frasco_reagente_m2_composed.tex`. A nova chave do manifest
é `formal_validation_m24_sha256`. IR v3/CUE de 29 campos permanecem inalterados.

Retirada é o recorte M0 sem abertura; esgotamento é efeito abstrato, não toda a
devolução. Extravio/esgotamento encerram apenas a custódia do alvo. Checks
UNSAT não são provas universais nem certificam Firebase, RBAC, Q06, concorrência
ou idempotência. M3 permanece separado. Ver o
[worklog M2.4](../documentation/worklogs/formal-spec/M2_4_COMPOSITION_INTEGRATION.md).

## M3

M3 formaliza `Emprestimo_Reagente`: `domain/emprestimo_reagente.cue` traz
`emprestimoReagenteCampos` (33 colunas) e `#EmprestimoReagente`, com enums,
nulabilidade, NUMERIC(10,3)/(10,5), VARCHAR(100) e constraints locais
intrínsecas (densidade condicional, bundle de anomalia e de encerramento
extraordinário). A paridade Seção 4 × CUE é verificada por
`tools/formal/check.mjs`. `alloy/reagents/loan_state.als` formaliza o ciclo de
vida (ativos = `EM_USO`/`ATRASADO`, encerrados não reabrem, unicidade ativa por
frasco); a evidência fica em `build/formal-validation-m3.json`, validada por
`validation_m3.rs`. O IR v3 acrescenta a projeção `emprestimo_reagente` e o
gerador emite `entities/emprestimo_reagente.tex` e
`invariants/emprestimo_reagente.tex`, integrados em `Formal-Spec-M3.tex`.
M3 NÃO cobre retirada/devolução completas (M4), extravio/reencontro (M5) nem
Q06/tara (M6).

## M4

`alloy/reagents/withdrawal_return.als` compõe Frasco (M2.4) e Emprestimo (M3) no
mesmo universo. `coerenteM4` reúne a coerência do frasco, a unicidade ativa e a
equivalência `disponibilidade = EMPRESTADO <=> exatamente um empréstimo ativo`.
A retirada cria um empréstimo `EM_USO` com o frasco `EMPRESTADO` e a devolução
sempre encerra a custódia (normal, atraso, anomalia), com vazio e destinos de
vencido coerentes. A evidência fica em `build/formal-validation-m4.json`,
validada por `validation_m4.rs`; o guard de drift em
`tools/formal/withdrawal_return.mjs` compara as regras reproduzidas com as
origens. O CUE/IR não mudam. M4 NÃO cobre Q06/tara (M6),
extravio/reencontro/quarentena completos (M5), idempotência (M7) nem RBAC (M9).

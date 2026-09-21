# Especificação formal LCQUI

Camada aditiva à UI `frontend/`, backend `functions/` e Firestore. M0/M1 foram
validados historicamente contra `db29ea2f17dc785fb0b44ffb3aec16db29c45e94`,
evidência 3B `9d97ed30`. O baseline documental de entrada M2 é
`9df335bc977bfcf16668bca4baf5f9ed50c2da1a`, após as auditorias documentais.
A proveniência executável foi migrada em M2.3: o IR passou a declarar
proveniência estruturada (`baseline_historico_m0_m1` = `db29ea2f` e
`baseline_documental_m2` = `9df335bc`), validada por `main.rs`. A distinção
evita reduzir histórias documentais distintas a um único SHA. Detalhes e
contraexemplo de identidade no
[worklog M2.0](../documentation/archive/formal-spec/M2_0_BASELINE_RECONCILIATION.md).
Comece por [estado de continuidade](../FORMAL_SPEC_STATE.md).

M0 cobre somente três dimensões de Frasco_Reagente, filtro físico de retirada e
unicidade em uma transição atômica abstrata. Não certifica autorização completa,
validade, Firestore ou concorrência real. M2.1d modela o Frasco completo no CUE;
M2.2 modela identidade e coerência de estado em Alloy; M2.3 migra o Frasco
completo e a evidência M2.2 para o IR/gerador. M2 não está integrado ao
`main.tex`; a composição M0 e M2.2 permanece para M2.4. M3–M12 não migrados;
ampliação M1 descrita abaixo.

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

Os fragmentos M2 ainda não são incluídos em `main.tex`. O `MANIFEST.json` vincula
IR, evidência M0 e evidência M2.2. Os módulos M0 e M2.2 são verificados
separadamente; a composição M0 e M2.2 permanece para M2.4.

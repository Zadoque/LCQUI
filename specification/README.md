# Especificação formal LCQUI

Camada aditiva à UI `frontend/`, backend `functions/` e Firestore. M0/M1 foram
validados historicamente contra `db29ea2f17dc785fb0b44ffb3aec16db29c45e94`,
evidência 3B `9d97ed30`. O baseline documental de entrada M2 é
`9df335bc977bfcf16668bca4baf5f9ed50c2da1a`, após as auditorias documentais.
O antigo apontamento isolado deste README para `10c86c00` não migrou a
proveniência executável: `projection.cue` e `main.rs` ainda usam `db29ea2f`.
A migração desse contrato terá checkpoint próprio antes da exportação M2.
Detalhes e contraexemplo de identidade no
[worklog M2.0](../documentation/archive/formal-spec/M2_0_BASELINE_RECONCILIATION.md).
Comece por [estado de continuidade](../FORMAL_SPEC_STATE.md).

M0 cobre somente três dimensões de Frasco_Reagente, filtro físico de retirada e
unicidade em uma transição atômica abstrata. Não certifica autorização completa,
validade, Firestore ou concorrência real. M2–M12 ainda não migrados; ampliação M1 descrita abaixo.

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
continuidade. `just spec-check` valida todos os grupos. IR v2 e gerador 0.2.0
mantêm os fragmentos M0; Alloy ainda verifica apenas as propriedades M0.

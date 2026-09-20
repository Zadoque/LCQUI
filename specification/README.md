# Especificação formal LCQUI

Camada aditiva à UI `frontend/`, backend `functions/` e Firestore. O baseline 3B
é `10c86c001e35efc0c5338e581a89819a0ff59646`, evidência `9d97ed30`.
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

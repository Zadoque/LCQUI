# Especificação formal LCQUI

Camada aditiva à UI `frontend/`, backend `functions/` e Firestore. O baseline 3B
é `db29ea2f17dc785fb0b44ffb3aec16db29c45e94`, evidência `9d97ed30`.
Comece por [estado de continuidade](../FORMAL_SPEC_STATE.md).

M0 cobre somente três dimensões de Frasco_Reagente, filtro físico de retirada e
unicidade em uma transição atômica abstrata. Não certifica autorização completa,
validade, Firestore ou concorrência real. M1–M12 ainda não migrados.

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

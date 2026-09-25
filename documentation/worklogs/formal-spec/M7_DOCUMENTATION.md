# M7 — Idempotência (documentação)

Estado: **DOCUMENTATION_VALIDATED**. Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `f6032a6082bc790d3a8b243970b6355f808f8875`
(`docs(pre-m7): record reconciliation and confirm M7 entry`), árvore limpa.

Esta rodada é **exclusivamente documental**. NÃO altera `frontend/`, `functions/`,
`specification/`, `tools/`, Rules, IR, receipts nem `documentation/generated/`.
O código TypeScript dentro do LaTeX é especificação ilustrativa e foi corrigido.

## Objetivo

Um contrato global, explícito e não contraditório de idempotência, distinguindo:
retry da mesma intenção ≠ nova intenção ≠ evento duplicado ≠ execução
concorrente ≠ reexecução de job ≠ reconstrução de materialização.

## Contrato global (Seção 7)

Taxonomia (comando, evento, unicidade, lock, materialização); identidade de
comando `(uid, tipo_operacao, payload_hash)`; `idOperacao` (formato, criação,
reutilização em retry, novo id só em nova intenção); canonicalização
determinística `hashPayload(tipoOperacao, payload)` com `canonicalize` recursivo
(ordena objetos, preserva arrays, null ≠ ausente, undefined ≡ ausente, sem
normalização de domínio); estados `PENDENTE`/`CONCLUIDA`/`FALHOU` com semântica
(comando atômico grava direto `CONCLUIDA`; fluxo com etapa externa usa
`PENDENTE`→`CONCLUIDA`); concorrência; efeitos externos pós-commit; triggers
(dedup por `eventId`, ``efeito observado único'', não exactly-once); jobs;
notificações/etiquetas/materializações; relação com M5/M6; hash não é segurança.
Matriz de 24 casos.

## Findings

| ID | Categoria | Descrição | Resolução |
|---|---|---|---|
| M7-F01 | `CONTRADICAO_DOCUMENTAL` | Vários exemplos comparavam apenas `uid + payload_hash`, sem `tipo_operacao` (extravio, recalibrar, descartar, quarentena, resolver, corrigir, revogação). | Todos passaram a comparar `uid + tipo_operacao + payload_hash`. |
| M7-F02 | `CONTRADICAO_DOCUMENTAL` | Canonicalização divergente: uns usavam `JSON.stringify(payload, Object.keys(payload).sort())` (replacer de array, inseguro para aninhados e com perda de campos), outros `JSON.stringify` sem ordenar. | Unificada em `hashPayload`/`canonicalize` (Seção 7); todas as ocorrências substituídas. |
| M7-F03 | `LACUNA_DE_DOMINIO` | `PENDENTE/CONCLUIDA/FALHOU` declarados sem semântica; exemplos atômicos só criavam `CONCLUIDA`. | Definida a semântica; comandos atômicos gravam `CONCLUIDA` na mesma transação; workflows externos usam `PENDENTE`→`CONCLUIDA`. |
| M7-F04 | `LACUNA_DE_DOMINIO` | Rotas M6 `repetirPesagemDevolucaoAnomala` e `confirmarEsgotamentoAposInspecao` só tinham comentário de idempotência, sem implementação. | Adicionada a checagem/gravação de `Operacoes` no contrato global, sem alterar a metrologia. |
| M7-F05 | `CONTRADICAO_DOCUMENTAL` | Revogação (`desvincularGestorAlmoxarifado`) retornava por `uid` apenas e não persistia `payload_hash`. | Passou a usar identidade completa e a persistir `tipo_operacao`+`payload_hash`. |
| M7-F06 | `CONTRADICAO_DOCUMENTAL` | Geração de etiquetas tinha `idOperacao` opcional com fallback `op_etiquetas_${Date.now()}` (inútil após resposta perdida). | `idOperacao` obrigatório; workflow `PENDENTE`→`CONCLUIDA` com objeto de caminho determinístico por `idOperacao`. |
| M7-F07 | `TRADUCAO_DOCUMENTAL_INCORRETA` | Seção 5 afirmava converter at-least-once em ``processing exactly-once''. | Reescrito: o **efeito observado** por `eventId` é deduplicado; infraestrutura não é exactly-once. |
| M7-F08 | `LACUNA_DE_DOMINIO` | `registrarRetirada`, `registrarDevolucao` e `registrarAberturaFrasco` não tinham idempotência. | Adicionado `idOperacao` obrigatório e o contrato global, sem alterar a semântica de domínio. |
| M7-F09 | `ERRO_MECANICO` | Comentário ``idempotente: re-executar o mesmo chunk produz o mesmo estado'' sem distinguir update determinístico de histórico/contador. | Comentário precisado (update de campo é idempotente; histórico/contador/notificação exigiriam dedup por eventId). |
| M7-F10 | `DIVERGENCIA_IMPLEMENTACAO` | `functions/src/reagentes.ts` não implementa o contrato de idempotência (sem `Operacoes`, sem `idOperacao`, sem canonicalização). | Registrado como dívida de implementação; `functions/` não foi alterado. |

Nenhuma **HQ** foi aberta: todas as decisões são de engenharia de software, sem
escolha de política institucional.

## Decisões técnicas

- Identidade = `(uid, tipo_operacao, payload_hash)`; comparação dos três campos.
- `payload_hash = SHA-256(tipo_operacao + "\n" + canonicalize(payload))`; `idOperacao` excluído.
- Arrays preservam ordem; `null` ≠ ausente; `undefined` ≡ ausente; sem trim/upper/arredondamento.
- Comando atômico = `CONCLUIDA` na transação; efeito externo = `PENDENTE`→`CONCLUIDA`/`FALHOU` com outbox/caminho determinístico.
- Triggers deduplicados por `eventId`; jobs por chave determinística (`create`) ou recomputação absoluta; materializações substituem, nunca somam.
- Etiquetas/PDF: `idOperacao` obrigatório, objeto determinístico.
- Idempotência ≠ concorrência ≠ unicidade ≠ lock.

## Fronteiras

- **M8 (estoque)**: não redesenha escassez/cache; apenas registra que reexecução
  não acumula.
- **M9 (autorização)**: identidade autenticada no servidor, sem novo papel.
- Formalização executável de M5/M6/M7 (CUE/Alloy/Rust) permanece dívida futura.

## Arquivos alterados

- `documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex` — contrato global M7 + matriz.
- `documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex` — `Operacoes`, `Eventos_Processados`, materializações.
- `Section-10-Subsection-4-Revogacao-de-Papel.tex`, `-5-Fluxo-de-Reagentes.tex`, `-8-...Patrimoniais.tex`, `-9-...PDF.tex`, `-10-...planejamento.tex`.
- `documentation/main.pdf` (recompilado).
- `documentation/STATUS_ATUAL.md`, `FORMAL_SPEC_STATE.md`.

## Validações

- `git diff --check`: PASS.
- Build LaTeX (TeX Live/Nix; `just` indisponível): exit 0, **341 páginas**, zero
  erros e zero referências indefinidas; overfulls preexistentes contabilizados.
- Inspeção Poppler: contrato M7 (p.127), canonicalização (p.128), matriz (p.131),
  revogação (p.190), etiquetas (p.286) e exemplos de retirada/devolução.
- Três auditorias integrais consecutivas sem nova inconsistência (seção abaixo).

## Auditoria de fechamento (3 passadas limpas)

Passada 1: 0 exemplo sem `tipo_operacao`; 0 canonicalização divergente; 0
`idOperacao` opcional; 0 efeito externo em callback; 0 `Date.now` como chave; 14
escritas de `Operacoes` com `payload_hash`. Limpa.
Passada 2: idem, incluindo retirada/devolução/abertura e rotas M6. Limpa.
Passada 3: idem + revisão de jobs/triggers/materializações/etiquetas. Limpa.

## Estado final

```text
M0–M4 = VALIDATED
M5 = DOCUMENTATION_VALIDATED
M6 = DOCUMENTATION_VALIDATED
M7 = DOCUMENTATION_VALIDATED
M8 = NOT_STARTED
```

PRÓXIMA AÇÃO EXATA: `INICIAR M8 DOCUMENTAL` (não iniciada nesta rodada).

## Commits

`7e3b70d2` (contrato global, Seções 7/5), `bb59a85f` (exemplos, Seção 10),
`f1d9ab54` (`main.pdf`). HEAD de saída = commit documental imediatamente
posterior ao do PDF (`f1d9ab54` + 1), resolvido com
`git log -1 --format=%H --grep="validate and close M7"`.

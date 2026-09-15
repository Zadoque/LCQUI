# M0 — Evidência de validação

Baseline funcional `db29ea2f17dc785fb0b44ffb3aec16db29c45e94`, evidência `9d97ed30`.
Fatia: três dimensões de Frasco_Reagente e transição abstrata de retirada.

| Gate | Resultado |
|---|---|
| CUE fmt/vet/export, 2 fixtures válidas e 5 inválidas | PASS |
| Alloy 6.2.0, SAT4J, scope 4, exatamente 2 Estado | 2 checks UNSAT, 2 testemunhas SAT |
| Rust fmt, 2 testes, clippy -D warnings | PASS |
| Manifest e entradas vinculados por SHA-256 | PASS |
| Alteração deliberada de .tex em cópia /tmp | --check rejeita stale |
| Duas gerações em cópia /tmp comparadas recursivamente | Bytes idênticos |
| just formal-check | PASS (exit 0) |
| TypeScript functions, tsc --noEmit | PASS |
| TypeScript frontend, tsc --noEmit --incremental false | FAIL preexistente: page.tsx:524, tipoSubstanciaResumo não existe em ModalProps |
| Jest functions, src/__tests__/domain | 9/10 PASS; roles.test espera mensagem distinta para Bolsista/Gestor sem Aluno |
| Diff de aplicação/configuração/worklogs 3B contra baseline | Vazio |

## Limites

Não se realizou deploy, reauditoria, mudança normativa ou teste Firebase Emulator.
Os erros da aplicação ocorrem em fontes idênticas ao baseline e não são resultados
Alloy. Não afirmar homologação operacional completa a partir do gate formal.
CI hospedada ainda não conectada; `just formal-check` é o gate executável para
um ambiente provisionado. Expansão de schema, contratos completos e concorrência
estão fora de M0.

## PDF

Compilação via TeX Live Nix existente, latexmk 4.87, conforme
`documentation/COMPILACAO_NIX_LCQUI.md`. Build integrado em `build/latex`.
Primeira compilação: 213 páginas, exit 0, sem referências indefinidas; inspeção
visual das páginas 212–213. Detectado Overfull novo no caminho longo do manifest;
corrigido na seção humana e submetido a nova compilação/inspeção antes da cópia.
Logs locais: `/tmp/lcqui-formal-check.log`, `/tmp/lcqui-formal-final-build.log`;
log final LaTeX: `build/latex/main.log`. Reexecutar gates; esses logs não são
necessários para retomar, pois resultados e comandos estão registrados aqui.

Build final: exit 0, 213 páginas, zero erros/referências indefinidas, 21 Overfulls
(mesma quantidade do log versionado do baseline; nenhum no trecho M0). Páginas
212–213 renderizadas novamente com Poppler e aprovadas visualmente. PDF final
copiado de `build/latex/main.pdf` para `documentation/main.pdf` após a revisão.

## Retomada e fechamento do M0

As falhas preexistentes foram reproduzidas, diagnosticadas e resolvidas em
`d13d25d3`. Detalhes e justificativa em [M0_BASELINE_DIAGNOSIS.md](M0_BASELINE_DIAGNOSIS.md).

- TypeScript frontend e functions: PASS.
- Jest domain: 2 suítes e 12 testes PASS.
- `just formal-check`: PASS; CUE, Alloy, Rust e stale reexecutados. latexmk
  confirmou o PDF atualizado; fontes LaTeX e PDF publicado não mudaram.
- Diff de aplicação agora contém somente uma prop não consumida removida e
  fixtures de papéis separadas por regra. A lógica de backend e o baseline
  documental permanecem intactos.

M0: **VALIDATED** no escopo descrito. M1: **NOT_STARTED**. Isso não constitui
homologação ponta a ponta ou certificação Firebase Emulator; esses testes
continuam em etapas futuras. Os resultados iniciais de falha acima são histórico,
não pendências atuais.

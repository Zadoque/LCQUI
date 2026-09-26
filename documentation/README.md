# Documentação LCQUI

Mapa curto da documentação. A autoridade corrente sobre o comportamento
esperado do sistema é a documentação normativa em
[`main.tex`](main.tex) → [`main.pdf`](main.pdf).

## Navegação

- [`main.tex`](main.tex) / [`main.pdf`](main.pdf) — documento humano
  consolidado (Seções 1–12 + capítulos `Formal-Spec-M0..M13`).
- [`STATUS_ATUAL.md`](STATUS_ATUAL.md) — estado corrente e histórico por
  milestone.
- [`COMPILACAO_NIX_LCQUI.md`](COMPILACAO_NIX_LCQUI.md) — compilação LaTeX
  (Nix, logs e inspeção).
- [`worklogs/formal-spec/`](worklogs/formal-spec/) — cadeia formal M0–M13;
  encerramento global em
  [`GLOBAL_FORMAL_CLOSURE.md`](worklogs/formal-spec/GLOBAL_FORMAL_CLOSURE.md).
- [`../FORMAL_SPEC_STATE.md`](../FORMAL_SPEC_STATE.md) — ponto de retomada da
  especificação formal.
- [`archive/`](archive/README.md) — documentação histórica (pré-formal e
  formal-spec), não normativa.

A futura matriz de implementação, baseada na especificação formal encerrada,
será criada em `MATRIZ_IMPLEMENTACAO_LCQUI.md` (ainda não existe nesta rodada).
A matriz antiga está preservada em
[`archive/pre-formal/MATRIZ_IMPLEMENTACAO_LCQUI_2026-09-13.md`](archive/pre-formal/MATRIZ_IMPLEMENTACAO_LCQUI_2026-09-13.md).

Os capítulos formais incluem fragmentos mecânicos de
[`generated/`](generated/); não editar esses fragmentos manualmente.

## Compilação

Na raiz:

```sh
nix shell nixpkgs#texliveFull nixpkgs#just -c just docs-generate
nix shell nixpkgs#texliveFull nixpkgs#just -c just formal-check
```

CUE 0.17.1, Alloy 6.2.0, Node e Rust também devem estar disponíveis.
`formal-check` compila em `build/latex`, sem sobrescrever o PDF publicado. Após
revisar o log final e as páginas alteradas, copiar `build/latex/main.pdf` para
`documentation/main.pdf`. Para build isolado manual, use o comando `latexmk` do
[guia de compilação](COMPILACAO_NIX_LCQUI.md). `generated/` é reprodutível byte
a byte; o PDF humano mantém `\today` e não promete identidade binária entre
datas/versões TeX Live diferentes.

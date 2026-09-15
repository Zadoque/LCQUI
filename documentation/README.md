# Documentação LCQUI

`main.tex` continua reunindo o conteúdo humano existente. A adição M0 está em
`Formal-Spec-M0.tex`, que inclui fragmentos mecânicos de `generated/`. Não editar
esses fragmentos manualmente. Os worklogs da Fase 3B permanecem intactos.

O procedimento completo de Nix, logs e inspeção visual está em
[COMPILACAO_NIX_LCQUI.md](COMPILACAO_NIX_LCQUI.md).

Na raiz:

```sh
nix shell nixpkgs#texliveFull nixpkgs#just -c just docs-generate
nix shell nixpkgs#texliveFull nixpkgs#just -c just formal-check
```

CUE 0.17.1, Alloy 6.2.0, Node e Rust também devem estar disponíveis. `formal-check`
compila em `build/latex`, sem sobrescrever o PDF publicado. Após revisar log final
e páginas alteradas, copiar `build/latex/main.pdf` para `documentation/main.pdf`.
Para build isolado manual use o comando latexmk do guia existente. Generated é
reprodutível byte a byte; o PDF humano mantém `\today` e não promete identidade
binária entre datas/versões TeX Live diferentes.

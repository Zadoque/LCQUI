# Documento de verificação

Este documento é independente de `documentation/main.tex` e não redefine o
contrato normativo do LCQUI.

Compile somente este documento, a partir da raiz do repositório:

```bash
nix shell nixpkgs#texliveFull -c \
  latexmk -cd -pdf -interaction=nonstopmode -halt-on-error \
  -outdir=/tmp/lcqui-testes-tex documentation/testes/main.tex
```

Após revisar o resultado, copie o PDF aprovado para
`documentation/testes/main.pdf`. Arquivos auxiliares permanecem em `/tmp`.

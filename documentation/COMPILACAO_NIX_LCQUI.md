# Compilar a documentação LaTeX do LCQUI

O arquivo principal é `documentation/main.tex`; ele inclui as doze seções `Section-*.tex`. O `flake.nix` da raiz fornece ferramentas da aplicação, mas **não inclui TeX Live**. O guia antigo descrevia um flake de LaTeX externo como se fosse o deste repositório.

Com TeX Live e latexmk disponíveis, execute a partir da raiz:

```sh
mkdir -p /tmp/lcqui-tex-build
cd documentation
latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-build main.tex
```

Em Nix, um ambiente dedicado pode fornecer as ferramentas:

```sh
nix shell nixpkgs#texliveFull nixpkgs#latexmk
```

Fixe a revisão de nixpkgs no ambiente institucional para builds reproduzíveis; o comando acima usa a referência configurada no computador. Se houver apenas pdflatex, execute passagens sucessivas até que não haja aviso de referências/rótulos alterados. Saída: `/tmp/lcqui-tex-build/main.pdf`. Isso evita modificar auxiliares e PDF versionados durante a validação.

Verifique erros, referências indefinidas, páginas/tabelas cortadas e avisos de overflow. A compilação prova consistência sintática do documento; não valida implementação nem políticas de negócio. Para entregar o PDF atualizado, copie apenas o PDF final revisado para `documentation/main.pdf`.

Revisão de 11/09/2026: foi utilizado TeX Live já disponível no Nix store, sem instalação ou mudança do flake. Resultado final registrado em STATUS_ATUAL.md.

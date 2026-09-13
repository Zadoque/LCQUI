# Compilar a documentação LaTeX do LCQUI

O principal é `documentation/main.tex`. O `flake.nix` da raiz fornece ferramentas da aplicação, **não TeX Live**. Não presumir que `nix develop` disponibiliza compilador LaTeX ou Python.

## Ambiente correto

`texliveFull` já inclui `latexmk` e `pdflatex`. **Não adicionar `nixpkgs#latexmk`**: esse atributo não existe na revisão Nix utilizada nesta sessão.

A partir da raiz do repositório, verificar primeiro:

```sh
nix shell nixpkgs#texliveFull -c latexmk -v
```

Se houver bloqueio de acesso ao daemon Nix pelo sandbox, solicitar escalonamento para o mesmo comando. Isso é problema de permissão do ambiente, não erro do documento. Não repetir o comando sem resolver a permissão. Não alterar o flake da aplicação só para compilar documentação.

## Build isolado, a partir da raiz

```sh
nix shell nixpkgs#texliveFull -c latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-final documentation/main.tex > /tmp/lcqui-final-build.log 2>&1
```

`-cd` faz latexmk entrar no diretório do arquivo principal, permitindo resolver os `input` relativos. O diretório de saída é absoluto. Alternativa equivalente: entrar em `documentation` e executar o mesmo comando sem `-cd`, passando somente `main.tex`.

Para rodadas independentes, trocar o diretório de saída e o log por nomes distintos: `/tmp/lcqui-tex-a`, `/tmp/lcqui-tex-b`, `/tmp/lcqui-tex-c`, `/tmp/lcqui-tex-d`. A compilação inicial desta sessão usou `/tmp/lcqui-tex-baseline`.

## Reutilização do ambiente já disponibilizado

Para descobrir os caminhos reais:

```sh
nix shell nixpkgs#texliveFull -c sh -c 'command -v latexmk; command -v pdflatex'
```

Nesta sessão de 13/09/2026, ambos estão em:

```text
/nix/store/hl0dgwqvnh7ls66xn4hmdxay7alrviy3-texlive-2025-r78234-final-env/bin
```

Esse caminho é evidência local, não contrato portável: conferir existência e redescobrir em outra máquina/revisão. Para reutilizá-lo nesta sessão:

```sh
PATH=/nix/store/hl0dgwqvnh7ls66xn4hmdxay7alrviy3-texlive-2025-r78234-final-env/bin:$PATH latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-final documentation/main.tex > /tmp/lcqui-final-build.log 2>&1
```

Adicionar o diretório completo ao PATH: latexmk invoca pdflatex e outras ferramentas. Não basta localizar apenas o executável latexmk. Fixar a revisão de nixpkgs no ambiente institucional para reprodução entre máquinas.

## Verificação obrigatória

1. Aguardar a conclusão do processo e registrar seu exit code; uma sessão ainda em execução não é resultado aprovado.
2. Exigir exit code 0 e conclusão de todos os alvos pelo latexmk.
3. Inspecionar o log **final** do compilador:

   ```sh
   rg -n '^!|LaTeX Error|undefined|Output written|Overfull' /tmp/lcqui-tex-final/main.log
   ```

   Nenhum erro ou referência indefinida pode permanecer. Avisos de `LastPage` na primeira passagem podem desaparecer nas passagens seguintes; não avaliar só o log agregado inicial. `rg` retorna 1 quando não encontra correspondências, o que não significa falha de compilação.
4. Executar `git diff --check` e inspecionar visualmente as páginas alteradas, especialmente tabelas, caixas de entidade e listagens. Registrar avisos tipográficos remanescentes sem escondê-los.
5. Copiar `/tmp/lcqui-tex-final/main.pdf` para `documentation/main.pdf` **somente depois do build final aprovado e da inspeção visual**. Builds intermediários não atualizam o PDF versionado.

Compilação verifica sintaxe e referências documentais; não prova implementação, segurança das Rules, política de domínio ou homologação. Resultados de cada rodada ficam no relatório/status, sem reutilizar sucesso histórico como validação atual.

## Evidência desta sessão

- Tentativa com `nixpkgs#latexmk`: falhou por atributo inexistente; comando corrigido para apenas `nixpkgs#texliveFull`.
- Acesso inicial ao daemon Nix: bloqueado no sandbox; resolvido por escalonamento autorizado.
- TeX Live disponibilizado: latexmk 4.87.
- Build inicial aprovado: 164 páginas, exit 0, sem referências indefinidas no log final.
- Rodadas A e B aprovadas: 166 e 167 páginas; rodada C aprovada: 171 páginas. Não confundir avisos de primeiras passagens com falhas finais.

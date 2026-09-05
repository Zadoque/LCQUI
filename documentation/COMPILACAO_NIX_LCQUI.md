Manual Técnico

# **Compilação do Projeto LCQUI com Nix**

Guia prático para compilar o arquivo mestre modular `main.tex` utilizando o ambiente reprodutível definido no seu `flake.nix`.

---

### 1\. O Arquivo `flake.nix` do Ambiente

O seu `flake.nix` fornece um ambiente hermético e completo via **`texliveFull`** (que já inclui `pdflatex`, `biber`, `latexmk` e todas as bibliotecas do CTAN, como `tcolorbox`, `longtable` e `babel-portuges`):

{

  description \= "Ambiente de desenvolvimento LaTeX";

  inputs \= {

    nixpkgs.url \= "github:NixOS/nixpkgs/nixos-unstable";

  };

  outputs \= { self, nixpkgs }:

    let

      supportedSystems \= \[ "x86\_64-linux" "aarch64-linux" "x86\_64-darwin" "aarch64-darwin" \];

      forEachSystem \= nixpkgs.lib.genAttrs supportedSystems;

    in

    {

      devShells \= forEachSystem (system:

        let

          pkgs \= import nixpkgs { inherit system; };

        in

        {

          default \= pkgs.mkShell {

            packages \= with pkgs; \[

              \# \--- Core do LaTeX \---

              \# O texliveFull já inclui pdflatex, biber, latexmk e todos os pacotes do CTAN.

              texliveFull

              \# \--- Integração com Editores \---

              texlab        \# Language Server Protocol (LSP) para LaTeX

            \];

            shellHook \= ''

              echo "✍️ Ambiente LaTeX carregado com sucesso\!"

              echo "Comandos úteis disponíveis: pdflatex, lualatex, latexmk, biber"

              tex \--version | head \-n 1

            '';

          };

        }

      );

    };

}

---

### 2\. Como Executar a Compilação

Considerando a estrutura de pastas do seu terminal:

\~/latex/

├── flake.nix

└── LCQUI\_LaTeX\_Modular/

    ├── main.tex

    ├── Section-1-Introducao.tex

    └── ... (demais seções)

**Método 1: Modo Interativo (Recomendado)**

Ideal para quando você está editando o documento e quer compilar várias vezes consecutivas sem recarregar o ambiente.

**Passo 1:** No terminal, navegue até a pasta onde está o `flake.nix` e ative o ambiente:

cd \~/latex

nix develop

*(Você verá a mensagem do hook: `✍️ Ambiente LaTeX carregado com sucesso!`)*

**Passo 2:** Entre na pasta do projeto e dispare a compilação:

cd LCQUI\_LaTeX\_Modular

pdflatex \-interaction=nonstopmode main.tex && pdflatex \-interaction=nonstopmode main.tex

**Passo 3:** Quando terminar seus trabalhos, saia da shell do Nix:

exit

---

**Método 2: Execução Direta em Linha Única (One-Liner)**

Executa o ambiente do Nix, compila o PDF e encerra automaticamente sem manter uma sub-shell aberta.

A partir de `~/latex`:

nix develop . \--command bash \-c "cd LCQUI\_LaTeX\_Modular && pdflatex \-interaction=nonstopmode main.tex && pdflatex \-interaction=nonstopmode main.tex"

Ou se você já estiver dentro da pasta `LCQUI_LaTeX_Modular` (referenciando o flake no diretório pai):

nix develop .. \--command bash \-c "pdflatex \-interaction=nonstopmode main.tex && pdflatex \-interaction=nonstopmode main.tex"

---

**Método 3: Via `nix-shell` tradicional (ad-hoc)**

Caso queira usar o utilitário clássico `nix-shell` diretamente sem invocar flakes:

Dentro da pasta `LCQUI_LaTeX_Modular`:

nix-shell \-p texliveFull \--run "pdflatex \-interaction=nonstopmode main.tex && pdflatex \-interaction=nonstopmode main.tex"

---

### 3\. Entendendo o Comando de Compilação

O comando utilizado foi:

pdflatex \-interaction=nonstopmode main.tex && pdflatex \-interaction=nonstopmode main.tex

| Componente | Função Técnica |
| ----- | ----- |
| `pdflatex` | O binário do compilador que processa os comandos LaTeX e gera diretamente o arquivo `main.pdf`. |
| `-interaction=nonstopmode` | Faz o compilador continuar processando o documento mesmo se encontrar avisos ou advertências menores, sem congelar o terminal aguardando a tecla `Enter` do usuário. |
| `main.tex` | O arquivo raiz que contém o preâmbulo, os pacotes, a capa e todas as inclusões modulares `\input{Section-*.tex}`. |
| `&&` | Operador condicional do shell: só executa a segunda compilação se a primeira tiver sido concluída com sucesso (código de retorno `0`). |

**Por que são necessárias duas passagens consecutivas?**

* **1ª Passagem:** O compilador analisa a estrutura do texto e grava em arquivos auxiliares (`main.aux`, `main.toc`) a lista de capítulos, seções, referências de rótulos (`\label` / `\ref`) e as dimensões parciais das colunas do `longtable`.  
* **2ª Passagem:** O compilador lê os arquivos auxiliares gravados na primeira passada para desenhar o **Sumário completo com os números de página exatos**, preencher o rodapé `página X de LastPage` e ajustar as quebras de linha nas tabelas contínuas.

---

### 4\. Dica Alternativa: Compilação com `latexmk`

Como o pacote `texliveFull` já inclui o utilitário **`latexmk`**, você também pode automatizar todo o ciclo em um único comando simplificado:

\# O latexmk detecta as alterações e executa automaticamente as passagens necessárias

latexmk \-pdf main.tex

Para fazer uma limpeza dos arquivos intermediários (`.aux`, `.log`, `.toc`, `.out`):

latexmk \-c  

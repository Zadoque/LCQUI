# VALIDACAO_LATEX — Consolidação Gemini Spark × LaTeX LCQUI

Registro de todas as compilações desta sessão. Cada lote requer build independente.

| Data/Hora | Lote | Commit | Comando | Exit code | Páginas | Erros LaTeX | Refs indefinidas | Avisos novos | Avisos preexistentes | git diff --check | Páginas inspecionadas | Observações |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-14T11:09 | Baseline desta sessão | e92544f3 | `nix shell nixpkgs#texliveFull -c latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-baseline-sep14 documentation/main.tex` | **0** | **185** | **0** | **0** | 1 (Overfull a +19=20 total) | 19 Overfull (herdados da sessão anterior) | limpo | Pendente inspeção visual lotes futuros | 185 págs vs 172 da sessão anterior — aumento esperado pelas adições do pull `e7b0bfe9` |
| 2026-09-14T11:27 | Lote 1 (Patrimônio e Espelhamento) | 5fa1e501 | `... latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-lote1e documentation/main.tex` | **0** | **189** | **0** | **0** | — | — | limpo | Sim | Lote 1 validado. Problemas de UTF-8 em lstlisting contornados com ASCII. |

## Regras

- Build anterior de outra sessão NÃO valida alterações desta sessão.
- Exit code 0 é condição necessária, não suficiente.
- Inspecionar visualmente páginas alteradas antes de atualizar `main.pdf`.
- `main.pdf` atualizado somente após aprovação do build final.
- Overfull são dívida tipográfica, não erros normativos.

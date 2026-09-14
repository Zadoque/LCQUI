# VALIDACAO_LATEX — Consolidação Gemini Spark × LaTeX LCQUI

Registro de todas as compilações desta sessão. Cada lote requer build independente.

| Data/Hora | Lote | Commit | Comando | Exit code | Páginas | Erros LaTeX | Refs indefinidas | Avisos novos | Avisos preexistentes | git diff --check | Páginas inspecionadas | Observações |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-14T11:09 | Baseline desta sessão | e92544f3 | `nix shell nixpkgs#texliveFull -c latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-baseline-sep14 documentation/main.tex` | **0** | **185** | **0** | **0** | 1 (Overfull a +19=20 total) | 19 Overfull (herdados da sessão anterior) | limpo | Pendente inspeção visual lotes futuros | 185 págs vs 172 da sessão anterior — aumento esperado pelas adições do pull `e7b0bfe9` |
| 2026-09-14T11:27 | Lote 1 (Patrimônio e Espelhamento) | 5fa1e501 | `... latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-lote1e documentation/main.tex` | **0** | **189** | **0** | **0** | — | — | limpo | Sim | Lote 1 validado. Problemas de UTF-8 em lstlisting contornados com ASCII. |
| 2026-09-14T11:44 | Lote 2 (Triggers, Permissões e Q06) | 198c86cc | `... latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-lote2 documentation/main.tex` | **0** | **191** | **0** | **0** | — | — | limpo | Sim | Lote 2 validado. |
| 2026-09-14T12:03 | Lote 2.1 (Fechamento de Contradições) | 820617a5 | `... latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-lote21 documentation/main.tex` | **0** | **192** | **0** | **0** | — | — | limpo | Sim (Págs de fluxo patrimonial, revogação, reagentes, dicionário) | Lote 2.1 validado; fecha PDFs 001, 002, 003, 007, 015, 016, 025. |
| 2026-09-14T12:33 | Lote 2.2a (PDF-002) | bafdd55f | `... latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-lote2-2a documentation/main.tex` | **0** | **192** | **0** | **0** | — | — | limpo | Sim (Revogação) | Lote 2.2a validado; corrigido escopo de variável `vinculos` em transação Firestore. |
| 2026-09-14T12:54 | Lote 2.2b (PDF-001) | 065176b7 | `... latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-lote2-2b documentation/main.tex` | **0** | **192** | **0** | **0** | — | — | limpo | Sim (Bens) | Lote 2.2b validado; removido reads após writes, normalizado chave de unicidade, backfill em Section 5. |
| 2026-09-14T13:02 | Lote 2.2c (PDF-003, PDF-016) | 9cec7da4 | `... latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-lote2-2c documentation/main.tex` | **0** | **195** | **0** | **0** | — | — | limpo | Sim (Convites, Triggers) | Lote 2.2c validado; resolvido UTF-8, convites refatorados, reconciliador absoluto com marca d'água. |
| 2026-09-14T13:03 | Lote 2.2 Final (PDF-025) | bc3f5602 | `... latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-lote2-2final documentation/main.tex` | **0** | **195** | **0** | **0** | — | — | limpo | Sim (Fluxo Q06) | Lote 2.2 concluído. |
| 2026-09-14T13:25 | Lote 2.2 Complemento V2 | 03f72169 | `... latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-lote2-2-complemento-v2 documentation/main.tex` | **0** | **196** | **0** | **0** | — | — | limpo | Sim (PDF-001, PDF-003, PDF-016) | Adicionados checks minuciosos aos PDFs 001, 003 e 016; compilado com sucesso. |
| 2026-09-14T13:48 | Lote 2.2 Complemento V3 | 43232157 | `... latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-lote2-2-complemento-v3 documentation/main.tex > ...` | **0** | **199** | **0** | **0** | — | — | limpo | Sim (PDF-001, PDF-003, PDF-016) | Resolvidos os 5 bloqueadores finais. Lock corrigido. Rejeições transacionais de dependências. Matrícula estrita. Contrato temporal explícito. Checkpoint independente semanticamente. Main.pdf atualizado. |

## Regras

- Build anterior de outra sessão NÃO valida alterações desta sessão.
- Exit code 0 é condição necessária, não suficiente.
- Inspecionar visualmente páginas alteradas antes de atualizar `main.pdf`.
- `main.pdf` atualizado somente após aprovação do build final.
- Overfull são dívida tipográfica, não erros normativos.

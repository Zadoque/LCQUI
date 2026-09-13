# Validação do realinhamento — 13/09/2026

## Compilações

Comando: latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-RODADA documentation/main.tex, com TeX Live no PATH conforme COMPILACAO_NIX_LCQUI.md.

| Build | Exit | Páginas | Erros | Referências indefinidas finais |
|---|---|---|---|---|
| Inicial (baseline) | 0 | 164 | 0 | 0 |
| A | 0 | 166 | 0 | 0 |
| B | 0 | 167 | 0 | 0 |
| C | 0 | 171 | 0 | 0 |
| D | 0 | 173 | 0 | 0 |
| Final | 0 | 172 | 0 | 0 |

PDF final copiado após inspeção visual das páginas 61, 143, 145 e 169. Avisos Overfull: 19; não são erros de compilação, permanecem como dívida tipográfica. diff --check aprovado.

## Nomes legados

Busca global com rg, excluindo dependências e artefatos: valor_composicao, estados_fisicos e DIDATICO_DEMONSTRACAO não persistem como campos/enum atuais nos .tex. Markdown conserva nomes de origem explicitamente como histórico da transformação. Código ainda usa valor_composicao em reagentes_base.ts e finalidade antiga em reagentes.ts, schemas/reagentes.schema.ts e testes; são divergências de implementação AUD-10/17/18/21, não migração executada. Assim, o critério literal de ausência global de nomes antigos no código ainda não está satisfeito; não declarar conformidade integral nem merge liberado.

## Limites

P1/P2/P3 aplicados à documentação não comprovam implementação funcional. AUD-01–04, AUD-07 e demais lacunas de código continuam rastreadas. Sem deploy, merge ou migração remota. Testes de código e preparação AUD-27 serão registrados ao término das fases seguintes.

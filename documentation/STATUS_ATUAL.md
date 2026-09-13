# Status atual do LCQUI

Revisão: 11/09/2026. Branch: `docs/realinhamento-especificacao-lcqui`.

## Entrega documental

- Planejamento de etiquetas e RN-ROLE-01–15 incorporados ao LaTeX, mantendo os Markdown de origem identificados como histórico.
- Seção 5.9 ampliada com dicionário de campos, tipos, obrigatoriedade, projeções e integridade.
- Seção 8 preservada e ampliada com contratos UI-01–13; seção 9 cobre ações de todos os papéis.
- Quatorze decisões pendentes, com três alternativas cada, em [DUVIDAS_DOCUMENTACAO_LCQUI.md](DUVIDAS_DOCUMENTACAO_LCQUI.md).
- Matriz, auditoria e contexto atualizados por evidência estática; percentuais e declarações de homologação sem comprovação foram retirados.

## Implementação

O projeto está parcial em relação aos contratos documentados. Prioridade: corrigir permissões excessivas, sincronização de identidade e caminhos divergentes de especificações; depois concluir invariantes, UI, consultas e E2E. Consulte os achados AUD-01–16 em [AUDITORIA_ATUALIZADA.md](AUDITORIA_ATUALIZADA.md) e RF/fluxos em [MATRIZ_IMPLEMENTACAO_LCQUI.md](MATRIZ_IMPLEMENTACAO_LCQUI.md).

## Validação desta entrega

Compilação concluída com `latexmk -pdf -interaction=nonstopmode -halt-on-error`, saída isolada em `/tmp/lcqui-tex-build`: PDF de 164 páginas atualizado em `documentation/main.pdf`, sem erros nem referências indefinidas. Permanecem 19 avisos tipográficos de caixas horizontais excedentes; amostras do dicionário e das telas foram inspecionadas visualmente. `git diff --check` passou para os arquivos desta entrega. A verificação estrutural confirmou 46 entidades, 15 regras RN-ROLE, 13 contratos UI, 35 fluxos e 14 perguntas com três opções cada. Testes funcionais não executados: esta entrega não altera código de aplicação, regras ou dados. Não houve deploy ou migração. Alterações locais preexistentes em logs e no arquivo de lock do PDF foram preservadas.

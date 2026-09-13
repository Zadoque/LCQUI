# Status atual do LCQUI

Revisão: 13/09/2026. Branch: `docs/realinhamento-especificacao-lcqui`.

## Entrega documental — rodada de realinhamento por blocos (13/09/2026)

- **Auditoria por blocos A–D concluída**: 22 novos achados (AUD-17–AUD-38) adicionados a `AUDITORIA_ATUALIZADA.md`, cobrindo Química/Almoxarifado (8), Patrimônio (4), Acadêmico/Turmas/Roteiros (6) e Governança/Multi-Role/Infra (4).
- **Fichário de dúvidas criado**: `DUVIDAS_PENDENTES_LCQUI.md` com 9 pendências subjetivas (DP-A01–DP-D02) que exigem decisão de stakeholder antes de alterar o LaTeX.
- **Plano de atualização criado**: `PLANO_ATUALIZACAO_TEX_LCQUI.md` com 10 alterações LaTeX matematicamente certas (P1-01 a P2-04) e 6 bloqueadas por pendências (P3-01 a P3-06), incluindo procedimento de validação por compilação isolada.
- **MODIFICACOES_CONSOLIDADAS_LCQUI.md** ampliado com Seção 6 registrando decisões e trade-offs desta rodada; confirmações de Q06, unidade de `medida_usada`, snapshots de roteiro e ACL de compartilhamento.
- **Inconsistências críticas identificadas não resolvidas**: AUD-17 (fórmula Q06 na Seção 10), AUD-18 (unidade `medida_usada` na Seção 10), AUD-19/20 (posicionamento de `estado_fisico`/`eh_higroscopico` — aguarda DP-A01), AUD-29 (snapshot `roteiro_anexo` ausente do dicionário 5.9), AUD-30 (ACL Roteiro na Seção 5), AUD-35/36 (coleções ausentes das Security Rules).

## Entrega documental — rodada anterior (11/09/2026)

- Planejamento de etiquetas e RN-ROLE-01–15 incorporados ao LaTeX, mantendo os Markdown de origem identificados como histórico.
- Seção 5.9 ampliada com dicionário de campos, tipos, obrigatoriedade, projeções e integridade.
- Seção 8 preservada e ampliada com contratos UI-01–13; seção 9 cobre ações de todos os papéis.
- Quatorze decisões pendentes originais (Q01–Q14) com três alternativas cada, resolvidas em `MODIFICACOES_CONSOLIDADAS_LCQUI.md`.
- Matriz, auditoria e contexto atualizados por evidência estática; percentuais e declarações de homologação sem comprovação foram retirados.

## Implementação

O projeto está parcial em relação aos contratos documentados. Nenhum item RF01–RF25 e nenhuma RN-ROLE-01–15 atingiu estado VALIDADO. Prioridade de implementação: (1) Security Rules — AUD-01/02/03/35/36; (2) Q06 metrologia — AUD-17/18; (3) migração de caminhos — AUD-07/08; (4) campos ausentes do modelo — AUD-19/21/25/29/30. Consulte os achados completos em `AUDITORIA_ATUALIZADA.md` e RF/fluxos em `MATRIZ_IMPLEMENTACAO_LCQUI.md`.

## Progresso por bloco de domínio

| Bloco | Domínio | Achados críticos | Achados altos | Achados médios | Decisões bloqueadas |
|---|---|---|---|---|---|
| A | Química e Almoxarifado | AUD-17, AUD-18 | AUD-19, AUD-20, AUD-21 | AUD-22, AUD-23, AUD-24 | DP-A01, DP-A02, DP-A03 |
| B | Patrimônio | AUD-25 | AUD-26, AUD-27 | AUD-28 | DP-B01, DP-B02 |
| C | Acadêmico/Turmas/Roteiros | AUD-29, AUD-30 | AUD-31, AUD-32 | AUD-33, AUD-34 | DP-C01, DP-C02, DP-C03 |
| D | Governança/Multi-Role/Infra | AUD-35, AUD-36 | AUD-37, AUD-38 | — | DP-D01, DP-D02 |

## Validação desta entrega

Esta entrega é documental e de inspeção estática. Compilação LaTeX não reexecutada nesta rodada (build anterior: PDF de 164 páginas sem erros em 11/09/2026). Nenhum teste funcional executado. Nenhum deploy, migração de dados nem alteração de código ou Rules nesta tarefa. Os arquivos `.tex` **não foram alterados** nesta rodada; todas as mudanças ficaram nos `.md` de controle. O `PLANO_ATUALIZACAO_TEX_LCQUI.md` descreve as alterações LaTeX a serem executadas na próxima rodada de implementação.


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

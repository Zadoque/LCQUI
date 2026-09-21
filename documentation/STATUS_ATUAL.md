# Status atual do LCQUI

Atualizado em 21/09/2026 — consolidação documental HQ-M2-004..007 e realinhamento formal local M2.1d.
Branch: `feat/formal-spec-cue-alloy`.
HEAD inicial da consolidação: `25e3825f5045a328e59f17115f2dbbda0710fb26`.
HEAD de entrada do realinhamento M2.1d: `69726049708398eacb2018534e88c49633f53d06`.
HEAD do fechamento M2.1d (local e remoto): `f27a797289dfa28ec4f3b445feb5599900cd4410`.

A consolidação foi registrada em **15 commits, um por arquivo**, de `5c625870` a `b5d3f099`. O PDF compilado foi commitado por último, em `b5d3f099` (`docs(pdf): publish compiled M2 reconciliation`). Não houve push, deploy ou alteração da aplicação nesta sequência.

Após esses commits, o usuário solicitou a atualização de `M2_HUMAN_QUESTIONS.md` e deste status. Essas duas revisões Markdown ficaram na árvore de trabalho sem commit até serem versionadas em `69726049708398eacb2018534e88c49633f53d06` (`docs(status): update STATUS_ATUAL and M2_HUMAN_QUESTIONS with consolidated decisions and revisions`), que é a HEAD de entrada do realinhamento M2.1d.

O realinhamento formal local **M2.1d** realinhou `specification/cue/` às 29 colunas documentais de `Frasco_Reagente`, introduziu `origem_tara` e suas invariantes locais de proveniência de tara. Detalhes, paridade e gates em `worklogs/formal-spec/M2_1D_CUE_REALIGNMENT.md`. M2.2 continua `NOT_STARTED`.

Os três commits de M2.1d (`fd6d3bc1`, `c6bad174`, `f27a7972`) foram inicialmente apenas locais. Em verificação posterior, `origin/feat/formal-spec-cue-alloy` passou a apontar para `f27a797289dfa28ec4f3b445feb5599900cd4410`, publicando-os. O Git permite afirmar apenas que a remota mudou; o push ocorreu fora da execução M2.1d e não foi executado por ela.

## Escopo efetivamente executado

A reconciliação inicial foi limitada aos arquivos .tex, PDF compilado e arquivos de status. A sequência de commits também versionou o documento de decisões fornecido pelo usuário, sem modificar seu conteúdo. Posteriormente, o usuário autorizou explicitamente atualizar M2_HUMAN_QUESTIONS.md. Código de frontend/backend, firestore.rules, CUE/Alloy, fixtures, generated e demais worklogs históricos permaneceram intactos. Os pseudocódigos e Rules no PDF são especificação, não implementação implantada.

## Decisões consolidadas

- **HQ-M2-004 — RESOLVED:** FECHADO com conteúdo nominal NULL é permitido; tara/origem NULL e saldo desconhecido. Abertura/pesagem bruta não tornam o saldo conhecido. Sem tara real, segue o ciclo de JA_ABERTO em situação equivalente, incluindo quebra/descarte/extravio; não fabricar tara nem quantidade. EXTRAVIADO preserva a flag; estados terminais seguem a semântica preexistente.
- **HQ-M2-005 — RESOLVED:** limiar fixo de 5 g eliminado; Q06 mantém max(1 g, 0,005 × saída) ou max(2 g, 0,02 × saída) para higroscópicos. Retorno abaixo da tara é registrado sem falsificação, encerrando custódia e bloqueando reutilização enquanto pendente. Origem teórica/real é explícita.
- **HQ-M2-006 — RESOLVED:** resumos de reagentes/almoxarifado exclusivamente FLOW, sem posição diária, dependência D-1 ou replay até hoje. Correções fechadas reprocessam somente datas diretamente afetadas. Patrimônio preservado.
- **HQ-M2-007 — RESOLVED:** pesagem ordinária aceita observação opcional; descrição automática identificada como sistema não exige justificativa humana de 20 caracteres. Operações especiais mantêm seus contratos.

M2_HUMAN_QUESTIONS.md foi atualizado por solicitação explícita do usuário: HQ-M2-004..007 estão RESOLVED, com respostas completas; HQ-M2-002 foi reconciliada com a possibilidade de FECHADO com saldo desconhecido. Todas as sete perguntas do arquivo estão resolvidas. Referências OPEN nos demais registros anteriores são históricas e estão superadas; não representam decisões humanas pendentes.

## Arquitetura documental resultante

Frasco_Reagente é a autoridade atual; backend protegido executa count()/sum() sobre seu estado corrente e saldos derivados server-owned (saldo_aferido_g/ml). Historico_Frasco_Reagente/Emprestimo_Reagente preservam fatos FLOW e alimentam Resumo_Almoxarifado_Diario/Resumo_Reagente_Diario por dia civil America/Sao_Paulo, em intervalo semiaberto. Não existe view persistente de estoque atual.

Sistema_Cache_Dashboard é cache efêmero lazy. Chaves: ESTOQUE__ALMOX e ESTOQUE__ALMOX__RESUMO com IDs codificados deterministicamente, escopo/filtros normalizados. Campos: escopo, resultado, calculado_em, versao_calculo, geracao, valido. TTL máximo 30 segundos, contado conservadoramente do início do cálculo; invalidação pode antecipar expiração. Sem scheduler periódico, recálculo apenas no próximo acesso. Publicação verifica geração para impedir que cálculo iniciado antes de mutação recoloque cache obsoleto.

Auth, App Check, RBAC/escopo e limite atômico de 5 solicitações/minuto/UID precedem cache e agregações, inclusive em cache hit. Coleção de cache e Sistema_Rate_Limit_Dashboard negam leitura/escrita cliente na especificação de Rules. Frontend mantém cache curto, horário do cálculo e ação Atualizar. TTL deletion não controla a validade semântica.

Invalidam no menor escopo seguro: cadastro, abertura, retirada, devoluções normal/anômala, resolução que muda estado corrente, esgotamento, pesagem/evaporação/ajuste/recalibração com efeito atual, quebra, descarte, extravio/reencontro, quarentena e decisões de validade/descarte. Origem/destino são invalidados em transferência/associação somente se houver contrato suportado. Mutação e invalidação são transacionais; nenhuma exige recálculo imediato. Correções exclusivamente históricas e reprocessamento FLOW não invalidam estoque atual.

## Campos removidos dos resumos

De **Resumo_Almoxarifado_Diario**, STOCK:

- qtd_frascos_fechados_no_fim_do_dia
- qtd_frascos_abertos_no_fim_do_dia
- qtd_frascos_emprestados_no_fim_do_dia
- qtd_frascos_saldo_desconhecido
- volume_total_disponivel_aferido_ml
- massa_total_disponivel_aferida_g

Também removido volume_total_usado_nos_frascos_devolvidos_durante_o_dia por redundância/ambiguidade de consumo, não por ser STOCK.

De **Resumo_Reagente_Diario**, STOCK:

- qtd_frascos_fechados_disponiveis
- qtd_frascos_abertos_disponiveis
- qtd_frascos_em_uso
- qtd_frascos_saldo_desconhecido
- qtd_frascos_vazios
- volume_total_disponivel_aferido_ml
- massa_total_disponivel_aferida_g

## Devolução e resolução metrológica

peso_retorno original e instante são preservados; peso_atual registra a observação. origem_tara distingue REFERENCIA_TEORICA, MEDIDA_REAL e NULL. DEVOLVIDO_COM_ANOMALIA encerra custódia. Sem vazio confirmado e com inconsistência, quarentena/INDISPONIVEL impede nova retirada; saldo_desconhecido=true e saldos derivados NULL. Tara teórica inconsistente não é tratada como limite físico real.

consumo_validado=false mantém medida_utilizada/peso_retorno_efetivo NULL; consumo/evaporação não são somados definitivamente. Resolução por nova pesagem preserva leitura original e registra AJUSTE vinculado, autoria/instante e medição efetiva. Confirmação posterior de vazio aplica VAZIO/INDISPONIVEL e saldo zero; tara real divergente anterior não é sobrescrita. Sua substituição usa recalibrarTaraFrascoEsgotado, somente com recipiente vazio, justificativa humana e auditoria. Liberação de quarentena mantém seu contrato próprio e não contorna pendência.

A resolução quantitativa fica vinculada por id_resolucao_metrologica; data FLOW continua a do retorno físico. Reprocessar somente datas afetadas. Se houve movimentação física posterior, uma nova pesagem atual não prova a medição histórica; não inventar evidência nem replay. Correções administrativas permanecem em conjunto fechado.

## Arquivos alterados e motivos

| Arquivo | Motivo |
|---|---|
| Section-4-Modelagem-Entidades-SQL-3FN.tex | Cadastro/metrologia, origem_tara e campos mínimos de consumo validado/resolução; preservação da medição. |
| Section-5-Notas-de-Mapeamento-para-Firestore.tex | Dicionários FLOW, saldo corrente, origem, fatos históricos e coleções internas. |
| Section-6-Materialized-Views.tex | Remoção de STOCK diário e campo legado; arquitetura de estoque atual/cache/proteção/invalidação. |
| Section-7-Requisitos-e-Regras-de-Negocio.tex | Regras e tabela de obrigatoriedade reconciliadas; decisões HQ004..007 resolvidas. |
| Section-8-Descricao-das-telas-Dashboards.tex | Estado atual separado do período FLOW; cadastro NULL, UI de anomalia e pesagem opcional. |
| Section-9-Exemplos-de-fluxos.tex | Exemplo de devolução física com anomalia e preservação de peso. |
| Section-10-Subsection-5-Fluxo-de-Reagentes.tex | Pseudocódigos de cadastro/devolução/recalibração/liberação e contratos fechados de resolução. |
| Section-10-Subsection-7-Jobs-Agendados.tex | Produtor FLOW-only, intervalo semiaberto, correções somente nas datas afetadas. |
| Section-10-Subsection-9-Relatorios-em-PDF.tex | Remoção da leitura de STOCK diário; exclusão de consumo pendente; janela semiaberta. |
| Section-10-Subsection-11-Funcoes-Academicas-e-Pesagem.tex | Observação opcional, autoria automática, derivação de saldo/invalidação. |
| Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex | Rules documentais deny-all para cache/limite internos. |
| main.pdf | PDF recompilado e inspecionado. |
| ../FORMAL_SPEC_STATE.md | Estado formal, decisões resolvidas e próximos passos sem iniciar M2.2. |
| STATUS_ATUAL.md | Este relatório, HEAD verificada, sequência de commits e revisões posteriores. |
| worklogs/formal-spec/M2_HUMAN_QUESTIONS.md | Revisão posterior aos 15 commits: HQ004..007 resolvidas e HQ002 reconciliada; versionada em 69726049. |
| worklogs/formal-spec/Consolidação das decisões humanas M2 e simplificação da arquitetura de estoque.md | Documento de entrada versionado em commit próprio, sem alteração de conteúdo. |

Os arquivos Section-10-Subsection-* ficam em documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/; os demais .tex e main.pdf ficam em documentation/.

## Validações da consolidação publicada

| Comando/verificação | Resultado |
|---|---|
| just docs-build (TeX Live Nix, workflow do guia COMPILACAO_NIX_LCQUI.md) | PASS final, exit 0, 275 páginas, zero erros/referências indefinidas. |
| latexmk sobre checkout documental temporário da HEAD inicial | PASS, exit 0, 267 páginas; baseline de diagramação. |
| Comparação dos logs finais | 28 avisos Overfull em ambos, mesmas larguras. Os três avisos novos da edição foram corrigidos. |
| Inspeção visual com Poppler | Modelo p.29, almoxarifado p.95, reagente p.99, cache pp.103–105, anomalia pp.208–210 e Rules p.267 conferidos. Trechos novos legíveis; overflow preexistente na seção de uploads da p.267 permanece registrado. |
| just spec-check | PASS, 64 fixtures existentes (M0 7, M1 35, M2 22). |
| just spec-export | PASS, exportação do recorte formal existente. |
| just alloy-check | PASS, regressão do modelo existente M0; não é prova M2.2. |
| git diff --check | PASS. |
| Diff de functions/frontend/specification/Rules executáveis/generated | Vazio. |
| Busca global nas fontes .tex | Sem limiar fixo, exigência universal nominal FECHADO ou rejeição por retorno abaixo da tara; STOCK removido dos dois schemas/dicionários/PDF. Snapshots patrimoniais/químicos, prazos civis e objetos QuerySnapshot foram classificados como não afetados. |
| Testes de aplicação | Não aplicáveis: nenhuma alteração de código executável. |

A primeira tentativa de build falhou por linguagem JavaScript não definida em Listings; corrigida para TypeScript já suportada. Primeira execução de spec-check foi bloqueada pelo sandbox (spawnSync cue EPERM); reexecução escalonada autorizada passou, assim como export/Alloy. Não são falhas remanescentes.

As revisões Markdown posteriores não exigem recompilação do PDF nem nova execução dos gates formais. Nesta atualização foi executado git diff --check; os resultados de build e gates acima permanecem evidências da consolidação publicada, não novas execuções.

Logs locais: /tmp/m2-docs-build.log, build/latex/main.log e /tmp/m2-baseline-build.log. O PDF publicado foi copiado de build/latex/main.pdf somente após aprovação do log final e inspeção visual, conforme o guia.

## Formal e pendências concretas

**M2.2 NÃO foi iniciado.** O CUE M2.1d realinhou o recorte local a 29 colunas com `origem_tara` e as invariantes locais de proveniência de tara; M0/M1 permanecem intactos. O CUE não impõe FECHADO ⇒ saldo conhecido e permite nominal/tara NULL. Relações de conhecimento/tara, custódia com pendência, resolução e FLOW permanecem entradas futuras para M2.2; geração/proveniência M2 permanece M2.3. Os gates atestam somente o recorte local M2.1d (7/35/30 = 72 fixtures), não ciclo de vida, cache nem backend.

Backend atual ainda tem contratos legados (ex.: cadastro fechado exige volumeNominal e devolução rejeita ganho acima de 102%); cache/endpoint e resolução precisam de implementação futura. Esta rodada não altera nem homologa esse código. Não há novas perguntas humanas sobre decisões já resolvidas.

## Histórico anterior — evidência preservada, não status da rodada atual

Snapshot de 13/09/2026. Branch: `docs/realinhamento-especificacao-lcqui`.

## Plano e decisões

21 itens enumerados: 6 P1, 6 P2 e 9 P3; 20 aplicados à documentação e 1 cancelado (P3-04, DP-B01). O total anterior 20/19 era erro aritmético. Nenhum item foi removido para acomodar a contagem.
As 10 decisões DP-A01–DP-D02 estão resolvidas em `DUVIDAS_PENDENTES_LCQUI.md`; não há decisão de domínio bloqueando execução. Os 20 itens executáveis foram APLICADO_DOCUMENTACAO nas rodadas A–D; código não é atestado por isso.

## Implementação e riscos

RF01–RF25 e RN-ROLE-01–15 permanecem parciais; documentação não comprova código ou homologação. AUD-35/36: hardening de baixa prioridade, pois deny-all já protege as coleções internas. AUD-37: exclusividade já validada fora de transação, sem garantia concorrente; correção pendente. AUD-27: caminho patrimonial divergente, migração ainda não preparada nem executada.
DP-D01 mantém verificação seletiva de ativo; mutações sem requerAtivo=true podem confiar em token ainda válido até renovação. Claims antigas em conta ainda ativa também exigem consideração explícita. DP-D02 mantém retenção indefinida V1 como política conservadora LCQUI/UENF sujeita à futura política arquivística/LGPD institucional.

## Execução e validação

Fase 0 e rodadas A–D concluídas em commits separados. Validação final aprovada: 172 páginas, exit 0, zero erros/referências indefinidas; 19 avisos tipográficos Overfull remanescentes; código e preparação de migração ainda pendentes. Builds isolados aprovados, todos exit 0, zero erros e referências indefinidas:

| Build | Páginas |
|---|---|
| Inicial | 164 |
| A | 166 |
| B | 167 |
| C | 171 |
| D | 173 |

Nenhum teste funcional executado nesta sessão até esta etapa. Nenhum deploy, merge ou migração remota.

## Histórico de marcos

- 11/09/2026: contratos UI, fluxos, dicionário e RN-ROLE consolidados. Build histórico de 164 páginas; resultado não reutilizado como validação atual.
- 13/09/2026: resolução formal das 10 DPs e inclusão de P2-05/P2-06 no plano.
- 20/09/2026: Auditoria 8 (Especificação Consolidada V5) aplicada integralmente à documentação LaTeX e validador formal M0 (CUE + Alloy + Rust) atualizado para contemplar o status INDISPONIVEL de frascos.
- 20/09/2026: Auditoria 9 (Ciclo de vida de reagentes e frascos) aplicada aos enums NoSQL, 3FN e código Typescript, não exigindo modificação nos artefatos de infraestrutura M0 e M1. Validação M0 e M1 verificada sem regressões.

Inspeção visual: páginas 61 (snapshot), 143 (TCR), 145 (Q06) e 169 (Rules) do PDF final legíveis, sem cortes de conteúdo nas amostras. Build final /tmp/lcqui-tex-final; PDF atualizado somente após aprovação.

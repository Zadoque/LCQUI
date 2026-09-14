# Matriz de consenso e execução da auditoria pós realinhamento LCQUI

## Finalidade

Este arquivo é simultaneamente:

1. a matriz de convergência entre a auditoria original de 23 itens, a Auditoria A (DOCX, leitura ampla) e a Auditoria B (PDF, leitura parcial);
2. o conjunto de instruções para o Codex revalidar os achados no baseline atual;
3. o plano de correção documental e de validação final.

O objetivo não é aplicar automaticamente todas as alegações dos relatórios. Cada alegação é uma hipótese até ser confrontada com o `.tex` atual. O Codex deve corrigir somente inconsistências demonstradas e registrar por que não alterou itens resolvidos, obsoletos, intencionais ou sem evidência suficiente.

## Repositório e baseline imutável da análise

- Repositório: `Zadoque/LCQUI`
- Branch de origem: `docs/realinhamento-especificacao-lcqui`
- Commit de baseline: `1c0d7f9b7efb2bf322a0dc8e73d66ec128d409ff`
- Mensagem do commit: `docs: valida documentação consolidada e atualiza PDF final`
- Estado conhecido: `documentation/main.pdf` com 172 páginas, compilação exit 0, nenhuma referência indefinida final e 19 avisos `Overfull`.
- Limite conhecido: as rodadas A-D alteraram a documentação. Elas não demonstram implementação no frontend, nas Functions, nas Rules, em dados remotos ou em deploy.

Antes de qualquer edição, confirme que a branch de origem ainda aponta para esse SHA. Faça o trabalho em uma nova branch criada a partir dele, sugerida como:

`docs/correcao-pos-auditoria-convergencia`

Não reescreva, faça reset ou force-push da branch de origem.

## Fontes comparadas e peso probatório

| Fonte | Cobertura | Força | Limitação |
|---|---|---|---|
| Auditoria original, `INCONSISTENCIAS_ADICIONAIS_LCQUI.md` | 23 achados orientados ao PDF anterior de 164 páginas | Boa lista de hipóteses técnicas e contratos específicos | É anterior ao realinhamento A-D; contém itens já resolvidos e recomendações que podem contrariar decisões posteriores |
| Auditoria A, DOCX | Aparente leitura ampla das 172 páginas; matriz RF01-RF25 e 15 testes adversariais | Maior capacidade de encontrar resíduos e problemas novos | Promove ambiguidades e preferências arquiteturais a contradições; contém falsos positivos importantes |
| Auditoria B, PDF | Leitura parcial admitida pelo próprio relatório | Útil como contraponto conservador | Não leu partes relevantes; vários “não localizado” e alegações sobre usuário ativo são limitações da leitura, não falhas do documento |
| `.tex` do commit baseline | Fonte normativa atual | Autoridade final para esta rodada | Compilação prova sintaxe, não consistência semântica |

## Hierarquia de autoridade

Em caso de conflito, use esta ordem:

1. decisões formalmente resolvidas DP-A01-DP-D02 e Q01-Q14;
2. regras de negócio e invariantes explicitamente aprovadas;
3. modelo 3FN e contrato físico Firestore, respeitando a diferença entre os dois;
4. contratos de UI e fluxos;
5. listings documentais da Section 10;
6. Security Rules e contratos de Storage descritos na documentação;
7. documentos de auditoria e status;
8. os três relatórios externos resumidos nesta matriz.

Arquivos de auditoria não substituem o `.tex`. `APLICADO_DOCUMENTACAO` não significa `IMPLEMENTADO_CODIGO`, `TESTADO`, `VALIDADO`, `MIGRADO` ou `EM_PRODUCAO`.

## Decisões protegidas contra regressão

Não reabra ou reverta estes pontos sem contradição objetiva com uma decisão posterior:

- DP-A01-DP-D02 e Q01-Q14;
- `estado_fisico` e `eh_higroscopico` canônicos em `Resumo_Reagente`;
- `id_especificacao_reagente` mantido no Frasco Firestore mesmo quando existe lote, como denormalização deliberada;
- snapshot `eh_higroscopico` no frasco;
- `medida_usada` do frasco sempre em gramas;
- TCR e autoatendimento conforme Q04 e Q14;
- Aluno puro pode ser Gestor de Almoxarifado;
- Bolsista e Gestor de Almoxarifado são mutuamente exclusivos;
- foto obrigatória na requisição patrimonial;
- relatórios limitados retornam PDF em base64;
- comentários moderados são entregues aos perfis sem acesso ao original por resposta filtrada do backend;
- retenção indefinida da V1 é política conservadora, não obrigação legal universal;
- Bem Patrimonial usa máquina de estados e não recebe flag `ativo`;
- as dimensões `estado_fisico_frasco`, `disponibilidade`, `vencido` e `em_quarentena` são ortogonais;
- diferenças deliberadas entre IDs relacionais inteiros e IDs Firestore/Auth em string não são, isoladamente, inconsistência.

## Legenda da matriz

- `C`: apontado ou sustentado pela fonte.
- `P`: apontado parcialmente, com escopo ou severidade diferente.
- `N`: não apontado pela fonte.
- `D`: a fonte diverge ou considera o contrato suficiente.
- `L`: a fonte não teve leitura material suficiente para avaliar.

Vereditos iniciais:

- `CONFIRMADO`: evidência já converge, mas ainda deve ser citada no baseline antes do patch.
- `PARCIALMENTE_CONFIRMADO`: parte foi resolvida ou há subproblemas com vereditos diferentes.
- `REVALIDAR`: hipótese plausível sustentada por uma fonte, sem confirmação cruzada suficiente.
- `DECISAO_ARQUITETURAL`: há uma lacuna real, mas mais de uma solução válida; documente a decisão antes do patch.
- `JA_RESOLVIDO`: não reaplicar patch.
- `FALSO_POSITIVO`: não alterar o projeto para satisfazer a alegação.
- `OBSOLETO`: dependia do PDF anterior ou de contrato substituído.

## Matriz de consenso dos 23 achados originais

| ID | Achado consolidado | Original | Auditoria A | Auditoria B | Veredito inicial | Direção obrigatória para o Codex |
|---|---|---:|---:|---:|---|---|
| M-01 | Endpoints críticos e jobs de materialização ausentes | C | D/P | L | `PARCIALMENTE_CONFIRMADO` | Verificar separadamente `registrarBaixaBemPatrimonial`, `aceitarConviteAluno`, `removerAlunoTurma` e materialização diária/mensal. Narrativa, fluxo ou menção genérica a upload não substitui contrato de callable/job. Não declarar RF completo sem o elo backend. |
| M-02 | Troca de `id_local` do bem sem recompor `predio`, `andar` e `sala` | C | P | P | `CONFIRMADO_PROVAVEL` | Diferenciar renomear um `Local` de trocar a FK do bem. Na aprovação com `novo_id_local`, exigir leitura do novo local e atualização atômica das projeções. Registrar histórico com snapshot coerente. |
| M-03 | Histórico patrimonial ausente na aprovação de requisições | C | D | L | `PARCIALMENTE_CONFIRMADO` | A edição teria sido corrigida. Verificar apenas a criação inicial na aprovação da adição e qualquer fluxo ainda sem evento. Não duplicar histórico de edição já corrigido. |
| M-04 | `id_especificacao_reagente` nulo no Frasco Firestore quando há lote | C | D/P | P | `JA_RESOLVIDO` | Não remover nem anular o campo no Firestore. Preservar a denormalização deliberada. A 3FN pode derivar a especificação pelo lote; o documento físico deve manter o ID resolvido. |
| M-05 | Tomador desativado ainda pode receber retirada | C | C | P, mas generalizado incorretamente | `CONFIRMADO` | Manter a distinção entre operador e tomador. O operador ativo já é validado; exigir também `Usuarios/{idUsuarioRetirou}.ativo == true` para Professor/Bolsista destinatário. Não transformar isso em alegação falsa de que `Usuarios.ativo` não existe. |
| M-06 | Frasco pode referenciar lote incompatível com a especificação | C | C | P | `CONFIRMADO` | Na transação, validar existência do lote, pertencimento à especificação/resumo e, se a regra fiscal permanecer normativa, limite `qtd_frascos_cadastrados <= qtd_frascos_comprados`. Fechar a mesma invariante para frasco fechado e aberto quando aplicável. |
| M-07 | Geração de etiquetas virgens sem validação do grid e dos códigos | C | N | N | `REVALIDAR` | Separar: (a) bounds `1..10` e `1..3`; (b) quantidade que cabe a partir da posição inicial; (c) semântica de código virgem em relação ao contador. Não impor “códigos sempre maiores” se a política aprovada trata etiquetas como papéis não reservados; documentar a decisão. |
| M-08a | `Almoxarifado.ativo` ausente da 3FN apesar das regras | C | N | D/L | `REVALIDAR` | Verificar Section 4, Section 5, RN-ROLE-05 e UI-03. Adicionar à 3FN somente se `ativo` for estado canônico do domínio, não mera projeção operacional. |
| M-08b | Exceção de capacidade ausente de `Convite_Aluno` 3FN | C | D | P | `JA_RESOLVIDO_PROVAVEL` | Revalidar `exceder_capacidade` e `justificativa_excecao`. Não duplicar campos se já estiverem no 3FN e no dicionário. |
| M-08c | Histórico de posts não identifica editor, apesar da intervenção da chefia | C | P | N | `CONFIRMADO_PROVAVEL` | Remover o texto legado “somente o professor edita”. Garantir autoria (`editado_por` ou equivalente) e autorização coerentes em 3FN, Firestore, UI, fluxo, listing e histórico. |
| M-09 | Idempotência de notificações mencionada sem chave concreta | C | D | C | `PARCIALMENTE_CONFIRMADO` | A existência de `notificarProfessorDevolucaoUmaVez` não prova idempotência. Declarar docId/chave determinística, janela temporal civil, transação/upsert e comportamento em retry. Não afirmar que idempotência inexiste antes de procurar o contrato. |
| M-10 | Propagadores e jobs podem ultrapassar o limite de `WriteBatch` | C | C | C | `CONFIRMADO` | Cobrir `onLocalAtualizado`, renomeação de resumo, vencimentos, atrasos e qualquer fan-out. Usar paginação/chunks ou BulkWriter quando atomicidade global não for requisito. Não citar “1 write/s por documento” como quota universal. |
| M-11 | Geração de `codigo_turma` não tem algoritmo/colisão formalizados | C | C/P | N | `DECISAO_ARQUITETURAL` | Definir geração pelo servidor, alfabeto legível, comprimento/entropia, normalização, doc/chave de unicidade e retry transacional. Base32 Crockford é opção, não obrigação sem decisão registrada. |
| M-12 | Datas civis `YYYY-MM-DD` sofrem parsing UTC implícito | C | C | P/N | `CONFIRMADO_PROVAVEL` | Fazer busca global por `new Date(stringCivil)`, `Date.parse` e construções locais. Centralizar helper para `America/Sao_Paulo`, definir início/fim do dia e preservar string civil quando não houver necessidade de instante. Evitar simplesmente concatenar `-03:00` em todo lugar sem avaliar horário de verão histórico e semântica do campo. |
| M-13 | Almoxarifado inativo continua aceitando operações | C | N | N | `REVALIDAR` | Verificar criação, cadastro, pesagem, retirada, devolução, descarte e consultas. Especificar quais operações são bloqueadas e quais permanecem permitidas para encerramento/auditoria. Não aplicar bloqueio absoluto que impeça devolver ou regularizar estoque. |
| M-14 | Gestão de papéis não possui contratos executáveis completos | C | P | P | `PARCIALMENTE_CONFIRMADO` | Inventariar concessão, revogação, autorrevogação, último responsável, recálculo de claims e reconciliação. Unir ao achado N-01 sobre concorrência do último gestor. Não assumir que `atualizarCustomClaims` sozinho implementa todo RBAC. |
| M-15 | Frasco nasce sem `CADASTRO`; job escreve histórico sem autoria/unidade | C | D/N | N | `REVALIDAR_FORTE` | Verificar listings de cadastro e scheduler. Exigir evento inicial atômico; para jobs, usar a sentinela canônica exata já aprovada (`__SISTEMA__`, `SISTEMA` ou outra), sem inventar uma segunda grafia. Confirmar nullability e unidade em todos os modelos. |
| M-16 | `REAGENTE_ESCASSO` não tem produtor real | C | N | N | `REVALIDAR_FORTE` | Localizar todos os consumidores e produtores do enum. Se não houver produtor, especificar trigger/transação idempotente, limiar, escopo por almoxarifado/resumo, rearmamento e prevenção de notificações repetidas. |
| M-17 | Payload `volumeNominal` contradiz `conteudo_nominal` para sólidos | C | P | P/N | `CONFIRMADO_PROVAVEL` | Padronizar `conteudoNominal`/`conteudo_nominal` semanticamente. Fazer busca por `volumeNominal`, `capacidade_nominal` e derivados; não alterar diferenças puramente sintáticas camelCase/snake_case quando o significado estiver correto. |
| M-18 | Perfis alheios não podem ser exibidos pelas Rules | C | N | L | `REVALIDAR` | Reavaliar após as projeções mínimas introduzidas no realinhamento. Preferir snapshot mínimo ou `Perfis_Publicos` estrito se realmente faltar elo. Não ampliar leitura de `Usuarios/{uid}` nem expor e-mail, papéis ou dados privados. |
| M-19 | Adicionar `INDISPONIVEL` a `disponibilidade` | C | D | D | `FALSO_POSITIVO` | Não adicionar esse estado. Preservar dimensões ortogonais. Corrigir as queries para combinar `disponibilidade` com `estado_fisico_frasco`, `em_quarentena`, descarte e autorização, conforme o caso. |
| M-20 | Operador da retirada/devolução confundido com portador físico | C | N | N | `REVALIDAR_FORTE` | Comparar `id_usuario_retirou`, `id_usuario_devolveu`, `id_gestor_retirada` e `id_gestor_devolucao` em 3FN, Firestore, payloads e listings. Preservar as duas identidades e autoria do evento. |
| M-21 | Relatórios: transporte, hash canônico e auditoria | C | D/P | D/L | `PARCIALMENTE_CONFIRMADO` | O conflito base64 versus Signed URL está resolvido; não o reabra. Verificar separadamente cálculo/serialização do Hash Canônico, inclusão no PDF, metadados auditáveis e evento de geração. Evitar confundir hash de conteúdo com nome de arquivo/timestamp. |
| M-22 | `descricao_complementar_proposta` ausente na requisição de adição | C | N | N | `REVALIDAR_BAIXA` | Demonstrar se o campo é necessário para concluir o fluxo sem perda de dados. Se for opcional e editável depois, classificar como completude/UX, não como quebra crítica. |
| M-23 | Índices compostos de histórico por operador e timestamp ausentes | C | P | C/P | `CONFIRMADO_PROVAVEL` | Derivar índices das queries normativas reais, incluindo collection-group quando usado. Alinhar Section 5, listings, `firestore.indexes.json` apenas como evidência de implementação; nesta rodada documental, não alterar config. |

## Matriz de achados novos, ampliações e falsos positivos

| ID | Achado da convergência | Origem | Veredito inicial | Direção obrigatória para o Codex |
|---|---|---|---|---|
| N-01 | Duas revogações concorrentes podem remover o último chefe/gestor | A e B | `CONFIRMADO_PROVAVEL`, unir a M-14 | Formalizar a transação e o documento/contador de coordenação `Controle_Papeis/singleton` ou mecanismo equivalente. Provar que todas as revogações concorrentes disputam o mesmo documento. |
| N-02 | Requisição de edição fica desatualizada após mudança legítima no bem | A | `DECISAO_ARQUITETURAL`, severidade rebaixada | `versao_bem_origem` deve ser capturada pelo servidor; a UI não é autoridade. Definir recuperação: rejeição explícita como desatualizada, rebase seletivo com revisão ou nova requisição. Não permitir overwrite silencioso nem chamar isso de contradição crítica da UI. |
| N-03 | 3FN de Lote deveria receber `id_resumo_reagente` | A | `FALSO_POSITIVO` | Não degradar a 3FN. No Firestore, manter `id_resumo_reagente` como projeção obrigatória se necessário para resolver o caminho. Harmonizar a tabela resumida da Section 5 se ela omitir a projeção que o dicionário detalhado já declara. |
| N-04 | Singleton do código de frasco teria limite universal de 1 transação/s | A | `FALSO_POSITIVO_COM_RISCO_RESIDUAL` | Não repetir a quota universal. Registrar apenas contenção/hotspot a medir. Manter o singleton para a escala atual, salvo evidência de requisitos de throughput incompatíveis. |
| N-05 | Moderação por backend seria contradição insanável das Rules | A | `JA_RESOLVIDO/FALSO_POSITIVO` | A solução filtrada pelo backend já é a decisão. Apenas harmonizar uma tabela narrativa se ela ainda sugerir leitura direta incompatível. Nunca tentar projeção de campo via Rules. |
| N-06 | Seria obrigatório um trigger Storage `onFinalize` | A | `MELHORIA_OPCIONAL` | Validação síncrona do objeto existente, tamanho e assinatura real pelo backend pode satisfazer o contrato. Não prescrever um trigger específico sem necessidade demonstrada. |
| N-07 | Campos redundantes em `Resumo_Almoxarifado_Diario` | A | `CONFIRMADO_PROVAVEL` | Remover ou marcar como legado o campo genérico `volume_total_usado_nos_frascos_devolvidos_durante_o_dia` se coexistir com `volume_utilizado_no_dia_ml` e `massa_utilizada_no_dia_g`. Preservar métricas separadas por dimensão. |
| N-08 | Query de histórico patrimonial filtra `predio` sem campo/snapshot indexável | A | `LACUNA_PROVAVEL_ALTA` | Verificar `collectionGroup("Historico").where("predio", ...)`. Se confirmada, declarar snapshot top-level imutável de `predio/andar/sala` com origem e índice, ou redesenhar a consulta. Não declarar automaticamente que a query “falha”; sem o campo ela pode apenas não retornar os documentos esperados. |
| N-09 | Resíduos `FechadoDisponivel`, `AbertoDisponivel` e `capacidade nominal` | A | `CONFIRMADO_PROVAVEL_BAIXA` | Fazer varredura léxica e substituir somente usos normativos legados. Preservar ocorrências explicitamente históricas ou marcadas “antigo”. |
| N-10 | UI de devolução não fecha o fluxo de peso abaixo da tara | A | `AMBIGUIDADE_PROVAVEL` | Garantir que o erro direcione a fluxo documentado de esgotamento/recalibração, sem manter empréstimo irrecuperavelmente aberto. Não aceitar ajuste silencioso. |
| N-11 | `papel_destinatario` da notificação versus papel ativo no sino | A e B | `DECISAO_ARQUITETURAL_BAIXA` | Definir se o sino consolida a conta ou filtra pelo papel ativo. Manter acesso seguro a todas as notificações do próprio UID; usar o campo para apresentação/roteamento, não para confiar em papel vindo do cliente. |
| N-12 | Aceite de convite por usuário Auth já existente | A | `REVALIDAR` | Verificar se o contrato já exige login e reutiliza o UID. Se ausente, fechar criação condicional de `Usuario`/`Aluno`, vínculo transacional e prevenção de contas duplicadas. |
| N-13 | Forma física do vínculo Gestor-Almoxarifado ambígua | A | `REVALIDAR_BAIXA` | Verificar se a Section 5 já define coleção raiz e docId determinístico. Só corrigir se o contrato de leitura direta e de query bidirecional estiver realmente indefinido. |
| N-14 | `id_emprestimo_ativo` no Frasco contradiz a 3FN | A | `FALSO_POSITIVO` | Preservar o ponteiro como denormalização Firestore mantida na mesma transação de retirada/devolução. Declarar fonte de verdade e regra de reparo, se ainda ausentes. |
| N-15 | `Usuario.ativo` e bloqueio de conta não existem | B | `FALSO_POSITIVO_POR_LEITURA_PARCIAL` | O baseline define `Usuarios.ativo` e `validarPermissao(..., requerAtivo)`. Corrigir apenas chamadas específicas que deixam de exigir conta ativa, especialmente M-05. |
| N-16 | RF01-RF25 estariam “não localizados” | B | `FALSO_POSITIVO_POR_LEITURA_PARCIAL` | Recalcular a matriz RF a partir das Sections 7-11. Nunca transportar os “não localizado” da Auditoria B. |
| N-17 | IDs INTEGER na 3FN versus UID string no Firestore seriam incompatíveis | A | `FALSO_POSITIVO` | São modelos tecnológicos distintos. Só corrigir se uma rotina de migração ou mapeamento confundir concretamente os tipos. |
| N-18 | Relatórios de turma deveriam obrigatoriamente destacar excesso de capacidade | B | `MELHORIA_OPCIONAL` | Não adicionar como requisito sem decisão de produto. O essencial é convite excepcional justificado e auditável. |
| N-19 | Professor + Gestor não teria regra de autoatendimento | B | `FALSO_POSITIVO_PROVAVEL` | Q14 já trata o caso. Revalidar o listing e o fluxo, mas não reabrir Q14. |
| N-20 | Feed moderado e acesso pós-remoção estariam indefinidos | B | `REVALIDAR_LIMITADO` | A Auditoria B não leu integralmente as Rules. Confirmar no baseline o endpoint filtrado e a remoção de ambos os espelhos de matrícula; corrigir somente elos realmente ausentes. |

## Síntese de prioridade

### Prioridade 0: evitar regressões

- M-04, M-19, N-03, N-04, N-05, N-14, N-15, N-16, N-17 e N-19 não devem receber o patch sugerido pelos relatórios.
- M-21 não deve reabrir o transporte de relatórios em base64.
- Não confundir 3FN normalizada com projeções deliberadas do Firestore.

### Prioridade 1: integridade, segurança e concorrência

- M-02: troca de local e projeções prediais.
- M-05: tomador inativo.
- M-06: lote incompatível.
- M-09: idempotência concreta.
- M-10: fan-out/batches.
- M-12: datas civis/timezone.
- M-14 + N-01: RBAC e último responsável concorrente.
- M-15: histórico inicial e autoria de jobs.
- M-20: operador versus portador físico.
- N-08: query histórica por prédio.

### Prioridade 2: completude funcional

- M-01: endpoints e materializações.
- M-07: etiquetas.
- M-08a/M-08c: estado do almoxarifado e autoria de edição.
- M-13: operações em almoxarifado inativo.
- M-16: produtor de `REAGENTE_ESCASSO`.
- M-21: hash e auditoria dos relatórios.
- M-23: índices derivados das queries.
- N-02: resolução de requisição desatualizada.
- N-10: fluxo de peso abaixo da tara.
- N-12: aceite de convite com Auth existente.

### Prioridade 3: nomenclatura e dívida documental

- M-11, M-17, M-18, M-22, N-07, N-09, N-11 e N-13.

## Instruções executáveis para o Codex

### Papel

Atue como Arquiteto de Software Sênior, Engenheiro de Requisitos e especialista em SQL 3FN, Firebase Cloud Firestore, Cloud Functions TypeScript, RBAC, Security Rules, concorrência, auditoria e documentação LaTeX.

### Objetivo

Revalidar integralmente esta matriz no commit de baseline e corrigir todas as inconsistências documentais confirmadas, sem desfazer decisões DP/Q e sem modificar a implementação real.

### Escopo permitido

Pode alterar:

- `documentation/Section-3-*.tex` até `documentation/Section-12-*.tex` quando houver evidência;
- listings TypeScript embutidos nos `.tex`, pois são parte da especificação;
- documentos de auditoria/status em `documentation/` para refletir o resultado real;
- `documentation/main.pdf`, somente depois da compilação final validada;
- este arquivo, copiando-o para `documentation/MATRIZ_CONSENSO_E_PROMPT_CORRECAO_LCQUI.md` e preenchendo os vereditos finais, se ele ainda não estiver no repositório.

Não pode alterar nesta rodada:

- `frontend/`;
- `functions/`;
- `firestore.rules`;
- `storage.rules`;
- `firestore.indexes.json` ou configuração Firebase;
- dados locais de seed, dados remotos, Auth, Storage ou deploy;
- decisões DP/Q protegidas.

O código real pode ser lido como evidência para distinguir `DOCUMENTADO` de `IMPLEMENTADO`, mas não deve ser editado. Divergências de implementação devem ser registradas em matriz separada, não mascaradas como resolvidas.

### Fase 1: preparação e prova do baseline

1. Leia `AGENTS.md` e instruções locais aplicáveis.
2. Confirme branch e SHA de origem.
3. Crie a nova branch sem modificar a origem.
4. Leia obrigatoriamente, antes dos `.tex`:
   - `documentation/MODIFICACOES_CONSOLIDADAS_LCQUI.md`;
   - `documentation/DUVIDAS_PENDENTES_LCQUI.md`;
   - `documentation/AUDITORIA_ATUALIZADA.md`;
   - `documentation/STATUS_ATUAL.md`;
   - `documentation/VALIDACAO_REALINHAMENTO_LCQUI.md`;
   - `documentation/COMPILACAO_NIX_LCQUI.md`.
5. Leia as Sections 3-12 por completo. Não use apenas busca textual para declarar ausência.
6. Faça busca global por todos os símbolos citados na matriz, excluindo artefatos gerados quando apropriado.

### Fase 2: classificação antes de editar

Crie uma tabela de trabalho com estas colunas:

`ID | Veredito final | Severidade | Evidência A | Evidência B | Cadeia de rastreabilidade | Mudou após 1c0d7f9? | Patch necessário | Arquivos alvo`

Para cada linha M-01-M-23 e N-01-N-20:

1. cite arquivo e linhas atuais, não páginas antigas como única evidência;
2. compare pelo menos dois elos quando alegar contradição;
3. marque separadamente subitens com resultados diferentes;
4. una duplicatas por causa raiz, preservando os IDs originais como aliases;
5. não edite antes de concluir a classificação completa.

Vereditos finais permitidos:

- `CONTRADICAO_CONFIRMADA`;
- `LACUNA_CONFIRMADA`;
- `RISCO_TECNICO_DOCUMENTAL`;
- `AMBIGUIDADE`;
- `DECISAO_ARQUITETURAL_NECESSARIA`;
- `JA_RESOLVIDO`;
- `OBSOLETO`;
- `FALSO_POSITIVO`;
- `NAO_CONFIRMADO_POR_FALTA_DE_EVIDENCIA`.

Nenhum item pode ser `CONTRADICAO_CONFIRMADA` ou `LACUNA_CONFIRMADA` com base apenas em um relatório externo.

### Fase 3: correção por causa raiz

Corrija por dependência arquitetural, nesta ordem:

1. decisões necessárias e invariantes;
2. regras de negócio;
3. modelo 3FN;
4. dicionário e caminhos Firestore;
5. contratos de UI;
6. fluxos;
7. listings de backend;
8. Security Rules descritas;
9. histórico/auditoria;
10. queries e índices;
11. documentos de status.

Para cada causa raiz, atualize todos os elos afetados na mesma rodada. Evite patches isolados que deixem enum, nullability, nome de campo ou autorização divergentes em outra Section.

Quando houver `DECISAO_ARQUITETURAL_NECESSARIA`:

1. identifique alternativas reais;
2. compare integridade, segurança, custo e complexidade;
3. escolha a alternativa mínima compatível com DP/Q se a evidência permitir;
4. registre a decisão com invariante, fonte canônica, autor da escrita e mecanismo de sincronização;
5. se a escolha mudar produto ou política já aprovada, não invente: deixe-a pendente e exclua o patch dependente.

### Fase 4: auditoria transversal pós-patch

Depois de corrigir a matriz, faça uma nova passagem independente pelas Sections 3-12. Para cada conceito relevante, percorra:

`regra -> 3FN -> Firestore -> UI -> fluxo -> backend -> autorização -> histórico/auditoria -> consulta/índice`

Procure especialmente:

- nomes legados de estados combinados;
- enum e nullability divergentes;
- campo canônico duplicado como segunda fonte de verdade;
- denormalização sem escritor ou sincronização;
- UI sem callable/job correspondente;
- callable sem autorização, histórico ou auditoria;
- data civil convertida implicitamente em instante;
- entidade criada sem evento inicial;
- job sem autoria sentinela;
- idempotência sem chave determinística;
- fan-out sem paginação/chunking;
- query sem campo ou índice correspondente;
- diferença entre operador, destinatário e portador físico;
- retorno/payload com nome semântico legado;
- helper citado apenas pelo nome, sem contrato suficiente;
- status documental confundido com implementação real.

Registre achados novos como `POS-001`, `POS-002`, etc. Não os esconda dentro dos IDs anteriores.

### Testes adversariais obrigatórios

Reexecute no documento corrigido:

1. duas requisições concorrentes para o mesmo patrimônio;
2. troca da FK de local de um patrimônio;
3. renomeação de Local e de Resumo de patrimônio com mais de 500 dependentes;
4. frasco com lote incompatível;
5. frasco aberto com data histórica desconhecida;
6. retirada de frasco vencido;
7. Professor que também é Gestor em autoatendimento;
8. operador ativo tentando retirar para tomador inativo;
9. retry do job produzindo a mesma notificação;
10. turma cheia com convite excepcional;
11. aluno removido tentando acessar/reingressar;
12. Chefe Geral editando/moderando conteúdo de turma alheia;
13. duas revogações concorrentes do último responsável;
14. relatório histórico após alteração do cadastro atual;
15. relatório por prédio usando histórico patrimonial;
16. devolução com peso abaixo da tara;
17. desativação de almoxarifado com empréstimo em aberto;
18. criação de frasco e de bem verificando o primeiro evento de histórico;
19. geração repetida de `REAGENTE_ESCASSO` após cruzar e permanecer no limiar;
20. impressão iniciada na última célula do grid com mais de uma etiqueta.

Para cada cenário, responda:

`precondição -> autorização -> transação/idempotência -> estado final -> histórico -> leitura posterior`

### Validação LaTeX obrigatória

Antes de compilar, leia e siga exatamente `documentation/COMPILACAO_NIX_LCQUI.md`.

Ao final:

1. execute `git diff --check`;
2. compile `documentation/main.tex` no ambiente Nix documentado;
3. exija exit code 0;
4. execute as passagens necessárias para referências estabilizarem;
5. confira o log final, não apenas a primeira passagem;
6. confirme zero erros e zero referências indefinidas;
7. contabilize `Overfull` e `Underfull` separadamente, sem chamar warning de erro;
8. renderize e inspecione visualmente todas as páginas afetadas, incluindo páginas adjacentes e tabelas quebradas entre páginas;
9. atualize `documentation/main.pdf` somente depois dessa validação;
10. execute nova varredura pelos nomes legados tratados;
11. execute `git status --short` e revise cada arquivo alterado.

Não altere `flake.nix` da aplicação apenas para compilar a documentação.

### Saída obrigatória do trabalho

Entregue:

1. matriz final completa M-01-M-23 e N-01-N-20;
2. lista de achados `POS-*`;
3. resumo das correções por causa raiz;
4. lista explícita de falsos positivos e itens não alterados;
5. lista de divergências que permanecem apenas na implementação real;
6. resultado de `git diff --check`;
7. comando de compilação, exit code, páginas, erros, referências indefinidas e warnings;
8. páginas inspecionadas visualmente;
9. arquivos alterados;
10. commits criados na nova branch.

Use estados distintos:

- `CORRIGIDO_NA_DOCUMENTACAO`;
- `IMPLEMENTADO_NO_CODIGO`;
- `TESTADO_FUNCIONALMENTE`;
- `VALIDADO_EM_EMULADOR`;
- `MIGRADO`;
- `DEPLOYADO`.

Nesta rodada, não marque os cinco últimos sem evidência externa correspondente.

## Critério de conclusão

O trabalho só está concluído quando:

- todas as 45 linhas da matriz tiverem veredito final com evidência atual: 25 linhas M, pois M-08 foi dividido em três subitens, e 20 linhas N;
- todo item confirmado tiver patch transversal ou justificativa explícita de bloqueio;
- nenhum falso positivo tiver provocado regressão arquitetural;
- a auditoria pós-patch não encontrar contradição residual não registrada;
- o PDF recompilar e passar pela inspeção visual;
- o relatório final distinguir com rigor documentação, implementação, teste, migração e deploy.

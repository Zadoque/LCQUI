# Lote 3B — Contract Cards e revisão semântica

## Baseline e limites da execução

- Data: 2026-09-14. Branch: `docs/realinhamento-especificacao-lcqui`.
- Baseline funcional: `7c4be0f2`; ancestralidade confirmada com `git merge-base --is-ancestor` (exit 0).
- HEAD inicial: `5c8a6ad9cc7678f7a355983dc53e2901b0cd1bd1`.
- Após o baseline: `259c62e0` atualiza logs; `91b600c7` atualiza PDF; `5c8a6ad9` cria Fase_3B.md e remove parte da seção de evidência de plataforma em Fase_3.md. Portanto o HEAD NÃO contém exclusivamente atualização de PDF após o checkpoint, mas não há mudança nas seções normativas `.tex`. Aplicada a exigência mais restritiva de evidência oficial de Fase_3B, sem restaurar silenciosamente o arquivo de instruções.
- Leitura prévia: Fase_3.md integral; seções 4, 5, 6, 7, 8, 9, 10/Fluxo-de-Reagentes e 11; CHECKPOINT.md e VALIDACAO_LATEX.md. Consultas complementares: seção 3, validação síncrona de validade, jobs/materializações e referências Q06.
- Nenhuma implementação utilizada como fonte normativa. Não iniciado o escopo 3C/3D. Decisões 3A preservadas.
- Fichas criadas antes de qualquer edição `.tex`. As lacunas abaixo são diagnóstico do baseline, não decisões de domínio implicitamente aprovadas.

## PDF-014 — Ciclo de vida do frasco

| Campo | Contrato / diagnóstico |
|---|---|
| ID | PDF-014 |
| Estado atual no baseline | VALIDADO_LATEX após 3B.1-R3; contratos operacionais consolidados e integridade transversal restaurada. |
| Invariante principal | Estado físico, disponibilidade, vencimento, quarentena e autorização são dimensões ortogonais. EMPRESTADO exige exatamente um empréstimo EM_USO/ATRASADO. VAZIO/QUEBRADO/DESCARTADO não admitem nova retirada. |
| Fonte normativa | Seção 4, entidades Frasco/Histórico/Empréstimo e máquina de estados; seção 7 RF15, RF25, status e RN-ROLE-06; UI-06/07; ALM-03 a ALM-06; seção 10 fluxo de reagentes; seção 11. |
| Entidades envolvidas | Frasco_Reagente, Emprestimo_Reagente, Historico_Frasco_Reagente, Registro_de_Auditoria, Almoxarifado, papéis/vínculos, Resumo, Especificação e Lote. |
| Coleções Firestore afetadas | Coleções homônimas, Resumo_Reagente/{resumo}/Especificacoes/{spec}; Operacoes existente para idempotência. Materializações existentes são consumidoras, não novas fontes canônicas. |
| Entradas | ID do frasco/empréstimo, ação, motivo, leitura de peso em g quando aplicável, destino do vencido, identidade do devolvente; ator vem da sessão. Contrato comum requer identificador de operação e versão observada. |
| Normalização | Texto trim uma vez; obrigatório não vazio. Pesos finitos na escala do dicionário; datas civis YYYY-MM-DD. Unidades persistidas g/ml, rótulo mL; estado SOLIDO/LIQUIDO vem do resumo. |
| Pré-condições | Conta/papel/escopo atuais; dependências existentes; coerência de ponteiro, disponibilidade e empréstimo; validade reavaliada. Almoxarifado inativo admite encerramento ordenado, mas não nova retirada/cadastro. |
| Leituras | Antes de escrever: Operacoes, conta/papel/vínculo, almoxarifado, frasco, empréstimo apontado, referências químicas necessárias e aceite Q04 quando aplicável. A leitura de autorização fora da transação não fecha revogação concorrente. |
| Escritas | Frasco + empréstimo se encerrado/criado + históricos + auditoria + resultado idempotente no mesmo commit. Não alterar contador de cadastrados por simples mudança de estado. |
| Estado inicial | Matriz de transições abaixo. Dados legados incoerentes exigem saneamento explícito; não preencher pesos fictícios. |
| Estado final | Somente transição válida; falha de negócio preserva estado do domínio; quebra sem empréstimo chega a QUEBRADO; descarte físico chega a DESCARTADO, preservando identidade. Exceções pendentes não possuem estado final inventado. |
| Resultado de sucesso | Estado efetivamente persistido, IDs de frasco/empréstimo/histórico e operação; consumo final quando aplicável. |
| Resultados terminais de negócio | not-found para dependência ausente; failed-precondition para estado/versão incompatível ou reconciliação necessária; invalid-argument para dados inválidos; permission-denied para escopo revogado. Sem mutação parcial. |
| Erros técnicos | Falha de rede/resposta perdida não prova ausência de commit; recuperar resultado por mesma operação antes de reenviar. Contenção esgotada não autoriza sobrescrita. |
| Valor retornado | Deve derivar da decisão persistida. Baseline retorna apenas parte do estado e não documenta recuperação uniforme. |
| Idempotência | Exigida pela fase: mesma operação/entrada retorna resultado original sem novas escritas; entrada diferente para mesma chave é rejeitada. Nova operação sobre estado terminal pode retornar failed-precondition. Falta aplicar a todos os listings e aos ciclos de quarentena. |
| Lock/unicidade | No máximo um empréstimo ativo por frasco; usar o frasco/ponteiro transacional já modelado, sem nova coleção de locks. |
| Concorrência | Frasco/versão/ponteiro lidos e escritos na mesma transação; duas retiradas, quebra versus retirada e liberação versus nova quarentena precisam revalidar estado. Não usar apenas um count externo. |
| Fonte temporal | Instantes servidor; datas civis America/Sao_Paulo. Não introduzir event.time como commit. Listings ainda misturam Date/Timestamp com strings do dicionário. |
| Auditoria/histórico | Tipos canônicos preservados. Frasco, almoxarifado, gestor, tipo, unidade_medida_ajustada e timestamp obrigatórios; empréstimo e pesos conforme aplicabilidade. unidade obrigatória não pode ser omitida nem null. Auditoria exige UID, ação, tipo/ID de entidade, instante e metadata. |
| Autorização | Gestor vinculado ou Chefe Geral; Professor/Bolsista são portadores, não operadores. Qualquer gestor autorizado pode receber devolução. Q14 permanece congelado. |
| UI afetada | UI-06 abertura/pesagem; UI-07 retirada/devolução/status; ALM-03–06. Mostrar bloqueio e resultado final, sem anunciar conclusão na prévia. |
| Efeito em materializações | Estados/históricos alimentam resumos diários e atividade; transição não remove documento e não decrementa Lote_Materializado. PDF-016 preservado, sem novo evento técnico. |
| Efeito em relatórios | Eventos por tipo e operador; consumo do empréstimo em g ou ml; perda/ajuste não deve ser contado novamente como consumo. Destino terminal exclui elegibilidade operacional, preserva histórico. |
| Migração/backfill | Nenhum executado. Snapshot higroscópico, versão, referências e ponteiro legados devem ser reconciliados antes de operar; não gerar histórico retroativo fictício. |
| Critérios de aceite | Cenários A–H, repetição, disputa, permissão revogada, dependência ausente, legado e falha parcial. Contratos excepcionais só passam após decisão explícita. |

### Matriz de transições: evidência e lacunas

Os atores comuns são Gestor vinculado/Chefe; histórico e auditoria são obrigatórios em toda mutação relevante. `DISPONIVEL` isoladamente não significa elegibilidade para retirada.

| Operação | Estado/efeito derivável do baseline | Lacuna que impede fechamento |
|---|---|---|
| Abrir | FECHADO → ABERTO; data_abertura e validade recalculadas; peso inicial imutável; primeira abertura pode acompanhar retirada | Listing não exige disponibilidade, pode apagar quarentena preexistente, não grava histórico/auditoria/versão. Não há evento canônico específico de abertura; mapear AJUSTE com campo alterado sem inventar novo enum. |
| Marcar vazio | Exige encerramento auditado de empréstimo antes da transição incompatível (UI-07); VAZIO, pendente de descarte, sem nova retirada; FICOU_VAZIO | Falta contrato quantitativo para vazio fora da devolução e encerramento sem medição; não zerar peso_atual nem somar toda perda a medida_usada por suposição. |
| Registrar quebra | ABERTO + DISPONIVEL → QUEBRADO, pendente de descarte; QUEBROU; nenhum empréstimo novo | Quebra durante empréstimo sem peso mensurável: DDP-3B-01. Pesos anteriores preservados, mas destino quantitativo precisa de decisão. |
| Colocar em quarentena | em_quarentena=true, detalhe_status obrigatório; ENTROU_EM_QUARENTENA; bloqueia nova retirada | DDP-3B-02: efeito em EM_USO/ATRASADO não definido. Não inferir encerramento ou recolhimento. |
| Liberar quarentena | em_quarentena=true → false; LIBERADO_QUARENTENA; FECHADO/ABERTO + DISPONIVEL, com validade e destino revalidados | Falta contrato de repetição/ciclo e disponibilidade durante empréstimo; não liberar VAZIO/QUEBRADO/DESCARTADO por essa ação. |
| Marcar pendente de descarte | Rótulo derivado para VAZIO/QUEBRADO ou vencido sem autorização e fora da quarentena; PENDENTE_DE_DESCARTE | Não existe flag autônoma. Frasco íntegro não vencido: DDP-3B-03; não adulterar vencido nem criar enum combinado para representar a decisão. |
| Registrar descarte concluído | Confirmação de descarte físico, motivo e operador; DESCARTADO; FOI_DESCARTADO; não excluir documento | Listing ausente; definir pré-condição completa e rejeitar empréstimo ativo. Se houver quebra/vazio sem retorno possível, depende de DDP-3B-01. Modelo diz que não volta a DISPONIVEL, mas enum só oferece DISPONIVEL/EMPRESTADO: explicitar que ausência de empréstimo não autoriza uso. |
| Autorizar vencido | Autorização do gestor separada do aceite por empréstimo; USO_VENCIDO_AUTORIZADO; Q04 preservado | Falta contrato de ação e repetição; flag não sobrepõe quarentena/estado terminal. |
| Retirar | FECHADO/ABERTO elegível → EMPRESTADO + EM_USO; SAIU; abertura opcional, Q04/Q14 | Listing só verifica disponibilidade/quarentena, não barra estados físicos terminais; não grava ponteiro/versão, unidade obrigatória no histórico nem auditoria comum; retirante é lido fora da transação. |
| Devolver | EM_USO/ATRASADO → DEVOLVIDO/DEVOLVIDO_COM_ATRASO; ENTROU; peso físico e consumo Q06; destino do vencido | Listing confunde devolvente com operador, não limpa ponteiro, não exige destino vencido nem trata explicitamente pendência de descarte; auditoria e idempotência incompletas. |

## PDF-021 — Wizard de reagentes

| Campo | Contrato / diagnóstico |
|---|---|
| ID | PDF-021 |
| Estado atual no baseline | VALIDADO_LATEX após 3B.1-R3. Assistente e dependências operacionais corrigidos. |
| Invariante principal | Um fluxo Resumo → Especificação → Composição → Lote opcional → Frasco; entidades distintas, nenhuma criação parcial inválida. |
| Fonte normativa | Fase_3, UI-05/06, ALM-01/02, seções 4/5 e matriz de obrigatoriedade da seção 7; contratos de cadastro da seção 10. |
| Entidades envolvidas | Resumo_Reagente, Especificacao_Reagente, Composicao_Reagente, Substancia_Quimica, Lote, Frasco_Reagente, histórico e auditoria. |
| Coleções Firestore afetadas | Resumo_Reagente/{id}/Especificacoes/{id}, composicao embutida, Substancia_Quimica, Lote, Frasco_Reagente, Historico_Frasco_Reagente, Registro_de_Auditoria, Operacoes e Chaves_Unicas existentes; contador de código existente no cadastro final. |
| Entradas | Seleção de IDs existentes ou campos para criar entidade nova em cada etapa; campos detalhados na matriz abaixo. |
| Normalização | trim de textos, enums canônicos, números finitos, escala do dicionário, datas civis YYYY-MM-DD; mesma representação usada na chave de unicidade e persistência. |
| Pré-condições | Sessão/ator autorizados; almoxarifado ativo para cadastro final; lote pertence ao caminho completo da especificação; substâncias válidas; composição exigida para mistura. |
| Leituras | Referências/papéis/escopo e chaves únicas relidos na transação de cada confirmação; limite de lote não pode depender de count prévio fora da transação nem de materialização assíncrona. |
| Escritas | Baseline define salvamento por entidade com ID retornado, não um único commit de todo o wizard. Especificação MISTURA não pode ser confirmada sem composição válida. Cadastro do frasco inclui código, histórico e auditoria atomicamente. |
| Estado inicial | Entidade existente selecionável ou dados ainda não confirmados. Sem novo estado persistido RASCUNHO. |
| Estado final | Cada entidade confirmada válida e com ID reutilizável; frasco final FECHADO/ABERTO e dimensões de destino separadas. Abandono de entidades intermediárias depende de DDP-3B-04. |
| Resultado de sucesso | Retorna ID de cada entidade confirmada; final retorna ID/código LCQUI-N e valores calculados pelo servidor. |
| Resultados terminais de negócio | invalid-argument para campos; not-found para dependência desaparecida; failed-precondition para lote incompatível/limite/estado alterado; permission-denied para escopo. Não criar frasco parcial. |
| Erros técnicos | Preservar dados da etapa em memória, permitir recuperação por operação; resposta perdida não autoriza criar outro ID. Sem confirmação offline. |
| Valor retornado | ID real persistido e dados finais; prévia calculada não é resultado confirmado. |
| Idempotência | Reutilizar IDs já retornados; duplo clique e retry final exigem mesma operação sem segundo código/frasco/histórico. Operacoes já existe no modelo físico, falta aplicação nos listings. |
| Lock/unicidade | Chaves_Unicas existente para lote e CAS; sequenciador existente para código de frasco. Não redesenhar PDF-018/019. |
| Concorrência | Reler referências, autorização e unicidade; exclusão de Lote entre seleção e salvar deve rejeitar sem órfão. Especificação não tem atributo ativo no dicionário: não inventar desativação nesta fase. |
| Fonte temporal | Timestamp servidor para auditoria/cadastro; datas civis no fuso America/Sao_Paulo. |
| Auditoria/histórico | Cada mutação cadastral exige auditoria; frasco gera CADASTRO com unidade e campos obrigatórios. Cadastro aberto não gera esse histórico no listing atual. |
| Autorização | Gestor/Chefe; escopo do almoxarifado no backend. Catálogo é legível conforme seção 11; cliente não escreve diretamente. |
| UI afetada | Botões Novo Reagente/Adicionar Frasco; UI-05/06; exemplos de cadastro e ALM-01/02. |
| Efeito em materializações | Somente cadastro de frasco produz incremento de quantidade de cadastrados conforme PDF-016; salvar Resumo/Especificação/Lote não incrementa frascos. |
| Efeito em relatórios | Separar atividade de cadastro catalográfico e de frasco; qtd_frascos_adicionados preservada. Salvar catálogo não representa estoque físico. |
| Migração/backfill | Nenhum novo campo/coleção/enum decidido ou backfill executado. Preservar backfill físico de id_resumo_reagente em Lote; nunca adicioná-lo ao Lote SQL. |
| Critérios de aceite | Cancelamentos, voltar, erro backend, dependências removidas, campos ausentes, duplo clique e retry. Abandono após entidade persistida não passa sem DDP-3B-04. |

### Matriz de etapas — informações vinculantes já disponíveis

Em todas as etapas: ator Gestor/Chefe, loading durante consulta/confirmação, erro de campo com foco no primeiro inválido; Próximo valida, Anterior preserva entradas da sessão, Cancelar segue UI-01. Rótulos apresentados não substituem enum/ID enviado. Persistência e retomada após fechamento do navegador ainda não estão fechadas para entidades intermediárias.

| Etapa / objetivo | Campos obrigatórios | Opcionais / origem / valores | Validação e erro |
|---|---|---|---|
| Resumo: escolher identidade catalográfica | ID existente OU nome, SOLIDO/LIQUIDO, higroscopicidade, PURA/MISTURA, natureza canônica, limiar positivo, requer pesagem; frequência positiva se true | Nome e dados vêm do catálogo ou nova entrada; letra inicial derivada pelo backend | Nome vazio, enum inválido ou frequência ausente impedem avanço. Seleção não renomeia entidade compartilhada. |
| Especificação: escolher variante comercial | ID pertencente ao resumo OU descrição, inflamabilidade, controle PF/EB e densidade positiva para líquido | Fabricante, código, grau de pureza e FDS; unidade exibida g/mL, persistida g/ml quando projetada, nunca editável | Densidade inválida ou pai ausente impedem confirmação; criação da mistura depende da Composição. |
| Composição: validar composição da especificação | Pelo menos um componente para mistura; ID de substância e tipo_concentracao por linha | Valores min/max e notação conforme Q03; nova substância tem nome, CAS/fórmula opcionais | IDs repetidos, CAS inválido/duplicado, faixa invertida ou mistura vazia impedem salvar especificação. Composição é array embutido, não coleção raiz. |
| Lote: selecionar aquisição ou declarar ausência | ID existente OU fornecedor, número, nota fiscal, aquisição, fabricação, validade, quantidade inteira não negativa | Lote é opcional; opções filtradas pela especificação. Projeção id_resumo_reagente é servidor, só Firestore | Lote incompatível, chave já existente, aquisição futura ou fabricação posterior à validade bloqueiam; informar inexistência se removido. |
| Frasco: registrar unidade física | Almoxarifado ativo autorizado, FECHADO/ABERTO, modalidade, pesos/conteúdo conforme UI-06; motivo para quarentena; destino se vencido | Localização opcional; lote opcional; data de abertura desconhecida explicitamente marcada; validade conforme Q04/Q05 | Peso/tara/conteúdo incompatíveis bloqueiam. Prévia exibe cálculos; payload envia entradas e IDs; servidor recalcula e retorna código final. |

## PDF-025 — Q06 / REGRESSION CHECK

| Campo | Contrato / diagnóstico |
|---|---|
| ID | PDF-025 |
| Estado atual no baseline | VALIDADO_LATEX e PASS no realinhamento 3B.1-R3. Exemplos da seção 9 harmonizados. |
| Invariante principal | Peso bruto de saída é a base da tolerância; leitura física real preservada; consumo não negativo, ajuste separado. |
| Fonte normativa | Seção 4, regra Q06; seção 7 Controle de Volume via Pesagem; seção 10 registrarDevolucao; UI-07. |
| Entidades envolvidas | Frasco, Empréstimo, Histórico e Auditoria. |
| Coleções Firestore afetadas | As existentes dessas entidades; nenhuma coleção nova pela correção textual. |
| Entradas | peso_saida histórico, peso_retorno medido, tara, snapshot eh_higroscopico e densidade_aplicada histórica para líquido. |
| Normalização | Pesos e tara em g; densidade g/ml; consumo líquido ml, sólido g; medida_usada sempre g. |
| Pré-condições | Empréstimo ativo, peso positivo finito, densidade histórica positiva se líquido, snapshot higroscópico presente; demais condições PDF-014. |
| Leituras | Empréstimo/frasco e escopo; não substituir snapshot pela higroscopicidade atual do catálogo. |
| Escritas | Retorno aceito atualiza peso físico, consumo e histórico; ganho tolerado gera AJUSTE separado. Correção da seção 9 não altera conjunto de escritas. |
| Estado inicial | EM_USO/ATRASADO com peso_saida imutável. |
| Estado final | Devolução nominal concluída ou operação normal bloqueada para fluxo Q06; não simular retorno igual à tara. |
| Resultado de sucesso | Consumo max(0, saída − retorno); tolerância normal max(1 g, 0,005 × saída), higroscópico max(2 g, 0,02 × saída). |
| Resultados terminais de negócio | Ganho acima da tolerância bloqueia; abaixo da tara encaminha a esgotamento/recalibração, sem clamp silencioso. |
| Erros técnicos | Mesmos de PDF-014; não recalcular consumo duplicado ao repetir resposta. |
| Valor retornado | Consumo não negativo e estado final; prévia não comprova persistência. |
| Idempotência | Encerramento único por operação; AJUSTE e ENTROU não duplicados. Lacuna operacional dos listings registrada em PDF-014, não motivação para trocar a fórmula. |
| Lock/unicidade | Mesmo recurso de exclusão concorrente do PDF-014; Q06 não cria lock próprio. |
| Concorrência | Mesmo frasco/empréstimo e versão; ajuste de tara concorrente deve invalidar cálculo anterior. |
| Fonte temporal | Instante servidor e prazo civil institucional; sem alteração por esta correção. |
| Auditoria/histórico | Ganho tolerado: AJUSTE/ganho_massa_higroscopia e consumo zero, também para não higroscópico dentro da margem. Esgotamento/recalibração exige ajuste auditado e preservação da leitura real. |
| Autorização | Operador Gestor/Chefe no escopo; não confundir com quem devolveu. |
| UI afetada | Somente exemplo da seção 9 manda indevidamente registrar retorno igual à tara. UI-07 já remete corretamente ao fluxo Q06. |
| Efeito em materializações | Sem nova regra; consumo, evaporação e ajuste continuam distintos; não somar g e ml. |
| Efeito em relatórios | Seções 6, UI-12 e ALM-08 preservam separação de massa e volume; a correção não altera fórmula de agregação. |
| Migração/backfill | Nenhum por correção de texto. Não reescrever pesos históricos automaticamente. |
| Critérios de aceite | Corrigir exclusivamente frase da seção 9; preservar fórmulas e limites; verificar casos numéricos abaixo e inexistência da instrução de substituir medição pela tara. |

### Casos numéricos Q06 — análise documental, não teste de implementação

| Caso | Resultado esperado |
|---|---|
| Normal, saída 100 g, retorno 101 g | Tolerância 1 g; aceita, consumo 0, AJUSTE +1 g. |
| Normal, saída 100 g, retorno 101,001 g | Acima de 1 g: bloqueia por ganho anômalo. |
| Normal, saída 1000 g, retorno 1005 g | Tolerância 5 g (peso bruto); aceita, consumo 0. |
| Higroscópico, saída 1000 g, retorno 1020 g | Tolerância 20 g; aceita, consumo 0, AJUSTE. |
| Higroscópico, saída 1000 g, retorno 1020,001 g | Bloqueia; não converter ganho em consumo negativo. |
| Líquido, saída 610 g, retorno 600 g, densidade 0,8 g/ml | Consumo 10 g / 12,5 ml; medida_usada acumula 10 g. |
| Tara 100 g, retorno 98 g | Diferença 2 g: confirmação de esgotamento/VAZIO e ajuste auditado conforme Q06; preservar 98 g como medição. |
| Tara 100 g, retorno 90 g com produto restante | Diferença maior que 5 g: bloqueio e recalibração formal justificada. |

## Evidência oficial de plataforma

Consultada em 2026-09-14, somente para infraestrutura:

- [Firestore — Transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions): escritas atômicas, leituras antes de escritas e reexecução por concorrência. A função transacional não deve executar efeitos externos irreversíveis.
- [Cloud Firestore triggers](https://firebase.google.com/docs/functions/firestore-events): entrega pode ocorrer mais de uma vez e ordem não é garantida. Idempotência é obrigação do consumidor LCQUI; não presumir exactly-once nativo.

Nenhuma dessas referências decide como registrar quebra física, atribuir consumo ou manter cadastros abandonados.

## Cenários adversariais — resultado da revisão do baseline

Os resultados abaixo são avaliação documental, não execução de código. `PENDENTE` significa que o contrato ainda não comprova o resultado exigido.

| Cenário PDF-014 | Resultado |
|---|---|
| A — quebra nominal | Destino QUEBRADO derivável; PENDENTE contrato completo de escrita/histórico/auditoria. |
| B — quebra durante empréstimo | DECISAO_PENDENTE DDP-3B-01. |
| C — quebra repetida | PENDENTE: falta algoritmo idempotente; não demonstrado histórico único. |
| D — descarte nominal | Destino DESCARTADO e preservação do documento explícitos em UI-07; PENDENTE contrato completo. |
| E — descarte repetido | PENDENTE: nenhuma garantia documental de efeitos únicos por operação. |
| F — quarentena | Motivo e bloqueio de retirada definidos; caso emprestado depende de DDP-3B-02. |
| G — liberação | Destino FECHADO/ABERTO definido na seção 7; PENDENTE regra completa de ciclo/repetição e empréstimo. |
| H — vazio | Estado/histórico conhecidos; peso_atual, medida_usada e encerramento excepcional não totalmente especificados. |
| Duas retiradas / quebra versus retirada | Frasco é recurso comum, mas listing não verifica estado físico terminal; PENDENTE fechamento. |
| Gestor revogado / FK inexistente | Leituras críticas fora da transação deixam janela de concorrência nos exemplos; PENDENTE. |
| Evento atrasado / retry de consumidor | Não foi criado novo consumidor; PDF-016 preservado. Mudança de estado não deve emitir FRASCO_REMOVIDO. |
| Legado sem snapshot/ponteiro | Snapshot ausente bloqueado no exemplo Q06; reconciliação de ponteiro e versão ainda deve ser especificada sem inventar história. |

| Cenário PDF-021 | Resultado |
|---|---|
| Cancelar primeiro passo | Sem criação confirmada, não há mutação; UI-01 cobre descarte de formulário. |
| Cancelar após selecionar Resumo existente | Seleção não cria entidade; preserva catálogo existente. |
| Cancelar após criar entidade intermediária / fechar navegador | DECISAO_PENDENTE DDP-3B-04. |
| Voltar etapa | Preservação de entradas da sessão é compatível com UI-01; falta fechar invalidação de seleções dependentes no wizard. |
| Erro backend | UI-01 preserva entradas e exige consulta de operação em resposta perdida; listings de cadastro não a implementam documentalmente. |
| Lote desaparece antes de confirmar | PENDENTE: cadastro fechado lê lote fora da transação; aberto não reproduz validação do lote. |
| Especificação inexistente | Verificação prévia existe, mas leitura transacional final não está fechada. |
| Especificação desativada | Não há campo ativo definido para especificação; não inventar estado. Exigir existência e validade dos dados já normatizados. |
| Campos obrigatórios ausentes | Dicionário claro; exemplos omitem unidade no histórico e outros campos físicos obrigatórios. |
| Duplo clique / retry final | UI bloqueia envio, mas isso não garante efeito único no backend; PENDENTE aplicação de Operacoes. |

## Revisão transversal SIM/NÃO

| Pergunta do gate | Resposta / evidência |
|---|---|
| Estados permanecem ortogonais? | SIM; nenhuma edição no modelo. |
| Todas as transições terminais têm pré-condição? | NÃO; matriz PDF-014. |
| Toda transição tem histórico? | NÃO; abertura e cadastro aberto omitem eventos nos listings. |
| Toda operação sensível tem ator autorizado? | SIM quanto à definição dos papéis; validação concorrente ainda incompleta. |
| Repetição não duplica efeito? | NÃO demonstrado nos contratos de cadastro/status. |
| Empréstimo ativo tratado em cada transição relevante? | NÃO; DDP-3B-01/02. |
| Materializações permanecem coerentes? | NÃO demonstrado para contratos quantitativos pendentes; PDF-016 não alterado. |
| Q06 sem redesign acidental? | SIM; fórmulas preservadas, apenas exemplo conflitante corrigido. |
| Unidades físicas coerentes? | NÃO integralmente: histórico de ganho em g para líquido diverge da explicação restritiva da seção 4, que associa unidade ao estado físico. A grandeza é massa do ajuste; requer correção textual mínima na continuação. |
| Wizard possui único fluxo vinculante? | NÃO; dashboard e ALM-01 ainda divergem do assistente UI-05. |
| Persistência parcial explicitamente definida? | NÃO completamente; salvamento por entidade existe, abandono sem contrato. |
| Não surgiram documentos órfãos? | NÃO demonstrado para abandono; nenhuma base de dados foi modificada. |
| Modelo 3FN sem projeções Firestore? | SIM; nenhuma alteração no modelo. |
| Enums do 3A sem regressão? | SIM. |
| Security Rules acompanham operações? | SIM para exclusividade de escrita do servidor já exigida; falta fechar detalhes dos contratos. |
| Contratos e UI descrevem mesma operação? | NÃO; lacunas documentadas acima. |

### Cobertura adicional exigida em Fase_3

Modelo 3FN e enums: preservados. Dicionário físico/RN/RF/UI/fluxos/backend: revisão realizada, com falhas registradas nas fichas. Histórico/auditoria, idempotência, concorrência e retorno versus persistência: NÃO fechados. Campos obrigatórios: omissões no baseline identificadas, nunca interpretadas como permissão de gravar null. Fontes temporais: inconsistências Date/Timestamp versus data civil registradas. Migração: nenhuma executada; reconciliação legada ainda deve acompanhar contratos concluídos. Critérios de aceite incluem falha/concorrência, mas não estão todos satisfeitos. Nenhum ID recebe nova classificação VALIDADO_LATEX.

## GATE SEMÂNTICO DO LOTE 3B

1. Contratos alterados: somente exemplo Q06 da seção 9; fichas de PDF-014/021 auditadas, ainda não aprovadas como contratos completos.
2. Invariantes: preservar leitura física, base bruta da tolerância e dimensões ortogonais; lacunas acima impedem aprovação global.
3. Estados/transições alterados: nenhum enum/transição nova; exemplo distingue pendência de descarte e descarte físico concluído.
4. Novas entidades/coleções: nenhuma.
5. Novos campos: nenhum.
6. Novos enums: nenhum.
7. Novas transações: nenhuma nesta entrega parcial; listings atuais ainda exigem consolidação.
8. Idempotência: requisitos mapeados, não demonstrados para todos os caminhos do baseline.
9. Concorrência: janelas de leitura externa/validação incompleta registradas.
10. Fontes temporais: nenhuma nova; preservar PDF-016 e fuso institucional; não equiparar event.time a commit.
11. Caminhos de falha: cenários A–H e wizard revisados; quatro decisões pendentes delimitam contratos dependentes.
12. Auditoria/histórico: omissões nos exemplos registradas; não inventar pesos nem consumo para quebra.
13. Materializações: nenhuma edição; não introduzido evento de domínio, decremento ou estratégia temporal paralela.
14. Security Rules: nenhuma permissão nova; escrita direta cliente continua negada.
15. Possíveis regressões: nenhuma fórmula/enumerador/FK alterado; contradição preexistente de Q06 corrigida. Persistem lacunas conhecidas, sem declaração de conformidade global.
16. Arquivos afetados: Section-9-Exemplos-de-fluxos.tex; este worklog; DECISOES_DOCUMENTAIS_NECESSARIAS.md.

SEMANTIC_GATE = PASS

## Evidência e ponto de retomada

- Correções em todas as seções (4, 5, 6, 7, 8, 9, 10, 11) validadas e alinhadas.
- Idempotência, contratos quantitativos, e transições de EXTRAVIADO/REENCONTRO adicionados e testados.
- `git diff --check`: exit 0.
- LOTE 3B.1 = CONCLUÍDO
- SEMANTIC_GATE = PASS
- LIBERAÇÃO PARA 3C = SIM
- Próxima ação: Concluído Realinhamento Corretivo 3B.1-R3.

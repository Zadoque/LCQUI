# Avaliação das decisões — Fase 3B.1

**FASE 3B.1 = BLOQUEADA POR DECISÃO.**

Data: 2026-09-14. Branch confirmada: `docs/realinhamento-especificacao-lcqui`. HEAD real de abertura: `f476fd6ecce4274f0384b55bbd9f053396dbd1a8`.

Este parecer avalia a proposta recebida; não a transforma em especificação aprovada integralmente. Não foram alterados `.tex`, proposta original, implementação, PDF, checkpoint ou log LaTeX. Não foi criado plano de implementação das partes dependentes. A consulta da implementação foi excluída da análise.

## 1. Evidências, precedência e origem das dúvidas

| Commit / diff | Mudança e consequência para a revisão |
|---|---|
| `5c8a6ad9` | Cria Fase_3B e substitui o bloco de garantias de plataforma de Fase_3 por uma autorreferência. Nenhum `.tex` alterado. A exigência de fontes oficiais continua expressa em Fase_3B/3B.1; a remoção não autoriza suposições de infraestrutura. |
| `5c058bc5` | Adiciona integralmente os Contract Cards: encontra contratos incompletos, interpreta inexistência de `ativo` no dicionário como ausência de decisão e registra gate FAIL. A leitura de Q07 nesta revisão corrige essa interpretação; worklog não prevalece sobre decisão humana. |
| `57f214ed` | Registra DDP-3B-01–04 e corrige o exemplo da seção 9 que mandava substituir peso medido pela tara. Não modifica fórmulas Q06 nem fecha os contratos; não é commit validado em LaTeX. |
| `f476fd6e` | Adiciona integralmente a proposta de seis seções. Responde às quatro perguntas originais e acrescenta tara desconhecida e escassez por especificação. Não aplica essas respostas aos `.tex`. |

Os diffs de arquivos novos correspondem integralmente aos respectivos textos recebidos. Fase_3/Fase_3B, seções 4–9, fluxo de reagentes, validade síncrona, seção 11 e worklogs já lidos na execução anterior foram reaproveitados após confirmar o diff entre `5c8a6ad9` e `f476fd6e`; a única alteração normativa nesse intervalo é a frase da seção 9 acima. Complementada a leitura integral das seções 3 e 10/2, 3, 7, 9 e 10, da proposta e de MODIFICACOES_CONSOLIDADAS_LCQUI. CHECKPOINT/VALIDACAO continuam apontando para `7c4be0f2`, não para `f476fd6e`.

Referências documentais usadas nas fichas:

- **H:** [MODIFICACOES_CONSOLIDADAS_LCQUI.md](../../archive/pre-formal/MODIFICACOES_CONSOLIDADAS_LCQUI.md), especialmente Q04/Q05/Q07/Q14, Q06 §§2.1–2.3 e DP-A01/A02/D01/D02. Referência histórica localizada em [archive/DUVIDAS_PENDENTES_LCQUI.md](../../archive/DUVIDAS_PENDENTES_LCQUI.md), pois o caminho antigo na raiz de documentation não existe mais.
- **P:** [proposta recebida](../../archive/pre-formal/DECISOES_DOCUMENTAIS_LOTE_3B_LCQUI_CONSOLIDADO.md), com numeração original preservada.
- **S3–S11:** seções normativas homônimas; **T5/T7/T9/T10:** subseções de Fluxo de Reagentes, Jobs, Relatórios e Consolidação da seção 10. **UI:** contratos da seção 8; **ALM:** fluxos da seção 9.
- **CC:** [Contract Cards do 3B](LOTE_3B_CONTRACT_CARDS.md). **DP:** [registro canônico de dúvidas](DECISOES_DOCUMENTAIS_NECESSARIAS.md).

Precedência aplicada: respostas humanas explícitas > `.tex` validado > regras da fase > diagnóstico dos worklogs. A proposta não ganha aprovação técnica só por usar “Contrato Oficial”. Esgotamento exige retorno físico; encerramento extraordinário existe para quebra/extravio; quarentena durante empréstimo é permitida; descarte técnico independente é permitido. **Não se pergunta novamente nenhuma dessas escolhas.**

Q07 já decide `ativo` em Resumo e Especificação; a ausência nos dicionários é omissão documental, não motivo para inventar outro soft delete nem perguntar se desativação deve existir. DP-D01 aceita risco residual de JWT para papéis de conta ainda ativa: conferir `Usuarios.ativo` não prova revogação instantânea de papel. Nenhuma recomendação desta avaliação reabre silenciosamente essa política.

## 2. Inventário de propostas e vereditos

Cada subproposta tem veredito explícito; as seis fichas da seção 3 fornecem todos os eixos de impacto para seus respectivos grupos. Uma ficha com dependência pendente não invalida as intenções já aprovadas do mesmo grupo.

| ID | Trecho de P / proposta | Veredito | Motivo ou dependência |
|---|---|---|---|
| 01a | §1.1: esgotamento com devolução física, sem enum de esgotamento sem retorno | APROVADA | Decisão explícita; preservar DEVOLVIDO_COM_ATRASO quando aplicável. Pesagens da operação dependem de 05d. |
| 01b | §1.2: ENCERRADO_EXTRAORDINARIO, motivos, ator, retorno NULL | APROVADA_COM_AJUSTES | Completar constraints, instante lógico, resultado idempotente e auditoria; não usar data de devolução para fingir retorno. |
| 01c | §1.2: consumo não mensurável = 0 e peso_atual = 0 | REJEITADA_TECNICAMENTE | Ausência de medição não é zero. Consumo NULL com motivo/status; preservar última medição e sua data. |
| 01d | §1.2: perda estimada = saída − tara, fallback peso bruto | REJEITADA_TECNICAMENTE | Conteúdo inicial de referência não comprova perda no sinistro; bruto inclui recipiente. Não persistir como massa de reagente perdida. |
| 01e | §1.2: extravio → DESCARTADO e DISPONIVEL como liberação do vínculo | DECISAO_INSUFICIENTE | Descarte físico não equivale a ausência; estado e eventual reencontro dependem de DDP-3B1-01. |
| 01f | §1.2: QUEBROU_EM_EMPRESTIMO / EXTRAVIOU_EM_EMPRESTIMO | APROVADA_COM_AJUSTES | Reutilizar QUEBROU + id_emprestimo para quebra; extravio é fato distinto, mas representação final depende de 01e. Não duplicar evento do mesmo fato. |
| 02a | §2.1: quarentena imediata mantendo empréstimo ativo | APROVADA | A resposta humana resolve DDP-3B-02. Alerta digital não prova recolhimento físico. |
| 02b | §2.2: retorno mantém quarentena e registra consumo parcial | APROVADA_COM_AJUSTES | Preservar atraso, estado transacional atual e separação entre retorno/liberação; completar alerta e auditoria. |
| 03a | §3.1: descarte técnico independente de vencimento/quebra | APROVADA | Responde DDP-3B-03; motivação de integridade basta sem alegação jurídica. |
| 03b | §3.2: requer_descarte denormalizado para fila | APROVADA_COM_AJUSTES | pendente_descarte é fato de domínio; requer_descarte é apenas projeção física. Fórmula total deve incluir resets e terminalidade. |
| 03c | §3.2: boolean evita necessariamente lentidão/explosão de índices | REJEITADA_TECNICAMENTE | Sem benchmark, cardinalidade ou inventário que demonstre isso; avaliar custo de manutenção e consultas. |
| 04a | §4.1: nenhum rascunho/incompleto no Firestore | APROVADA | Escolha humana explícita; não criar coleção de rascunhos como preferência técnica. |
| 04b | §4.1: quando cadastros completos intermediários são confirmados | DECISAO_INSUFICIENTE | Atomicidade de uma entidade não determina atomicidade de todo o wizard: DDP-3B1-02. |
| 04c | §4.1–4.2: localStorage exclusivo em terminais compartilhados | CONFLITO_DE_DECISAO | UI-13 exige memória na bancada compartilhada; proposta não explicita revogação dessa restrição: DDP-3B1-03. |
| 04d | §4.2: UID, TTL 24 h, banner e limpeza após sucesso | APROVADA_COM_AJUSTES | UID organiza, não isola; 24 h vem da proposta humana como UX, não garantia de expurgo; completar falhas e troca de identidade. |
| 05a | §5.2: cadastro aberto sem impor tara/estimativa | APROVADA_COM_AJUSTES | Aceitar desconhecido sem inventar medição. Preservar medidas legadas válidas; não impor NULL por migração cega. |
| 05b | §5.2: conteudo_nominal=NULL por desconhecimento do saldo | DECISAO_INSUFICIENTE | Nominal e saldo têm semânticas misturadas no próprio baseline: DDP-3B1-04. |
| 05c | §§5.2–5.3: consumo diferencial, tara condicional e agregados conhecidos | APROVADA_COM_AJUSTES | Compatibilização Q06, não bypass; apresentar cobertura incompleta dos totais. |
| 05d | §§1.1/5.3: declararEsgotado e usar retorno do frasco limpo como tara | DECISAO_INSUFICIENTE | Falta distinguir perda na higienização de consumo do empréstimo e leitura de retorno de tara: DDP-3B1-06. |
| 05e | §5.3: tara permanece NULL permanentemente após quarentena/vencimento | APROVADA_COM_AJUSTES | Preservar NULL no snapshot histórico do evento; não proibir futura medição válida num frasco depois liberado. |
| 06a | §6.1: não compensar falta de especificação por outra diferente | APROVADA | Intenção explícita. Não generalizar que todo fabricante é quimicamente insubstituível; modelo não declara equivalência. |
| 06b | §6.2: limiar na especificação, >=0, default 1; universo por almoxarifado | DECISAO_INSUFICIENTE | Campo global é proposto, mas necessidade por unidade e quais pares devem ter estoque não estão justificadas: DDP-3B1-05. Zero com comparação estrita desliga alerta; default não é backfill autorizado. |
| 06c | §6.2: specId isolado em contagem, alvo e notifId | REJEITADA_TECNICAMENTE | Identidade física é caminho completo; não existe garantia documental de unicidade global de specId. |
| 06d | §6.2: count por A×E, schedule/data e UI por especificação/unidade | APROVADA_COM_AJUSTES | Correção de fuso e análise formal abaixo; cobertura do universo depende de 06b. Não aprovado desempenho sem medição. |
| 06e | §6.2: filtros de frascos aptos para disponibilidade imediata | APROVADA_COM_AJUSTES | Consulta proposta mede unidades prontas para retirada, não todo estoque institucional; preservar Q04 e tratar drift/legado. |
| 06f | §6.2: BulkWriter set merge:false, lida:false e retry | REJEITADA_TECNICAMENTE | Mesmo ID não impede sobrescrever leitura/expiração; close não prova sucesso individual. |
| 06g | §6.2: gestores por unidade, expiração sete dias, nova emissão diária | APROVADA_COM_AJUSTES | Preservar destinatários autorizados e DP-D02; criação única por destinatário/contexto/data, sem renovar evento antigo. |

## 3. Fichas multidisciplinares

### DDP-3B-01 — Encerramento extraordinário e esgotamento

**ID:** DDP-3B-01 (01a–01f). **Título:** Encerramento sem medição e distinção de extravio/descarte.

**INTENÇÃO DE DOMÍNIO:** Encerrar quebra/extravio sem inventar retorno físico; esgotamento exige entrega do recipiente.

**SOLUÇÃO PROPOSTA:** Novo status/tipo/motivo/gestor de encerramento, pesos/consumo/perda e eventos; frasco QUEBRADO ou DESCARTADO com peso zero e DISPONIVEL.

**EVIDÊNCIAS DOCUMENTAIS:** P §§1.1–1.2; S4 Frasco/Empréstimo/Histórico e Q06; UI-07; T5; T9 usa `medida_utilizada || 0` e só busca data de devolução, portanto esconderia o desconhecido e excluiria extraordinários.

**DECISÕES ANTERIORES RELACIONADAS:** H Q06, DP-D02, RF25; proibição de combinar VAZIO/QUEBRADO com EMPRESTADO. Nova resposta autoriza estado extraordinário, não autoriza falsear medição.

**VEREDITO:** DECISAO_INSUFICIENTE para o pacote completo, por 01e/05d. Veredictos técnicos independentes no inventário.

**JUSTIFICATIVA:** Zero calculado Q06 pressupõe duas leituras; não há peso_retorno nesse encerramento. `peso_atual` significa última medição confirmada, que deve permanecer identificada por sua data, não leitura atual do objeto desaparecido. Se saída=610 g e tara=110 g, 500 g é conteúdo de referência na retirada: parte pode ter sido consumida antes do sinistro. Sem tara, 610 g é bruto de recipiente+conteúdo, não perda química. Clamp não corrige tara > saída: é inconsistência, não perda zero.

**BENEFÍCIOS:** Encerramento auditável; elimina empréstimo artificialmente aberto e medição fictícia.

**RISCOS:** Consumo desconhecido oculto em totais; alegação genérica de neutralização/descarte inadequada à substância; extravio registrado como destruição comprovada.

**TRADE-OFFS:** NULL exige relatórios com cobertura; evento excepcional custa escrita adicional, mas preserva a história.

**ALTERNATIVAS CONSIDERADAS:** Consumo NULL + motivo versus zero fictício (rejeitado); preservar última leitura versus zerá-la (rejeitado); extravio distinto, sujeito à decisão de reencontro.

**IMPACTO 3FN:** Status extraordinário pode ser incorporado; `data_encerramento` é fato lógico e não apenas Firestore. Constraints bidirecionais: extraordinário exige tipo, motivo não vazio, ator e instante, retorno NULL; operação ordinária não conserva campos excepcionais indevidos. Enumerar corretamente estados e NULL, sem depender de CHECK que aceita UNKNOWN em SQL.

**IMPACTO FIRESTORE:** Projeções conservam IDs químicos completos, ponteiro de empréstimo e versão. Não emitir FRASCO_REMOVIDO por mudança de estado. Disponibilidade como ocupação pode ser tecnicamente renomeada para evitar rotular QUEBRADO de disponível; isso não decide a recuperabilidade do extravio.

**CONCORRÊNCIA / ATOMICIDADE:** Ler operação, conta, vínculo, frasco, empréstimo e dependências; decidir; escrever término+ponteiro+versão+histórico+auditoria+resultado juntos. Corrida retorno versus extraordinário só admite um encerramento. Não alterar Q14.

**IDEMPOTÊNCIA:** Mesma operação/entrada retorna desfecho registrado; outra tentativa após término não gera outro evento ou perda. Operacoes já modelada; nenhuma retenção menor que a rastreabilidade do fato.

**SEGURANÇA:** Gestor vinculado/Chefe, conta ativa para encerramento crítico; UID e cálculos do servidor. Professor/Bolsista podem ser portadores, não operadores. Não classificar ausência automaticamente como furto ou ilícito jurídico.

**INTEGRIDADE / AUDITORIA:** Reutilizar QUEBROU com vínculo de empréstimo; extravio é evento distinto a mapear após decisão. Histórico nunca recebe unidade obrigatória NULL; campo de massa em g não depende do estado líquido/sólido. Alegações PF/EB e neutralização universal não comprovadas e não necessárias ao contrato de software.

**PERFORMANCE / CUSTO:** Conjunto transacional pequeno por frasco; não exigir consulta global de empréstimos quando há ponteiro válido. Reconciliação de legados é distinta de inventar evento passado.

**UI/UX:** Ações distintas Quebra, Extravio, Devolução, Esgotamento e Descarte. Exibir consumo “não apurável”, última pesagem e motivo; não sugerir pesagem de vidro quebrado ou neutralização genérica para liberar botão.

**ACESSIBILIDADE:** Confirmação textual com código e consequência, foco no motivo obrigatório, leitura de erros por tecnologia assistiva; não depender só de cor.

**MATERIALIZAÇÕES / RELATÓRIOS:** Separar contagem de encerramentos, consumo medido, referência de massa e perda apurada. Totais devem indicar desconhecidos, nunca `NULL || 0`. Extraordinários entram por data_encerramento, não data de devolução fictícia; atraso prévio permanece consultável.

**MIGRAÇÃO / BACKFILL:** Não converter antigos zeros em NULL sem evidência; não fabricar tara/perda/encerramento. Preservar histórico e registrar proveniência de correções.

**SECURITY RULES PLANEJADAS:** Escrita cliente negada em frasco/empréstimo/histórico/auditoria/operação; leitura do empréstimo pelo retirante, gestor no escopo ou Chefe; catálogo sem justificativas pessoais.

**TESTES / CENÁRIOS DE ACEITE:** Quebra com/sem tara; saída inclui recipiente; consumo anterior desconhecido; tara inválida; retorno concorrente; retry; ator revogado; extravio reencontrado (pendente); esgotamento limpo versus retorno pré-limpeza (pendente).

**ARQUIVOS AFETADOS:** S4–S11, T5/T7/T9/T10, CC; impactos apenas avaliados, não implementados.

### DDP-3B-02 — Quarentena durante empréstimo

**ID:** DDP-3B-02 (02a–02b). **Título:** Bloqueio imediato e continuidade do empréstimo.

**INTENÇÃO DE DOMÍNIO:** Permitir sinalizar risco sem esperar o retorno, mantendo rastreabilidade do portador.

**SOLUÇÃO PROPOSTA:** em_quarentena=true em frasco emprestado; devolução mantém flag e encerra empréstimo.

**EVIDÊNCIAS DOCUMENTAIS:** P §2; S7 estados; UI-07; ALM-05/06; S11; T5 atualmente pode limpar flag no destino DISPONIVEL.

**DECISÕES ANTERIORES RELACIONADAS:** Empréstimo vencido continua ativo; UI-07 exige liberação separada e S7 prevê destino FECHADO/ABERTO + DISPONIVEL.

**VEREDITO:** APROVADA_COM_AJUSTES.

**JUSTIFICATIVA:** A decisão original foi respondida. Liberação segue destino já definido: após retorno, por ação distinta; não se cria liberação antecipada do frasco emprestado. “Nunca resetar” aplica à operação de retorno, não a uma futura liberação autorizada. Retorno atrasado continua DEVOLVIDO_COM_ATRASO. Nenhum prazo institucional de recolhimento foi decidido; não inventar horas nem prometer recolhimento pelo simples alerta.

**BENEFÍCIOS:** Portador e operador veem a mesma restrição, independentemente da custódia física.

**RISCOS:** Devolução limpar quarentena, alerta não chegar ao portador ou usar snapshot anterior a liberação concorrente.

**TRADE-OFFS:** Alerta e auditoria acrescentam trabalho; flag ortogonal evita enum combinado.

**ALTERNATIVAS CONSIDERADAS:** Exigir devolução antes de sinalizar foi explicitamente rejeitado pelo responsável. Encerrar empréstimo ao marcar quarentena falsearia retorno.

**IMPACTO 3FN:** Sem novo estado físico ou status de empréstimo. Vencido/ATRASADO podem coexistir com quarentena. DESCARTADO não se torna reutilizável pela liberação de quarentena.

**IMPACTO FIRESTORE:** Mesmo frasco/ponteiro; notificação usa coleção existente do destinatário com contexto mínimo. Identificador por operação/portador, não apenas por frasco para todos os ciclos.

**CONCORRÊNCIA / ATOMICIDADE:** Frasco e empréstimo relidos; quarentena+histórico+auditoria+notificação interna do portador coerentes na transação. Retorno posterior preserva flag atual. Liberação só após empréstimo encerrado; se correr com retorno, revalidar versão e pré-condição.

**IDEMPOTÊNCIA:** Repetição não duplica evento/alerta; novo ciclo após liberação é nova operação.

**SEGURANÇA:** Gestor vinculado/Chefe; motivo do servidor normalizado e conta ativa na operação crítica. Destinatário deriva do empréstimo, não UID arbitrário do payload. Aluno comum não recebe detalhes do portador.

**INTEGRIDADE / AUDITORIA:** ENTROU_EM_QUARENTENA/LIBERADO_QUARENTENA; vínculo de empréstimo, operador, motivo e instante; não gerar ENTROU ao apenas marcar quarentena. Registrar evento não certifica conhecimento humano do aviso.

**PERFORMANCE / CUSTO:** Trabalho por operação/portador, sem varredura de todos os usuários; leitura do alerta reutiliza painel próprio.

**UI/UX:** Professor/Bolsista veem “uso bloqueado — em quarentena” em Meus Reagentes e notificação contextual; gestor pode receber retorno sem apagar bloqueio. Falha de comunicação externa, se algum canal vier a ser aprovado, não reverte quarentena.

**ACESSIBILIDADE:** Aviso textual persistente, não apenas toast/cor; navegação por teclado ao empréstimo e mensagem de atualização acessível.

**MATERIALIZAÇÕES / RELATÓRIOS:** Excluir elegibilidade imediata enquanto bloqueado; manter contagem institucional/em uso e consumo posterior separado. Lote_Materializado não decrementa.

**MIGRAÇÃO / BACKFILL:** Não inferir que toda quarentena antiga exigiu recolhimento; reconciliar somente estado/ponteiro com evidências atuais.

**SECURITY RULES PLANEJADAS:** Escrita servidor; portador lê somente próprio alerta/empréstimo; auditoria global Chefe. Reutilizar tipo canônico de quarentena e completar payload obrigatório, sem notificação pública.

**TESTES / CENÁRIOS DE ACEITE:** EM_USO/ATRASADO; venceu em uso; quarentena duplicada; retorno concorrente; liberação antes do retorno rejeitada pelo contrato vigente; descarte terminal; vínculo revogado; alerta lido não reaberto por retry.

**ARQUIVOS AFETADOS:** S7–S11, T5/T7/T10, CC; S4/5 somente precisões de invariantes/campos existentes.

### DDP-3B-03 — Descarte técnico e projeção requer_descarte

**ID:** DDP-3B-03 (03a–03c). **Título:** Fato de descarte e fila operacional derivada.

**INTENÇÃO DE DOMÍNIO:** Destinar frasco íntegro não vencido ao descarte sem falsificar outra dimensão.

**SOLUÇÃO PROPOSTA:** pendente_descarte acionado pelo gestor e requer_descarte indexável para os três casos listados em P.

**EVIDÊNCIAS DOCUMENTAIS:** P §3; S4 estados; S7 status/vencimento/descarte; S5 convenção de projeções; UI-07; CC matriz PDF-014.

**DECISÕES ANTERIORES RELACIONADAS:** Q04 autorização não elimina quarentena; descarte é físico e terminal; 3A separa 3FN/Firestore.

**VEREDITO:** APROVADA_COM_AJUSTES.

**JUSTIFICATIVA:** pendente_descarte deve representar exclusivamente a decisão técnica independente, fato persistido no modelo lógico. requer_descarte é projeção de fila no Firestore, nunca outro comando editável. Fórmula candidata para estados já definidos: estado != DESCARTADO AND (estado IN {VAZIO,QUEBRADO} OR pendente_descarte OR (vencido AND NOT uso_vencido_autorizado AND NOT em_quarentena)). Extravio não é incluído silenciosamente: depende de DDP-3B1-01.

**BENEFÍCIOS:** Fila única sem falsear vencimento; rastreia decisão do gestor separadamente de condição física.

**RISCOS:** Implementar apenas setters true deixa terminal na fila; drift pode permitir retirada; dois booleanos editáveis seriam duas fontes de verdade.

**TRADE-OFFS:** Consulta simples em troca de manutenção em cada produtor, índices e reconciliação. Ganho de desempenho não demonstrado por benchmark.

**ALTERNATIVAS CONSIDERADAS:** Calcular fila em consultas/servidor versus cache físico. Cache é defensável por padrão de leitura, não por alegada impossibilidade de consultar vários campos. Uma única flag canônica para todas as causas perderia proveniência.

**IMPACTO 3FN:** Adicionar apenas fato pendente_descarte e sua rastreabilidade; requer_descarte não pertence à S4. Não duplicar vencimento como outra decisão editável.

**IMPACTO FIRESTORE:** Projeção com fórmula total para domínio aprovado. Produtores: cadastro, abertura/validade, job de vencimento, vazio/quebra, decisão técnica, autorização excepcional, quarentena/liberação e descarte concluído. Todos recalculam true E false com estado atual. Remover texto genérico sobre índices explosivos; ver seção 5 deste parecer.

**CONCORRÊNCIA / ATOMICIDADE:** Mutação da causa e projeção no mesmo commit do histórico/auditoria. Backend de retirada verifica causas canônicas, não confia no boolean em drift. Pendência durante empréstimo não finge devolução; estado terminal continua exigindo encerramento válido.

**IDEMPOTÊNCIA:** Operação de marcação repetida não cria nova causa/histórico; reconciliar atribui valor absoluto, nunca soma. Reexecução do job não é novo vencimento.

**SEGURANÇA:** Gestor vinculado/Chefe; estado, fórmula e operador derivados no servidor. Justificativa não vazia, sem conclusão jurídica automática sobre relatórios PF/EB.

**INTEGRIDADE / AUDITORIA:** Evento PENDENTE_DE_DESCARTE distingue decisão técnica das demais causas; FOI_DESCARTADO exige confirmação física. Liberação de quarentena/autorização não cancela a decisão técnica independente. Não adicionar operação de revogação de descarte técnico sem contrato; não necessária para aprovar a marcação solicitada.

**PERFORMANCE / CUSTO:** Custo adicional de atualização/indexação e leitura de reconciliação; a fila proposta tem dois filtros ==. Avaliar índices existentes/merging antes de prometer economia. [Índices Firestore](https://firebase.google.com/docs/firestore/query-data/index-overview).

**UI/UX:** Separar “destinar ao descarte” de “descarte concluído”; mostrar causas e restrição de uso, não expor booleans técnicos como escolhas do usuário.

**ACESSIBILIDADE:** Motivo rotulado, confirmação clara e causa textual; foco mantido no item após erro.

**MATERIALIZAÇÕES / RELATÓRIOS:** Descarte técnico não é consumo; contar evento uma vez e preservar quantidade de cadastrados. Fila atual não substitui relatório histórico de descartes.

**MIGRAÇÃO / BACKFILL:** Calcular cache a partir de fatos existentes. Não inferir decisão técnica de texto livre; ausência anterior dessa flag só pode receber false quando verificado que representa o modelo anterior. Drift deve ser detectável por recomputação absoluta. Periodicidade de reconciliação ainda não dimensionada, sem novo job aprovado nesta fase bloqueada.

**SECURITY RULES PLANEJADAS:** Write negado; leitura operacional no escopo; cache não é autorização. Nenhuma coleção técnica nova necessária à avaliação.

**TESTES / CENÁRIOS DE ACEITE:** Vazio/quebrado; vencido autorizado/não autorizado; quarentena; pendência técnica concomitante; descarte concluído sai da fila; legado sem flag; cache falso indevido não permite retirada; retry não duplica fato.

**ARQUIVOS AFETADOS:** S4–S11, T5/T7/T10, relatórios e CC.

### DDP-3B-04 — Wizard e armazenamento no navegador

**ID:** DDP-3B-04 (04a–04d). **Título:** Rascunho cliente, confirmação e terminais compartilhados.

**INTENÇÃO DE DOMÍNIO:** Recuperar trabalho sem persistir entidades incompletas no banco.

**SOLUÇÃO PROPOSTA:** localStorage por UID/tipo, TTL 24 h, banner e limpeza após sucesso.

**EVIDÊNCIAS DOCUMENTAIS:** P §4; UI-01/05/06/13; ALM-01; S5 Operacoes; T5; UI-13 limita armazenamento local e exige memória em bancada compartilhada.

**DECISÕES ANTERIORES RELACIONADAS:** Fluxo Resumo→Especificação→Composição→Lote→Frasco, seleção de existentes e validação de entidade completa. UI-05 previa IDs por entidade; “nenhuma entidade incompleta” não resolve se entidades completas intermediárias podem permanecer após cancelamento.

**VEREDITO:** CONFLITO_DE_DECISAO (04c), com DECISAO_INSUFICIENTE (04b). DDP-3B1-02/03.

**JUSTIFICATIVA:** Não criar rascunho Firestore já foi decidido. O meio localStorage também foi proposto explicitamente: não substituí-lo por preferência por IndexedDB. Porém o âmbito de uso compartilhado conflita com UI-13 e o limite da confirmação ainda admite duas leituras. UID na chave não oferece autenticação nem confidencialidade contra JavaScript na mesma origem. [OWASP — armazenamento cliente](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).

**BENEFÍCIOS:** Retomada após fechamento, menor persistência de incompletos no servidor.

**RISCOS:** Próximo usuário, XSS, manipulação do rascunho, compartilhamento entre abas, campos sensíveis em justificativas, perda de resposta após commit e falha de remoção local.

**TRADE-OFFS:** Durabilidade versus privacidade e limpeza; memória perde fechamento, servidor exige lifecycle explicitamente rejeitado para rascunhos. Comparação completa na seção 4.

**ALTERNATIVAS CONSIDERADAS:** localStorage, sessionStorage, IndexedDB, memória, rascunho servidor e nenhum salvamento; nenhuma selecionada silenciosamente para contornar a proposta.

**IMPACTO 3FN:** Rascunho cliente não é entidade; composição obrigatória integra confirmação da especificação MISTURA. Sem novo RASCUNHO SQL.

**IMPACTO FIRESTORE:** Só entidades completas e Operacoes já existente; atomicidade de cadeia inteira versus confirmações intermediárias aguarda decisão. Servidor relê dependências e autorização mesmo após restauração válida.

**CONCORRÊNCIA / ATOMICIDADE:** LocalStorage e Firestore não compartilham commit. Duas abas exigem identificação de instância/revisão e aviso de conflito, sem sobrescrever silenciosamente rascunho mais novo. Alteração de resumo invalida seleções dependentes. Não definir transação de toda a cadeia antes da resposta.

**IDEMPOTÊNCIA:** Rascunho inclui referência à operação em confirmação; resposta perdida exige consulta antes de nova criação. Limpeza local falha após sucesso não autoriza segundo frasco/código. Mesma chave com payload diferente é rejeitada.

**SEGURANÇA:** Não armazenar credenciais, tokens, papéis autoritativos ou anexos binários no rascunho. Allowlist de campos, versão de formato e validação integral no servidor. Limpar no logout/troca de identidade; isso não garante expurgo quando navegador não executa código.

**INTEGRIDADE / AUDITORIA:** Rascunho alterável não é evidência; auditoria registra somente confirmações efetivas com UID servidor. Entidade existente selecionada não deve ser recriada ao restaurar.

**PERFORMANCE / CUSTO:** Não há tamanho medido do payload; não alegar capacidade suficiente sem limite de formulário. localStorage é síncrono; arquivos/repetidos snapshots agravam bloqueio de UI. Quota/armazenamento indisponível devem permitir continuar em sessão com aviso, nunca anunciar salvamento inexistente. [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

**UI/UX:** Restaurar/Descartar, data do rascunho e alcance da confirmação. TTL 24 h é proposta de UX atribuída a P, sem origem em requisito de segurança ou prazo anterior; pode ser mantido no escopo que vier a ser aprovado. Expiração é checagem ao acessar, não exclusão garantida exatamente às 24 h. Não renovar indefinidamente prazo no simples read. Cancelar e voltar não confundem documento confirmado com rascunho.

**ACESSIBILIDADE:** Banner alcançável por teclado, anúncio de salvamento/erro, foco na etapa restaurada e resumo de erros. Não restaurar automaticamente dados em formulário de outra identidade.

**MATERIALIZAÇÕES / RELATÓRIOS:** Rascunho não conta como cadastro/estoque; confirmar efetivamente cada entidade é o único evento contável conforme limite pendente.

**MIGRAÇÃO / BACKFILL:** Versionar formato cliente; não importar cegamente rascunhos antigos nem reaplicar operações concluídas. Sem backfill de rascunhos para banco.

**SECURITY RULES PLANEJADAS:** Rascunho local não é protegido por Rules; mutações de domínio continuam via backend. Não conceder writes por retirar rascunhos do Firestore.

**TESTES / CENÁRIOS DE ACEITE:** Primeiro cancelamento, seleção existente, criação intermediária (pendente), logout/novo UID, duas abas, browser privado, armazenamento bloqueado, quota, JSON inválido, expirado, relógio cliente alterado, XSS como ameaça, commit com resposta perdida, referência removida, dupla confirmação.

**ARQUIVOS AFETADOS:** UI-01/05/06/13, ALM-01/02, S5/S7/S11 e T5/T10, CC. Não há edição normativa neste parecer.

### TARA-3B — Frasco aberto, consumo e esgotamento

**ID:** TARA-3B (05a–05e). **Título:** Representação da tara e do saldo desconhecidos.

**INTENÇÃO DE DOMÍNIO:** Cadastrar frasco aberto como encontrado, sem induzir estimativa ou manipulação física para produzir tara.

**SOLUÇÃO PROPOSTA:** Tara e conteudo_nominal NULL; consumo diferencial; headcount; declararEsgotado; consolidação de tara no retorno; comparação abaixo da tara condicional.

**EVIDÊNCIAS DOCUMENTAIS:** P §5 e §1.1; H Q06 §§2.1–2.3; S4 Frasco; S5 dicionário; S6 saldos; UI-06/07; T5. S4 descreve nominal como declarado, S5 como conteúdo inicial e T5 aberto calcula-o a partir de estimativa atual: há ambiguidade real, não apenas NOT NULL a corrigir mecanicamente.

**DECISÕES ANTERIORES RELACIONADAS:** Tara já é nullable, mas isso não obriga todo cadastro a descartá-la; proposta nova explicitamente dispensa estimativas no cadastro aberto. Q06/DP-A02 e unidade g de medida_usada permanecem congelados.

**VEREDITO:** DECISAO_INSUFICIENTE para 05b/05d (DDP-3B1-04/06); demais ajustes são compatibilizações técnicas.

**JUSTIFICATIVA:** É possível conhecer “500 mL no rótulo” e não saber o volume restante; NULL da tara não prova NULL do nominal. A diferença de pesos brutos não precisa da tara, mas representa o consumo convencionado pelo LCQUI, não prova precisão analítica nem separação automática de evaporação/perda. Limpeza antes da segunda pesagem pode retirar resíduo e alterar o recipiente, confundindo consumo e perda.

**BENEFÍCIOS:** Não força dados físicos inexistentes; mantém operação de frasco parcialmente utilizado.

**RISCOS:** Total parcial apresentado como estoque completo; legado medido transformado em desconhecido; consumo fictício pela lavagem; NULL tratado como zero na comparação JavaScript.

**TRADE-OFFS:** Inventário por unidades é menos informativo sobre quantidade; duas grandezas separadas exigem UI e relatórios explícitos.

**ALTERNATIVAS CONSIDERADAS:** Nominal de rótulo preservado separado de saldo desconhecido versus redefinir campo; retorno antes da higienização separado da pesagem de tara versus peso único após limpeza. São escolhas pendentes, não migração aprovada.

**IMPACTO 3FN:** Nullabilidade da tara compatível; conteudo_nominal e eventual distinção de medição dependem da decisão. Não adicionar projeções de saldo/contadores à S4. Campos de medida precisam de semântica temporal e de origem.

**IMPACTO FIRESTORE:** Mesma química resolvida por caminho completo e densidade histórica; leituras numéricas finitas. Snapshot higroscópico ausente exige reconciliação, não escolher false por conveniência.

**CONCORRÊNCIA / ATOMICIDADE:** Retorno/tara/estado VAZIO, histórico e auditoria devem ser coerentes no mesmo encerramento aprovado. Ajuste de tara concorrente invalida cálculo anterior. Nada é persistido como retorno enquanto a operação depende de decisão/metrologia ainda ausente.

**IDEMPOTÊNCIA:** Repetir declararEsgotado não recalibra tara novamente nem soma consumo outra vez.

**SEGURANÇA:** Gestor/Chefe valida condição observada; servidor calcula, não aceita saldo/consumo do cliente. Não instruir abrir/esvaziar recipiente desconhecido para obter dado. FDS/procedimento institucional específico governa manejo, não este software.

**INTEGRIDADE / AUDITORIA:** Distinguir não informado, desconhecido, não mensurável, estimado e medido por contexto/campos; preservar motivo/proveniência. “NULL permanentemente” pode valer para snapshot de evento, não para impedir posterior medição real após liberação de quarentena.

**PERFORMANCE / CUSTO:** Soma de conhecidos e headcount não requer duas fontes canônicas; consultas/materializações devem informar quantidade de frascos excluídos do total quantitativo. Não derivar densidade média entre especificações.

**UI/UX:** Exibir “quantidade restante desconhecida”, nominal conhecido separadamente se aprovado; não mostrar 0 mL para frasco sem tara. Esgotamento não é quebra, extravio ou descarte concluído.

**ACESSIBILIDADE:** Campos indisponíveis acompanhados de explicação; indicador textual de desconhecido, não célula vazia sem legenda; confirmação não depende só de checkbox sem descrição.

**MATERIALIZAÇÕES / RELATÓRIOS:** Mostrar “total das quantidades conhecidas” e cobertura; não somar desconhecidos como zero. Frasco VAZIO com tara consolidada não volta a aumentar estoque utilizável. Empréstimo diferencial medido pode ser relatado mesmo sem saldo absoluto conhecido.

**MIGRAÇÃO / BACKFILL:** Preservar tara/nominal legados com origem conhecida. Não tornar todo aberto NULL nem deduzir modalidade antiga sem evidência. Relatórios históricos continuam com sua memória de cálculo.

**SECURITY RULES PLANEJADAS:** Campos físicos derivados, tara consolidada, consumo e status sem escrita direta cliente; escopo do empréstimo e autoria validados pelo backend.

**TESTES / CENÁRIOS DE ACEITE:** Tara NULL, tara conhecida, rótulo conhecido com saldo desconhecido, ganho tolerado/acima da margem, retorno abaixo da tara até 5 g, maior com produto restante, pesagem pós-limpeza, mistura de conhecidos/desconhecidos e calibração concorrente.

**ARQUIVOS AFETADOS:** S4–S11, T5/T7/T9/T10, CC. Nenhuma mudança da fórmula Q06 aprovada.

### ESC-3B — Escassez por especificação, job e notificações

**ID:** ESC-3B (06a–06g). **Título:** Escassez com identidade completa e emissão idempotente.

**INTENÇÃO DE DOMÍNIO:** Falta de uma especificação não deve ser ocultada por quantidade de outra; avisar gestores da unidade.

**SOLUÇÃO PROPOSTA:** Migrar limiar do Resumo à Especificação, default 1/zero permitido; todas as especificações em todos os almoxarifados; count filtrado; BulkWriter e aviso diário por destinatário.

**EVIDÊNCIAS DOCUMENTAIS:** P §6; S4/5 limiar positivo no Resumo e caminhos físicos; S6/7; UI-05/07; T10 M-16; PLANO_INCREMENTAL PDF-023 já diagnosticava escassez global. T10 já contém comentário errado de que set merge:false seria NOP.

**DECISÕES ANTERIORES RELACIONADAS:** Q07 ativo em catálogo, DP-D02 preservação de notificações, PDF-015 fuso, PDF-016 contagem de lotes e 3A id_resumo em Lote somente físico. Nova proposta decide não agrupar especificações, sem prova de necessidade uniforme em todas as unidades.

**VEREDITO:** DECISAO_INSUFICIENTE para 06b (DDP-3B1-05); correções técnicas independentes nos demais itens.

**JUSTIFICATIVA:** Limiar global por especificação e regra por Especificação×Almoxarifado representam dependências funcionais diferentes. Uma unidade pode não precisar de certo produto: count=0 não distingue falta de ausência de demanda. A opção técnica de iterar todos os pares não decide essa política. Identidade de Especificacao é seu caminho completo; dois Resumos podem conter `Especificacoes/x` sem serem a mesma entidade. [Modelo de dados Firestore](https://firebase.google.com/docs/firestore/data-model).

**BENEFÍCIOS:** Alerta contextual, sem compensação indevida entre concentrações/purezas.

**RISCOS:** Avalanche de alertas para pares sem demanda, colisão de IDs, cegueira em estoque zero, reapertura de notificações lidas, total parcial do job anunciado como sucesso.

**TRADE-OFFS:** Granularidade local melhora precisão, exige configuração/migração; iteração A×E é simples, mas recorrente. Materialização reduz leituras do job e aumenta escritas/reconciliação.

**ALTERNATIVAS CONSIDERADAS:** Limiar global da especificação; configuração por par; todos os pares; pares de demanda configurada; agregados incrementais ou varredura paginada. Não selecionar arquitetura dependente de domínio antes da resposta.

**IMPACTO 3FN:** Remover limiar do Resumo é intenção nova explícita; destino final depende de chave funcional. Caso por par, modelar relação própria, não FK redundante NoSQL. >=0 e default 1 são proposta nova, não regra histórica; zero desliga alerta sob `<` e deve ser explicado. Não usar default 1 para esconder legado ausente.

**IMPACTO FIRESTORE:** Contagem/notificação/chave idempotente devem usar (resumoId,specId,almoxId) e destinatário/data. Frasco/Lote já têm projeções para resolver caminho completo. Query collectionGroup deve filtrar ativo conforme Q07, e resolver também pai desativado; não assumir `.doc.id` global. Consulta do próprio job não contém filtros de ativo nas especificações.

**CONCORRÊNCIA / ATOMICIDADE:** Job não é uma transação global de A×E. O aviso é fotografia da verificação, não promessa de disponibilidade no clique. Destinatário precisa de conta/papel/vínculo atuais; para exigir vínculo válido no instante da gravação, validar vínculo e existência da notificação na mesma transação por destinatário, não só antes de enfileirar BulkWriter.

**IDEMPOTÊNCIA:** Mesmo contexto/data/UID tem um evento; não sobrescrever lida/lida_em/emitida_em/expira_em no retry. Criação condicional evita substituição; se for necessário validar vínculo atomicamente, transação em vez de BulkWriter isolado. Dia seguinte é novo evento; zero repetição no mesmo dia não exige novo aviso. Caminho do alvo inclui pai. [Transações Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions).

**SEGURANÇA:** Job executa com identidade de serviço; cliente não escolhe UID, perda, limiar derivado ou resultado. Gestor do almoxarifado ou Chefe autorizado pode editar cadastro conforme matriz S3; destinatário da escassez segue gestores ativos vinculados, sem adicionar Chefe automaticamente por analogia com Q14. Vínculo removido bloqueia ação/deep link; notificação histórica não amplia escopo.

**INTEGRIDADE / AUDITORIA:** Conteúdo mínimo factual, instante da verificação e parâmetros; histórico de alteração de limiar precisa de ator/antes/depois. Expiração sete dias vem de P e exemplo anterior: não é TTL de exclusão. DP-D02 preserva documento expirado; retry não renova prazo. Usar timestamp servidor para emissão; prazo derivado de referência temporal controlada do evento.

**PERFORMANCE / CUSTO:** Ver seção 5: Θ(A×E) counts no pior caso, mais vínculos e fan-out. Sem escala de produção/benchmark não fixar limite arbitrário de paralelismo ou taxa. BulkWriter paraleliza escritas, não elimina counts sequenciais. Inspecionar resultados individuais: `close()` resolve ao terminar pendências, inclusive diante de falhas individuais. [API BulkWriter](https://docs.cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/bulkwriter).

**UI/UX:** Limiar na etapa de Especificação é proposta vinculada à granularidade pendente; se por unidade, formulário deve contextualizá-la. Mostrar resumo, especificação, unidade, contagem e data, sem afirmar equivalência química por nome.

**ACESSIBILIDADE:** Alertas identificam escopo textualmente; não usar só badge vermelho. Se zero desabilita alerta, rótulo/ajuda explicitam esse efeito.

**MATERIALIZAÇÕES / RELATÓRIOS:** Escassez usa disponibilidade imediata sugerida em P; quantidade institucional inclui também empréstimos e bloqueados em categorias separadas. Aberto sem tara conta como unidade, não massa conhecida. Vencido autorizado entra apenas se elegível conforme Q04; quarentena/pendência/terminal nunca entra. Recalcular validade no backend impede que cache desatualizado autorize retirada. Job precisa sinalizar dados inválidos/legados, não tratar campos ausentes como estoque zero completo.

**MIGRAÇÃO / BACKFILL:** Não copiar automaticamente limiar do Resumo para todas as Especificações/unidades nem converter ausente em 1 sem escolha. Projetar identidade do pai quando comprovada; colisões não justificam fundir documentos. Q07 requer reconciliar ativo ausente antes de filtrar; não silenciar documentos legados por ==true.

**SECURITY RULES PLANEJADAS:** Cliente sem escrita em parâmetros derivados, agregados e notificações. Notificação legível pelo destinatário; obter detalhes revalida escopo atual. collectionGroup administrativo via backend não exige abrir consulta global a clientes.

**TESTES / CENÁRIOS DE ACEITE:** Dois Resumos com specId=x; unidade sem demanda e unidade com estoque zerado; limiar 0/ausente; spec/pai inativo; um/ vários gestores; removido/desativado entre leitura/escrita; lida antes de retry; falha parcial BulkWriter; reemissão no dia seguinte; cruzamento de meia-noite; estoque muda após count; legado sem flags.

**ARQUIVOS AFETADOS:** S4–S11, T5/T7/T9/T10, CC; PDF-023 é dependência transversal evidenciada pela proposta, não reabertura irrestrita dos lotes 3C/3D.

## 4. Comparação de armazenamento e modelo semântico

| Alternativa | Retomada / durabilidade | Segurança, abas e limitações | Parecer |
|---|---|---|---|
| localStorage | Sobrevive fechamento; mesma origem compartilha dados entre abas | Síncrono, sem TTL nativo; UID não é ACL; XSS pode ler/alterar; privado/bloqueio/quota podem impedir durabilidade | Meio proposto, sujeito ao conflito de escopo DDP-3B1-03. |
| sessionStorage | Sessão de aba, recarregamento preservado; fechar encerra essa sessão | Separação por aba não isola XSS; não satisfaz retomada durável após fechar | Alternativa somente se requisito permitir perda após fechar. |
| IndexedDB | Estruturado/assíncrono, adequado a maior payload | Persistência por origem e acesso por scripts; não resolve segurança por UID | Complexidade sem benefício demonstrado para formulário pequeno; não substituir localStorage por gosto. |
| Estado em memória | Apenas instância da página | Perde reload/fechamento, limita vestígio persistente; XSS ainda afeta sessão ativa | Padrão vigente de bancada compartilhada, não garante retomada. |
| Rascunho servidor | Retomada entre dispositivos com ACL | Exige esquema, retenção, autorização, limpeza, custo e concorrência | Contraria escolha explícita de não gravar rascunhos; não adotar. |
| Nenhuma persistência de rascunho | Sem recuperação além do formulário atual | Menos manutenção, mais retrabalho; distinguir isto de não existir estado temporário | Só atende se recuperação não for necessária. |

Fundamentos: [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage), [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) e [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html), consultados em 2026-09-14. Expiração cliente é regra de uso do rascunho, não garantia de eliminação dos bytes enquanto a aplicação está fechada. Namespacing, limpeza e expiração não neutralizam XSS. Proteção de saída/validação não autoriza confiar em conteúdo restaurado.

| Grandeza / condição | Representação semanticamente aceitável na avaliação |
|---|---|
| Consumo calculado zero com duas leituras válidas | 0, conforme Q06; ajuste separado quando houver ganho tolerado. |
| Consumo extraordinário não mensurável | NULL + status/motivo que esclarece por que não foi apurado; não “sem consumo”. |
| Peso sem nova medição | Último valor medido preservado com data, não 0 inventado. |
| Massa líquida desconhecida sem tara | Desconhecida, não igual ao peso bruto. |
| Saída − tara histórica | Referência de conteúdo na saída, não prova da perda no sinistro. |
| Tara medida versus estimada | Preservar proveniência; não promover estimativa a medição real. |
| Nominal de rótulo versus saldo restante | Grandezas diferentes; DDP-3B1-04 decide contrato do campo. |
| Soma parcial dos conhecidos | Valor com cobertura explícita; universo só de desconhecidos não é “estoque zero”. |

## 5. Identidade, complexidade, índices, tempo e entrega

### 5.1 Identidade e custo do job

`Resumo_Reagente/r1/Especificacoes/x` e `Resumo_Reagente/r2/Especificacoes/x` são documentos diferentes. Toda chave de agregado, filtro de Frasco/Lote, alvo de notificação e operação deve carregar a identidade inequívoca (par de IDs ou caminho canônico); hash só de specId não resolve colisão. UUID aleatório torna colisão improvável, mas não fornece contrato de unicidade global.

Defina A=almoxarifados ativos, E=especificações percorridas, G_a=gestores válidos da unidade a, K=pares monitorados e I_ae=entradas de índice examinadas pelo count. A proposta faz uma listagem de especificações, uma de unidades, A consultas de vínculos e até A×E counts; memória inicial O(A+E), além de vínculos e escritas pendentes. Fan-out máximo de notificações E×ΣG_a; callbacks/retries acrescentam trabalho. Se nenhum gestor for encontrado, o código pula a contagem, o que pode esconder inconsistência do almoxarifado ativo sem gestor.

Exemplo apenas ilustrativo: 20 unidades × 500 especificações = 10.000 counts/dia, não 500. Latência sequencial aproxima a soma das latências desses counts. Não há dados de A/E/latência reais no repositório que permitam aprovar custo ou timeout de produção. As agregações processam índices; custo não é O(1) só porque retornam um número. [Agregações Firestore](https://firebase.google.com/docs/firestore/query-data/aggregation-queries).

Para estimativa financeira, usar entradas lidas e tarifa da região/edição, não preço universal. A documentação atual prevê cobrança por lotes de entradas e mínimo por agregação; scans, leituras de catálogo/vínculos, writes/índices e reprocessamentos entram na conta. [Cobrança Firestore](https://firebase.google.com/docs/firestore/pricing).

Alternativas avaliadas, não plano aprovado: counts em K pares de demanda; varredura paginada agrupada no servidor; agregado por par atualizado incrementalmente e reconciliado; counts diretos se escala medida permitir. Derivar K apenas de frascos existentes perde o par que zerou estoque — justamente quando o alerta importa. Acrescentar concorrência limitada ajuda tempo, mas exige medir carga e tratar falhas individuais. Não substituir PDF-016 nem criar contador paralelo de lote.

### 5.2 Inventário de queries e índices candidatos

Os índices abaixo são candidatos documentais, não afirmação de que todos são obrigatórios: a documentação oficial permite reaproveitar/combinar índices em consultas de igualdade. A consulta exata e seu plano/erro de índice devem confirmar a configuração. Não foi executado benchmark nem emulador nesta auditoria documental. [Tipos de índice](https://firebase.google.com/docs/firestore/query-data/index-overview).

| Query | Campos / operadores | Ordenação | Escopo e índice a verificar |
|---|---|---|---|
| Fila descarte | id_almoxarifado == A; requer_descarte == true | Nenhuma explícita em P | Collection Frasco; índices single-field/merging ou composto (id_almoxarifado ASC, requer_descarte ASC) conforme plano. Se UI ordenar, acrescentar campo/direção e cursor de desempate. |
| Especificações do job | P usa collectionGroup sem filtro; correção considera ativo == true | Nenhuma explícita | Collection-group Especificacoes, índice de grupo para ativo quando filtrado; leitura do pai para Q07. Não abrir ACL global cliente para viabilizar job Admin. |
| Unidades do job | Almoxarifado.ativo == true | Nenhuma explícita | Collection; single-field ativo habilitado. |
| Gestores da unidade | vínculo.id_almoxarifado == A | Nenhuma explícita | Collection vínculo, single-field; conta/papel por docId. Modelo N:N não possui flag ativo própria: não inventar where ativo em vínculo inexistente. |
| Count elegível corrigido | id_resumo_reagente == R; id_especificacao_reagente == E; id_almoxarifado == A; disponibilidade == DISPONIVEL; estado_fisico_frasco in [FECHADO,ABERTO]; requer_descarte == false; em_quarentena == false | Sem orderBy no count | Collection Frasco; candidato composto com esses sete campos ASC, sujeito à identidade/representação final. in exige avaliar as ramificações; contagem usa os mesmos índices da query. |
| Resultado por notificação/operação | Caminho determinístico completo | Não aplicável | Leitura direta por docId; nenhum composto só por usar ID. |
| Auditoria de encerramentos | Empréstimo.id_almoxarifado == A; data_encerramento >= início e < fim | data_encerramento ASC; desempate ID se paginado | Novo composto candidato (id_almoxarifado ASC, data_encerramento ASC); só se confirmado contrato de encerramento. Não fazer query ordinária por data_devolucao para extravio. |

### 5.3 Tempo, retries e autorização

Schedule pretendido: 04:00 **America/Sao_Paulo**, explicitamente configurado; a data institucional não pode ser `toISOString().slice(0,10)`. Às 22:30 em São Paulo, UTC já pode ser o dia seguinte. Uma execução iniciada às 04:00 pode ocultar esse bug nos testes felizes, mas replay manual à noite o revela. O padrão do Cloud Scheduler é UTC; a zona precisa ser configurada. [Cloud Scheduler](https://docs.cloud.google.com/scheduler/docs/configuring/cron-job-schedules).

Janela/data de referência deve ser fixa para um reprocessamento, sem mudar pela hora de cada destinatário; timestamp de emissão e data civil são conceitos separados. Mesmo contexto/data gera mesma chave. Não interpretar event.time como commit Firestore. Notificação é uma observação histórica, não reserva ou autorização futura.

`set(..., {merge:false})` substitui o documento existente: um retry pode restaurar `lida=false` e renovar prazo. `create` falha se já existe; é alternativa para criação única, verificando resultado e distinguindo ALREADY_EXISTS de falha técnica. BulkWriter não dá atomicidade com as leituras de autorização; transação é necessária se o vínculo deve estar válido no commit. Avaliar individualmente os resultados, pois a resolução de `close()` não confirma sucesso de todas as escritas. [BulkWriter](https://docs.cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/bulkwriter).

### 5.4 Regressão Q06 e segurança de bancada

- Fórmulas congeladas: massa consumida=max(0,saída−retorno); tolerância normal=max(1 g,0,005×saída), higroscópico=max(2 g,0,02×saída), sempre peso bruto. A referência é H §2 e CC PDF-025.
- Tara desconhecida apenas torna inaplicável a comparação retorno<tara; não desliga validação finita/positiva, tolerância de ganho, snapshot higroscópico, densidade histórica ou autorização.
- Tara conhecida e retorno abaixo dela mantêm esgotamento/recalibração Q06; não usar declararEsgotado como bypass geral de anomalias nem mexer na fórmula para compensar limpeza.
- Saída 100 g e retorno 101 g normal: consumo zero e ajuste; 101,001 g bloqueia. Saída 1000 g higroscópico: margem 20 g. Tara 100 g, retorno 98 g: encaminhamento Q06 preservando 98 g, nunca clamp para 100 g.
- Não mensurável no extraordinário não é resultado zero dessa fórmula. Valores antes/depois de higienização e apuração do esgotamento dependem de DDP-3B1-06.
- Neutralização, destinação de vidro contaminado e classificação jurídica não são condições genéricas do software. As alegações de P não foram comprovadas como exigência institucional/regulatória aplicável a todo reagente; excluí-las como fundamento normativo preserva a intenção de segurança e rastreabilidade. Não emitir instrução química universal nem exigir procedimento físico inseguro para preencher campo.

## 6. Pendências e gate

Novas dúvidas, com alternativas e perguntas objetivas no [registro canônico](DECISOES_DOCUMENTAIS_NECESSARIAS.md):

| ID | Decisão estritamente restante | Propostas dependentes |
|---|---|---|
| DDP-3B1-01 | Estado de extravio e tratamento de reencontro, sem equiparar a descarte | 01e, parte de 01f/03b |
| DDP-3B1-02 | Unidade de confirmação: wizard completo ou entidades completas intermediárias | 04b |
| DDP-3B1-03 | Alcance de localStorage frente à restrição de bancada compartilhada | 04c |
| DDP-3B1-04 | Conteúdo nominal do rótulo versus saldo inicial/restante | 05b |
| DDP-3B1-05 | Limiar global/por unidade e universo de pares que precisam de estoque | 06b |
| DDP-3B1-06 | Pesagem de retorno versus tara após higienização e classificação de resíduos removidos | 01a/05d, sem reabrir a obrigação de retorno físico |

**GATE SEMÂNTICO — FASE 3B.1 + RETOMADA 3B**

- Decisões avaliadas: 27 subpropostas, cobertas pelas seis fichas.
- Decisões aprovadas: 01a, 02a, 03a, 04a, 06a.
- Decisões ajustadas: 01b, 01f, 02b, 03b, 04d, 05a, 05c, 05e, 06d, 06e, 06g.
- Decisões rejeitadas: 01c, 01d, 03c, 06c, 06f.
- Decisões pendentes: 01e, 04b, 04c, 05b, 05d, 06b; seis perguntas canônicas.
- Modelo 3FN: dependências e NULL avaliados; mudanças dependentes não aprovadas.
- Firestore: identidade completa, projeções e acesso servidor avaliados; nenhum schema aplicado.
- Atomicidade: limites apontados; wizard depende de resposta; BulkWriter não substitui transação de domínio.
- Concorrência: corridas retorno/extraordinário, quarentena/liberação, múltiplas abas e vínculo/notificação cobertas.
- Idempotência: set destrutivo rejeitado; resultado de operação e criação condicional avaliados.
- NULL/zero/desconhecido: representação fictícia rejeitada; nominal e pesagens ainda dependentes.
- Segurança: fontes oficiais consultadas; escopo de armazenamento pendente; risco residual DP-D01 explicitado.
- UI/UX: rótulos e estados analisados sem inventar fatos físicos.
- Materializações: totais parciais e unidades desconhecidas discriminados; PDF-016 não redesenhado.
- Jobs: A×E analisado; universo de monitoramento pendente; nenhum job alterado.
- Relatórios: extraordinários não podem sumir do período nem virar consumo zero; contrato final pendente.
- Índices: inventário candidato acima; necessidade final e desempenho não aferidos em ambiente.
- Migrações: riscos avaliados; sem default/backfill silencioso ou migração executada.
- Dados legados: preservar medições; reconciliar Q07/identidade/flags sem inventar história.
- Regressões: Q07 recuperado como decisão já existente; divergências do baseline e da proposta identificadas, sem novo `.tex` modificado.
- Q06: fórmula preservada; pesagens de esgotamento dependem de esclarecimento.
- 3A preservado: nenhuma alteração em FK/enum/projeção; GASOSO continua fora da V1.

SEMANTIC_GATE = FAIL

Não criado PLANO_IMPLEMENTACAO_LOTE_3B_1.md. Não retomado o restante do 3B. Não executado build de validação ou commit funcional; CHECKPOINT/VALIDACAO_LATEX/main.pdf permanecem inalterados. A avaliação não equivale a aprovação do lote.

Verificação dos artefatos: inventário conferido com 27 subpropostas (5 aprovadas, 11 ajustadas, 5 rejeitadas, 5 insuficientes e 1 conflito); seis fichas com os 26 campos do modelo da seção 10; links locais existentes. `git diff --check` e a checagem de whitespace do novo parecer não apontaram erros. Confirmada ausência de diff em `.tex`, proposta original, PDF, CHECKPOINT e VALIDACAO_LATEX. Cenários descritos são critérios documentais de aceite, não testes de implementação executados.

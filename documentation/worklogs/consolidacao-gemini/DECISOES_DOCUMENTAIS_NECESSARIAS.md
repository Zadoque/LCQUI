# DECISOES_DOCUMENTAIS_NECESSARIAS — Consolidação Gemini Spark × LaTeX LCQUI

Decisões que não podem ser derivadas das decisões vigentes e requerem escolha humana.

Lote 3B: decisões abaixo identificadas na revisão de `5c8a6ad9`. Não alteram retroativamente a validação do Lote 3A. As alternativas são propostas para deliberação, não contratos aprovados.

Atualização da Fase 3B.1 (2026-09-14, HEAD `f476fd6e`): as perguntas originais receberam respostas em `DECISOES_DOCUMENTAIS_LOTE_3B_LCQUI_CONSOLIDADO.md`. Seus contextos/perguntas abaixo são preservados como histórico, **não devem ser enviados novamente ao responsável**. O parecer técnico está em [AVALIACAO_DECISOES_LOTE_3B_1.md](AVALIACAO_DECISOES_LOTE_3B_1.md); as pendências atuais são exclusivamente DDP-3B1-01–06 ao final deste registro.

## DDP-3B-01 — Quebra/esgotamento durante empréstimo sem medição válida

**Estado:** RESPONDIDA — esgotamento exige devolução física; quebra/extravio admitem encerramento extraordinário. Não implementada: representação do extravio e pesagens dependem de DDP-3B1-01/06; zeros fictícios e perda estimada sem base rejeitados tecnicamente no parecer.

**Contexto:** Seção 4 proíbe VAZIO/QUEBRADO + EMPRESTADO; UI-07 exige encerramento auditado antes da transição. O empréstimo só possui estados de devolução e o cálculo ordinário exige peso de retorno. Não há contrato de encerramento excepcional quando o recipiente quebra e não pode ser pesado. A regra Q06 cobre esgotamento e recalibração, mas não autoriza inventar medição ou classificar perda como consumo.

**Alternativas:** (1) encerramento excepcional com consumo não apurável/perda discriminada e eventual mudança de modelo; (2) manter empréstimo pendente até apuração formal com procedimento institucional definido. Não adotar devolução com peso fictício.

**Pergunta ao responsável:** Quem registra e como se encerra uma quebra durante empréstimo quando não é possível medir o retorno? Que valor/status de consumo e perda deve permanecer?

**IDs/contratos dependentes:** PDF-014, quebra/vazio excepcional, e respectivo encerramento. Retirada/devolução nominal e fórmula Q06 não dependem dessa escolha.

**Arquivos dependentes:** Seções 4/5 (se mudar modelo), 7, UI-07, ALM-06, seção 10/Fluxo-de-Reagentes, seção 11 e relatórios afetados.

## DDP-3B-02 — Quarentena de frasco emprestado

**Estado:** RESPONDIDA — quarentena imediata permitida, preservando empréstimo ativo e flag no retorno. APROVADA_COM_AJUSTES na avaliação 3B.1; ainda não aplicada aos `.tex`.

**Contexto:** Quarentena é dimensão ortogonal que bloqueia nova retirada, mas o baseline não diz se pode ser registrada enquanto EM_USO/ATRASADO nem se exige recolhimento prévio.

**Alternativas:** (1) marcar quarentena e manter empréstimo ativo até retorno; (2) exigir devolução anterior à quarentena. A primeira exige definir liberação/retorno e rastreabilidade enquanto o frasco permanece com o portador.

**Pergunta ao responsável:** A quarentena pode ser aplicada durante empréstimo, preservando-o até o retorno, ou exige primeiro a devolução?

**IDs/contratos dependentes:** PDF-014, entrada/liberação de quarentena com empréstimo ativo. Quarentena de frasco disponível já tem efeito de bloqueio definido.

**Arquivos dependentes:** Seção 7, UI-07, ALM-06 e seção 10/Fluxo-de-Reagentes.

## DDP-3B-03 — Pendência de descarte de frasco íntegro não vencido

**Estado:** RESPONDIDA — marcação técnica independente permitida. APROVADA_COM_AJUSTES para separar fato canônico e projeção; ainda não aplicada aos `.tex`.

**Contexto:** O rótulo é derivado de VAZIO/QUEBRADO ou vencido sem autorização e fora da quarentena. Não há campo para decisão independente de pendência de descarte. O prompt exige contrato da operação, mas não amplia explicitamente sua elegibilidade.

**Alternativas:** (1) restringir a operação às situações já representáveis; (2) permitir pendência independente e definir representação ortogonal, motivo, revogação, efeito no empréstimo e relatórios. Não usar detalhe_status como enum oculto nem falsear vencimento.

**Pergunta ao responsável:** A operação deve ficar restrita aos casos derivados existentes ou também abranger frasco íntegro não vencido?

**IDs/contratos dependentes:** PDF-014, pendência de descarte fora dos casos já modelados.

**Arquivos dependentes:** Seções 4/5 se ampliar modelo, 7, UI-07, ALM-06 e seção 10/Fluxo-de-Reagentes.

## DDP-3B-04 — Abandono e persistência intermediária do wizard

**Estado:** RESPONDIDA — rascunhos no navegador, nenhum incompleto no Firestore; localStorage proposto. Limite de confirmação e escopo em bancada compartilhada dependem de DDP-3B1-02/03, sem repetir a pergunta sobre permitir rascunhos no banco.

**Contexto:** UI-05 diz que salvar cada entidade retorna seu ID, e ALM-01 manda persistir cada etapa. Não há status RASCUNHO, contrato de exclusão por abandono nem confirmação de que entidades sem frascos constituem cadastros independentes completos.

**Alternativas:** (1) preservar entidades intermediárias confirmadas como catálogo independente, visível conforme papéis, e retomar por seleção dos IDs; (2) rever a persistência para confirmação conjunta ou rascunhos com lifecycle completo. A opção 1 é a mais próxima do salvamento por entidade existente; ainda exige decisão explícita sobre abandono e visibilidade. Mistura só pode ser salva com composição válida.

**Pergunta ao responsável:** Ao cancelar/fechar o navegador depois de criar Resumo, Especificação ou Lote, esses cadastros confirmados permanecem como entidades independentes reutilizáveis? Se não, qual política deve substituí-los?

**IDs/contratos dependentes:** PDF-021, criação intermediária/abandono/retomada. Seleção de entidades já existentes e cadastro final não dependem de inventar rascunhos.

**Arquivos dependentes:** UI-05/06, ALM-01/02, seção 10/Fluxo-de-Reagentes e seção 11.

## DDP-3B1-01 — Extravio: ausência recuperável ou encerramento físico definitivo

**Estado:** DECISAO_PENDENTE.

**Contexto:** A proposta §1 já autoriza ENCERRADO_EXTRAORDINARIO por EXTRAVIO_SINISTRO. O que falta é o destino do frasco: DESCARTADO no baseline comprova descarte físico e é terminal; extravio só comprova ausência. Não há decisão para um frasco reencontrado. A avaliação 01e não cria enum novo nem escolhe a recuperabilidade.

**Alternativas mutuamente exclusivas:**
1. Ausência recuperável: reencontro permite retorno ao cadastro operacional após conferência/autorização, preservando o empréstimo extraordinariamente encerrado e todo histórico.
2. Baixa operacional definitiva: eventual reencontro é registrado historicamente, mas não reativa aquele cadastro para uso.

**Impactos:**
- Opção 1: exige condição de custódia/ausência distinta de descarte e contrato de reencontro; não reabre automaticamente empréstimo anterior.
- Opção 2: exige representação terminal distinta de descarte físico e procedimento de registro de reencontro sem reativação; nenhuma opção permite fingir destruição do recipiente.

**Recomendação técnica fundamentada:** Distinguir extravio e descarte em qualquer opção, sem peso zero. A possibilidade de reuso após reencontro é decisão institucional, não decorrência do banco de dados.

**Pergunta objetiva ao responsável:** Um frasco encerrado por extravio, se reencontrado, pode voltar ao uso após conferência ou deve permanecer definitivamente fora de uso naquele cadastro?

**IDs bloqueados:** PDF-014; proposta 01e e partes dependentes de 01f/03b.

**Arquivos que dependem da decisão:** Seções 4–11; seção 10/Fluxo-de-Reagentes, Jobs, Relatórios e Consolidação; LOTE_3B_CONTRACT_CARDS.md.

## DDP-3B1-02 — Limite de confirmação do wizard

**Estado:** DECISAO_PENDENTE.

**Contexto:** §4 proíbe incompletos/rascunhos no Firestore, mas não diz se um Resumo ou uma Especificação já completa pode ser confirmado antes do frasco. UI-05 e ALM-01 anteriores persistiam entidades com IDs retornados. “Transações completas” não escolhe o limite de uma transação entre entidades diferentes.

**Alternativas mutuamente exclusivas:**
1. Confirmação única ao final do wizard: todos os novos cadastros da cadeia só passam a existir junto ao frasco final.
2. Confirmação explícita por entidade completa: Resumo, Especificação com Composição válida e Lote podem ser cadastros independentes reutilizáveis antes do frasco; cancelar depois preserva os já confirmados.

**Impactos:**
- Opção 1: cancelamento pré-final não cria cadastros; confirmação envolve cadeia, unicidade e código numa única unidade de domínio.
- Opção 2: exige distinguir Salvar entidade de Próximo; abandono não apaga cadastro válido compartilhado e a retomada seleciona IDs já confirmados.

**Recomendação técnica fundamentada:** Ambas respeitam a proibição de incompletos. Não transformar cada avanço de tela em commit implícito nem supor transação de toda a cadeia apenas pelo uso da palavra wizard.

**Pergunta objetiva ao responsável:** O wizard confirma todos os novos cadastros somente junto ao frasco final, ou permite salvar entidades completas independentes que permanecem após cancelar o restante?

**IDs bloqueados:** PDF-021; proposta 04b.

**Arquivos que dependem da decisão:** Seções 5, 7, UI-05/06, ALM-01/02, seção 10/Fluxo-de-Reagentes e Consolidação, seção 11 e Contract Cards.

## DDP-3B1-03 — localStorage em bancada compartilhada

**Estado:** DECISAO_PENDENTE.

**Contexto:** Proposta §4 escolhe localStorage e lista mitigações para terminais compartilhados; UI-13 determina memória para bancada compartilhada. A proposta não afirma explicitamente que substitui essa restrição. UID na chave não isola dados contra scripts da mesma origem ou quem tem acesso ao perfil do navegador. TTL de 24 h é escolha de UX proposta, não apagamento garantido com aplicação fechada.

**Alternativas mutuamente exclusivas:**
1. Preservar regra de bancada: persistência durável só em dispositivo pessoal/confiável explicitamente habilitado; bancada compartilhada mantém apenas estado da sessão.
2. Substituir expressamente essa restrição e exigir retomada durável também em bancada compartilhada, aceitando o risco residual de armazenamento por origem e definindo o ambiente institucional autorizado.

**Impactos:**
- Opção 1: fechamento na bancada perde rascunho; localStorage continua sendo o meio aprovado para dispositivos habilitados, com limpeza/expiração.
- Opção 2: exige política operacional de perfil do navegador/terminal e revisão explícita da UI-13; namespacing e TTL não constituem isolamento de segurança nem garantia de expurgo.

**Recomendação técnica fundamentada:** Opção 1 preserva a regra existente e reduz vestígios entre usuários. Essa recomendação não substitui a decisão sobre necessidade de retomada entre sessões na bancada.

**Pergunta objetiva ao responsável:** O localStorage deve ser restrito a dispositivos pessoais/confiáveis, mantendo memória na bancada compartilhada, ou a nova decisão substitui essa restrição e exige persistência também na bancada?

**IDs bloqueados:** PDF-021; proposta 04c, CONFLITO_DE_DECISAO.

**Arquivos que dependem da decisão:** UI-01/05/06/13, ALM-01/02, seção 10/Consolidação, seção 11 e Contract Cards.

## DDP-3B1-04 — Semântica de conteudo_nominal no frasco aberto

**Estado:** DECISAO_PENDENTE.

**Contexto:** §5 torna conteudo_nominal NULL porque o saldo restante é desconhecido. S4 descreve conteúdo declarado, S5 conteúdo inicial e T5 aberto o calcula por estimativa de quantidade atual. Um frasco aberto pode ter rótulo de 500 mL legível e saldo desconhecido. Alterar apenas NOT NULL não resolve a identidade da grandeza.

**Alternativas mutuamente exclusivas:**
1. conteudo_nominal significa quantidade original declarada no rótulo/cadastro: preservar se conhecida; saldo inicial/restante é outro conceito, podendo ser desconhecido.
2. O campo representa quantidade restante no ingresso no sistema: renomear/redefinir explicitamente para não aparentar nominal do fabricante e decidir separadamente se o valor do rótulo será mantido.

**Impactos:**
- Opção 1: não apagar nominal conhecido ao admitir tara NULL; saldo não pode ser calculado só pelo nominal em frasco aberto.
- Opção 2: muda significado, UI, dicionário e tratamento de legados; não pode reinterpretar automaticamente valores antigos de rótulo como saldo de ingresso.

**Recomendação técnica fundamentada:** Opção 1 conserva o sentido usual de nominal e distingue grandezas, mas o baseline contém usos divergentes; a escolha final precisa ser explícita.

**Pergunta objetiva ao responsável:** Em um frasco aberto com rótulo de 500 mL e saldo desconhecido, conteudo_nominal deve preservar 500 mL como valor do rótulo ou representar somente o saldo desconhecido no ingresso?

**IDs bloqueados:** PDF-021/PDF-014; proposta 05b e materializações quantitativas dependentes. Fórmula Q06 não depende dessa decisão.

**Arquivos que dependem da decisão:** Seções 4–9, seção 10/Fluxo-de-Reagentes e Relatórios, seção 11 e Contract Cards.

## DDP-3B1-05 — Escassez: limiar por unidade e universo monitorado

**Estado:** DECISAO_PENDENTE.

**Contexto:** §6 decide distinguir especificações, mas propõe um limiar global na Especificação e um loop por todos os almoxarifados. Não há evidência de que todas as unidades precisem de todas as especificações ou do mesmo mínimo. A intenção de não compensar concentrações diferentes já está aprovada; não é perguntada novamente. Filtrar apenas pares com frascos existentes esconderia um estoque que zerou.

**Alternativas mutuamente exclusivas:**
1. Mesmo limiar por especificação, obrigatório em todos os almoxarifados ativos: ausência total naquela unidade também é escassez a notificar.
2. Mesmo limiar por especificação, mas somente em pares especificação×almoxarifado explicitamente definidos como necessários, inclusive quando zerados.
3. Limiar próprio por par especificação×almoxarifado necessário, inclusive estoque zero; ausência de configuração significa que o par não é monitorado.

**Impactos:**
- Opção 1: mantém dependência funcional na Especificação e universo A×E; gera alertas para qualquer combinação sem estoque.
- Opção 2: requer relação de demanda/unidades monitoradas, preservando limiar global; zero frascos não remove demanda.
- Opção 3: limiar pertence à relação 3FN e permite necessidades distintas; exige configuração e migração por unidade.

**Recomendação técnica fundamentada:** O exemplo químico justifica não agregar especificações, mas não escolhe essas três políticas. Usar pares explicitamente necessários evita alertas sem demanda, se essa for a realidade institucional. Não escolher apenas para reduzir queries.

**Pergunta objetiva ao responsável:** Qual política vale: mesmo mínimo em todas as unidades (1), mesmo mínimo apenas nas unidades que precisam da especificação (2), ou mínimo próprio por unidade necessária (3)?

**IDs bloqueados:** Proposta 06b; campos UI de PDF-021 e dependência transversal PDF-023; job/relatórios de escassez.

**Arquivos que dependem da decisão:** Seções 4–9, seção 10/Jobs e Consolidação, seção 11, relatórios e Contract Cards.

## DDP-3B1-06 — Retorno esgotado e pesagem após higienização

**Estado:** DECISAO_PENDENTE.

**Contexto:** §1.1 determina pesar recipiente limpo; §5.3 usa pesoRetorno para consolidar tara e calcular consumo. Q06 usa a diferença entre saída e retorno para consumo e distingue ajustes/perdas. Resíduo retirado na limpeza e alteração da massa do recipiente não são automaticamente consumo do empréstimo. A obrigação de devolver o recipiente já foi respondida e permanece.

**Alternativas mutuamente exclusivas:**
1. Peso de retorno para consumo é medido antes de higienização; eventual tara real é uma medição separada após procedimento institucional, com perda/ajuste discriminado.
2. Aceitar uma única pesagem após higienização como encerramento do esgotamento; definir explicitamente que diferença é atribuída a consumo, perda ou não apurável quando houver resíduo removido/alteração do recipiente.

**Impactos:**
- Opção 1: separa fatos físicos e preserva cálculo ordinário sem absorver limpeza como consumo; precisa distinguir medições e registrar procedimento quando aplicável.
- Opção 2: pode não permitir apurar consumo exclusivamente didático; exige convenção explícita e não deve substituir Q06 por suposição implícita.

**Recomendação técnica fundamentada:** Separar leituras quando representam corpos/condições diferentes; nenhum fluxo do software deve exigir manipulação química insegura para obter tara. Manejo e momento da higienização devem seguir procedimento institucional, não instrução genérica desta auditoria.

**Pergunta objetiva ao responsável:** O peso que calcula consumo deve ser tomado antes da higienização, com tara medida separadamente depois, ou o fluxo usará uma única pesagem após limpeza? Nesse segundo caso, como registrar o resíduo removido: perda separada, consumo por convenção explícita ou quantidade não apurável?

**IDs bloqueados:** PDF-014 e compatibilização operacional PDF-025; proposta 05d e parte de 01a. Limites numéricos e base bruta Q06 não são reabertos.

**Arquivos que dependem da decisão:** Seções 4–9, seção 10/Fluxo-de-Reagentes e Relatórios, seção 11 e Contract Cards.

## Resultado da Fase 3B.1

FASE 3B.1 = BLOQUEADA POR DECISÃO.

As seis dúvidas acima não têm resposta suficiente nas fontes consultadas. Nenhum plano de implementação das partes dependentes foi criado e não houve retomada do restante do 3B, conforme Fase_3B.1 §28. As perguntas antigas permanecem apenas como histórico de sua resposta; não há solicitação de reconfirmação das intenções já fechadas.

## Formato histórico para entradas anteriores

```
## DDP-NNN — Título

**Contexto:** ...

**Alternativas mutuamente exclusivas:**
1. ...
2. ...

**Impactos:**
- Opção 1: ...
- Opção 2: ...

**Recomendação técnica fundamentada:** ...

**Pergunta objetiva ao responsável:** ...

**IDs bloqueados:** PDF-XXX, ...

**Arquivos que dependem da decisão:** Section-X.tex, ...
```

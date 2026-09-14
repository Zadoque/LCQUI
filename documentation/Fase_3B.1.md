# FASE 3B.1 — AUDITORIA DAS DECISÕES DOCUMENTAIS DO LOTE 3B

Atue nesta fase como uma **banca técnica multidisciplinar de revisão arquitetural**, e não como mero executor das soluções propostas.

O objetivo da Fase 3B.1 é avaliar criticamente as respostas, correções e novas propostas consolidadas em:

```text
documentation/DECISOES_DOCUMENTAIS_LOTE_3B_LCQUI_CONSOLIDADO.md
```

Esse arquivo foi produzido depois de o Lote 3B encontrar decisões que não podiam ser tomadas sem intervenção humana.

IMPORTANTE:

> O conteúdo desse arquivo é uma proposta consolidada do responsável pelo projeto e possui forte peso decisório, mas NÃO deve ser aplicado cegamente.

Cada decisão precisa primeiro ser confrontada com:

* decisões anteriores já fechadas;
* modelo 3FN;
* mapeamento Firestore;
* regras de negócio;
* contratos técnicos;
* segurança;
* atomicidade;
* concorrência;
* idempotência;
* auditabilidade;
* materializações;
* relatórios;
* desempenho/custo;
* UI/UX;
* segurança operacional do laboratório;
* consistência semântica dos dados.

Se uma proposta estiver correta, aprove-a.

Se a intenção estiver correta, mas a solução técnica puder ser melhorada sem alterar a decisão de domínio, classifique como `APROVADA_COM_AJUSTES` e proponha a forma tecnicamente superior.

Se não for possível decidir com segurança a partir das decisões já existentes, **NÃO INVENTE**.

Pergunte.

---

# 1. Repositório, branch e contexto

Repositório:

```text
Zadoque/LCQUI
```

Branch:

```text
docs/realinhamento-especificacao-lcqui
```

HEAD observado na abertura desta Fase 3B.1:

```text
f476fd6e
```

Confirme o HEAD real antes de iniciar.

A sequência documental recente que originou esta fase é especialmente importante:

```text
5c8a6ad9
→ criação/instruções formais do Lote 3B

5c058bc5
→ Contract Cards e primeira revisão semântica do Lote 3B

57f214ed
→ identificação das decisões pendentes e interrupção controlada do 3B

f476fd6e
→ respostas e novas propostas consolidadas em
  DECISOES_DOCUMENTAIS_LOTE_3B_LCQUI_CONSOLIDADO.md
```

Leia os diffs desses quatro commits.

Não analise apenas o estado final dos arquivos: compreenda **por que cada dúvida apareceu** e o que mudou entre uma rodada e outra.

---

# 2. Papéis obrigatórios

Atue simultaneamente como:

1. **Arquiteto de Software Sênior**

   * contratos;
   * limites transacionais;
   * invariantes;
   * idempotência;
   * concorrência;
   * consistência;
   * separação de responsabilidades.

2. **Analista Sênior de Requisitos e Domínio**

   * distinguir regra de negócio de escolha técnica;
   * identificar decisões realmente humanas;
   * impedir requisitos implícitos.

3. **Especialista em Modelagem Relacional / 3FN**

   * dependências funcionais;
   * redundância;
   * normalização;
   * semântica correta de NULL;
   * constraints.

4. **Arquiteto Firebase / Firestore**

   * transações;
   * consultas;
   * índices;
   * collection groups;
   * denormalização;
   * materializações;
   * jobs;
   * escalabilidade;
   * custo de leituras/escritas;
   * BulkWriter;
   * consistência e retries.

5. **Especialista em Sistemas Distribuídos**

   * concorrência;
   * TOCTOU;
   * at-least-once;
   * retries;
   * idempotência;
   * eventos;
   * timestamps;
   * race conditions.

6. **Engenheiro de Segurança / AppSec**

   * autorização;
   * privilégio mínimo;
   * validação server-side;
   * dados armazenados no browser;
   * XSS;
   * terminais compartilhados;
   * exposição de informações;
   * manipulação do cliente.

7. **Especialista em Integridade e Auditoria**

   * diferenciar `0`, `NULL`, desconhecido, estimado e não mensurável;
   * impedir criação de fatos fictícios;
   * histórico imutável;
   * rastreabilidade.

8. **Especialista em UI/UX e Acessibilidade**

   * wizard;
   * abandono;
   * recuperação;
   * feedback;
   * estados de loading/erro;
   * terminais compartilhados;
   * prevenção de erro operacional;
   * clareza para usuário de laboratório.

9. **Especialista em Operações de Laboratório Químico**

   * avaliar se o fluxo digital incentiva procedimento inseguro;
   * distinguir consumo, perda, quebra, extravio, descarte, quarentena e esgotamento;
   * não transformar suposição química em regra sem base.

10. **Engenheiro de Performance e FinOps**

    * complexidade de consultas;
    * cardinalidade;
    * fan-out;
    * índices;
    * jobs N×M;
    * custos recorrentes;
    * trade-off entre denormalização e manutenção.

11. **Engenheiro de Qualidade**

    * cenários adversariais;
    * regressões;
    * propriedades/invariantes;
    * critérios de aceite.

12. **Revisor de Documentação Técnica / LaTeX**

    * coerência transversal;
    * nomenclatura;
    * referências;
    * ausência de contratos duplicados.

---

# 3. Diretriz fundamental: NÃO INVENTAR

A regra principal desta fase é:

```text
Se a documentação existente + decisões anteriores
não forem suficientes para determinar a resposta,
NÃO ESCOLHA silenciosamente.
```

Nesse caso:

```text
DECISAO_PENDENTE
```

e formule uma pergunta objetiva ao responsável.

Não escolha uma alternativa apenas porque:

* parece mais elegante;
* é comum em outros sistemas;
* reduz código;
* reduz leituras;
* parece mais segura;
* parece melhor UX;
* é recomendada genericamente pelo Firebase;
* é a preferência pessoal do agente.

Uma recomendação técnica pode acompanhar a pergunta, mas não substituir a decisão humana quando a regra de domínio não puder ser inferida.

---

# 4. Não perguntar novamente algo já decidido

Antes de criar qualquer nova dúvida, procure a resposta em:

* decisões consolidadas;
* Contract Cards;
* decisões de domínio anteriores;
* worklogs;
* Seções `.tex`;
* commits anteriores do realinhamento.

É proibido perguntar novamente algo que já foi explicitamente decidido.

Se parecer haver conflito:

```text
decisão anterior
vs
nova decisão em DECISOES_DOCUMENTAIS_LOTE_3B_LCQUI_CONSOLIDADO.md
```

determine primeiro se a decisão mais nova explicitamente substitui a anterior.

Se não for possível determinar isso sem interpretação arbitrária:

```text
CONFLITO_DE_DECISAO
```

e pergunte.

---

# 5. Hierarquia das fontes

Use como hierarquia:

### Nível 1 — decisões humanas explicitamente fechadas

Inclui decisões consolidadas anteriormente e respostas explícitas recentes.

### Nível 2 — documentação normativa `.tex` validada

Principalmente Seções 4–11.

### Nível 3 — regras da Fase 3 e Fase 3B

```text
documentation/Fase_3.md
documentation/Fase_3B.md
```

### Nível 4 — Contract Cards e worklogs

Diagnósticos e rastreabilidade.

### Nível 5 — auditorias históricas

Somente como contexto.

---

# 6. O arquivo consolidado NÃO prevalece automaticamente sobre decisões fechadas

Avalie:

```text
documentation/DECISOES_DOCUMENTAIS_LOTE_3B_LCQUI_CONSOLIDADO.md
```

como um conjunto de **decisões candidatas e propostas de correção**.

Mesmo onde estiver escrito:

```text
Decisão Adotada
Contrato Oficial
Correção Estrutural
```

isso não dispensa a Fase 3B.1.

Não altere o arquivo original durante a primeira etapa da auditoria.

Preserve-o como evidência da proposta recebida.

---

# 7. Arquivos obrigatórios para leitura integral

Leia antes de avaliar:

```text
documentation/DECISOES_DOCUMENTAIS_LOTE_3B_LCQUI_CONSOLIDADO.md

documentation/Fase_3.md
documentation/Fase_3B.md

documentation/MODIFICACOES_CONSOLIDADAS_LCQUI.md

documentation/Section-3-Stakeholders.tex
documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex
documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex
documentation/Section-6-Materialized-Views.tex
documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex
documentation/Section-8-Descricao-das-telas-Dashboards.tex
documentation/Section-9-Exemplos-de-fluxos.tex

documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/
  Section-10-Subsection-2-Principio-nunca-confiar-no-client-side.tex
  Section-10-Subsection-3-Funcoes-de-Apoio-Autorizacao.tex
  Section-10-Subsection-5-Fluxo-de-Reagentes.tex
  Section-10-Subsection-6-Validacao-sincrona-de-validade.tex
  Section-10-Subsection-7-Jobs-Agendados.tex
  Section-10-Subsection-9-Relatorios-em-PDF.tex
  Section-10-Subsection-10-Consolidacao-do-planejamento.tex

documentation/Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex

documentation/worklogs/consolidacao-gemini/
  LOTE_3B_CONTRACT_CARDS.md
  DECISOES_DOCUMENTAIS_NECESSARIAS.md
  CHECKPOINT.md
  VALIDACAO_LATEX.md
```

Leia ainda os arquivos que essas seções referenciarem diretamente.

---

# 8. NÃO usar a implementação como fonte normativa

Não use:

```text
functions/src/**
frontend/**
schemas
firestore.rules real
firebase.json
testes atuais
```

para decidir o contrato.

Esta fase continua documental.

A implementação futura deverá obedecer à documentação aprovada, e não o contrário.

---

# 9. Uso de documentação externa

Quando uma proposta depender de garantia técnica externa, consulte fonte oficial atual.

Exemplos:

* Firebase / Firestore;
* Cloud Functions;
* Eventarc;
* BulkWriter;
* transações;
* índices;
* collection-group queries.

Não use blogs como fundamento arquitetural se existir documentação oficial.

Para afirmações regulatórias, legais ou institucionais — por exemplo referências à Polícia Federal, Exército, auditoria regulatória ou exigência química — não transforme afirmações não verificadas em requisito normativo.

Se a alegação externa for essencial à decisão:

* valide em fonte oficial competente;
* ou classifique a justificativa como não comprovada;
* ou remova a alegação, preservando a regra de domínio quando ela puder existir independentemente dela.

---

# 10. Artefato obrigatório da Fase 3B.1

Antes de qualquer edição `.tex`, crie:

```text
documentation/worklogs/consolidacao-gemini/
AVALIACAO_DECISOES_LOTE_3B_1.md
```

Para **cada decisão/proposta** do arquivo consolidado, registre:

```text
ID:
Título:

INTENÇÃO DE DOMÍNIO:
...

SOLUÇÃO PROPOSTA:
...

EVIDÊNCIAS DOCUMENTAIS:
...

DECISÕES ANTERIORES RELACIONADAS:
...

VEREDITO:
APROVADA
APROVADA_COM_AJUSTES
DECISAO_INSUFICIENTE
CONFLITO_DE_DECISAO
REJEITADA_TECNICAMENTE

JUSTIFICATIVA:
...

BENEFÍCIOS:
...

RISCOS:
...

TRADE-OFFS:
...

ALTERNATIVAS CONSIDERADAS:
...

IMPACTO 3FN:
...

IMPACTO FIRESTORE:
...

CONCORRÊNCIA / ATOMICIDADE:
...

IDEMPOTÊNCIA:
...

SEGURANÇA:
...

INTEGRIDADE / AUDITORIA:
...

PERFORMANCE / CUSTO:
...

UI/UX:
...

ACESSIBILIDADE:
...

MATERIALIZAÇÕES / RELATÓRIOS:
...

MIGRAÇÃO / BACKFILL:
...

SECURITY RULES PLANEJADAS:
...

TESTES / CENÁRIOS DE ACEITE:
...

ARQUIVOS AFETADOS:
...
```

---

# 11. Avaliação obrigatória da DDP-3B-01 — encerramento extraordinário

Avalie criticamente toda a cadeia:

```text
QUEBRA_ACIDENTAL
EXTRAVIO_SINISTRO
ENCERRADO_EXTRAORDINARIO
```

Não aceite automaticamente as representações propostas.

Verifique especialmente:

### Semântica dos dados

É correto persistir:

```text
medida_utilizada = 0
```

quando na realidade a quantidade consumida é **não mensurável**?

Diferencie:

```text
zero real
não houve consumo
não foi possível medir
desconhecido
estimado
perda
```

Não usar `0` para representar ausência de conhecimento.

### `peso_atual = 0`

Avalie se escrever:

```text
peso_atual = 0
```

em quebra ou extravio cria um fato falso.

Ausência de medição não é peso zero.

### Perda estimada

Avalie dimensionalmente:

```text
massa_perda_estimada_g =
peso_saida - peso_frasco_vazio
```

e principalmente o fallback:

```text
peso_saida
```

quando a tara é desconhecida.

`peso_saida` inclui recipiente.

Não chamar de “massa de reagente perdida” algo que inclui massa do recipiente sem deixar isso semanticamente explícito.

### Extravio versus descarte

Questione se:

```text
EXTRAVIO_SINISTRO
→ estado_fisico_frasco = DESCARTADO
```

é semanticamente correto.

Um objeto extraviado não é necessariamente objeto fisicamente descartado.

Não crie novo estado por conta própria se a decisão de domínio não estiver fechada.

### disponibilidade

Avalie o significado de:

```text
QUEBRADO + DISPONIVEL
DESCARTADO + DISPONIVEL
```

mesmo que a aplicação bloqueie retirada por outro campo.

Evite campos cujo valor literal contradiga o estado real do recurso.

---

# 12. Avaliação da DDP-3B-02 — quarentena durante empréstimo

A intenção de bloquear uso imediatamente pode ser correta.

Verifique, porém:

* quem pode acionar;
* como o portador é notificado;
* se há obrigação de recolhimento;
* estado da UI do professor/bolsista;
* devolução posterior;
* quarentena persistente;
* possibilidade de liberação antes do retorno;
* race entre liberação e devolução;
* auditoria;
* histórico;
* idempotência;
* frasco vencido + quarentena;
* descarte + quarentena;
* empréstimo atrasado + quarentena.

Não crie estados impossíveis.

---

# 13. Avaliação da DDP-3B-03 — `requer_descarte`

A intenção é permitir descarte técnico sem falsear vencimento ou quebra.

Avalie cuidadosamente a modelagem proposta.

Verifique se haverá duas fontes de verdade entre:

```text
requer_descarte
pendente_descarte
vencido
uso_vencido_autorizado
em_quarentena
estado_fisico_frasco
```

Determine se `requer_descarte` é:

```text
A) fato de domínio persistido;
B) projeção derivada;
C) cache de consulta.
```

Ele não pode assumir papéis diferentes em trechos diferentes.

Se for projeção derivada, documente:

* fonte canônica;
* fórmula;
* todos os produtores;
* reconciliação;
* backfill;
* comportamento diante de drift.

Avalie se a alegação:

```text
"evitar consultas compostas lentas e índices multidimensionais explosivos"
```

é tecnicamente demonstrável ou apenas justificativa genérica.

Não denormalize sem demonstrar benefício e custo de manutenção.

---

# 14. Avaliação da DDP-3B-04 — localStorage

Não aceitar `localStorage` apenas porque elimina rascunhos no Firestore.

Faça análise explícita de:

```text
localStorage
sessionStorage
IndexedDB
estado apenas em memória
persistência server-side de rascunho
nenhuma persistência
```

Considere:

* terminais compartilhados;
* logout;
* troca de usuário;
* XSS;
* dados químicos sensíveis;
* tamanho dos dados;
* múltiplas abas;
* browser privado;
* limpeza;
* expiração;
* offline;
* retomada;
* experiência do usuário.

Namespacing por UID **não é isolamento de segurança** contra JavaScript executando na mesma origem.

Avalie também:

```text
TTL de 24 h
```

como decisão de UX.

Se 24 h não vier de decisão humana anterior e nenhuma regra permitir derivá-lo, não invente uma duração diferente nem trate 24 h como obrigatória sem justificar.

---

# 15. Cadastro de frasco aberto com tara desconhecida

Avalie a nova proposta em todas as dimensões.

Verifique especificamente a distinção entre:

```text
peso_frasco_vazio = NULL
conteudo_nominal = NULL
saldo atual desconhecido
conteúdo nominal original do fabricante
```

Não confunda:

```text
conteúdo nominal do recipiente
```

com:

```text
quantidade atual restante.
```

Se `conteudo_nominal` no modelo representa o valor original do rótulo, talvez ele continue conhecido mesmo em um frasco aberto.

Se a documentação não determinar isso, gere dúvida.

Verifique impacto em:

* Seção 4;
* Firestore;
* UI;
* materializações;
* relatórios;
* empréstimo;
* devolução;
* Q06;
* cálculo de estoque disponível;
* migração de documentos legados.

---

# 16. Q06 não pode sofrer regressão silenciosa

PDF-025 já passou por validação anterior.

Toda mudança proposta pelo 3B.1 deve ser confrontada com a decisão Q06 congelada.

Diferencie claramente:

```text
consumo diferencial
retorno abaixo da tara conhecida
tara desconhecida
esgotamento
recalibração
ganho de massa
perda
```

Não chamar de “bypass da Q06” algo que na prática altere a regra sem registrar a mudança.

Se a nova modelagem apenas define que a verificação abaixo da tara só é possível quando existe tara conhecida, registre isso como compatibilização.

Se altera a decisão canônica, trate como conflito e não prossiga silenciosamente.

---

# 17. Avaliação da migração do limiar de escassez

A proposta move:

```text
qtd_em_que_e_considerado_escasso
```

de:

```text
Resumo_Reagente
```

para:

```text
Especificacao_Reagente
```

Avalie se essa granularidade corresponde ao domínio real.

Considere:

* especificações são substituíveis ou não;
* concentração;
* pureza;
* fabricante;
* finalidade;
* necessidade de diferentes limiares por almoxarifado.

Questão crítica:

Talvez o limiar correto seja:

```text
Especificacao
```

ou talvez:

```text
Especificacao × Almoxarifado
```

Não escolha sem evidência de domínio.

Avalie isso explicitamente.

---

# 18. Hotspot obrigatório — identidade de Especificacao_Reagente

O caminho físico consolidado é:

```text
Resumo_Reagente/{resumoId}/Especificacoes/{specId}
```

Logo, avalie se:

```text
specId
```

sozinho é globalmente único.

Se não houver garantia explícita, consultas ou notificações baseadas somente em:

```text
id_especificacao_reagente = specId
```

podem colidir entre Resumos diferentes.

Revise:

* Frasco_Reagente;
* Lote;
* job de escassez;
* notificações;
* IDs idempotentes;
* índices.

Não invente unicidade global se ela não estiver documentada.

---

# 19. Auditoria de complexidade do job de escassez

Analise formalmente a solução proposta.

Ela atualmente tende a:

```text
para cada Almoxarifado
    para cada Especificação
        executar count()
```

Calcule conceitualmente a complexidade:

```text
O(A × E)
```

em consultas agregadas, além das consultas de gestores e notificações.

Avalie:

* escala esperada;
* custo;
* tempo;
* retries;
* timeout;
* limites;
* paralelização;
* fan-out;
* índices;
* alternativas materializadas;
* agregação incremental;
* consulta apenas de pares realmente existentes.

Não otimizar prematuramente, mas também não aprovar algoritmo N×M sem análise.

---

# 20. Hotspot obrigatório — data civil e timezone

Não utilizar:

```ts
new Date().toISOString().slice(0, 10)
```

como “data de hoje” institucional sem verificar timezone.

A documentação da Fase 3 determina:

```text
America/Sao_Paulo
```

para datas civis institucionais.

Verifique também o schedule:

```text
every day 04:00
```

e documente timezone explicitamente.

---

# 21. Hotspot obrigatório — elegibilidade do estoque escasso

A consulta proposta conta somente:

```text
DISPONIVEL
FECHADO ou ABERTO
!requer_descarte
!em_quarentena
```

Avalie semanticamente o que significa “estoque escasso”.

Pergunte, se necessário:

* frasco emprestado ainda faz parte do estoque institucional?
* deve contar para disponibilidade imediata?
* frasco vencido autorizado deve contar?
* frasco em quarentena deve contar?
* lote reservado?
* frasco sem tara conhecida?
* frasco aberto?

Não escolha o significado de “escasso” somente pela facilidade da query.

---

# 22. Notificações de escassez

Avalie:

```text
notifId determinístico
BulkWriter
merge:false
lida:false
expiração 7 dias
```

Considere retries.

Exemplo:

Se a notificação já existe e o usuário a marcou como lida:

```text
retry do job
→ set(... merge:false)
```

pode reabrir a notificação?

Analise.

Verifique ainda:

* gestor ativo;
* vínculo ativo;
* Chefe Geral ou não;
* remoção do vínculo;
* múltiplos gestores;
* notificação por usuário versus por almoxarifado;
* idempotência;
* expiração;
* deduplicação;
* reemissão no dia seguinte.

---

# 23. Índices Firestore

Toda query nova precisa ser confrontada com a Seção 5.

Liste:

```text
query
campos
operadores
ordenação
índice necessário
```

Não afirmar que determinado índice é necessário ou desnecessário sem fundamento.

Se uma query proposta depender de índice composto novo, inclua-o no plano.

---

# 24. Segurança e autorização

Para cada nova operação determine:

```text
quem pode chamar
qual papel
qual escopo
qual vínculo de almoxarifado
qual conta precisa estar ativa
qual estado é relido dentro da transação
```

Não confiar no cliente para:

* definir ator;
* estado atual;
* perda;
* consumo;
* status final;
* IDs de auditoria;
* autorização;
* derivar campos denormalizados.

---

# 25. UI/UX obrigatória

Para cada decisão aprovada avalie impacto na UI.

Especialmente:

### Encerramento extraordinário

A interface deve deixar clara a diferença entre:

```text
Quebra
Extravio
Devolução
Esgotamento
Descarte
```

Não induzir o gestor a escolher opção incorreta apenas para conseguir concluir a operação.

### Quarentena

Mostrar alerta ao portador enquanto o frasco estiver fora do almoxarifado.

### Descarte

Diferenciar:

```text
pendente de descarte
descarte concluído
```

### Wizard

Avaliar:

* recuperação;
* cancelamento;
* rascunho;
* entidade já existente;
* entidades intermediárias;
* mudança de usuário;
* múltiplas abas;
* feedback de sucesso;
* prevenção de duplo envio.

### Tara desconhecida

Não induzir o usuário a estimar um valor físico que não conhece.

---

# 26. Integridade semântica: NULL ≠ zero

Esta regra é obrigatória em toda a avaliação.

```text
NULL / desconhecido
≠
0 medido
≠
0 calculado
≠
não aplicável
≠
não mensurável
≠
estimativa
```

Revise todos os novos campos e cálculos sob esse princípio.

Esse foi um dos padrões de erro mais perigosos das fases anteriores.

---

# 27. Resultado possível para cada proposta

Use somente:

```text
APROVADA
```

A solução está correta como está.

```text
APROVADA_COM_AJUSTES
```

A decisão/intenção está correta, mas detalhes técnicos precisam ser alterados sem exigir nova decisão humana.

```text
DECISAO_INSUFICIENTE
```

Falta informação de domínio.

```text
CONFLITO_DE_DECISAO
```

Há choque com decisão anterior e não há precedência inequívoca.

```text
REJEITADA_TECNICAMENTE
```

A solução proposta viola invariantes ou possui alternativa claramente superior que preserva a mesma decisão de domínio.

---

# 28. Se surgirem novas dúvidas

Se existir ao menos uma:

```text
DECISAO_INSUFICIENTE
```

ou:

```text
CONFLITO_DE_DECISAO
```

NÃO implemente as mudanças dependentes.

Atualize o registro canônico:

```text
documentation/worklogs/consolidacao-gemini/
DECISOES_DOCUMENTAIS_NECESSARIAS.md
```

Use exatamente o modelo já existente:

```markdown
## DDP-3B1-NN — Título

**Estado:** DECISAO_PENDENTE.

**Contexto:** ...

**Alternativas mutuamente exclusivas:**
1. ...
2. ...

**Impactos:**
- Opção 1: ...
- Opção 2: ...

**Recomendação técnica fundamentada:** ...

**Pergunta objetiva ao responsável:** ...

**IDs bloqueados:** ...

**Arquivos que dependem da decisão:** ...
```

Não crie pergunta vaga.

A pergunta precisa permitir resposta objetiva.

Não faça perguntas sobre algo já respondido em rodadas anteriores.

No final:

```text
FASE 3B.1 = BLOQUEADA POR DECISÃO
```

e pare.

NÃO crie plano de implementação das partes dependentes.

NÃO prossiga ao restante do 3B.

---

# 29. Se NÃO surgirem dúvidas

Se todas as propostas puderem ser classificadas como:

```text
APROVADA
APROVADA_COM_AJUSTES
REJEITADA_TECNICAMENTE
```

sem nenhuma decisão humana adicional:

crie:

```text
documentation/worklogs/consolidacao-gemini/
PLANO_IMPLEMENTACAO_LOTE_3B_1.md
```

ANTES de alterar os `.tex`.

---

# 30. Conteúdo obrigatório do plano de implementação

Para cada decisão aprovada/ajustada:

```text
ID
decisão final
motivo
arquivos afetados
seções/subseções afetadas
campos novos/removidos
enums novos/removidos
constraints
mapeamento Firestore
índices
contratos backend documentais
UI/UX
Security Rules planejadas
histórico
auditoria
materializações
jobs
relatórios
migração/backfill
compatibilidade com dados legados
cenários adversariais
critérios de aceite
ordem de implementação documental
```

Monte também uma **matriz transversal**:

```text
Decisão
→ Seção 4
→ Seção 5
→ Seção 6
→ Seção 7
→ Seção 8
→ Seção 9
→ Seção 10
→ Seção 11
→ relatórios/jobs/outros
```

Nenhuma alteração pode ficar documentada em apenas uma camada quando possuir efeito transversal.

---

# 31. Ordem recomendada de aplicação

Depois do plano aprovado semanticamente, aplique alterações nesta ordem conceitual:

```text
1. modelo lógico 3FN
2. modelo físico Firestore
3. materializações
4. regras de negócio
5. UI/UX
6. fluxos ponta a ponta
7. contratos técnicos
8. jobs
9. relatórios
10. segurança
11. critérios de aceite
12. worklogs
```

Isso não obriga um commit por item, mas reduz contradições.

---

# 32. Preservar a separação 3FN × Firestore

Relembrar o erro do Lote 3A:

```text
Seção 4 = modelo relacional normalizado
Seção 5 = projeções e denormalizações físicas Firestore
```

Não inserir otimização NoSQL na Seção 4.

Toda denormalização deve possuir:

```text
fonte canônica
produtor
reconciliação
backfill
razão
trade-off
```

---

# 33. Prosseguir com o Lote 3B após o plano

Se não houver novas dúvidas:

1. finalize `AVALIACAO_DECISOES_LOTE_3B_1.md`;
2. crie `PLANO_IMPLEMENTACAO_LOTE_3B_1.md`;
3. aplique o plano em todas as seções pertinentes;
4. atualize `LOTE_3B_CONTRACT_CARDS.md`;
5. atualize os estados das antigas DDP-3B-01 a DDP-3B-04;
6. retome o trabalho interrompido do Lote 3B;
7. conclua PDF-014, PDF-021 e regression check PDF-025.

Não reinicie o Lote 3B do zero.

Continue do estado alcançado nos commits recentes.

---

# 34. Gate semântico

Antes do build:

```text
GATE SEMÂNTICO — FASE 3B.1 + RETOMADA 3B

Decisões avaliadas:
Decisões aprovadas:
Decisões ajustadas:
Decisões rejeitadas:
Decisões pendentes:

Modelo 3FN:
Firestore:
Atomicidade:
Concorrência:
Idempotência:
NULL/zero/desconhecido:
Segurança:
UI/UX:
Materializações:
Jobs:
Relatórios:
Índices:
Migrações:
Dados legados:
Regressões:
Q06:
3A preservado:

SEMANTIC_GATE = PASS | FAIL
```

Somente `PASS` autoriza build de validação.

---

# 35. Build e checkpoint

Depois do `PASS`:

1. `git diff --check`;
2. commit funcional/documental;
3. registrar SHA;
4. compilar exatamente esse commit;
5. verificar erros e referências;
6. inspecionar visualmente páginas alteradas;
7. atualizar `VALIDACAO_LATEX.md`;
8. atualizar `CHECKPOINT.md`;
9. atualizar `main.pdf` apenas depois da validação.

Não declarar que um commit foi validado se os logs correspondem a outro conteúdo.

---

# 36. Saída final obrigatória

Se houver novas decisões humanas:

```text
FASE: 3B.1

RESULTADO:
BLOQUEADA POR DECISÃO

DECISÕES APROVADAS:
...

DECISÕES APROVADAS COM AJUSTES:
...

DECISÕES REJEITADAS:
...

NOVAS DÚVIDAS:
DDP-3B1-...

ARQUIVO DE DÚVIDAS:
...

NÃO PROSSEGUI PARA IMPLEMENTAÇÃO DOCUMENTAL.
```

Se não houver novas dúvidas:

```text
FASE: 3B.1

RESULTADO:
APROVADA

AVALIAÇÃO:
documentation/worklogs/consolidacao-gemini/
AVALIACAO_DECISOES_LOTE_3B_1.md

PLANO:
documentation/worklogs/consolidacao-gemini/
PLANO_IMPLEMENTACAO_LOTE_3B_1.md

DECISÕES APROVADAS:
...

DECISÕES APROVADAS COM AJUSTES:
...

DECISÕES REJEITADAS:
...

IMPLEMENTAÇÃO DOCUMENTAL:
...

PDF-014:
...

PDF-021:
...

PDF-025:
...

SEMANTIC_GATE:
PASS

COMMIT FUNCIONAL:
...

LATEX:
exit:
páginas:
erros:
refs:
git diff --check:
inspeção visual:

STATUS:
LOTE 3B CONCLUÍDO
ou
LOTE 3B AINDA BLOQUEADO POR: ...
```

---

# 37. Princípio final

O objetivo da Fase 3B.1 não é defender as soluções do arquivo consolidado.

Também não é substituí-las por preferências do agente.

O objetivo é chegar à solução que simultaneamente:

```text
preserva a decisão humana
+
mantém integridade de domínio
+
é tecnicamente correta
+
é segura
+
é auditável
+
é consistente
+
é implementável
+
tem custo/desempenho razoáveis
+
produz boa UX
+
não contradiz decisões anteriores
```

Quando isso puder ser determinado tecnicamente, determine.

Quando não puder:

```text
PERGUNTE.
```

### Fase 3 — Reagentes e Almoxarifado

#### Protocolo reforçado de consolidação documental pós-Lote 2.2

Esta fase deve ser executada como uma **auditoria e consolidação semântica orientada por contratos**, e não apenas como uma sequência de edições LaTeX.

O objetivo é impedir que a Fase 3 repita os problemas encontrados durante o Lote 2.2, em que alterações localmente plausíveis compilavam corretamente, mas ainda continham inconsistências arquiteturais, transacionais, temporais ou de rastreabilidade.

A compilação LaTeX é necessária, mas **não constitui prova de correção semântica**.

---

## 1. Escopo obrigatório da Fase 3

Tratar exclusivamente:

* PDF-004 + EXTRA-002;
* PDF-010;
* PDF-012 + EXTRA-001;
* PDF-014;
* PDF-018;
* PDF-019;
* PDF-021;
* PDF-022;
* PDF-024;
* PDF-025;
* EXTRA-003.

Não reabrir contratos já validados nos lotes anteriores, salvo quando uma alteração desta fase criar uma contradição direta e demonstrável.

Em particular, decisões já estabilizadas sobre autenticação, matrícula, patrimônio, locks, unicidade, Q06 ou outros contratos anteriores devem ser consideradas **baseline congelado**, e não oportunidades para novo redesign.

Se um item desta fase já estiver corretamente consolidado no HEAD atual:

1. classifique-o como `JA_CONSOLIDADO`;
2. registre as evidências;
3. faça a verificação transversal;
4. não edite apenas para “mostrar trabalho”.

---

# 2. Princípio central aprendido no Lote 2.2

Para cada alteração, devem existir quatro níveis coerentes:

```text
decisão de domínio
        ↓
contrato documental
        ↓
algoritmo/pseudocódigo normativo
        ↓
critérios verificáveis de aceite
```

Nenhum nível pode contradizer outro.

É proibido considerar um achado encerrado apenas porque:

* o texto foi adicionado;
* um enum foi acrescentado;
* um pseudocódigo parece plausível;
* o PDF compilou;
* o checkpoint diz “resolvido”;
* uma solução semelhante costuma funcionar no Firebase;
* uma IA afirmou que determinada garantia existe.

O item somente pode ser marcado `VALIDADO_LATEX` após validação **semântica e transversal**.

---

# 3. Regra de evidência técnica

Toda afirmação sobre comportamento de infraestrutura deve ser classificada em uma destas categorias:

### A. Decisão de domínio LCQUI

Exemplo:

```text
Aluno não pode retirar reagente sem possuir papel autorizado.
```

Sua fonte são os requisitos e decisões normativas do projeto.

### B. Garantia da plataforma
No arquivo: `documentation/Fase_3.md`

### C. Escolha arquitetural do LCQUI

Exemplo:

```text
utilizar outbox/evento de domínio para determinada operação.
```

A documentação deve explicar:

* por que existe;
* produtor;
* consumidor;
* atomicidade;
* idempotência;
* armazenamento;
* lifecycle;
* replay;
* reconciliação;
* segurança.

Nunca documentar somente metade de um mecanismo.

---

# 4. Contract Card obrigatório antes de editar qualquer `.tex`

Antes de alterar a documentação de cada achado, produzir no worklog uma ficha contendo:

| Campo                                    | Obrigatório                  |
| ---------------------------------------- | ---------------------------- |
| ID                                       | PDF/EXTRA                    |
| Invariante principal                     | sim                          |
| Fonte normativa                          | sim                          |
| Entidades envolvidas                     | sim                          |
| Coleções/documentos Firestore planejados | quando aplicável             |
| Entrada                                  | quando houver operação       |
| Normalização/canonicalização             | quando aplicável             |
| Pré-condições                            | sim                          |
| Leituras necessárias                     | operações transacionais      |
| Escritas necessárias                     | operações transacionais      |
| Resultado de sucesso                     | sim                          |
| Resultados terminais de negócio          | sim                          |
| Erros técnicos                           | sim                          |
| Estado persistido em cada saída          | sim                          |
| Valor retornado ao chamador              | quando aplicável             |
| Lock/unicidade                           | quando aplicável             |
| Idempotência                             | quando aplicável             |
| Concorrência                             | quando aplicável             |
| Fonte temporal                           | quando aplicável             |
| Auditoria/histórico                      | sim para mutações relevantes |
| Autorização e escopo                     | sim                          |
| UI afetada                               | quando aplicável             |
| Migração/backfill                        | quando necessário            |
| Critério de aceite                       | sim                          |

A edição só começa depois que essa ficha estiver internamente consistente.

---

# 5. Regras transacionais obrigatórias

Toda operação Firestore transacional documentada nesta fase deve ser revisada explicitamente contra os seguintes invariantes.

### 5.1 Leituras antes de escritas

Em pseudocódigo normativo:

```text
PASSO A — todas as leituras
PASSO B — decisão
PASSO C — todas as escritas
```

Não permitir `tx.get()` após `tx.set`, `tx.update` ou `tx.delete`.

### 5.2 Falha de negócio não pode deixar recurso preso

Para qualquer lock, reserva, contador ou estado intermediário:

```text
sucesso
rejeição
recurso inexistente
dependência inexistente
conflito
repetição
concorrência
```

devem possuir comportamento explícito.

Nenhum caminho terminal esperado pode deixar:

* lock órfão;
* requisição permanentemente pendente;
* contador inconsistente;
* estado parcial;
* documento técnico sem dono.

### 5.3 Não usar `throw` inadvertidamente após preparar escritas de recuperação

Se a condição representa um resultado normal do domínio, por exemplo:

```text
dependência inválida
operação não permitida
estado incompatível
```

avaliar se o resultado correto é uma transição terminal persistida.

Um `throw` que aborta a transação também desfaz todas as escritas planejadas.

Esse efeito deve ser considerado deliberadamente.

### 5.4 Estado retornado = estado persistido

Se o Firestore grava:

```text
REJEITADA
```

o contrato não pode retornar:

```text
APROVADA
```

Toda saída deve derivar da **decisão final efetiva**, não apenas da intenção original do usuário.

---

# 6. Regra de campos obrigatórios, opcionais e canonicalização

Para cada transformação:

```text
payload → entidade intermediária → entidade final
```

verificar obrigatoriamente:

```text
campo opcional na origem
        ↓
campo obrigatório no destino
```

Se isso ocorrer, o contrato deve definir como o campo obrigatório é obtido.

Não aceitar:

```text
undefined
null
""
"   "
```

quando o dicionário definir campo obrigatório não vazio.

Normalizar uma única vez:

```ts
const valorCanonico = valor.trim();
```

e utilizar exatamente essa representação em:

* persistência;
* chave de unicidade;
* locks;
* filtros;
* projeções;
* letra inicial;
* comparação.

Não validar uma representação e persistir outra.

Preservar zeros iniciais quando o domínio tratar o identificador como texto.

---

# 7. Regras específicas para Reagentes e Almoxarifado

## 7.1 Estados de frasco

PDF-014 e qualquer fluxo relacionado devem definir explicitamente as transições para:

* disponível;
* emprestado;
* aberto;
* fechado;
* vazio;
* quebrado;
* descartado;
* quarentena;
* vencido;
* autorizado para uso excepcional, quando previsto.

Para cada transição documentar:

```text
estado inicial permitido
ação
ator autorizado
pré-condições
estado final
campos alterados
histórico gerado
auditoria
efeito em empréstimo ativo
efeito em disponibilidade
efeito em materializações
efeito em relatórios
idempotência
```

Estados físicos, disponibilidade, vencimento e quarentena não devem ser tratados como uma única enumeração se representam dimensões diferentes.

---

## 7.2 Resumo → Especificação → Lote → Frasco

Para PDF-012 + EXTRA-001 e achados correlatos, verificar a cadeia completa:

```text
Resumo_Reagente
   ↓
Especificacao_Reagente
   ↓
Lote
   ↓
Frasco_Reagente
```

Toda FK/projeção necessária para resolver o caminho deve aparecer consistentemente:

* no modelo físico;
* no dicionário Firestore;
* nos contratos;
* nos fluxos;
* nos relatórios/materializações quando utilizada.

Não adicionar uma FK redundante sem justificar por que ela existe no Firestore.

Se `id_resumo_reagente` for projeção derivada:

* declarar a fonte;
* declarar quem a grava;
* declarar se é imutável;
* declarar como ocorre backfill de documentos antigos.

---

## 7.3 Natureza química e estado físico

PDF-022 e EXTRA-003 devem ser tratados como **vocabulário canônico do domínio**.

Antes de alterar UI ou algoritmo:

1. estabelecer os enums válidos;
2. estabelecer seus significados;
3. verificar todas as ocorrências no documento;
4. eliminar sinônimos concorrentes;
5. diferenciar rótulo apresentado ao usuário de valor persistido.

Não introduzir silenciosamente categorias como:

```text
HIBRIDO
COMPLEXO
BIOLOGICO
GASOSO
```

sem decisão normativa explícita.

Se `GASOSO` alterar significativamente:

* unidades;
* armazenamento;
* cálculo de estoque;
* pressão;
* volume;
* cilindros;
* telas;
* filtros;
* regras de segurança;

não tratá-lo como simples adição de enum.

Criar decisão separada ou registrar fora do escopo quando necessário.

---

# 8. Q14 — autoatendimento

PDF-004 + EXTRA-002 não pode ser considerado resolvido apenas adicionando:

```text
Chefe_Geral
```

ou:

```text
AUTO_ATENDIMENTO
```

a um enum.

Validar todo o contrato:

```text
quem pode iniciar
condições para autoatendimento
quando é permitido
quando é proibido
justificativa
auditoria
destinatário da notificação
tipo da notificação
conteúdo mínimo
ID idempotente
momento da emissão
falha na notificação
efeito da falha sobre a operação principal
consulta pela chefia
autorização de leitura
```

O contrato deve decidir explicitamente se a notificação pertence à mesma transação lógica da retirada ou se é efeito assíncrono recuperável.

Nunca deixar essa responsabilidade implícita.

---

# 9. Cadastro de Almoxarifado

PDF-010 deve ser tratado como contrato ponta a ponta.

A existência de uma tela não prova que o backend está especificado.

Documentar:

```text
ator autorizado
campos obrigatórios
normalização
unicidade do nome, se existir
Local associado
validação da existência do Local
gestores iniciais
ativação
qtd_gestores_ativos
criação dos vínculos
atomicidade
auditoria
erros
retorno
idempotência
concorrência
```

Se criar almoxarifado e vincular gestor forem uma única operação de domínio, definir claramente o limite transacional.

Não permitir:

```text
Almoxarifado ativo
+
0 gestores ativos
```

se isso violar o invariante já estabelecido.

---

# 10. Sequenciamento de códigos e etiquetas

PDF-018, PDF-019 e itens relacionados a etiquetas exigem revisão conjunta.

### Não inventar limite de desempenho

Não transformar:

```text
“parece que Firestore suporta X escritas/s”
```

em requisito.

Separar:

```text
garantia oficial da plataforma
benchmark do projeto
estimativa
decisão de domínio
```

### Antes de alterar o singleton

Responder documentalmente:

```text
A sequência precisa ser estritamente crescente?
Lacunas são permitidas?
Código pode ser reservado antes do cadastro?
Etiqueta virgem representa entidade existente?
Código impresso pode nunca ser usado?
Intervalo pode ser fornecido pelo cliente?
Reimpressão cria novo código?
Importação utiliza a mesma sequência?
```

Não introduzir block allocation ou outro mecanismo apenas para aumentar desempenho se isso contradizer a decisão de não permitir lacunas.

### Cliente nunca controla autoridade do sequenciador

Valores como:

```text
codigo_inicial
codigo_final
```

não podem funcionar como autoridade apenas porque vieram do cliente.

O backend deve ser a fonte normativa da sequência.

---

# 11. Materializações, contadores e eventos assíncronos

Esta seção aplica as lições mais importantes do PDF-016.

Para qualquer contador/materialização nova ou existente, documentar:

```text
fonte canônica
evento produtor
evento consumidor
ID idempotente
momento temporal
tipo do timestamp
garantia que permite comparar timestamps
entrega at-least-once
deduplicação
replay
reconciliação
falha parcial
backfill
reprocessamento
```

### Proibição explícita

Não comparar timestamps originados de relógios/eventos diferentes e afirmar que possuem ordem total sem garantia oficial.

Exemplo proibido:

```text
timestamp A < timestamp B
logo evento A ocorreu antes da mutação B
```

se as origens temporais não tiverem relação formal garantida.

### Novo mecanismo técnico implica contrato completo

Se surgir uma coleção como:

```text
Eventos_Dominio_*
Outbox_*
Locks_*
Chaves_Unicas_*
Eventos_Processados
```

ela deve ser adicionada ao modelo físico com:

* caminho;
* finalidade;
* campos;
* obrigatoriedade;
* produtor;
* consumidor;
* autorização;
* retenção;
* idempotência;
* limpeza;
* reconciliação;
* índices, se necessários.

Não documentar apenas o consumidor.

---

# 12. Jobs agendados

Todo job da Fase 3 deve indicar:

```text
schedule
timezone
janela de dados
data civil de referência
consulta fonte
documentos afetados
ID determinístico
idempotência
retry
reprocessamento
backfill
reconciliação
auditoria
autorização de leitura da saída
```

Datas civis do LCQUI devem declarar explicitamente:

```text
America/Sao_Paulo
```

quando o conceito representar dia institucional.

Não depender implicitamente do timezone da runtime.

---

# 13. Q06

PDF-025 deve começar com uma verificação de regressão, não com redesign.

Primeiro verificar se a decisão Q06 já foi consolidada no baseline validado.

Se estiver consolidada:

```text
JA_CONSOLIDADO
```

e verificar somente coerência transversal.

Não alterar fórmula, base de cálculo ou tolerâncias sem uma decisão de domínio superior explícita.

Qualquer fórmula presente no documento deve ser comparada entre:

* Regra de Negócio;
* contrato;
* fluxo;
* UI;
* exemplo;
* relatório.

A mesma grandeza deve usar a mesma unidade e a mesma definição em todas as seções.

---

# 14. UI de Reagentes

PDF-021 não deve ser resolvido somente trocando a palavra:

```text
modal
```

por:

```text
wizard
```

Deve existir um único fluxo vinculante para cadastro:

```text
Resumo
→ Especificação
→ Composição
→ Lote
→ Frasco
```

conforme aplicável.

Cada etapa deve definir:

* campos;
* obrigatoriedade;
* origem do valor;
* estado de validação;
* erro;
* navegação;
* cancelamento;
* persistência parcial permitida ou proibida;
* retomada;
* permissão.

Se uma etapa cria entidade real antes da conclusão total, documentar o efeito de abandono do assistente.

---

# 15. Validação transversal obrigatória por achado

Antes de marcar um ID como concluído, responder SIM/NÃO:

```text
[ ] modelo 3FN coerente?
[ ] mapeamento Firestore coerente?
[ ] dicionário físico coerente?
[ ] RN/RF coerente?
[ ] UI coerente?
[ ] fluxo ponta a ponta coerente?
[ ] contrato backend coerente?
[ ] Security Rules planejadas coerentes?
[ ] histórico/auditoria coerentes?
[ ] idempotência definida?
[ ] concorrência definida?
[ ] timestamps fundamentados?
[ ] campos obrigatórios preservados?
[ ] enums uniformes?
[ ] retorno coerente com persistência?
[ ] migração/backfill definido quando necessário?
[ ] critérios de aceite cobrem falha e concorrência?
```

Qualquer resposta `NÃO` impede `VALIDADO_LATEX`.

---

# 16. Cenários adversariais obrigatórios

Cada contrato relevante deve incluir pelo menos:

### Sucesso nominal

Entrada válida e estado esperado.

### Repetição

Mesma operação executada novamente.

### Concorrência

Duas operações válidas executadas simultaneamente.

### Dependência inexistente

FK/documento referenciado não existe mais.

### Estado mudou entre leitura e execução

Exemplo:

```text
frasco ficou emprestado
gestor foi revogado
lote foi alterado
almoxarifado foi desativado
```

### Evento atrasado

Para mecanismo assíncrono.

### Retry após falha parcial

Quando existir componente assíncrono.

### Dados legados

Documento anterior ao contrato atual, sem um dos campos hoje obrigatórios.

Nenhum contrato importante deve ser aprovado apenas pelo happy path.

---

# 17. Estratégia de sublotes

Não executar toda a Fase 3 em um único commit.

## Lote 3A — Vocabulário e modelo canônico

Tratar prioritariamente:

* PDF-012 + EXTRA-001;
* PDF-022;
* PDF-024;
* EXTRA-003.

Objetivo:

```text
fixar entidades
fixar enums
fixar FKs/projeções
fixar unidades
fixar nomes canônicos
```

Não avançar enquanto modelo e vocabulário não estiverem estáveis.

---

## Lote 3B — Operações de reagentes

Tratar:

* PDF-014;
* PDF-021;
* PDF-025.

Objetivo:

```text
estados de frasco
transições
wizard
Q06
erros
auditoria
```

---

## Lote 3C — Almoxarifado e Q14

Tratar:

* PDF-004 + EXTRA-002;
* PDF-010.

Objetivo:

```text
cadastro de almoxarifado
vínculos
Q14
autoatendimento
notificação
autorização
```

---

## Lote 3D — Sequenciamento e etiquetas

Tratar:

* PDF-018;
* PDF-019.

Objetivo:

```text
sequenciador
concorrência
lacunas
impressão
reserva
segunda via
idempotência
```

---

## Lote 3E — Consolidação transversal

Nenhuma nova regra de domínio deve ser criada neste lote.

Executar somente:

* matriz de cobertura;
* busca por enums/nomenclaturas antigas;
* busca por campos divergentes;
* busca por algoritmos duplicados;
* revisão de referências cruzadas;
* revisão de coleções técnicas;
* revisão de Security Rules planejadas;
* revisão dos critérios de aceite;
* build final.

---

# 18. Gate semântico antes do LaTeX

Antes de compilar cada sublote, realizar uma revisão textual do diff.

O agente deve produzir:

```text
GATE SEMÂNTICO DO LOTE 3X

1. Contratos alterados:
2. Invariantes:
3. Novas entidades/coleções:
4. Novos enums:
5. Novas transações:
6. Locks/unicidade:
7. Idempotência:
8. Fontes temporais:
9. Caminhos de falha:
10. Backfills:
11. Possíveis regressões:
12. Arquivos afetados:
```

Depois responder:

```text
SEMANTIC_GATE = PASS
```

ou:

```text
SEMANTIC_GATE = FAIL
```

O build só pode ser usado como evidência após `PASS`.

---

# 19. Regra de validação por commit

O erro ocorrido no Lote 2.2 não pode se repetir:

**o worklog não pode afirmar que uma correção existe se ela não estiver no commit indicado.**

Procedimento obrigatório:

1. concluir alterações `.tex`;
2. executar `git diff --check`;
3. revisar semanticamente o diff;
4. criar o commit funcional;
5. registrar o SHA;
6. compilar exatamente esse conteúdo;
7. inspecionar o PDF;
8. somente então atualizar `VALIDACAO_LATEX.md`;
9. atualizar `CHECKPOINT.md`;
10. se `main.pdf` gerar commit separado, declarar explicitamente que ele não altera o baseline funcional.

O campo correto é:

```text
Commit funcional/documental validado
```

e não:

```text
HEAD atual
```

quando commits posteriores forem apenas bookkeeping ou PDF compilado.

---

# 20. Evidência de build

Para cada sublote registrar:

```text
commit funcional validado
comando exato
exit code
número de páginas
erros
undefined references
warnings novos
git diff --check
páginas inspecionadas
contratos inspecionados
SEMANTIC_GATE
```

Uma compilação bem-sucedida não autoriza avançar quando:

```text
SEMANTIC_GATE = FAIL
```

---

# 21. Critério de encerramento da Fase 3

A Fase 3 somente poderá ser declarada concluída quando:

```text
[ ] todos os IDs do escopo foram classificados;
[ ] nenhum ID está EM_ANDAMENTO;
[ ] nenhum ID está BLOQUEADO sem decisão explícita;
[ ] nenhuma inconsistência P0/P1 permanece aberta;
[ ] todos os contratos alterados passaram pelo gate semântico;
[ ] não há enum conflitante;
[ ] não há campo obrigatório sendo persistido como null;
[ ] não há canonicalização divergente;
[ ] não há transação com read após write;
[ ] nenhum lock pode ficar órfão em desfecho esperado;
[ ] nenhum mecanismo assíncrono depende de ordem temporal não demonstrada;
[ ] toda nova coleção técnica possui produtor e consumidor documentados;
[ ] todo contador possui estratégia de idempotência/reconciliação;
[ ] todas as fórmulas/unidades são consistentes;
[ ] Security Rules planejadas acompanham as novas coleções;
[ ] matriz de cobertura está completa;
[ ] build final pertence ao commit funcional indicado;
[ ] inspeção visual foi realizada;
[ ] VALIDACAO_LATEX.md corresponde ao conteúdo efetivamente compilado;
[ ] CHECKPOINT.md não contém afirmações que contradigam o Git;
```

Somente depois disso escrever:

```text
GO PARA A FASE 4
```

Caso contrário:

```text
NÃO LIBERADO PARA A FASE 4
```

seguido dos critérios exatos que falharam.

---

# 22. Proibições específicas aprendidas na Fase 2

Durante a Fase 3 é proibido:

* assumir garantia técnica de Firebase/Firestore sem evidência;
* confundir `event.time` com commit time;
* considerar compilação como validação arquitetural;
* marcar contrato como resolvido sem verificar o diff correspondente;
* atualizar checkpoint antes da validação real;
* validar uma string e persistir outra;
* persistir `null` em campo obrigatório;
* criar mecanismo técnico e omitir sua outra metade;
* apagar lock sem verificar propriedade;
* deixar erro de negócio abortar acidentalmente uma limpeza necessária;
* retornar estado diferente do persistido;
* reabrir decisão já congelada sem contradição concreta;
* introduzir enum novo como “correção simples” quando ele altera o modelo;
* criar segunda fonte de verdade;
* usar valor vindo do cliente como autoridade sobre sequência, unicidade ou autorização;
* inventar limites de performance;
* corrigir somente a seção apontada pelo Gemini sem revisar todas as seções afetadas.

---

# 23. Saída obrigatória de cada sublote

Ao finalizar cada Lote 3X, reportar:

```text
LOTE:
COMMIT FUNCIONAL:
IDS TRATADOS:

ALTERAÇÕES NORMATIVAS:
- ...

CONTRATOS REVISADOS:
- ...

CENÁRIOS ADVERSARIAIS VERIFICADOS:
- ...

NOVAS COLEÇÕES/CAMPOS/ENUMS:
- ...

BACKFILL/MIGRAÇÃO:
- ...

GATE SEMÂNTICO:
PASS | FAIL

LATEX:
exit:
páginas:
undefined refs:
git diff --check:
inspeção visual:

REGRESSÕES IDENTIFICADAS:
- nenhuma
ou
- ...

STATUS:
LIBERADO PARA PRÓXIMO SUBLOTE
ou
BLOQUEADO

MOTIVO DO BLOQUEIO:
- ...
```

Não utilizar “concluído” quando restar qualquer divergência semântica conhecida.

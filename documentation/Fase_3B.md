# LOTE 3B — OPERAÇÕES DE REAGENTES

## Consolidação documental orientada por contratos — PDF-014, PDF-021 e PDF-025

Atue como **Arquiteto de Software Sênior, Analista de Requisitos Sênior, Especialista em Firestore/Firebase, Especialista em Modelagem de Dados, Engenheiro de Segurança e Revisor de Documentação Técnica**.

Você trabalhará exclusivamente na documentação normativa do LCQUI.

---

# 1. Repositório e baseline obrigatório

Repositório:

```text
Zadoque/LCQUI
```

Branch obrigatória:

```text
docs/realinhamento-especificacao-lcqui
```

Baseline funcional/documental validado do lote anterior:

```text
7c4be0f2
```

Commit posterior de logs/checkpoint:

```text
259c62e0
```

O HEAD pode conter posteriormente apenas atualização de `documentation/main.pdf`.

Antes de editar qualquer arquivo:

1. confirme que `7c4be0f2` é ancestral do HEAD atual;
2. confirme que não houve alteração normativa posterior que modifique o baseline;
3. leia `documentation/worklogs/consolidacao-gemini/CHECKPOINT.md`;
4. leia `documentation/worklogs/consolidacao-gemini/VALIDACAO_LATEX.md`;
5. registre o HEAD de início do Lote 3B.

---

# 2. Fonte normativa principal desta execução

Leia **integralmente antes de qualquer edição**:

```text
documentation/Fase_3.md
```

As regras desse arquivo são obrigatórias.

Em particular:

* Contract Cards antes de editar `.tex`;
* gate semântico antes do build;
* validação por commit;
* análise de happy path + falhas + repetição + concorrência;
* proibição de assumir garantias de Firebase sem documentação oficial;
* preservação das decisões já estabilizadas;
* build LaTeX não equivale a validação semântica.

Se este prompt e `Fase_3.md` parecerem divergir, aplique a interpretação **mais restritiva contra regressões**.

---

# 3. Escopo EXCLUSIVO do Lote 3B

Tratar:

```text
PDF-014
PDF-021
PDF-025
```

Objetivos:

```text
estados de frasco
transições
wizard de reagentes
Q06
erros
auditoria
idempotência
concorrência
coerência transversal
```

NÃO iniciar:

```text
PDF-004
PDF-010
EXTRA-002
PDF-018
PDF-019
```

Esses itens pertencem aos Lotes 3C e 3D.

Também NÃO reabrir:

```text
PDF-012
EXTRA-001
PDF-022
PDF-024
EXTRA-003
```

salvo se uma alteração necessária do 3B produzir uma **contradição direta e demonstrável** com eles.

Nesse caso:

1. não redesenhe silenciosamente o contrato;
2. registre a inconsistência;
3. explique a dependência;
4. faça apenas a correção mínima necessária.

---

# 4. A implementação atual NÃO é fonte normativa

Esta continua sendo uma fase de **consolidação documental**.

Não use:

```text
functions/src/**
frontend/**
firestore.rules
storage.rules
schemas
testes
firebase.json
código atualmente implantado
```

para decidir qual deve ser a regra.

A direção obrigatória permanece:

```text
decisão de domínio
      ↓
documentação normativa
      ↓
contratos/pseudocódigo documental
      ↓
implementação futura
```

É permitido utilizar documentação oficial Firebase/Google somente quando uma afirmação arquitetural depender de garantia da plataforma.

Não modificar código de implementação.

---

# 5. Arquivos mínimos que devem ser lidos integralmente

Antes de editar:

```text
documentation/Fase_3.md

documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex

documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex

documentation/Section-6-Materialized-Views.tex

documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex

documentation/Section-8-Descricao-das-telas-Dashboards.tex

documentation/Section-9-Exemplos-de-fluxos.tex

documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/
  Section-10-Subsection-5-Fluxo-de-Reagentes.tex

documentation/Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex

documentation/worklogs/consolidacao-gemini/CHECKPOINT.md
documentation/worklogs/consolidacao-gemini/VALIDACAO_LATEX.md
```

Consulte outras seções `.tex` se uma referência direta exigir.

---

# 6. Criar primeiro o Contract Card do Lote 3B

Antes de qualquer alteração `.tex`, criar:

```text
documentation/worklogs/consolidacao-gemini/LOTE_3B_CONTRACT_CARDS.md
```

Criar uma ficha independente para:

```text
PDF-014
PDF-021
PDF-025
```

Para cada ficha preencher obrigatoriamente:

```text
ID
estado atual no baseline
invariante principal
fonte normativa
entidades envolvidas
coleções Firestore afetadas
entradas
normalização
pré-condições
leituras
escritas
estado inicial
estado final
resultado de sucesso
resultados terminais de negócio
erros técnicos
valor retornado
idempotência
concorrência
fonte temporal, se houver
auditoria/histórico
autorização
UI afetada
efeito em materializações
efeito em relatórios
migração/backfill, se houver
critérios de aceite
```

Se algum item já estiver plenamente consolidado:

```text
JA_CONSOLIDADO
```

e registre evidências. Não edite somente para criar diferença.

---

# 7. PDF-014 — contratos de ciclo de vida do Frasco_Reagente

O modelo atual separa dimensões diferentes do estado do frasco.

Preserve essa decomposição.

O contrato canônico contém, entre outros:

```text
estado_fisico_frasco:
FECHADO
ABERTO
VAZIO
QUEBRADO
DESCARTADO

disponibilidade:
DISPONIVEL
EMPRESTADO

vencido:
boolean

em_quarentena:
boolean

uso_vencido_autorizado:
boolean
```

NÃO reintroduzir um grande enum combinado como:

```text
VENCIDO_DISPONIVEL
VENCIDO_EMPRESTADO
QUARENTENA_VENCIDO
...
```

As dimensões devem continuar ortogonais.

---

# 8. PDF-014 — operações que devem possuir contrato

Verifique se existem contratos documentais completos e coerentes para, no mínimo:

```text
abrir frasco
marcar como vazio
registrar quebra
colocar em quarentena
liberar da quarentena
marcar pendente de descarte
registrar descarte concluído
autorizar uso excepcional de vencido
retirar
devolver
```

Não duplique operações já corretamente especificadas.

Para as operações ausentes ou incompletas, documente contratos completos.

Cada transição deve indicar:

```text
estado inicial permitido
ator autorizado
pré-condições
estado final
campos alterados
histórico gerado
auditoria gerada
efeito sobre disponibilidade
efeito sobre empréstimo ativo
efeito sobre materializações
efeito sobre relatórios
idempotência
resultado em repetição
```

---

# 9. Invariantes obrigatórios das transições

Não permitir estados semanticamente impossíveis sem regra explícita.

Verificar pelo menos:

```text
DESCARTADO + EMPRESTADO
QUEBRADO + EMPRESTADO
VAZIO + EMPRESTADO
em_quarentena=true + nova retirada
DESCARTADO + nova retirada
QUEBRADO + nova retirada
VAZIO + nova retirada
```

Se algum desses estados puder existir apenas transitoriamente, documentar exatamente onde e por quê.

Se não puder existir, o contrato deve impedir a transição.

---

# 10. Empréstimo ativo e transição terminal

Para cada operação como:

```text
QUEBRADO
VAZIO
DESCARTADO
QUARENTENA
```

definir explicitamente o que acontece quando existir:

```text
Emprestimo_Reagente.status = EM_USO
ou
ATRASADO
```

Não deixar isso implícito.

Responder documentalmente:

```text
A operação é proibida enquanto houver empréstimo?
A operação conclui o empréstimo?
Exige primeiro uma devolução?
Existe fluxo excepcional para quebra durante empréstimo?
Quem registra?
Qual histórico fica no empréstimo?
Qual histórico fica no frasco?
Qual peso/consumo é preservado?
```

Não inventar a resposta caso a documentação vigente não permita derivá-la.

Se houver verdadeira decisão de domínio ausente:

```text
DECISAO_PENDENTE
```

e bloquear somente o contrato dependente.

---

# 11. Histórico de frasco

Preservar e verificar os tipos canônicos existentes, incluindo quando aplicável:

```text
CADASTRO
SAIU
ENTROU
FICOU_VAZIO
QUEBROU
FOI_DESCARTADO
VENCEU
INVENTARIO_ROTINA
EVAPORACAO
AJUSTE
CONCLUSAO
ENTROU_EM_QUARENTENA
LIBERADO_QUARENTENA
PENDENTE_DE_DESCARTE
USO_VENCIDO_AUTORIZADO
```

Toda mutação relevante de ciclo de vida deve produzir histórico coerente.

Não criar dois tipos diferentes para o mesmo evento sem necessidade.

Verifique também:

```text
id_frasco_reagente
id_almoxarifado
id_gestor
id_emprestimo_reagente quando aplicável
peso_anterior
peso_novo
medida_ajustada
unidade
timestamp
```

Não persistir campo obrigatório como `null`.

---

# 12. Atomicidade

Se uma operação alterar simultaneamente:

```text
Frasco_Reagente
Emprestimo_Reagente
Historico_Frasco_Reagente
Registro_de_Auditoria
materialização
evento de domínio
```

definir claramente qual conjunto precisa ser atomicamente consistente.

Dentro de uma transação:

```text
A — todas as leituras
B — decisão
C — todas as escritas
```

É proibido:

```text
tx.set/update/delete(...)
...
tx.get(...)
```

na mesma transação.

---

# 13. Idempotência de operações terminais

Avaliar explicitamente repetição.

Exemplo:

```text
registrar quebra duas vezes
registrar descarte duas vezes
marcar vazio duas vezes
liberar quarentena duas vezes
```

A documentação deve decidir se:

```text
A) repetição é sucesso idempotente
ou
B) retorna failed-precondition
```

mas jamais deve:

```text
duplicar histórico
duplicar auditoria
duplicar decrementos
duplicar materializações
```

---

# 14. Materializações e eventos

Se PDF-014 exigir alterar contadores/materializações:

não criar uma nova estratégia temporal paralela.

Respeitar o baseline validado do PDF-016.

Qualquer novo evento técnico deve documentar:

```text
produtor
consumidor
docId/eventId
idempotência
timestamp
fonte temporal
replay
retenção
reconciliação
Security Rules
```

Não introduzir `event.time` como representação de commit Firestore.

---

# 15. PDF-021 — wizard de cadastro de reagentes

Não resolver PDF-021 apenas substituindo palavras como:

```text
modal → wizard
```

O objetivo é estabelecer um **único fluxo normativo de UI**.

Verificar e consolidar, conforme aplicável:

```text
Resumo
→ Especificação
→ Composição
→ Lote
→ Frasco
```

O fluxo deve ser compatível com a separação de entidades consolidada no Lote 3A.

Não reintroduzir:

```text
Especificacao_Reagente como coleção raiz Firestore
GASOSO na V1
naturezas químicas divergentes
FKs denormalizadas na Seção 4
```

---

# 16. Cada etapa do wizard deve possuir contrato de UI

Para cada etapa, documentar:

```text
objetivo
campos apresentados
campos obrigatórios
campos opcionais
origem dos dados
validação
mensagens de erro
permissões
botão anterior
botão próximo
cancelamento
persistência
estado de loading
erro de backend
retomada
```

Diferenciar claramente:

```text
valor exibido
valor enviado
valor persistido
```

---

# 17. Persistência parcial no wizard

Responder explicitamente:

```text
Ao avançar de uma etapa, alguma entidade já é persistida?

OU

Todo o wizard é apenas estado temporário até uma confirmação?
```

Se houver persistência antes do final:

documentar:

```text
o que acontece se o usuário cancelar;
o que acontece se fechar o navegador;
se ficam documentos órfãos;
como retomar;
como limpar;
quem pode ver o rascunho;
se existe status RASCUNHO.
```

Não inventar mecanismo de rascunho se não houver decisão normativa.

Caso não exista decisão suficiente, prefira documentar a necessidade da decisão em vez de criar arquitetura silenciosamente.

---

# 18. Wizard — escolha entre entidade existente e criação

O fluxo deve deixar explícito onde o usuário pode:

```text
selecionar Resumo existente
ou criar novo Resumo

selecionar Especificação existente
ou criar nova Especificação

selecionar Lote existente
ou cadastrar novo Lote

cadastrar Frasco
```

Não confundir:

```text
Resumo
Especificação
Lote
Frasco
```

como se fossem uma única entidade.

---

# 19. Lote e Frasco dentro do wizard

Preservar a decisão do Lote 3A:

Modelo 3FN:

```text
Lote
→ id_especificacao_reagente
→ Especificacao_Reagente
→ Resumo_Reagente
```

Modelo físico Firestore:

```text
Lote/{id}
id_especificacao_reagente
id_resumo_reagente  // projeção física imutável
```

Não recolocar `id_resumo_reagente` na entidade SQL `Lote`.

---

# 20. PDF-025 — Q06 é baseline congelado

O checkpoint já considera PDF-025 validado.

Portanto, iniciar PDF-025 como:

```text
REGRESSION CHECK
```

e NÃO como redesign.

Primeiro verificar a fórmula canônica em todas as ocorrências:

```text
Regra de Negócio
Seção 10
UI
fluxos
exemplos
relatórios
```

A decisão atualmente congelada deve ser preservada salvo contradição documental concreta.

Não trocar a base de cálculo silenciosamente.

---

# 21. Q06 — verificações obrigatórias

Verificar consistência transversal de:

```text
peso_saida
peso_retorno
peso_frasco_vazio
peso bruto
tolerância
frascos higroscópicos
frascos não higroscópicos
ganho de massa
consumo
evaporação
esgotamento
recalibração de tara
```

A mesma variável física deve possuir a mesma unidade em todo o documento.

---

# 22. Q06 — cuidado com ganho de massa

Não confundir:

```text
consumo = max(0, peso_saida - peso_retorno)
```

com:

```text
validação de ganho anômalo
```

São conceitos diferentes.

A documentação deve deixar explícito:

```text
como consumo é calculado;
como tolerância é calculada;
quando ganho é aceito;
quando ganho exige ajuste;
quando ganho bloqueia a devolução;
qual histórico é gravado.
```

---

# 23. Q06 — retorno abaixo da tara

Preservar a decisão já consolidada:

retorno abaixo da tara não deve ser tratado como consumo negativo normal.

Verifique o fluxo documental previsto para:

```text
esgotamento
recalibração de tara
ajuste auditado
```

Não introduzir clamp silencioso que esconda inconsistência física.

---

# 24. Q06 — resultado esperado deste lote

Se todas as seções já forem coerentes:

```text
PDF-025 = JA_CONSOLIDADO
```

Não alterar fórmula apenas para produzir diff.

Se existir divergência textual:

corrija somente a divergência e registre exatamente o local.

---

# 25. Security Rules planejadas

Para qualquer nova operação documentada no Lote 3B:

verificar a Seção 11.

O cliente não pode gravar diretamente documentos quando uma Cloud Function precisa garantir:

```text
transição de estado
histórico
auditoria
cálculo
idempotência
invariante
```

Nesse caso:

```text
Read = conforme papéis
Write = negado ao cliente
```

e a mutação é responsabilidade do backend planejado.

---

# 26. Cenários adversariais obrigatórios do PDF-014

Validar documentalmente no mínimo:

### Cenário A — quebra nominal

```text
Frasco ABERTO + DISPONIVEL
→ registrar quebra
→ QUEBRADO
→ indisponível para nova retirada
→ histórico uma vez
```

### Cenário B — quebra durante empréstimo

Definir comportamento explícito.

### Cenário C — repetição

```text
registrar quebra
registrar quebra novamente
```

não pode duplicar efeitos.

### Cenário D — descarte

```text
frasco elegível
→ descarte concluído
→ DESCARTADO
→ histórico
→ auditoria
```

### Cenário E — descarte repetido

não duplicar efeitos.

### Cenário F — quarentena

```text
frasco elegível
→ em_quarentena=true
→ detalhe_status obrigatório
→ retirada bloqueada
```

### Cenário G — liberação

```text
em_quarentena=true
→ liberar
→ histórico LIBERADO_QUARENTENA
```

com destino válido explicitado.

### Cenário H — vazio

definir efeitos em:

```text
estado_fisico_frasco
disponibilidade
peso_atual
medida_usada
histórico
empréstimo
materializações
```

---

# 27. Cenários adversariais obrigatórios do PDF-021

Verificar:

```text
cancelar no primeiro passo
cancelar após selecionar Resumo
cancelar após criar entidade intermediária
voltar etapa
erro de backend
Lote desaparece entre seleção e confirmação
Especificação desativada/inexistente
dados obrigatórios ausentes
duplo clique em confirmação
retry da confirmação
```

Não permitir que o fluxo produza documentos órfãos sem contrato explícito.

---

# 28. Não reabrir decisões do Lote 3A

Considerar congelados, salvo regressão demonstrável:

```text
PDF-012
EXTRA-001
PDF-022
PDF-024
EXTRA-003
```

Em particular:

```text
Seção 4 = 3FN
Seção 5 = Firestore físico
GASOSO fora da V1
Especificacoes como subcoleção de Resumo_Reagente
qtd_frascos_adicionados com grafia canônica
```

---

# 29. Revisão transversal antes do gate

Antes de declarar o Lote 3B pronto, responder SIM/NÃO:

```text
[ ] estados de frasco permanecem ortogonais?
[ ] todas as transições terminais têm pré-condição?
[ ] toda transição tem histórico?
[ ] toda operação sensível tem ator autorizado?
[ ] repetição não duplica efeito?
[ ] empréstimo ativo foi tratado em cada transição relevante?
[ ] materializações permanecem coerentes?
[ ] Q06 não sofreu redesign acidental?
[ ] unidades físicas permanecem coerentes?
[ ] wizard possui um único fluxo vinculante?
[ ] persistência parcial está explicitamente definida?
[ ] não surgiram documentos órfãos?
[ ] modelo 3FN não recebeu projeções Firestore?
[ ] nenhuma enumeração do 3A regrediu?
[ ] Security Rules planejadas acompanham as operações?
[ ] contratos e UI descrevem a mesma operação?
```

Qualquer `NÃO` impede o encerramento.

---

# 30. Gate semântico obrigatório

Antes do build, criar no worklog uma seção:

```text
GATE SEMÂNTICO DO LOTE 3B

1. Contratos alterados:
2. Invariantes:
3. Estados/transições alterados:
4. Novas entidades/coleções:
5. Novos campos:
6. Novos enums:
7. Novas transações:
8. Idempotência:
9. Concorrência:
10. Fontes temporais:
11. Caminhos de falha:
12. Auditoria/histórico:
13. Materializações:
14. Security Rules:
15. Possíveis regressões:
16. Arquivos afetados:
```

Finalizar com exatamente:

```text
SEMANTIC_GATE = PASS
```

ou:

```text
SEMANTIC_GATE = FAIL
```

Não compilar como evidência de aprovação enquanto estiver `FAIL`.

---

# 31. Build e validação

Com `SEMANTIC_GATE = PASS`:

1. execute:

```text
git diff --check
```

2. crie o **commit funcional/documental do Lote 3B**;

3. registre o SHA;

4. compile exatamente esse commit usando o procedimento já documentado no repositório;

5. registrar:

```text
comando
exit code
páginas
erros
refs indefinidas
warnings novos
git diff --check
páginas inspecionadas
contratos inspecionados
```

6. inspecione visualmente todas as páginas alteradas;

7. somente depois atualize:

```text
documentation/worklogs/consolidacao-gemini/VALIDACAO_LATEX.md
documentation/worklogs/consolidacao-gemini/CHECKPOINT.md
```

8. atualizar `documentation/main.pdf` apenas após aprovação.

---

# 32. Não repetir o erro dos lotes anteriores

É proibido:

```text
declarar um commit validado antes do build;
registrar correção que não está no commit funcional;
considerar exit 0 como prova semântica;
alterar Q06 sem necessidade;
misturar Seção 4 com denormalização Firestore;
corrigir só UI sem contrato backend;
corrigir só backend documental sem UI;
criar enum combinado de estados;
ignorar repetição/idempotência;
ignorar empréstimo ativo em quebra/vazio/descarte;
criar coleção técnica sem documentar produtor e consumidor;
usar garantia Firebase não demonstrada;
```

---

# 33. Saída obrigatória

Ao terminar, reporte:

```text
LOTE: 3B — Operações de Reagentes

BASELINE INICIAL:
7c4be0f2

COMMIT FUNCIONAL:
<sha>

IDS:
PDF-014:
PDF-021:
PDF-025:

ALTERAÇÕES NORMATIVAS:
- ...

TRANSIÇÕES DE FRASCO:
- ...

WIZARD:
- ...

Q06:
- ...

CENÁRIOS ADVERSARIAIS:
- ...

NOVAS ENTIDADES/CAMPOS/ENUMS:
- ...

MIGRAÇÃO/BACKFILL:
- ...

SECURITY RULES PLANEJADAS:
- ...

SEMANTIC_GATE:
PASS | FAIL

LATEX:
exit:
páginas:
erros:
refs indefinidas:
git diff --check:
inspeção visual:

REGRESSÕES ENCONTRADAS:
- nenhuma
ou
- ...

CHECKPOINT:
<commit que atualizou os logs>

STATUS FINAL:
LIBERADO PARA LOTE 3C
ou
NÃO LIBERADO PARA LOTE 3C
```

---

# 34. Condição de aprovação do Lote 3B

Só escrever:

```text
LIBERADO PARA LOTE 3C
```

se:

```text
PDF-014 = semanticamente fechado
PDF-021 = semanticamente fechado
PDF-025 = confirmado sem regressão ou corrigido minimalmente
SEMANTIC_GATE = PASS
LaTeX = exit 0
git diff --check = limpo
inspeção visual = aprovada
CHECKPOINT = corresponde ao Git
VALIDACAO_LATEX = corresponde ao commit funcional
```

Caso contrário:

```text
NÃO LIBERADO PARA LOTE 3C
```

e listar objetivamente os bloqueadores restantes.

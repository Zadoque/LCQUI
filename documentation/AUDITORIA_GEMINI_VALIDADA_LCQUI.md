# Auditoria validada dos achados do Gemini Spark — LCQUI

> Documento operacional para correção por IA/agente de código.
>
> **Repositório:** `Zadoque/LCQUI`  
> **Branch auditada:** `docs/realinhamento-especificacao-lcqui`  
> **HEAD auditado:** `ae447fbfe96653d90248228337163061574d24e9`  
> **Auditoria de origem:** relatório do Gemini Spark com achados `PDF-001` a `PDF-025`
>
> Este documento **não repete cegamente** a auditoria original. Cada ponto foi confrontado com o código, Security Rules e documentação existentes nessa branch. Quando a implementação já corrigiu o problema, o item foi marcado como resolvido. Quando o problema mudou de forma, a solução abaixo substitui a solução proposta pelo Gemini.

---

## 1. Como este documento deve ser usado pela IA corretora

A IA que executar as correções deve trabalhar **sobre a branch acima ou uma nova branch criada a partir desse HEAD** e seguir estas regras:

1. **Não corrigir os itens marcados como `RESOLVIDO` ou `REJEITADO`.**
2. Quando este documento divergir do relatório original do Gemini, **este documento prevalece**, pois foi validado contra o estado atual da branch.
3. Tratar como fonte normativa, nesta ordem:
   1. decisões explicitamente fechadas em `documentation/DUVIDAS_PENDENTES_LCQUI.md`;
   2. invariantes e contratos das Seções 4, 5, 7 e 11 da documentação;
   3. código efetivamente implantável em `functions/src`, `firestore.rules`, esquemas Zod e configuração Firebase;
   4. exemplos de código da Seção 10, que podem estar desatualizados ou ser apenas ilustrativos.
4. Sempre que uma correção alterar um contrato do domínio, atualizar de forma coerente:
   - código TypeScript;
   - esquemas Zod;
   - Security Rules;
   - índices Firestore;
   - documentação LaTeX correspondente;
   - testes.
5. Não introduzir um segundo mecanismo concorrente para resolver algo que já possui mecanismo funcional.
6. Preferir transações e IDs determinísticos quando a regra de negócio exigir unicidade ou idempotência.
7. Não usar exclusão física de dados históricos quando o projeto exige preservação/auditoria.
8. Datas civis do domínio devem ser interpretadas em `America/Sao_Paulo` e só depois convertidas para `Timestamp`/UTC.
9. Toda mutação de alto impacto deve revalidar o estado atual do usuário/ator no servidor quando a documentação assim exigir; não confiar apenas em Custom Claims potencialmente antigas.
10. Adicionar testes de regressão para cada correção crítica.

---

## 2. Resultado consolidado

| ID | Veredito na branch atual | Ação |
|---|---|---|
| PDF-001 | **PARCIAL — problema real mudou e há regressões adicionais** | **CORRIGIR P0** |
| PDF-002 | **RESOLVIDO** | **NÃO ALTERAR** |
| PDF-003 | **PARCIAL** | **CORRIGIR P0** |
| PDF-004 | **CONFIRMADO e mais amplo que o relatório** | **CORRIGIR P1** |
| PDF-005 | **PARCIAL — regras já cobrem parte das coleções** | **CORRIGIR P0** |
| PDF-006 | **CONFIRMADO** | **CORRIGIR P1** |
| PDF-007 | **PARCIAL — runtime corrigido; documentação contraditória** | **CORRIGIR P2** |
| PDF-008 | **CONFIRMADO** | **CORRIGIR P1** |
| PDF-009 | **PARCIAL — endpoints existem, mas faltam edição/moderação e há hard delete** | **CORRIGIR P1** |
| PDF-010 | **CONFIRMADO** | **CORRIGIR P2** |
| PDF-011 | **CONFIRMADO** | **CORRIGIR P1** |
| PDF-012 | **CONFIRMADO e mais grave no runtime** | **CORRIGIR P0** |
| PDF-013 | **RESOLVIDO NO CÓDIGO / lacuna documental** | **CORRIGIR DOCUMENTAÇÃO P2** |
| PDF-014 | **CONFIRMADO** | **CORRIGIR P1** |
| PDF-015 | **CONFIRMADO** | **CORRIGIR P1** |
| PDF-016 | **CONFIRMADO NA ESPECIFICAÇÃO / implementação implantável ausente** | **CORRIGIR P1** |
| PDF-017 | **RESOLVIDO NO RUNTIME / documentação obsoleta** | **CORRIGIR DOCUMENTAÇÃO P2** |
| PDF-018 | **RISCO REAL, mas limite numérico do Gemini não é comprovado** | **MEDIR / P2** |
| PDF-019 | **REJEITADO — contraria decisão explícita do projeto** | **NÃO ALTERAR** |
| PDF-020 | **PARCIAL — janela de claims é decisão aceita; mutações precisam revalidação** | **CORRIGIR P1** |
| PDF-021 | **RESOLVIDO** | **NÃO ALTERAR** |
| PDF-022 | **RESOLVIDO** | **NÃO ALTERAR** |
| PDF-023 | **CONFIRMADO NA ESPECIFICAÇÃO / job implantável ausente** | **CORRIGIR P1** |
| PDF-024 | **RESOLVIDO** | **NÃO ALTERAR** |
| PDF-025 | **PARCIAL — implementação está errada, mas a solução do Gemini também** | **CORRIGIR P0** |

### Contagem

- **10 confirmados:** PDF-004, 006, 008, 010, 011, 012, 014, 015, 016, 023.
- **10 parciais / mudaram de natureza / documentação desatualizada:** PDF-001, 003, 005, 007, 009, 013, 017, 018, 020, 025.
- **5 resolvidos ou rejeitados:** PDF-002, 019, 021, 022, 024.

---

# 3. Correções P0 — prioridade crítica

## PDF-001 — Fluxo patrimonial: versão, lock, atomicidade e unicidade de plaqueta

### Veredito

**PARCIALMENTE CONFIRMADO, mas o problema real da branch atual é diferente e mais amplo.**

O relatório do Gemini descreveu um deadlock por conflito de `versao_bem_origem`. No código implantável atual, essa lógica foi parcialmente perdida: o pedido de edição não persiste adequadamente a versão de origem, e a resposta de aprovação também não restaura a verificação otimista de versão.

Além disso, a implementação atual de `responderRequisicaoEdicaoBem` estrutura a transação de forma perigosa: existem gravações enfileiradas antes de uma leitura posterior do bem no caminho de aprovação. Em uma transação Firestore, **todas as leituras devem ocorrer antes das escritas**. Isso deve ser reorganizado.

A unicidade da plaqueta também continua vulnerável: há uma consulta prévia à coleção principal antes da transação, mas isso é **TOCTOU** — duas requisições concorrentes podem passar pela consulta antes de qualquer uma gravar.

### Arquivos principais

- `functions/src/patrimonio.ts`
- `documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/Section-10-Subsection-8-Fluxo-de-Bens-Patrimoniais.tex`
- Seções 4/5/7 relacionadas a `Bem_Patrimonial`, requisições e locks
- testes de Functions/Firestore a criar ou atualizar

### Correção obrigatória

#### A. Requisição de edição

Ao criar a requisição:

1. abrir transação;
2. ler:
   - `Bem_Patrimonial/{idBem}`;
   - lock determinístico da edição;
3. validar existência/estado do bem e ausência de lock;
4. armazenar no pedido:
   - `id_bem`;
   - `versao_bem_origem`;
   - snapshot mínimo necessário para auditoria;
5. criar pedido + lock na mesma transação.

#### B. Resposta a requisição de edição

Reestruturar para que **todas as leituras ocorram antes de qualquer escrita**.

Fluxo de rejeição:

1. ler requisição e lock;
2. validar que a requisição ainda está pendente;
3. **não exigir que a versão atual do bem ainda seja igual à versão de origem para permitir rejeição**;
4. marcar requisição como rejeitada;
5. remover lock;
6. registrar auditoria/notificação.

Fluxo de aprovação:

1. ler requisição;
2. ler lock;
3. ler `Bem_Patrimonial`;
4. comparar `bem.versao` com `req.versao_bem_origem`;
5. se houver conflito:
   - não aplicar alteração;
   - retornar erro de conflito de versão;
   - não deixar o sistema em lock irrecuperável;
   - adotar uma política explícita: cancelar/rejeitar a requisição com liberação do lock ou disponibilizar ação de rejeição posterior;
6. se não houver conflito:
   - atualizar o bem;
   - incrementar `versao`;
   - registrar `Historico` imutável;
   - finalizar requisição;
   - remover lock;
   - registrar auditoria/notificação.

### Unicidade de `numero_patrimonio`

A simples query `where("numero_patrimonio", "==", ...)` antes da transação **não garante unicidade concorrente**.

Implementar uma chave de unicidade determinística, por exemplo:

```text
Chaves_Unicas/
  Bem_Patrimonial__<numero_normalizado>
```

A criação/aprovação de um novo bem deve, na mesma transação:

1. ler a chave;
2. rejeitar se já existir;
3. criar a chave;
4. criar o `Bem_Patrimonial`;
5. finalizar a requisição;
6. remover o lock;
7. gravar histórico/auditoria.

Fazer backfill das chaves para bens já existentes antes de depender do mecanismo.

> Se outra estratégia determinística equivalente for escolhida, ela deve garantir atomicidade real. Não aceitar apenas “consultar antes de criar”.

### Critérios de aceite

- [ ] duas requisições concorrentes para a mesma plaqueta não conseguem criar dois bens;
- [ ] rejeitar uma requisição continua possível mesmo se a versão do bem mudou;
- [ ] nenhuma falha deixa lock permanente sem política de recuperação;
- [ ] aprovação com versão desatualizada não sobrescreve silenciosamente alterações posteriores;
- [ ] não existe `tx.get()` depois de `tx.set/update/delete()` na mesma transação;
- [ ] aprovação incrementa `versao`;
- [ ] histórico imutável é criado;
- [ ] documentação da Seção 10 representa o mesmo algoritmo do código real.

---

## PDF-003 — Matrícula em turma: ingresso por código está corrigido, aceite de convite não

### Veredito

**PARCIAL.**

O Gemini está desatualizado sobre `ingressarEmTurmaPorCodigo`: a função atual já:

- valida turma arquivada;
- valida capacidade;
- verifica vínculo;
- verifica histórico de exclusão;
- cria `Turma/{id}/Alunos/{uid}`;
- cria `Usuarios/{uid}/Turmas/{id}`;
- registra `HistoricoAlunos`;
- incrementa `qtd_alunos`.

Portanto, **não reimplementar esse trecho**.

O problema residual está no fluxo de convite. Na implementação implantável não há um `aceitarConviteAluno` completo equivalente ao contrato descrito. O exemplo documental disponível também é insuficiente.

### Arquivos

- `functions/src/turmas.ts`
- schemas de turmas/convites
- `functions/src/index.ts` apenas se o novo callable não for exportado pelo módulo
- documentação de `Convite_Aluno`, RN-TUR-01 e Seção 10
- `firestore.rules`

### Solução

Criar um helper transacional único, por exemplo:

```ts
matricularAlunoTx(...)
```

Esse helper deve ser reutilizado por:

- ingresso por código;
- adição nominal por professor;
- aceite de convite.

O helper deve garantir atomicamente:

1. turma existe;
2. turma não está arquivada;
3. aluno/usuário existe e está ativo;
4. não existe vínculo duplicado;
5. capacidade:
   - ingresso normal respeita limite;
   - sobrecapacidade só é aceita quando existir **convite nominal explícito** com a exceção permitida e justificativa;
6. grava:
   - `Turma/{turmaId}/Alunos/{uid}`;
   - `Usuarios/{uid}/Turmas/{turmaId}` com metadados completos;
   - `HistoricoAlunos`;
   - incremento de `qtd_alunos`;
   - auditoria.

Implementar `aceitarConviteAluno` real, validando também:

- destinatário/e-mail/UID esperado;
- expiração;
- estado do convite;
- turma arquivada;
- capacidade;
- flag de exceção de lotação;
- justificativa quando exceder capacidade.

### Critérios de aceite

- [ ] aluno que aceita convite vê a turma no espelho `Usuarios/{uid}/Turmas`;
- [ ] contador e subcoleção permanecem consistentes;
- [ ] turma arquivada não aceita novos vínculos;
- [ ] turma cheia só aceita sobrecapacidade mediante convite excepcional válido;
- [ ] justificativa excepcional entra no histórico;
- [ ] repetir o aceite não duplica aluno nem contador;
- [ ] todos os caminhos de matrícula usam a mesma regra central.

---

## PDF-005 — Security Rules: parte do relatório está obsoleta, mas há lacunas reais

### Veredito

**PARCIALMENTE CONFIRMADO.**

A branch atual já possui regras para várias coleções que o Gemini listou como ausentes, incluindo exemplos como:

- `Materia`;
- `Resumo_Bem_Patrimonial`;
- `Local`;
- `Substancia_Quimica`;
- `Lote`;
- `Historico_Frasco_Reagente`.

Não adicionar regras duplicadas.

Entretanto, ainda existem problemas importantes:

1. ausência/insuficiência de regras para `Convite_Aluno`;
2. ausência de regras explícitas adequadas para materializações `Resumo_*_Diario` e equivalentes;
3. **desalinhamento de caminho para especificações de reagente**:
   - regras/documentos ainda tratam `Especificacao_Reagente` como raiz em alguns pontos;
   - o modelo atual usa `Resumo_Reagente/{resumoId}/Especificacoes/{especId}`;
4. algumas mutações sensíveis continuam podendo ficar excessivamente abertas ao cliente, embora invariantes dependam de Cloud Functions.

A própria documentação de segurança reconhece que `firestore.rules` ainda não reproduz integralmente a matriz autorizativa.

### Arquivos

- `firestore.rules`
- `documentation/Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex`
- schemas/código dos domínios afetados
- testes com Firebase Emulator

### Solução

#### Especificações aninhadas

Adicionar regra no caminho real:

```text
/Resumo_Reagente/{resumoId}/Especificacoes/{especificacaoId}
```

A permissão deve refletir a matriz de papéis da documentação.

Remover ou marcar como legado o match de raiz se a coleção raiz não fizer mais parte do modelo.

#### Convites

Definir explicitamente quem pode:

- criar convite;
- ler convite;
- aceitar/alterar estado;
- cancelar convite.

Se o aceite for exclusivamente via Cloud Function, o cliente deve ter apenas a leitura estritamente necessária e `write: false`.

#### Materializações

Adicionar leitura por papéis autorizados para:

- `Resumo_Almoxarifado_Diario`;
- `Resumo_Reagente_Diario`;
- `Resumo_Bem_Patrimonial_Diario`;
- materializações mensais utilizadas pela interface/relatórios.

Escrita deve ser do backend/Admin, não do cliente.

#### Mutações críticas

Para entidades protegidas por invariantes transacionais — requisições, patrimônio, estoque, materializações etc. — revisar `allow create/update/delete` diretos. Quando o contrato exigir Function, deixar escrita do cliente negada.

### Critérios de aceite

- [ ] testes do Emulator cobrem permitido e negado para cada papel;
- [ ] especificação aninhada pode ser lida pelo papel correto;
- [ ] cliente não consegue burlar lock/invariante escrevendo diretamente;
- [ ] convites têm regra coerente com o callable;
- [ ] materializações são legíveis apenas por papéis autorizados;
- [ ] documentação e `firestore.rules` descrevem o mesmo caminho físico.

---

## PDF-012 — `Lote` sem `id_resumo_reagente` e leitura no caminho físico incorreto

### Veredito

**CONFIRMADO e mais grave do que descrito pelo Gemini.**

A função de cadastro de lote recebe `idResumoReagente` e usa esse valor para encontrar a especificação aninhada, mas o documento `Lote` não persiste `id_resumo_reagente`.

Além disso, há código que tenta resolver a especificação em:

```text
Especificacao_Reagente/{id}
```

enquanto o modelo atual persiste em:

```text
Resumo_Reagente/{idResumo}/Especificacoes/{idEspecificacao}
```

Isso pode quebrar resolução de densidade e relatórios com lote.

### Arquivos

- `functions/src/reagentes_base.ts`
- `functions/src/reagentes.ts`
- `functions/src/relatorios.ts`
- schemas de lote
- `firestore.rules`
- documentação Seções 4/5/10
- migração/backfill

### Solução

Adicionar ao documento `Lote`:

```ts
id_resumo_reagente: string
```

Esse campo deve ser obrigatório para novos lotes.

Centralizar a construção de referência:

```ts
function refEspecificacao(
  db: FirebaseFirestore.Firestore,
  idResumo: string,
  idEspecificacao: string
) {
  return db
    .collection("Resumo_Reagente")
    .doc(idResumo)
    .collection("Especificacoes")
    .doc(idEspecificacao);
}
```

Usar esse helper em todo o backend.

Criar script/migração idempotente para preencher `id_resumo_reagente` nos lotes legados.

### Critérios de aceite

- [ ] nenhum código ativo consulta a coleção raiz legada `Especificacao_Reagente`;
- [ ] todo `Lote` novo armazena `id_resumo_reagente`;
- [ ] lotes existentes são migrados ou tratados explicitamente;
- [ ] densidade de frasco com lote é resolvida corretamente;
- [ ] relatórios com lote resolvem a especificação correta;
- [ ] Security Rules usam o caminho aninhado real;
- [ ] testes cobrem lote da especificação correta e lote incompatível.

---

## PDF-025 — Q06/higroscopia: implementação atual não cumpre a regra canônica

### Veredito

**O problema é real, porém a solução proposta pelo Gemini não deve ser aplicada.**

O Gemini sugeriu mudar a tolerância para massa líquida. Isso **contradiz a decisão canônica já fechada no projeto**.

A regra válida é:

```text
tolerancia_normal = max(1,0 g; 0,5% × peso_saida)

tolerancia_higro  = max(2,0 g; 2,0% × peso_saida)
```

Quando:

```text
peso_retorno > peso_saida
```

mas o ganho permanece dentro da tolerância aplicável:

- consumo = `0`;
- registrar evento separado de `AJUSTE`.

Se exceder a tolerância, a devolução deve ser bloqueada para reconciliação.

### Problemas reais do código atual

O código atual:

- usa margem fixa de 2%;
- aplica a margem de forma indistinta;
- não implementa a tolerância normal de 1 g/0,5%;
- não implementa o mínimo higroscópico de 2 g;
- não seleciona a regra com base em `eh_higroscopico`;
- não registra adequadamente o evento separado `AJUSTE`;
- o cadastro de resumo atualmente não disponibiliza de forma suficiente `eh_higroscopico` para cumprir Q06.

### Arquivos

- `functions/src/reagentes.ts`
- `functions/src/reagentes_base.ts`
- `functions/src/schemas/reagentes_base.schema.ts`
- modelo `Resumo_Reagente`
- histórico/emprestimo se o snapshot for exigido
- documentação Q06
- testes

### Solução

1. adicionar campo `ehHigroscopico` ao schema de entrada;
2. persistir como `eh_higroscopico` no `Resumo_Reagente`;
3. migrar/backfill os dados existentes;
4. no momento da retirada, capturar snapshot do comportamento higroscópico quando o modelo histórico exigir imutabilidade;
5. na devolução:
   - obter `peso_saida`;
   - determinar a tolerância pelo snapshot/Resumo;
   - calcular exatamente as fórmulas normativas;
   - se ganho positivo dentro da tolerância:
     - consumo `0`;
     - escrever `AJUSTE`;
   - se ganho acima da tolerância:
     - rejeitar e orientar reconciliação;
   - se retorno <= saída:
     - calcular consumo normalmente.
6. não substituir essas fórmulas por fórmula baseada em massa líquida sem reabrir formalmente a decisão Q06.

### Testes obrigatórios

- [ ] não higroscópico com ganho < 1 g;
- [ ] não higroscópico em exatamente 0,5%;
- [ ] não higroscópico acima da tolerância;
- [ ] higroscópico com ganho < 2 g;
- [ ] higroscópico em exatamente 2%;
- [ ] higroscópico acima da tolerância;
- [ ] retorno igual à saída;
- [ ] retorno menor que saída;
- [ ] ganho tolerado gera consumo zero + `AJUSTE`;
- [ ] histórico preserva a regra/snapshot utilizada.

---

# 4. Correções P1 — alta prioridade

## PDF-004 — Autoatendimento Q14 e notificações para a Chefia

### Veredito

**CONFIRMADO e mais amplo que o relatório.**

O schema de notificação não contempla adequadamente a Chefia para esse evento e `AUTO_ATENDIMENTO` não existe no enum correspondente.

Mais importante: o fluxo atual de `registrarRetirada` não implementa integralmente Q14.

### Solução

Atualizar o contrato de notificação:

- incluir `Chefe_Geral` em `papel_destinatario`;
- incluir `AUTO_ATENDIMENTO` em `tipo`;
- verificar se `Bolsista` precisa permanecer no enum conforme o modelo canônico e alinhar schema/documentação.

No `registrarRetirada`, detectar quando:

```text
uid do gestor operador == uid do destinatário da retirada
```

Nesse caso:

1. identificar o almoxarifado;
2. consultar vínculos ativos de gestores;
3. permitir somente se o operador for o **único gestor ativo** daquele almoxarifado;
4. exigir justificativa;
5. criar retirada;
6. criar notificação obrigatória para a Chefia;
7. registrar auditoria do autoatendimento;
8. realizar tudo com a atomicidade necessária.

Se existir outro gestor ativo, rejeitar.

### Critérios de aceite

- [ ] autoatendimento com dois gestores ativos é bloqueado;
- [ ] único gestor pode realizar somente com justificativa;
- [ ] Chefia recebe notificação idempotente;
- [ ] schema aceita `Chefe_Geral` e `AUTO_ATENDIMENTO`;
- [ ] operação normal para outro usuário não gera falso alerta.

---

## PDF-006 — Relatório mensal de bens usa estado atual

### Veredito

**CONFIRMADO.**

`gerarRelatorioBensPredio` aceita `mes`/`ano`, porém consulta `Bem_Patrimonial` atual. Isso produz relatório historicamente incorreto.

### Solução

Se a função permanecer mensal/histórica:

1. converter mês/ano em intervalo civil de `America/Sao_Paulo`;
2. usar histórico imutável/materialização histórica;
3. reconstruir o estado do bem no período/corte temporal;
4. respeitar prédio/sala do período, não os valores atuais;
5. adicionar os índices collection-group necessários.

Alternativa somente se o produto decidir que esse relatório é atual:

- remover `mes` e `ano`;
- renomear o relatório explicitamente para estado atual;
- ajustar UI/documentação.

**Não manter parâmetros temporais ignorados.**

### Critérios de aceite

- [ ] bem transferido em julho aparece em fevereiro na sala de fevereiro;
- [ ] bem baixado após o mês consultado aparece conforme situação daquele mês;
- [ ] testes cobrem mudança de local entre períodos.

---

## PDF-008 — Índices de relatórios ausentes e configuração não reproduzível

### Veredito

**CONFIRMADO.**

Há queries compostas no backend que não estão refletidas de forma suficiente no catálogo documental e a branch não possui configuração declarativa completa de índices versionada para deployment.

### Solução

Criar/atualizar `firestore.indexes.json` e referenciá-lo em `firebase.json`.

Incluir, no mínimo, os índices exigidos pelas queries reais, como:

```text
Emprestimo_Reagente:
  id_almoxarifado ASC
  data_devolucao_efetuada ASC

Historico_Frasco_Reagente:
  id_almoxarifado ASC
  timestamp ASC
```

Também auditar todas as queries em `functions/src` e frontend para catalogar os demais índices compostos e collection-group necessários.

> Não adicionar índices especulativos sem query correspondente; versionar os realmente usados.

### Critérios de aceite

- [ ] `firebase.json` aponta para arquivo de índices;
- [ ] índices estão no repositório;
- [ ] queries de relatório executam no Emulator/projeto de teste sem erro `FAILED_PRECONDITION` de índice;
- [ ] Seção 5.8 é atualizada para refletir os índices reais.

---

## PDF-009 — Posts/comentários: parte já implementada, mas moderação e histórico estão incompletos

### Veredito

**PARCIAL.**

Já existem no código:

- `criarPost`;
- `adicionarComentario`;
- `excluirPost`;
- `excluirComentario`.

Logo, não criar duplicatas.

Problemas residuais:

- falta fluxo formal de `editarPost`;
- falta `editarComentario`/`moderarComentario`;
- moderação institucional por `Chefe_Geral` não está completamente materializada;
- há exclusões físicas em um domínio que exige rastreabilidade/soft-delete.

### Solução

Implementar, conforme o modelo:

- `editarPost`;
- `editarComentario` e/ou `moderarComentario`;
- override institucional da Chefia somente com justificativa;
- `Historico_Posts_Turma`;
- `Historico_Comentario`;
- soft-delete/tombstone em vez de `delete()` quando RF25 exigir preservação.

Para exclusão lógica, usar campos coerentes com o modelo, por exemplo:

```text
ativo
excluido
excluido_em
excluido_por
motivo_moderacao
```

Não inventar nomes se já houver nomenclatura canônica; preferir os existentes.

### Critérios de aceite

- [ ] professor responsável edita post autorizado;
- [ ] aluno não edita post de professor;
- [ ] autor edita comentário conforme regra;
- [ ] Chefia pode moderar com justificativa e auditoria;
- [ ] conteúdo anterior permanece recuperável no histórico;
- [ ] exclusão não apaga trilha auditável.

---

## PDF-011 — Materializações sem jobs implantáveis

### Veredito

**CONFIRMADO.**

A documentação define materializações diárias/mensais, mas não há implementação implantável suficiente em `functions/src` para produzi-las de forma contínua.

### Solução

Implementar jobs agendados para, no mínimo:

- `Resumo_Almoxarifado_Diario`;
- `Resumo_Reagente_Diario`;
- `Resumo_Bem_Patrimonial_Diario`;
- `Atividade_Gestor_Almoxarifado_Mensal`.

Características obrigatórias:

1. timezone `America/Sao_Paulo`;
2. ID determinístico por período + entidade;
3. execução idempotente;
4. `set()` de estado calculado ou estratégia de upsert determinística;
5. possibilidade de backfill/reprocessamento;
6. não depender de incrementos não idempotentes sem deduplicação;
7. telemetria/log estruturado;
8. regra explícita de leitura e escrita em `firestore.rules`.

### Critérios de aceite

- [ ] executar duas vezes o mesmo período produz o mesmo resultado;
- [ ] job atrasado/reexecutado não duplica métricas;
- [ ] backfill de uma data passada funciona;
- [ ] fronteira de dia usa São Paulo;
- [ ] documentação e código têm os mesmos nomes de coleções/campos.

---

## PDF-014 — Operações críticas de frasco sem contratos de backend

### Veredito

**CONFIRMADO.**

Faltam operações server-side formais para estados como descarte, quebra e quarentena, embora o domínio as descreva.

### Solução

Implementar callables/serviços para as transições previstas no modelo, por exemplo:

- `registrarDescarteFrasco`;
- `registrarQuebraFrasco`;
- operação de esvaziamento, se existir no enum canônico;
- `alterarQuarentenaFrasco`.

Cada operação deve:

1. validar Gestor de Almoxarifado ativo;
2. validar vínculo com o almoxarifado do frasco;
3. ler estado atual;
4. validar transição permitida;
5. atualizar frasco sem apagar fisicamente;
6. registrar `Historico_Frasco_Reagente`;
7. registrar `Registro_de_Auditoria`;
8. impedir retirada posterior quando o estado não permitir.

### Critérios de aceite

- [ ] frasco descartado não pode voltar a `DISPONIVEL` sem fluxo explicitamente permitido;
- [ ] frasco quebrado não pode ser retirado;
- [ ] quarentena bloqueia operações incompatíveis;
- [ ] histórico registra estado anterior/novo e operador;
- [ ] usuário não vinculado ao almoxarifado é bloqueado.

---

## PDF-015 — Datas civis e timezone

### Veredito

**CONFIRMADO.**

Há uso de `new Date(...)`, parsing de string de data e `setHours(...)` dependente do timezone do runtime. Em Functions/container, isso não é uma garantia de `America/Sao_Paulo`.

### Solução

Criar utilitário único de data civil usando biblioteca com IANA timezone (`date-fns-tz`, Luxon ou equivalente já aprovado).

Exemplos de responsabilidades:

```ts
inicioDiaSaoPaulo("2026-09-13")
fimDiaSaoPaulo("2026-09-13")
intervaloMesSaoPaulo(2026, 9)
```

Fluxo correto:

1. interpretar data civil em `America/Sao_Paulo`;
2. calcular início/fim no timezone do domínio;
3. converter para instante UTC;
4. persistir/consultar via Timestamp.

Substituir parsing ad hoc em:

- retirada;
- devolução;
- relatórios;
- jobs;
- vencimentos;
- qualquer comparação de “hoje”, “fim do dia” ou mês.

### Critérios de aceite

- [ ] `2026-09-13` significa o dia civil de São Paulo independentemente de `TZ` do processo;
- [ ] teste roda com `TZ=UTC` e continua correto;
- [ ] intervalo mensal não perde eventos das primeiras/últimas horas;
- [ ] nenhuma função crítica usa `new Date("YYYY-MM-DD")` diretamente.

---

## PDF-016 — Triggers de contagem não idempotentes

### Veredito

**CONFIRMADO NO DESENHO DOCUMENTADO, com agravante de que a implementação implantável correspondente está incompleta/ausente.**

O exemplo de trigger usa `FieldValue.increment`, o que não é idempotente sob retry de evento.

### Solução

Ao implementar os triggers reais:

1. obter `event.id`;
2. manter ledger de eventos processados ou usar outra técnica de deduplicação atômica;
3. numa transação:
   - verificar se `event.id` já foi processado;
   - se não, aplicar a alteração;
   - marcar evento como processado;
4. tratar mudança de lote, se possível, como decremento no lote anterior + incremento no novo;
5. implementar job de reconciliação periódica que possa recalcular o contador a partir dos frascos reais.

Uma alternativa ainda mais robusta é materializar por recomputação determinística quando a escala permitir.

### Critérios de aceite

- [ ] replay do mesmo evento não altera a contagem pela segunda vez;
- [ ] remoção reexecutada não gera contador negativo artificial;
- [ ] movimentação entre lotes é consistente;
- [ ] reconciliação corrige eventual drift.

---

## PDF-020 — Custom Claims: não mudar a decisão de leituras, corrigir mutações de alto impacto

### Veredito

**PARCIAL.**

O projeto aceita conscientemente que leituras diretas possam refletir claims antigas por uma janela de token. Portanto, **não transformar toda leitura do Firestore em consulta síncrona de `Usuarios.ativo`** como solução genérica.

O problema real é que mutações de alto impacto ainda podem validar apenas o papel vindo do token.

### Solução

Criar helper assíncrono, por exemplo:

```ts
validarPermissaoAtiva(uid, papeisPermitidos)
```

que faça:

1. validação do token/papel;
2. leitura atual de `Usuarios/{uid}`;
3. confirmação de `ativo === true`;
4. quando necessário, confirmação de papel/vínculo persistido atual.

Aplicar às mutações de alto impacto, especialmente:

- patrimônio;
- retiradas/devoluções;
- criação/revogação de papéis;
- operações de almoxarifado;
- descarte/quebra/quarentena;
- moderação institucional;
- operações administrativas.

Também validar o usuário destinatário da operação quando a regra exigir, como já ocorre em partes do fluxo de retirada.

### Não fazer

- não alterar DP-D01 silenciosamente;
- não prometer revogação instantânea de leitura via Rules se a arquitetura não foi alterada;
- não usar apenas `request.auth.token.roles` para mutações críticas.

### Critérios de aceite

- [ ] ator desativado não executa mutação crítica mesmo com JWT antigo;
- [ ] papel revogado não executa mutação crítica mesmo com claim antiga quando a função exige estado persistido;
- [ ] leituras continuam seguindo a decisão DP-D01 documentada.

---

## PDF-023 — Job de escassez globaliza estoque e perde granularidade do almoxarifado

### Veredito

**CONFIRMADO NA ESPECIFICAÇÃO EXISTENTE.**

O exemplo documental calcula escassez globalmente por resumo e depois envia para gestores de almoxarifados, o que pode notificar uma unidade que não está realmente em escassez.

Há também divergência entre comentário e ID determinístico produzido.

### Solução

O cálculo deve ser por par:

```text
(id_resumo_reagente, id_almoxarifado)
```

Para cada almoxarifado:

1. calcular estoque do resumo naquela unidade;
2. comparar com o limiar aplicável;
3. buscar somente gestores ativos vinculados à unidade;
4. criar notificação para esses gestores;
5. usar ID idempotente com granularidade suficiente, por exemplo:

```text
escassez_<idResumo>_<idAlmoxarifado>_<data>_<uid>
```

se a notificação for individual por usuário.

Usar a data civil de `America/Sao_Paulo`.

Transformar o exemplo em implementação real em `functions/src` caso o job ainda não exista.

### Critérios de aceite

- [ ] falta em A não notifica gestor exclusivo de B;
- [ ] reexecução do mesmo dia não duplica notificação;
- [ ] ID contém a granularidade do almoxarifado;
- [ ] apenas gestores ativos/vinculados recebem;
- [ ] índices necessários estão versionados.

---

# 5. Correções P2 — documentação, infraestrutura complementar e performance

## PDF-007 — Dois mecanismos de propagação de nome

### Veredito

**PARCIAL.**

O runtime atual já divide os writes em lotes de 400, então o problema do limite de 500 descrito pelo Gemini não se aplica diretamente ao código implantável atual.

Entretanto, a documentação ainda contém:

- exemplo antigo de `batch()` único;
- outro caminho baseado em `BulkWriter`.

Isso cria duas soluções concorrentes na especificação.

### Solução

Escolher **um único mecanismo oficial automático**.

Recomendação:

- manter trigger automática;
- internamente usar `BulkWriter` **ou** preservar os chunks de 400 já funcionais;
- atualizar a Seção 10 para o mesmo algoritmo;
- remover/marcar como obsoleta a callable concorrente `propagarNomeResumo` se ela não for necessária.

### Critérios de aceite

- [ ] só existe um fluxo oficial de propagação;
- [ ] >500 bens são processados;
- [ ] documentação não mostra batch ilimitado.

---

## PDF-010 — Cadastro de almoxarifado sem Function formal

### Veredito

**CONFIRMADO.**

Não há módulo/Function implantável específico para criação de almoxarifado com vínculos iniciais, apesar do fluxo administrativo estar descrito.

### Solução

Criar:

- schema de entrada;
- `functions/src/almoxarifados.ts`;
- callable `cadastrarAlmoxarifado`.

Validar:

1. Chefe Geral ativo;
2. dados do almoxarifado;
3. gestores selecionados existem;
4. gestores possuem papel ativo de `Gestor_Almoxarifado`;
5. criação de vínculos determinísticos em `Gestor_Almoxarifado_x_Almoxarifado`;
6. auditoria.

Restringir escrita direta do cliente se a operação for governada pela Function.

### Critérios de aceite

- [ ] almoxarifado e vínculos nascem atomicamente/coerentemente;
- [ ] usuário sem papel adequado não pode ser vinculado;
- [ ] operação gera auditoria;
- [ ] UI não precisa escrever múltiplas coleções por conta própria.

---

## PDF-013 — `removerAlunoTurma` já existe

### Veredito

**RESOLVIDO NO CÓDIGO; permanece apenas lacuna documental.**

A função atual já realiza:

- remoção do aluno da turma;
- remoção do espelho;
- histórico;
- decremento;
- auditoria.

### Ação

**Não criar outra função.**

Somente:

- documentar formalmente `removerAlunoTurma` na Seção 10;
- garantir que o contrato documental represente o código;
- adicionar/confirmar testes de idempotência e autorização.

---

## PDF-017 — `onLocalAtualizado` já faz chunk abaixo de 500

### Veredito

**RESOLVIDO NO RUNTIME.**

O código real já divide as operações em blocos de 400.

### Ação

- não reimplementar a trigger;
- atualizar o snippet documental que ainda mostra batch único;
- se PDF-007 padronizar BulkWriter para todo fan-out, migrar conscientemente ambas as triggers de forma consistente e testada.

---

## PDF-018 — Singleton do código de frasco

### Veredito

**RISCO DE CONTENÇÃO REAL, mas a afirmação do Gemini de “1 a 5 gravações/s” não deve ser tratada como fato.**

O singleton existe para garantir sequência estrita. A própria documentação pede medição em vez de assumir um limite universal.

### Ação

Não substituir automaticamente o design.

Criar benchmark de concorrência que meça:

- latência p50/p95/p99;
- retries;
- throughput;
- taxa de falha;
- comportamento em carga inicial/importação.

Documentar o limite observado.

Somente se a carga necessária ultrapassar o limite medido, abrir decisão arquitetural para:

- alocador serializado;
- fila;
- blocos de códigos;
- outra estratégia.

> Cuidado: reservar blocos pode introduzir lacunas e contrariar a semântica desejada. Não fazer sem decisão explícita.

---

# 6. Itens que NÃO devem ser corrigidos como o Gemini sugeriu

## PDF-002 — Revogação de papel

### Veredito: RESOLVIDO

O código atual já:

- remove vínculos em `Gestor_Almoxarifado_x_Almoxarifado` ao revogar Gestor;
- protege almoxarifado contra ficar sem gestor;
- passa os papéis resultantes por `validarMatrizPapeis`.

Como `Bolsista` exige `Aluno`, revogar apenas `Aluno` enquanto `Bolsista` permanece é rejeitado pela matriz.

### Ação

**Não implementar cascata automática sem nova decisão de produto.**

A política atual segura é: revogar `Bolsista` antes de `Aluno`.

Opcionalmente melhorar a mensagem de erro e documentar esse fluxo.

---

## PDF-019 — Reserva de códigos para etiquetas virgens

### Veredito: REJEITADO

A decisão explícita do projeto é que **etiqueta virgem não reserva identificador oficial**.

O código oficial é atribuído no cadastro físico/transação, justamente para evitar consumir IDs de etiquetas:

- danificadas;
- perdidas;
- nunca utilizadas.

### Ação

**Não sincronizar impressão virgem reservando o singleton.**

Apenas manter claro na UI/documentação que o valor visual de etiqueta virgem não é registro oficial até o cadastro.

---

## PDF-021 — Modal “Novo Reagente”

### Veredito: RESOLVIDO

A Seção 8 atual já remete o cadastro aos dados separados de resumo/especificação e a UI-05 descreve o assistente em etapas.

### Ação

Nenhuma alteração funcional.

Se desejar apenas reforço textual, registrar explicitamente que UI-05 é o contrato normativo e substitui formulário plano legado.

---

## PDF-022 — Natureza química

### Veredito: RESOLVIDO

O schema atual usa:

```text
ORGANICO
INORGANICO
ELEMENTO
HIBRIDO
```

e a UI está alinhada aos rótulos correspondentes.

A antiga ambiguidade “Complexo/Biológico” não deve ser reintroduzida.

### Ação

Nenhuma correção para este achado.

---

## PDF-024 — `_ frascos_adicionados`

### Veredito: RESOLVIDO

A documentação atual usa `qtd_frascos_adicionados`.

### Ação

Nenhuma.

---

# 7. Achados P1/P2 já descritos pelo Gemini, mas com correção ajustada

## PDF-009 — observação adicional: hard delete

Além da lacuna de edição/moderação, revisar `excluirPost` e `excluirComentario` porque RF25 exige preservação histórica. Caso o contrato atual realmente determine soft-delete, substituir exclusão física por tombstone + histórico.

---

## PDF-013 — não duplicar lógica

Ao documentar `removerAlunoTurma`, não criar uma versão nova paralela. O código atual é a base.

---

# 8. Achados adicionais encontrados durante a validação

Estes pontos surgiram ao verificar os achados do Gemini contra o código atual e devem ser corrigidos junto dos IDs aos quais estão relacionados.

## EXTRA-001 — Caminho físico de `Especificacoes` está divergente em vários níveis

**Associado a:** PDF-005 e PDF-012.

O modelo atual usa subcoleção sob `Resumo_Reagente`, mas há referências de raiz em backend/regras/documentação.

### Ação

Executar busca global por:

```text
Especificacao_Reagente
```

Classificar cada ocorrência:

- coleção raiz legada;
- nome conceitual legítimo;
- referência física incorreta.

Migrar somente referências físicas incorretas para:

```text
Resumo_Reagente/{idResumo}/Especificacoes/{idEspecificacao}
```

Centralizar helper para evitar regressão.

---

## EXTRA-002 — Q14 não está apenas com enum quebrado; regra operacional está ausente

**Associado a:** PDF-004.

Não considerar PDF-004 concluído apenas após adicionar enum. É obrigatório implementar a validação operacional do autoatendimento em `registrarRetirada`.

---

## EXTRA-003 — `estado_fisico = GASOSO` merece revisão separada

O schema atual permite:

```text
SOLIDO
LIQUIDO
GASOSO
```

Enquanto uma decisão registrada em `DUVIDAS_PENDENTES_LCQUI.md` limita o escopo consolidado a sólido/líquido.

### Ação

Antes de alterar código, confirmar qual decisão é a mais recente no próprio documento de decisões. Se `DP-A01` ainda estiver vigente:

- remover `GASOSO` do schema;
- alinhar UI/documentação;
- migrar dados se necessário.

**Não misturar essa correção com PDF-022**, que trata natureza química, não estado físico.

---

# 9. Ordem recomendada de execução

A IA corretora deve fazer commits pequenos e rastreáveis, aproximadamente nesta ordem:

1. **Patrimônio transacional** — PDF-001.
2. **Caminho de especificações + Lote** — PDF-012 + parte de PDF-005.
3. **Q06/higroscopia** — PDF-025.
4. **Matrícula/convites** — PDF-003.
5. **Security Rules** — restante de PDF-005.
6. **Autoatendimento Q14/notificações** — PDF-004.
7. **Timezone** — PDF-015.
8. **Relatórios históricos** — PDF-006.
9. **Índices versionados** — PDF-008.
10. **Posts/moderação/soft delete** — PDF-009.
11. **Operações de frasco** — PDF-014.
12. **Checagem síncrona de ator ativo** — PDF-020.
13. **Materializações + idempotência** — PDF-011 + PDF-016.
14. **Escassez por almoxarifado** — PDF-023.
15. **Cadastro de almoxarifado** — PDF-010.
16. **Consolidação de triggers/documentação** — PDF-007 + PDF-017.
17. **Documentação de remover aluno** — PDF-013.
18. **Benchmark do singleton** — PDF-018.
19. **Somente revisão/verificação** dos itens 002, 019, 021, 022 e 024.

---

# 10. Estratégia de testes mínima antes de considerar concluído

## 10.1 Firestore Emulator

Criar suites para:

- concorrência de duas requisições patrimoniais;
- unicidade de plaqueta;
- conflito de versão;
- rejeição com versão divergente;
- ingresso/convite em turma cheia;
- turma arquivada;
- espelhamento aluno/turma;
- Rules por papel;
- acesso a especificação aninhada;
- lote/especificação;
- replay de eventos idempotentes;
- Security Rules de materializações;
- tentativa de escrita direta em entidade governada por Function.

## 10.2 Testes de domínio de reagente

Cobrir:

- Q06 normal;
- Q06 higroscópico;
- lote incompatível;
- densidade via especificação aninhada;
- descarte;
- quebra;
- quarentena;
- retirada de estado inválido;
- autoatendimento único gestor;
- autoatendimento com mais de um gestor.

## 10.3 Datas

Rodar testes com ambiente:

```bash
TZ=UTC
```

e confirmar que regras civis continuam em `America/Sao_Paulo`.

Cobrir:

- 00:00 local;
- 23:59:59 local;
- virada de mês;
- virada de ano.

## 10.4 Relatórios

Cenário obrigatório:

1. bem na Sala 101 em fevereiro;
2. transferido para Sala 202 em julho;
3. relatório de fevereiro deve mostrar Sala 101;
4. relatório atual deve mostrar Sala 202.

## 10.5 Regressão de itens já resolvidos

Confirmar que as correções não quebraram:

- expurgo de vínculos ao revogar Gestor;
- matriz `Bolsista -> Aluno`;
- ingresso por código com espelho/histórico;
- chunks de 400 nas triggers atuais, caso ainda sejam mantidos;
- nomenclatura `qtd_frascos_adicionados`;
- naturezas químicas atuais.

---

# 11. Definition of Done

A correção global só deve ser considerada concluída quando:

- [ ] todos os itens P0 e P1 deste documento estiverem resolvidos;
- [ ] itens resolvidos/rejeitados não tiverem sido “corrigidos” indevidamente;
- [ ] `npm run build`/TypeScript das Functions passar;
- [ ] frontend continuar compilando;
- [ ] testes de Functions passarem;
- [ ] testes do Firestore Emulator passarem;
- [ ] `firestore.rules` e índices estiverem versionados;
- [ ] documentação LaTeX estiver alinhada ao runtime;
- [ ] não houver referências físicas ativas à coleção raiz legada de especificações;
- [ ] scripts de migração/backfill forem idempotentes e documentados;
- [ ] alterações de schema tiverem estratégia para dados já existentes;
- [ ] cada correção crítica tiver teste de regressão;
- [ ] nenhum hard delete novo tenha sido introduzido em entidades de histórico;
- [ ] datas civis críticas forem independentes do timezone do processo;
- [ ] a IA produzir, ao final, uma tabela `ID -> arquivos alterados -> testes -> status`.

---

# 12. Checklist final por ID

```text
[ ] PDF-001  CORRIGIR — patrimônio/versionamento/lock/unicidade/transação
[x] PDF-002  NÃO CORRIGIR — já resolvido
[ ] PDF-003  CORRIGIR — aceite de convite/matrícula comum
[ ] PDF-004  CORRIGIR — Q14 + enum + notificação Chefia
[ ] PDF-005  CORRIGIR — regras residuais + caminho aninhado
[ ] PDF-006  CORRIGIR — relatório histórico
[ ] PDF-007  CORRIGIR DOC/CONSOLIDAR — não duplicar propagação
[ ] PDF-008  CORRIGIR — índices versionados
[ ] PDF-009  CORRIGIR — edição/moderação/histórico/soft delete
[ ] PDF-010  CORRIGIR — cadastrar almoxarifado
[ ] PDF-011  CORRIGIR — materializações
[ ] PDF-012  CORRIGIR — Lote + caminho de Especificacoes
[ ] PDF-013  DOCUMENTAR — função já existe
[ ] PDF-014  CORRIGIR — descarte/quebra/quarentena
[ ] PDF-015  CORRIGIR — timezone
[ ] PDF-016  CORRIGIR — idempotência de triggers
[ ] PDF-017  DOCUMENTAR — runtime já corrige limite de batch
[ ] PDF-018  MEDIR — não assumir throughput numérico
[x] PDF-019  NÃO CORRIGIR — reserva de etiqueta contradiz decisão
[ ] PDF-020  CORRIGIR — revalidação em mutações críticas
[x] PDF-021  NÃO CORRIGIR — UI-05 já consolidada
[x] PDF-022  NÃO CORRIGIR — natureza química já alinhada
[ ] PDF-023  CORRIGIR — escassez por almoxarifado
[x] PDF-024  NÃO CORRIGIR — typo já corrigido
[ ] PDF-025  CORRIGIR — Q06 com fórmula canônica
```

---

## Observação final para o agente corretor

Não trate a Seção 10 reorganizada como prova de que um trecho já existe no código de produção. Nesta branch, há exemplos/documentação que ficaram à frente ou atrás de `functions/src`. A correção deve terminar com **uma única verdade consistente entre modelo, documentação e implementação**, preservando as decisões já fechadas do projeto.

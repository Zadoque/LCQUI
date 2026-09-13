# Especificação Técnica Consolidada e Resolução de Pendências — Sistema LCQUI

Este documento reúne todas as correções arquiteturais, refinamentos no modelo relacional (SQL 3FN), modelagem física NoSQL (Cloud Firestore), regras de segurança (Security Rules), Cloud Functions e resolução formal das questões em aberto (Q01 a Q14) para o sistema do Laboratório de Ciências Químicas (LCQUI/UENF).

---

## 1\. Modelagem do Catálogo Químico e Propriedades de Domínio

### 1.1 Centralização de `estado_fisico` e `eh_higroscopico` em `Resumo_Reagente`

* **Definição Arquitetural**: Os campos `estado_fisico` (SOLIDO, LIQUIDO) e `eh_higroscopico` (BOOLEAN) pertencem à entidade `Resumo_Reagente`, sendo removidos da `Especificacao_Reagente`.  
* **Fundamentação Química e de Domínio**:  
  * Em condições ambientes (25 °C, 1 atm), o estado físico é inerente à espécie química pura (ex.: Cloreto de Sódio é sólido; Etanol é líquido). Formas líquidas de substâncias tipicamente sólidas são, por definição científica, soluções aquosas (`tipo_substancia = MISTURA`), devendo compor um resumo próprio no catálogo.  
  * A necessidade de pesagem periódica (`requer_pesagem_frequente`) no laboratório decorre estritamente de:  
    1. **Sólidos higroscópicos ou deliquescentes** (ganham massa ao absorver vapor d'água atmosférico);  
    2. **Líquidos voláteis** (perdem massa contínua por evaporação).  
  * A deliquescência/higroscopia é propriedade da espécie química (ex.: KOH, NaOH, CaCl₂, Sílica Gel), repetindo-se em qualquer grau de pureza comercial. Centralizar no resumo elimina redundâncias (3FN) e assegura que qualquer frasco herde automaticamente as tolerâncias de bancada.  
* **Otimização no Firestore**:  
  * Elimina o array denormalizado `estados_fisicos: []` e a query com `array-contains` (Seção 5.2).  
  * As buscas no catálogo usam igualdade escalar direta: `.where("estado_fisico", "==", "SOLIDO")`, viabilizando índices compostos triviais com `natureza_quimica` e `letra_inicial`.

### 1.2 Unidade de Medida e Densidade

* `unidade_de_medida` é amarrada ao `Resumo_Reagente.estado_fisico`:  
  * `SOLIDO` $\\rightarrow$ Unidade padrão: **gramas (g)**;  
  * `LIQUIDO` $\\rightarrow$ Unidade padrão: **mililitros (mL)**.  
* Densidade ($\\rho$, em $g/mL$) permanece na `Especificacao_Reagente`, obrigatória e positiva apenas quando `Resumo_Reagente.estado_fisico == 'LIQUIDO'`.

---

## 2\. Metrologia, Tolerância de Balança e Devolução de Frascos (Q06)

### 2.1 Invariante Estrita de Não Negatividade no Empréstimo

* O consumo útil associado a uma retirada é um atributo do empréstimo: $$\\text{Consumo} \= \\max(0,; Peso\_{saida} \- Peso\_{retorno})$$  
* Um empréstimo **jamais** produz consumo negativo e nunca decrementa o acumulador `medida_usada` do frasco.

### 2.2 Janela Híbrida de Tolerância Metrológica de Retorno

Para acomodar a incerteza instrumental de balanças de bancada sem permitir discrepâncias em bombonas pesadas: $$\\Delta m\_{max} \= \\begin{cases} \\max(1.0\\text{ g},; 0.5% \\times Peso\_{saida}) & \\text{se } \\text{eh\_higroscopico} \= \\text{false} \\ \\max(2.0\\text{ g},; 2.0% \\times Peso\_{saida}) & \\text{se } \\text{eh\_higroscopico} \= \\text{true} \\end{cases}$$

1. **$Peso\_{retorno} \\le Peso\_{saida}$**: Operação regular de consumo.  
2. **$Peso\_{saida} \< Peso\_{retorno} \\le Peso\_{saida} \+ \\Delta m\_{max}$**: Ganho higroscópico ou incerteza tolerada:  
   * Consumo do empréstimo registrado como `0.000`;  
   * Frasco atualizado com o peso físico real medido na balança (`peso_atual = pesoRetorno`);  
   * Gera histórico em `Historico_Frasco_Reagente` do tipo `AJUSTE` com `campo_ajustado = 'ganho_massa_higroscopia'`.  
3. **$Peso\_{retorno} \> Peso\_{saida} \+ \\Delta m\_{max}$**: Bloqueio operacional por anomalia (suspeita de contaminação física ou erro de balança).

### 2.3 Tratamento de Anomalia $Peso\_{retorno} \< Tara$ e Recalibração

* Se o peso de retorno for inferior à tara cadastrada ($Peso\_{frasco\_vazio}$):  
  * Diferença $\\le 5\\text{ g}$: O sistema sugere frasco esgotado. Confirmado pelo gestor, `estado_fisico_frasco` migra para `VAZIO`, tara é reajustada ao peso atual e consumo consome o saldo restante.  
  * Diferença $\> 5\\text{ g}$ com produto restante: Bloqueia a devolução e exige o fluxo formal de **Recalibração de Tara** (`AJUSTE_TARA` em UI-06) com justificativa obrigatória do gestor.

---

## 3\. Gestão de Roteiros Didáticos e Segurança

### 3.1 Consumo por Alunos sem Acesso à Coleção Raiz

* **Snapshot Embutido**: Os metadados essenciais do roteiro são embutidos diretamente no documento do `Post` (`Turma/{turmaId}/Posts/{postId}`):  
  "roteiro\_anexo": {  
    "id\_roteiro": "rot\_123",  
    "nome\_arquivo": "Roteiro\_Aula\_03.pdf",  
    "tamanho\_bytes": 1048576,  
    "storage\_path": "roteiros/rot\_123.pdf"  
  }  
* **Vantagens**:  
  * Custo de leitura adicional no Firestore para alunos \= **ZERO** (os dados vêm junto da leitura do feed da turma);  
  * Alunos não possuem regra de leitura na coleção raiz `Roteiro_Experimento`, garantindo privacidade sobre rascunhos e provas de outros docentes.  
* **Download Seguro de PDF**: Realizado exclusivamente pela Cloud Function `obterUrlDownloadRoteiro`, que valida o vínculo ativo do aluno na turma e emite uma **Signed URL temporária** (15 minutos).

### 3.2 Compartilhamento entre Professores (ACL por Array)

* A coleção de junção `Roteiro_Professor_Compartilhado` é eliminada do Firestore (mantida apenas no modelo lógico relacional 3FN).  
* No Firestore, utiliza-se uma Lista de Controle de Acesso (ACL) no documento raiz de `Roteiro_Experimento`:  
  "professores\_compartilhados": \["uid\_prof\_marcos", "uid\_prof\_ana"\]  
* **Security Rules com Custo Zero de Leitura Extra**:  
  match /Roteiro\_Experimento/{roteiroId} {  
    allow read: if request.auth \!= null && (  
      resource.data.id\_professor\_upload \== request.auth.uid ||  
      request.auth.uid in resource.data.professores\_compartilhados  
    );  
    allow write: if false;  
  }  
* **Consultas Nativas da UI**:  
  * *Meus*: `.where("id_professor_upload", "==", uid)`  
  * *Compartilhados Comigo*: `.where("professores_compartilhados", "array-contains", uid)`  
  * *Eu Compartilhei*: Filtragem em memória no cliente sobre a lista de "Meus" onde `professores_compartilhados.length > 0`.  
* **Operações Atômicas de Escrita**: Compartilhamento usa `arrayUnion(destinatarioUid)` e revogação usa `arrayRemove(destinatarioUid)`.

---

## 4\. Resolução Formal das Questões de Domínio (Q01 a Q14)

### Q01 — Localização do Professor

* Decisão: Remover a localização física por Prédio e Sala do escopo da V1 (YAGNI / Redução de Complexidade). Postergada formalmente para a V2 (Seção 12.5), quando for implementado o módulo de alocação de salas e horários de turmas (Horario\_Turma).  
* Modelo Relacional e Firestore: A entidade Professor permanece enxuta e fiel à 3FN original, contendo apenas id\_usuario, centro (CCT, CCTA, CBB, CCH) e laboratorio (ex: LCQUI). Não há adição de id\_local nem campos denormalizados de prédios para docentes.  
* Busca de Professores na V1 (Seção 8.3.3):  
  * Busca textual livre por Nome;  
  * Filtro por Matéria lecionada (via tabela associativa Professor\_x\_Materia);  
  * Filtro por Centro e Laboratório de lotação acadêmica.

### Q02 — Proveniência, Prazo e Unicidade de Convites

* **Decisão**: Convite com expiração de 7 dias e link assinado criptograficamente via hash (`token_hash`).  
* **Unicidade**: O documento no Firestore utiliza chave determinística: `convite_${turmaId || 'global'}_${hashEmail}`, impedindo convites simultâneos para o mesmo aluno.  
* **Reenvio**: Tanto o Professor da turma quanto o Chefe Geral podem reenviar o convite; a operação renova o prazo para \+7 dias a partir do disparo e gera novo token, invalidando o anterior sem duplicar registros.

### Q03 — Concentração e Faixas

* **Decisão**: Eliminar texto livre e separar faixas em colunas numéricas em `Composicao_Reagente`:  
  * `valor_min`: `NUMERIC(10,5) NULL`  
  * `valor_max`: `NUMERIC(10,5) NULL`  
  * `tipo_concentracao`: `ENUM('M_M', 'V_V', 'M_V', 'MOL_L', 'MOL_KG', 'PPM', 'PPB') NOT NULL`  
  * `notacao_original_fabricante`: `VARCHAR(50) NULL` (para preservar rotulagens como "36.5 \- 38.0% P.A.").  
* **Regra**: Concentração pontual define `valor_min == valor_max` (ou `valor_max = null`). Faixas impõem `valor_min <= valor_max`.

### Q04 & Realidade Acadêmica — Reagentes Vencidos e Validade Desconhecida

* **Princípio Fundamental de Governança**: *O software não deve forçar o usuário a mentir para o banco de dados.* No laboratório acadêmico, pesquisas de TCC, Pós-Graduação e projetos de tratamento de resíduos frequentemente utilizam reagentes vencidos de forma intencional ou viável.  
* **Destinos no Cadastro de Validade Desconhecida**:  
  1. `QUARENTENA` (bloqueado para uso);  
  2. `PENDENTE_DE_DESCARTE` (`vencido = true`);  
  3. `LIBERADO_COM_TERMO` (liberado sob consentimento informado).  
* **Termo de Assunção de Responsabilidade Metodológica na Retirada**:  
  * Ao retirar reagente vencido ou com validade desconhecida para pesquisa acadêmica (`PESQUISA_TCC_POS` ou `ESTUDO_DEGRADACAO_RESIDUOS`), o sistema não bloqueia, mas exige:  
    1. **Justificativa Metodológica Obrigatória** (mínimo 20 caracteres);  
    2. **Checkbox de Ciência Expressa**: *"Declaro ciência da condição de validade do frasco e assumo integral responsabilidade metodológica pelos resultados analíticos do projeto."*  
  * O empréstimo registra `uso_vencido_aceito = true`, resguardando juridicamente o almoxarifado contra queixas de degradação.

### Q05 — Frasco Aberto sem Data Histórica

* **Decisão**: Registrar `data_abertura = null`, ativar a flag `abertura_historica_desconhecida = true`, e aplicar os destinos controlados da Q04.

### Q07 — Remoção Lógica de Reagentes (Soft Delete)

* **Decisão**: Adicionar a flag booleana `ativo` (default `true`) em `Resumo_Reagente` e `Especificacao_Reagente`.  
* **Comportamento**: A desativação impede o cadastro de novos frascos daquele reagente, mas preserva a operacionalidade (pesagem, empréstimo, devolução e descarte) dos frascos físicos remanescentes na prateleira.

### Q08 — Escrita em Turmas Arquivadas

* **Decisão**: Turmas com `status == 'Arquivada'` passam a ser estritamente somente-leitura para professores e alunos.  
* **Aplicação**: Bloqueio garantido via Firestore Security Rules e Cloud Functions em `Posts` e `Comentarios`.

### Q09 — Revogação de Roteiro Anexado a Post

* **Decisão**: A revogação do compartilhamento impede a criação de novos posts com o arquivo, mas preserva permanentemente os posts históricos onde o roteiro já havia sido publicado (garantido nativamente pelo snapshot no Post).

### Q10 — Limites de Textos Livres

* **Decisão**:  
  * Comentários: até 2.000 caracteres;  
  * Motivos e Justificativas: até 2.000 caracteres;  
  * Descrições de Post e Resumo: até 10.000 caracteres.  
* **Regra**: Validação no servidor com rejeição de strings vazias pós-`.trim()`.

### Q11 — Edição e Moderação de Comentários

* **Decisão**: O autor pode editar (gera histórico e exibe etiqueta `editado`). O professor pode moderar comentários marcando `moderado = true` e registrando o motivo.  
* **Exibição**: Comentários moderados ocultam o texto original para os alunos (*"Comentário ocultado pela moderação"*), mantendo o histórico visível apenas para auditoria da chefia e do docente.

### Q12 — Notificações de Bolsistas

* **Decisão**: `papel_destinatario` ganha o valor `Bolsista` na subcoleção `Usuarios/{uid}/Notificacoes`.  
* **UX**: O sino de notificações da interface agrega alertas críticos (devolução de reagentes expirando) independentemente do papel ativo selecionado no header pelo usuário.

### Q13 — Chefe Geral em Turmas e Roteiros Alheios

* **Decisão**: Intervenções administrativas do Chefe são permitidas como suporte excepcional. O evento é registrado em `Registro_de_Auditoria` e qualquer postagem pública exibe a identificação explícita `[Ação da Chefia do Departamento]`.

### Q14 — Autoatendimento (Professor que é Gestor) e Segregação de Funções (SoD)

* **Decisão Padrão**: Se houver outro gestor ativo no almoxarifado, o autoatendimento é bloqueado.  
* **Contingência (Gestor Único em Exercício)**: Caso seja o único gestor ativo disponível, a operação é autorizada exigindo justificativa obrigatória, marcando o empréstimo com `auto_atendimento = true` e enviando notificação imediata de auditoria ao Chefe Geral.

---

## 5\. Correções de Backend, Concorrência e Tipagem

1. **Assinaturas Cloud Functions (Seção 10.2.1)**:  
   * Tipar formalmente com `CallableRequest<T>`.  
   * Verificar `Usuarios/{uid}.ativo` no banco para invalidar sessões revogadas antes do vencimento do JWT (1 hora).  
2. **Espelhamento de Matrícula (Seção 10.2.5)**:  
   * Gravar atomicamente na subcoleção `Usuarios/{uid}/Turmas/{turmaId}` dentro de `ingressarEmTurmaPorCodigo`.  
   * Validar a capacidade da turma utilizando o contador transacional `Turma.qtd_alunos`.  
3. **Reclassificação Patrimonial (Seção 10.2.5)**:  
   * Ao aprovar edição de nome de bem individual, criar ou apontar para um novo `Resumo_Bem_Patrimonial` na mesma transação, evitando sobrescrita reversa pela trigger `onResumoBemPatrimonialNomeAtualizado`.  
4. **Verificação de Plaqueta em Requisições**:  
   * `criarRequisicaoAdicaoBem` deve validar a existência prévia do patrimônio na coleção `Chaves_Unicas`.  
5. **Normalização Temporal e Batches no Scheduler**:  
   * `validar_efetiva` e `data_devolucao_prevista` padronizadas como `Timestamp` normalizadas para as 23:59:59.999 (-03:00).  
   * Particionamento de batches no scheduler para blocos de no máximo 400 operações por commit.  
6. **Relatórios Mensais**:  
   * Ajuste de `dataFim` nos relatórios de almoxarifado para `new Date(ano, mes, 0, 23, 59, 59, 999)`.  
   * Retorno direto em Base64 para relatórios sob demanda.  
7. **Diagrama 3FN (Seção 4.36)**:  
   * Correção do campo `Notificacao.id_quem_fez_acao` de `INTEGER PK, NULL` para `INTEGER FK, NULL`.

&nbsp;

---

## 6\. Registro de Decisões e Trade-offs — Rodada de Realinhamento 13/09/2026

Esta seção registra as decisões desta rodada de auditoria por blocos (A–D). Itens que dependem de validação externa estão em `DUVIDAS_PENDENTES_LCQUI.md`.

### 6.1 Confirmações de Decisões Já Registradas

As seguintes decisões deste documento estão **confirmadas como diretrizes de evolução** e devem prevalecer sobre a Seção 10 (exemplos de código) onde houver divergência:

* **Q06 §2.1 (Não negatividade)**: O consumo de empréstimo é `max(0, peso_saida - peso_retorno)`. O pseudocódigo de `registrarDevolucao` na Seção 10 não implementa este piso; o plano de atualização (P1-03) registra a correção.
* **Q06 §2.2 (Fórmula híbrida)**: A margem de tolerância é `max(1g, 0,5% × peso_saida)` para não-higroscópicos e `max(2g, 2% × peso_saida)` para higroscópicos. A Seção 10 usa margem plana de 2%; o plano P1-03 registra a correção.
* **Q06 §2.2 (Tipo de evento de ganho)**: Quando `peso_retorno > peso_saida` mas dentro da tolerância, o consumo do empréstimo é `0`, o `peso_atual` do frasco é atualizado com o peso físico real e é gerado evento `AJUSTE/ganho_massa_higroscopia` em `Historico_Frasco_Reagente`. Este comportamento não estava implementado no pseudocódigo da Seção 10.
* **§3.1 (Snapshot `roteiro_anexo`)**: O campo `roteiro_anexo` é denormalização exclusiva do Firestore no documento `Post`. O modelo 3FN não é alterado. O dicionário 5.9 deve ser atualizado (plano P1-01).
* **§3.2 (ACL `professores_compartilhados`)**: A coleção `Roteiro_Professor_Compartilhado` não existe no Firestore; existe apenas no modelo relacional 3FN. A Seção 5 deve ser atualizada para remover essa coleção da tabela de mapeamento físico Firestore e referenciar o array ACL (plano P1-02).

### 6.2 Unidade de `medida_usada` no Frasco

* **Decisão**: `medida_usada` em `Frasco_Reagente` acumula **sempre em gramas** (leitura de balança), independentemente de o reagente ser sólido ou líquido. O consumo em mL é calculado e armazenado exclusivamente em `Emprestimo_Reagente.medida_utilizada` e nas views materializadas.
* **Trade-off**: O pseudocódigo atual da Seção 10 (`registrarDevolucao`) usa `FieldValue.increment(volumeUtilizado)`, onde `volumeUtilizado = pesoConsumido / densidade` para líquidos — acumulando mL em `medida_usada`. Esta inconsistência (AUD-18) deve ser corrigida: o incremento em `medida_usada` deve usar sempre `pesoConsumido` (g), sem divisão por densidade.
* **Justificativa**: O dicionário 5.9 §Frasco_Reagente define explicitamente `medida_usada` como "acumulado gravimétrico em g; não misturar com volume". Misturar g e mL neste campo tornaria os relatórios de consumo inconsistentes para reagentes líquidos.

### 6.3 Campos Ausentes do Modelo 3FN — Trade-offs Documentais

As decisões Q01–Q14 geraram campos que precisam ser incorporados ao LaTeX. O `PLANO_ATUALIZACAO_TEX_LCQUI.md` lista as alterações concretas. O trade-off central é: manter o LaTeX divergente do `.md` por tempo limitado é aceitável durante a transição, desde que o `.md` seja a diretriz de evolução e os campos ausentes estejam rastreados na auditoria (AUD-22 a AUD-34).

### 6.4 Coleções de Controle de Concorrência nas Security Rules

* **Decisão**: As coleções `Controle_Papeis/singleton`, `Operacoes` e `Chaves_Unicas` devem ter regras explícitas negando acesso direto de clientes em `firestore.rules`. A ausência de regra não equivale a deny-all em ambientes onde o deny-all raiz não é configurado explicitamente. AUD-35 e AUD-36 registram este risco.
* **Trade-off**: Adicionar regras de deny para essas coleções não impacta o comportamento atual das Cloud Functions (que usam o SDK Admin e ignoram Rules), mas fecha o vetor de acesso direto por clientes maliciosos com token válido.
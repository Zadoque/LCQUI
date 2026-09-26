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

* Se o peso de retorno for inferior à tara cadastrada ($Peso\_{frasco\_vazio}$), trata-se de **anomalia metrológica**: a diferença (por exemplo, até $5\\text{ g}$) serve apenas para sinalizar o caso e exigir confirmação e justificativa humana, nunca para decidir automaticamente que o frasco ficou vazio.
  * O esgotamento é confirmado **explicitamente pelo gestor** na devolução (``O frasco ficou vazio nesta devolução? [ ] Sim''). Confirmado, `estado_fisico_frasco` migra para `VAZIO`, `saldo_desconhecido` passa a `false`, o peso de retorno vira a **tara real** (`peso_frasco_vazio = peso_atual = peso_retorno`) e o consumo consome o saldo restante.
  * Sem a confirmação, a devolução ordinária é bloqueada e o caso é tratado como anomalia com justificativa. Não existe recalibração parcial de tara com produto restante: recalibrar tara exige recipiente efetivamente vazio com peso vazio real medido, com justificativa obrigatória do gestor.

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
* **Unicidade**: O documento no Firestore utiliza chave determinística: `convite_${HMAC_SHA256(segredoServidor, contextoTurmaGlobalEmailNormalizado)}`, impedindo convites simultâneos para o mesmo aluno.
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
  1. `QUARENTENA` (bloqueado para uso, com `em_quarentena = true` e disponibilidade indisponível; não forçar `vencido`);
  2. `PENDENTE_DE_DESCARTE` (disponibilidade indisponível e status de pendência; `vencido` continua derivado apenas das regras reais de validade, ortogonal à quarentena);
  3. `LIBERADO_COM_TERMO` (liberado sob consentimento informado).
* **Termo de Assunção de Responsabilidade Metodológica na Retirada**:
  * Ao retirar reagente vencido ou com validade desconhecida para pesquisa acadêmica (`PESQUISA_TCC_POS` ou `ESTUDO_DEGRADACAO_RESIDUOS`), o sistema não bloqueia, mas exige:
    1. **Justificativa Metodológica Obrigatória** (mínimo 20 caracteres);
    2. **Checkbox de Ciência Expressa**: *"Declaro ciência da condição de validade do frasco e assumo integral responsabilidade metodológica pelos resultados analíticos do projeto."*
  * O empréstimo registra `uso_vencido_aceito = true`, versão, instante servidor, UID do aceitante e referência à auditoria do TCR, validados no backend. O TCR registra ciência e responsabilidade, mas não substitui regras institucionais de segurança química nem garante exoneração jurídica.

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

* **Decisão**: As coleções `Controle_Papeis/singleton`, `Operacoes` e `Chaves_Unicas` devem ter regras explícitas negando acesso direto de clientes em `firestore.rules`. A revisão de firestore.rules confirmou deny-all raiz e nenhum allow que alcance essas coleções. AUD-35/36 são hardening/documentação defensiva.
* **Trade-off**: Adicionar regras de deny para essas coleções não impacta o comportamento atual das Cloud Functions (que usam o SDK Admin e ignoram Rules), e explicita a intenção arquitetural já protegida pelo deny-all raiz; não corrige um acesso atualmente permitido nessas coleções.

---

## 7\. Resolução Formal das Dúvidas Pendentes (DP-A01 a DP-D02)

Todas as pendências de `DUVIDAS_PENDENTES_LCQUI.md` foram resolvidas em 13/09/2026. O detalhamento técnico de cada decisão está em `DUVIDAS_PENDENTES_LCQUI.md` (arquivo atualizado como registro histórico). As alterações LaTeX correspondentes estão em `PLANO_ATUALIZACAO_TEX_LCQUI.md`.

### 7.1 DP-A01 — `estado_fisico` e `eh_higroscopico` movidos para `Resumo_Reagente`

**Decisão**: Opção 2 — Ambos os campos migram de `Especificacao_Reagente` para `Resumo_Reagente`.

**Justificativa**: Em CNTP (25 °C, 1 atm), substâncias em estados físicos distintos são produtos químicos distintos e, portanto, itens de catálogo distintos. Soluções aquosas de NaOH são `MISTURA` (resumo distinto de NaOH sólido puro). `eh_higroscopico` é propriedade intrínseca da espécie química, comum a todas as especificações de pureza. A unidade operacional (`g` se `SOLIDO`, `ml` se `LIQUIDO`) é derivada diretamente do resumo, sem ambiguidade. Queries de catálogo usam igualdade escalar `.where("estado_fisico", "==", "SOLIDO")`, eliminando o array `estados_fisicos` e queries `array-contains`.

**Seções LaTeX**: 4.16 (Resumo_Reagente), 4.18 (Especificacao_Reagente — remover campo), 5.2 e 5.9.1 (dicionário e busca textual). Plano: P3-02, P3-03.

---

### 7.2 DP-A02 — Snapshot imutável `eh_higroscopico` em `Frasco_Reagente`

**Decisão**: Opção 2 — Denormalizar snapshot `eh_higroscopico: boolean` em `Frasco_Reagente` no momento do cadastro.

**Justificativa**: Zero leituras adicionais na devolução. A Cloud Function `registrarDevolucao` lê apenas o frasco e obtém a regra de tolerância híbrida diretamente. Imutabilidade garantida por validação no servidor: campo recusado em updates diretos. Solução mais eficiente em custo de leituras Firestore sem comprometer a fidelidade ao domínio.

**Seções LaTeX**: 5.9.1 (dicionário Frasco_Reagente), 10.2.2 (pseudocódigo registrarDevolucao). Plano: P3-07, P1-03.

---

### 7.3 DP-A03 — Constraint formal de faixa em `Composicao_Reagente`

**Decisão**: Opção 1 — Constraint declarativa formal no modelo 3FN.

**Regra**: `CHECK (valor_max IS NULL OR valor_min <= valor_max)`. Concentrações pontuais: `valor_min == valor_max` ou `valor_max = NULL`. Faixas: `valor_min < valor_max`. Campos substituem `valor_composicao`/`unidade` por `valor_min NUMERIC NULL`, `valor_max NUMERIC NULL`, `notacao_original_fabricante VARCHAR(50) NULL`.

**Seções LaTeX**: 4.17 (Composicao_Reagente), 4.42.3 (anotações de integridade). Plano: P3-01.

---

### 7.4 DP-B01 — Máquina de estados pura em `Bem_Patrimonial` (sem flag `ativo`)

**Decisão**: Opção 1 — Não adicionar flag `ativo`; manter a máquina de estados `Ativo → Inservivel → Ja_dado_baixa`.

**Justificativa**: O ciclo de vida patrimonial público da UENF é regido pelo status formal. Uma flag `ativo` avulsa criaria redundância e ambiguidade semântica com o status formal. A máquina de estados é a forma canônica de controle de ciclo de vida patrimonial.

**Seções LaTeX**: Nenhuma alteração. Item P3-04 cancelado. AUD-28 fechado sem alteração.

---

### 7.5 DP-B02 — `photo_url_proposta` NOT NULL na submissão da requisição de adição

**Decisão**: Opção 1 — Foto obrigatória na submissão pelo professor (`NOT NULL`).

**Justificativa**: O solicitante precisa estar diante do equipamento para levantar plaqueta e conservação, tornando a foto integral ao ato da requisição. Submissões sem imagem geram retrabalho e dependência de vistorias presenciais do gestor, contrariando o objetivo de autonomia do professor na requisição. Remove o fallback `"https://placeholder"` do backend.

**Seções LaTeX**: 4.11 (`photo_url_proposta TEXT NOT NULL`), 10.2.5 (remover placeholder). Plano: P3-05.

---

### 7.6 DP-C01 — Aluno puro (sem Bolsista) pode exercer Gestor_Almoxarifado

**Decisão**: Opção 1 — Compatível.

**Regra resultante**: A restrição mútua de SoD é estritamente `Bolsista` ↔ `Gestor_Almoxarifado`. `Aluno` (sem `Bolsista`) e `Gestor_Almoxarifado` são compatíveis porque alunos regulares de graduação não têm permissão para retirar reagentes, eliminando o conflito de interesse. A seção 3.6 deve ser precisada para evitar ambiguidade futura.

**Seções LaTeX**: 3.6 (nota de precisão), 7.4 (linha explícita na matriz). Plano: P3-06.

---

### 7.7 DP-C02 — Visibilidade de comentários moderados

**Decisão**: Opção 1 — Autor vê seu texto com tarja; colegas veem aviso institucional.

**Regra técnica**:
- **Autor**: texto original com `"Comentário moderado pelo docente: [motivo_moderacao]"`.
- **Colegas (Aluno/Bolsista não-autores)**: texto substituído por `"Comentário ocultado pela moderação da turma"`.
- **Professor e Chefe_Geral**: texto original e histórico completo para auditoria.
- **Bolsista**: segue visibilidade de Aluno (sem visibilidade ampliada de moderação).

Campo `moderado_por INTEGER FK NULL` adicionado à entidade `Comentario` para rastreabilidade.

**Seções LaTeX**: 4 (entidade Comentario: `moderado`, `motivo_moderacao`, `moderado_por`), 8.8.11 (UI-11), 11.1 (Security Rules). Plano: P1-04, P3-08.

---

### 7.8 DP-C03 — Invalidação de token de convite por substituição in-place

**Decisão**: Opção 1 — Substituição in-place no documento determinístico. Sem campo `revogado_em`.

**Regra técnica**: Chave determinística `convite_${HMAC_SHA256(segredoServidor, contextoTurmaGlobalEmailNormalizado)}`. O reenvio executa update atômico gravando novo `token_hash`, recalculando `expira_em = now() + 7 dias` e gravando `ultimo_reenvio_por`. O link anterior é revogado imediatamente sem duplicar documentos. A ausência de `revogado_em` é intencional: a substituição in-place é semanticamente equivalente à revogação.

**Seções LaTeX**: 4.35 (`token_hash`, `ultimo_reenvio_por`), 5.9.1 (dicionário Convite_Aluno), 8.8.10 (UI de reenvio). Plano: P1-05.

---

### 7.9 DP-D01 — Verificação seletiva de `Usuarios/{uid}.ativo`

**Decisão**: Opção 2 — Verificação apenas em mutações de alto impacto.

**Regra técnica**:
- **Confiam no token JWT** (latência máxima de 1h de revogação): leituras de catálogo, feeds de turma, listagem de posts e comentários, relatórios.
- **Leem `Usuarios/{uid}.ativo` obrigatoriamente** (zero tolerância de revogação): `registrarRetirada`, `registrarDevolucao`, `responderRequisicaoAdicaoBem`, `responderRequisicaoEdicaoBem`, `concederPapel`, `revogarPapel`.

Implementação via parâmetro `requerAtivo: boolean = false` em `validarPermissao`. Custo: 1 leitura Firestore por mutação crítica — aceitável para operações de escrita de alto impacto.

**Seções LaTeX**: 10.2.1 (pseudocódigo `validarPermissao`). Plano: P3-09.

---

### 7.10 DP-D02 — Retenção indefinida de registros de auditoria (V1)

**Decisão**: Opção 1 — Retenção indefinida na V1.

**Justificativa**: Política conservadora de rastreabilidade do LCQUI/UENF, sujeita à futura política arquivística/LGPD institucional, sem atribuição de exigência normativa específica, impede expurgo automático de `Registro_de_Auditoria` e `Historico_Frasco_Reagente`. Notificações expiradas são marcadas com `expirada = true` mas o documento é preservado. RF25 e Seção 4.41 ratificados sem alteração.

**Seções LaTeX**: Nenhuma alteração — RF25 e Seção 4.41 já cobrem este requisito.
Precisão de implementação: token de convite usa CSPRNG de 32 bytes, somente SHA-256 persistido e comparação em tempo constante; HMAC do identificador não anonimiza PII. DP-D01 aceita risco residual de token ainda válido em mutações sem requerAtivo=true. DP-A02 é denormalização exclusiva Firestore: Resumo_Reagente permanece fonte 3FN, e mudanças futuras não reescrevem snapshots existentes.

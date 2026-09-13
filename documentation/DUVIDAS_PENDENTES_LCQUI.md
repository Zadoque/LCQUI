# Dúvidas Pendentes LCQUI

Criação: 13/09/2026. Documento de pendências subjetivas ou de negócio que exigem validação externa (stakeholders, gestor do laboratório ou decisão de produto), **não** achados técnicos verificáveis por inspeção estática (esses vão em `AUDITORIA_ATUALIZADA.md`).

Formato: cada item lista a questão, a fonte do conflito ou lacuna, as alternativas possíveis e o impacto no modelo caso a decisão mude.

---

## Bloco A — Química e Almoxarifado

### DP-A01 — Posicionamento de `estado_fisico` e `eh_higroscopico`

**Questão**: `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §1.1 move `estado_fisico` e `eh_higroscopico` de `Especificacao_Reagente` para `Resumo_Reagente`. Contudo, a Seção 4 mantém `estado_fisico` apenas em `Especificacao_Reagente`, e a explicação da Seção 4 (§Resumo_Reagente) afirma explicitamente que "densidade, estado físico e unidade de medida são propriedades da Especificacao_Reagente". As duas fontes se contradizem.

**Alternativas**:
1. Manter em `Especificacao_Reagente` (posição atual do LaTeX) e revogar a decisão de §1.1 do MODIFICACOES.
2. Mover para `Resumo_Reagente` (posição do MODIFICACOES): implica que todas as especificações de um mesmo resumo devem compartilhar o mesmo estado físico — impede, por exemplo, ter "Ácido Clorídrico anidro (SOLIDO)" e "Ácido Clorídrico solução 37% (LIQUIDO)" sob o mesmo resumo.
3. Manter em ambos como redundância explícita: viola 3FN e cria risco de divergência.

**Impacto**: Afeta o modelo 3FN (Seção 4), o dicionário Firestore (Seção 5.9), a fórmula de busca do catálogo (Seção 5 §busca-textual) e as regras de obrigatoriedade (Seção 7). Achados AUD-19 e AUD-20 bloqueados por esta decisão.

**Recomendação técnica (não decisão)**: A opção 1 preserva a capacidade de agrupar formas distintas do mesmo reagente. A opção 2 simplifica queries mas restringe o catálogo. Levar ao gestor do laboratório para confirmar se "Ácido Clorídrico" é sempre um único estado físico no contexto do almoxarifado LCQUI.

---

### DP-A02 — Fórmula híbrida de Q06 e custo de leitura de `eh_higroscopico`

**Questão**: A fórmula híbrida de tolerância de devolução (MODIFICACOES §2.2) distingue higroscópicos de não-higroscópicos. Para aplicar essa distinção, a Cloud Function `registrarDevolucao` precisa resolver `eh_higroscopico` a partir da cadeia `Frasco_Reagente → Especificacao_Reagente → Resumo_Reagente`. Isso exige 1–2 leituras adicionais por devolução sem DP-A01 resolvido.

**Alternativas**:
1. Resolver `eh_higroscopico` na devolução com leituras adicionais (fidelidade máxima ao domínio).
2. Denormalizar `eh_higroscopico` em `Frasco_Reagente` no momento do cadastro (snapshot, zero leituras extras na devolução).
3. Simplificar para margem única de 2% (abrir mão da distinção higroscópico/não-higroscópico).

**Impacto**: AUD-17 bloqueado parcialmente por esta decisão.

---

### DP-A03 — Constraint de faixa em `Composicao_Reagente` (Q03)

**Questão**: Q03 (MODIFICACOES §Q03) define `valor_min`/`valor_max` para representar faixas. A regra `valor_min <= valor_max` não foi incorporada à Seção 4 como constraint formal.

**Alternativas**:
1. Adicionar `CHECK (valor_max IS NULL OR valor_min <= valor_max)` na Seção 4.
2. Manter validação apenas na aplicação, sem constraint no modelo 3FN.

**Impacto**: AUD-21 depende desta formalização.

---

## Bloco B — Patrimônio

### DP-B01 — Soft-delete em `Bem_Patrimonial`

**Questão**: Q07 define flag `ativo` para reagentes. A entidade `Bem_Patrimonial` tem máquina de estados (`Ativo → Inservivel → Ja_dado_baixa`) mas não tem flag `ativo`. Não está claro se um bem pode ser "desativado" sem completar o fluxo formal de baixa.

**Alternativas**:
1. Máquina de estados é suficiente para patrimônio; não adicionar `ativo`.
2. Adicionar `ativo BOOLEAN` para permitir ocultação temporária sem transição de status formal.

**Impacto**: AUD-28. Se opção 2, requer adição ao modelo 3FN e dicionário 5.9.

---

### DP-B02 — Foto obrigatória na requisição de adição de bem

**Questão**: `Requisicao_Adicao_Bem_Patrimonial.photo_url_proposta` é NULL na Seção 4 (linha 130). A lógica da UENF exige foto para registro patrimonial. Não está especificado se a foto é obrigatória na criação da requisição ou apenas na aprovação.

**Alternativas**:
1. Foto obrigatória na criação da requisição (NOT NULL): professor fotografa ao solicitar.
2. Foto obrigatória apenas na aprovação: gestor pode requisitar foto antes de aprovar.
3. Foto opcional em todo o fluxo (atual: NULL).

**Impacto**: Altera nullability em `Requisicao_Adicao_Bem_Patrimonial.photo_url_proposta`. AUD-25 relacionado.

---

## Bloco C — Acadêmico, Turmas e Roteiros

### DP-C01 — Aluno puro + Gestor_Almoxarifado: combinação permitida?

**Questão**: Seção 7 (linha ~157) lista "Aluno que é Gestor de Almoxarifado" como combinação válida. Seção 3 §Bolsista (linha 99) diz que Bolsista é "mutuamente exclusivo com Gestor de Almoxarifado". A ambiguidade: Aluno **sem** Bolsista + Gestor_Almoxarifado é permitido?

**Alternativas**:
1. Sim, Aluno puro (sem Bolsista) pode ser Gestor_Almoxarifado (leitura atual da Seção 7).
2. Não, qualquer Aluno é vedado de ser Gestor_Almoxarifado (segregação mais rígida).

**Impacto**: Altera a matriz de combinações da Seção 7 e verificações nas Functions. AUD-33 relacionado.

---

### DP-C02 — Histórico de comentários moderados: visibilidade

**Questão**: Q11 (MODIFICACOES) define que comentários moderados ocultam o texto para alunos mas mantêm histórico para "auditoria da chefia e do docente". Não está especificado:
- Se o autor vê seu próprio texto moderado.
- Se Bolsista (que é Aluno) tem visibilidade ampliada.
- Se `Historico_Comentario` tem Rules separadas de leitura.

**Alternativas**:
1. Autor vê seu texto moderado; outros alunos não veem.
2. Nenhum aluno (nem o autor) vê o texto moderado.

**Impacto**: Altera Security Rules em `Comentarios/{id}/Historico` e UI-11.

---

### DP-C03 — Expiração e renovação de token de convite (Q02)

**Questão**: Q02 define renovação que invalida token anterior "sem duplicar registros". Não está especificado se o token anterior é invalidado por substituição in-place ou por campo de revogação.

**Alternativas**:
1. Substituição in-place: sobrescrever `token_hash` e `expira_em` no documento existente (sem histórico de tokens).
2. Marcar `status = expirado` no convite antigo e criar novo documento.

**Impacto**: Altera estrutura de `Convite_Aluno` e o fluxo de reenvio. AUD-32 relacionado.

---

## Bloco D — Governança, Multi-Role e Infra

### DP-D01 — Custo de verificação de `Usuarios/{uid}.ativo` por chamada

**Questão**: `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §5.1 exige verificação de `ativo` no banco para invalidar sessões revogadas. Verificar em cada chamada cria custo de leitura adicional.

**Alternativas**:
1. Verificar `ativo` em toda Cloud Function crítica (1 leitura por chamada).
2. Verificar apenas nas funções de alto impacto; demais confiam no token por até 1h.
3. Usar `versao_permissoes` no token e no banco, invalidando quando divergirem.

**Impacto**: AUD-38, AUD-05. Depende do prazo aceitável de latência de revogação aceito pelo produto.

---

### DP-D02 — Política de retenção de dados de auditoria

**Questão**: RF25/RN-ROLE-11 garantem que histórico não seja excluído. Não está definido:
- Por quanto tempo os registros de `Registro_de_Auditoria` são mantidos.
- Se existe política de arquivamento após período.
- Se notificações expiradas são fisicamente removidas ou apenas marcadas.

**Alternativas**:
1. Retenção indefinida (padrão atual implícito).
2. Retenção por período definido por política institucional da UENF.
3. Soft-delete com campo `arquivado_em` após período.

**Impacto**: Afeta custo de armazenamento Firestore e índices de relatórios.

---

## Como resolver estas pendências

1. Cada item deve ser discutido com o stakeholder relevante (gestor do laboratório, coordenação ou equipe de produto).
2. Após decisão, registrar a resolução em `MODIFICACOES_CONSOLIDADAS_LCQUI.md` com a alternativa escolhida e a justificativa.
3. Atualizar `PLANO_ATUALIZACAO_TEX_LCQUI.md` com as mudanças no LaTeX decorrentes da decisão.
4. Remover o item deste arquivo somente após a decisão estar registrada nos documentos acima.

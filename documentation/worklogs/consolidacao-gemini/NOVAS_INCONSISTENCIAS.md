# NOVAS_INCONSISTENCIAS — Consolidação Gemini Spark × LaTeX LCQUI (Lote 2.2)

Registro de inconsistências do Lote 2.2 (refinamento semântico após Lote 2.1), focado na resolução dos apontamentos remanescentes indicados no prompt.

## Lote 2.2 — Refinamento Semântico

### PDF-002: Revogação de Papel
- **ID**: PDF-002-L2.2
- **Evidência**: A seção de revogação de papel (10.4) possui leituras após escritas ou ordem que não garante atomicidade restrita, ou o escopo de vínculos entre leitura e exclusão precisa de correção.
- **Solução proposta**: Corrigir o escopo de vínculos entre leitura e exclusão. Assegurar que todas as leituras no Firestore (como verificar outros gestores ou bolsista ativo) ocorram antes de qualquer escrita (delete/update/set). Preservar proteção do último responsável e dependência Bolsista–Aluno.
- **Arquivos afetados**: `Section-10-Subsection-4-Revogacao-de-Papel.tex`
- **Critério de aceite**: Todas as leituras de transação (`tx.get`) ocorrem antes das escritas (`tx.delete`, `tx.update`, `tx.set`). Dependências mantidas.
- **Estado**: VALIDADO_LATEX

### PDF-001: Fluxo de Bens Patrimoniais
- **ID**: PDF-001-L2.2
- **Evidência**: Na aprovação de adição e na edição com novo resumo/local, pode haver chamadas `tx.get` após `tx.create`/`tx.update` ou chamadas indiretas. Falta normalizar o nome da chave de unicidade (`plaqueta_...` vs `Bem_Patrimonial__...`).
- **Solução proposta**: Eliminar leituras após escritas na aprovação de adição e edição. Unificar a definição da chave de unicidade entre comentário, algoritmo e dicionário (`Chaves_Unicas/plaqueta_{numero}`). Incluir tratamento dos registros preexistentes exigido pelo plano (backfill documentado).
- **Arquivos afetados**: `Section-10-Subsection-8-Fluxo-de-Bens-Patrimoniais.tex`, verificar `Section-5` se necessário (embora focado no 10.8).
- **Critério de aceite**: Sem leituras após escritas nas transações de adição/edição. Chave de unicidade normatizada e unificada. Menção ao tratamento/backfill de preexistentes.
- **Estado**: VALIDADO_LATEX

### PDF-003: Consolidação do Planejamento (Convites)
- **ID**: PDF-003-L2.2
- **Evidência**: O contrato `aceitarConviteAluno` não reconcilia totalmente com a Seção 5 (falta ler `exceder_capacidade`, `justificativa_excecao`, e preencher `aceitado_por` e `aceitado_em`). Há leituras após escritas. Idempotência e concorrência não garantem repetição sem duplicar contador ou histórico.
- **Solução proposta**: Reconciliar o convite com a Seção 5 (`exceder_capacidade`, `justificativa_excecao`, `aceitado_por` e `aceitado_em`). Colocar leituras antes das escritas. Revalidar convite, turma e vínculo dentro da transação. Definir repetição e concorrência sem duplicar contador/histórico. Preservar os dois espelhos e reingresso documentados.
- **Arquivos afetados**: `Section-10-Subsection-10-Consolidacao-do-planejamento.tex`
- **Critério de aceite**: Contrato inclui `exceder_capacidade`, `justificativa_excecao`, `aceitado_por`, `aceitado_em`. Leituras antes de escritas. Concorrência idempotente sem duplicação.
- **Estado**: VALIDADO_LATEX

### PDF-016: Jobs Agendados (Reconciliação e Triggers)
- **ID**: PDF-016-L2.2
- **Evidência**: O contrato de reconciliação de contadores e a coordenação com triggers de deduplicação não demonstram como um evento atrasado já incluído na contagem absoluta não será somado novamente apenas pelo uso de lock.
- **Solução proposta**: Completar o contrato de reconciliação e coordenação. Modificar a estratégia de deduplicação para lidar com eventos retardados (ex. marca d'água, versionamento ou log de eventos, reconciliação que invalida lock antigo). Se necessário nova decisão, documentar alternativas, recomendação e impacto.
- **Arquivos afetados**: `Section-10-Subsection-7-Jobs-Agendados.tex`
- **Critério de aceite**: Reconciliação coordenada de forma que uma contagem absoluta no lote não sofra incremento de evento atrasado da trigger. Mecanismo explícito.
- **Estado**: VALIDADO_LATEX

### PDF-025: Fluxo de Reagentes (Tolerância Q06)
- **ID**: PDF-025-L2.2
- **Evidência**: Contradição entre o comentário que permite retorno abaixo da tara e o encaminhamento obrigatório ao fluxo Q06 (recalibração).
- **Solução proposta**: Eliminar a contradição. Documentar claramente o comportamento para retorno < tara, preservando encaminhamento obrigatório ao fluxo Q06 para confirmação/recalibração (conforme §2.3 das Modificações Consolidadas). Preservar a fórmula canônica (peso_saida) e condições de confirmação, esgotamento e recalibração.
- **Arquivos afetados**: `Section-10-Subsection-5-Fluxo-de-Reagentes.tex`
- **Critério de aceite**: Devolução < tara bloqueia para recalibração/esgotamento Q06 sem contradição no código. Fórmula canônica e eventos mantidos.
- **Estado**: VALIDADO_LATEX

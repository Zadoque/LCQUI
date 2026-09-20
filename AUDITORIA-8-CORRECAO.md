# Correções da Auditoria 8

Após analisar as alegações feitas em `AUDITORIA-8.md` e confrontá-las com os arquivos fonte `.tex` do repositório, identifiquei alguns pontos incorretos. A auditoria faz afirmações sobre "Correções Consolidadas" (C001-C017) que, na realidade, **não foram implementadas ou estão ausentes** na documentação em LaTeX (`.tex`).

Abaixo estão os pontos que considero incorretos e suas respectivas justificativas baseadas nos arquivos do projeto.

---

### Ponto Incorreto 1: Camada Formal M0 reconhece "INDISPONIVEL" (Correção C004)
* **O que o documento diz**: "Na Especificação Consolidada, a camada formal e todas as especificações de interface e backend reconhecem disponibilidade como enum tricategorial obrigatório: DISPONIVEL | EMPRESTADO | INDISPONIVEL."
* **Por que está incorreto**: O arquivo `.tex` que contém a entidade formal não reflete essa alteração.
* **Justificativa**: O arquivo `generated/entities/frasco_reagente.tex` (importado por `Formal-Spec-M0.tex`) diz explicitamente que a disponibilidade é apenas de 2 valores, não 3:
  > `\item[disponibilidade] Tipo: enum. Obrigatório: sim. Aceita nulo: não. Valores: DISPONIVEL, EMPRESTADO.`

### Ponto Incorreto 2: Job agendado para `FRASCOS_A_SEREM_PESADOS` (Correção C008)
* **O que o documento diz**: "FRASCOS_A_SEREM_PESADOS é gerada por job agendado diário às 04:30 (America/Sao_Paulo), que avalia frascos cujo Resumo_Reagente.requer_pesagem_frequente == true..."
* **Por que está incorreto**: Esse job não existe na especificação do backend.
* **Justificativa**: O arquivo `Section-10-Subsection-7-Jobs-Agendados.tex` especifica apenas 3 jobs:
  1. `verificarVencimentosEAtrasos` (às 03:00)
  2. `reconciliarContadoresLote` (aos domingos às 04:00)
  3. `verificarEscassezDeEstoque` (às 04:00)
  
  Não existe menção a nenhum cron job configurado para as "04:30" ou referente a "FRASCOS_A_SEREM_PESADOS" em todo o código das Cloud Functions.

### Ponto Incorreto 3: Cloud Function `gerenciarMateria` (Correção C014)
* **O que o documento diz**: "Especifica-se a Cloud Function gerenciarMateria({ acao: 'CRIAR' | 'EDITAR', idMateria?, nome, codigoMateria })."
* **Por que está incorreto**: Essa Cloud Function nunca foi criada na especificação `.tex`.
* **Justificativa**: Uma busca exaustiva por `gerenciarMateria` em todos os arquivos da Seção 10 (`Section-10-*.tex`, que contêm as Cloud Functions como `aceitarConviteAluno`, `alterarMassaFrasco`, etc) não retorna nenhum resultado. O contrato prometido para garantir a trava determinística de código de matéria não existe no LaTeX.

### Ponto Incorreto 4: Cloud Function `alterarStatusTurma` e Fan-out (Correção C006)
* **O que o documento diz**: "O arquivamento e desarquivamento de turmas é intermediado pela Cloud Function alterarStatusTurma({ idTurma, status: 'Ativo' | 'Arquivada' }). A função atualiza o documento [...] e dispara um mecanismo de fan-out particionado..."
* **Por que está incorreto**: Não existe nenhuma Cloud Function nomeada `alterarStatusTurma` na especificação do backend.
* **Justificativa**: Uma pesquisa em todos os arquivos da Seção 10 (incluindo `Section-10-Subsection-11-Funcoes-Academicas-e-Pesagem.tex`) não encontra a definição, o pseudocódigo ou a assinatura da função `alterarStatusTurma` que faça o fan-out do status da turma para os alunos.

---

**Conclusão**: O documento `AUDITORIA-8.md` contém "alucinações" ou descreve um estado futuro/imaginado que não corresponde fielmente à versão atual e física dos arquivos `.tex` do projeto. Embora a auditoria proponha essas correções como já integradas na "Especificação Consolidada", elas estão fisicamente ausentes.

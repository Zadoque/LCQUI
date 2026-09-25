# Pré-M11 — micro-reconciliação normativa antes da formalização executável

## Estado e escopo

- **Branch:** `feat/formal-spec-cue-alloy` (única).
- **HEAD de entrada:** `01fe84fde32aacee8e8c165f76faba40a5b2b786`, árvore limpa,
  `origin/feat/formal-spec-cue-alloy` sincronizada.
- **Baseline:** `just formal-check` exit `0` antes de editar (26 testes Rust,
  17 Node, Alloy PASS, gerador e PDF). M0–M10 preservados.
- **Tipo:** reconciliação **exclusivamente textual** de fronteiras do contrato
  M11, sem alterar CUE/IR/Alloy/Rust/fixtures. Nenhuma alteração de
  `frontend/`, `functions/`, `firestore.rules`, `storage.rules` ou índices.

## Achados e correções

| ID | Categoria | Achado | Resolução |
|---|---|---|---|
| PRE11-01 | CONTRADICAO_DOCUMENTAL | A Seção 7 proibia `capacidade < qtd_alunos` (edição) mas permitia exceção nominal acima da capacidade; a redação podia sugerir que `qtd_alunos > capacidade` invalidava a turma. | Explicita-se que HQ-M11-001 = A proíbe **editar/reduzir** `capacidade` abaixo da ocupação preexistente, enquanto um ingresso excepcional válido pode deixar `qtd_alunos > capacidade` sem invalidar a turma; o ingresso ordinário fica bloqueado até surgir vaga e ninguém é expulso. Reconciliado em Seções 4, 7, 8 e casos de regressão. |
| PRE11-02 | FRONTEIRA_INCOERENTE | O título/comentário de N-12 sugeria "criação condicional de conta Firebase Auth" para o mesmo solicitante da aceitação, operação impossível: quem aceita já está autenticado. | A aceitação pressupõe `request.auth.uid` e e-mail verificado e a **conta Auth já existente**. A criação condicional passa a ser explicitamente de `Usuarios`/`Aluno` no Firestore (transação), separada do envio de e-mail e da sincronização de Custom Claims (externos, pós-commit). Nenhum provisionamento Auth alternativo é inventado. |
| PRE11-03 | IDENTIDADE_DE_CONVITE | O docId determinístico por HMAC identifica a chave de pendência, mas não estava explícito como criar convite novo após terminalidade sem sobrescrever `aceitado_por`/`aceitado_em`/auditoria. | Separado **ID imutável do convite** × **chave determinística de pendência** (HMAC de e-mail normalizado + turma\|GLOBAL): aceitação/expiração liberam a pendência; novo convite é um novo documento; reenvio de pendente substitui hash/expiração no mesmo documento; retry devolve receipt. HMAC e e-mail em claro continuam fora da chave. |
| PRE11-04 | IDEMPOTENCIA | N-12 ilustrativo rejeitava qualquer `status != pendente`, sem distinguir retry do mesmo ator/operação de tentativa divergente. | Contrato M7 distingue retry (mesmo ator/token/operação → receipt) de tentativa distinta/outro ator/token divergente (negação específica). O fato de "removido anteriormente" é lido de `Historico_Alunos_Turma` (`exclusao_aluno`), nunca de espelho obsoleto. |

## Arquivos alterados

- `documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex`
- `documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex`
- `documentation/Section-8-Descricao-das-telas-Dashboards.tex`
- `documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/Section-10-Subsection-10-Consolidacao-do-planejamento.tex`

Nenhuma mudança de modelo CUE/Alloy/Rust/fixtures nesta etapa; nenhuma HQ nova.

## Nota de autoridade

A decisão humana **HQ-M11-001 = A** foi preservada e apenas precisada: proíbe a
edição/redução de capacidade abaixo da ocupação; não proíbe o estado alcançável
de exceção nominal válida.

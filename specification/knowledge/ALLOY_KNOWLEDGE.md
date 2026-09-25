# Alloy

`check` procura contraexemplo; UNSAT vale somente no scope declarado. `run`
procura testemunha; exigir SAT evita modelo impossível. Não assumir como fact
a propriedade que se pretende verificar. A transição M0 assume coerência inicial
e verifica coerência final; não modela serialização Firebase ou retries.

`just alloy-check` executa Alloy 6.2.0/SAT4J e normaliza receipt real. Exit code
sozinho não basta: validar cada comando e resultado. Não omitir testemunhas.

Ao encontrar instância adversa, registrar CONTRAEXEMPLO PÓS-3B com ID, assertion,
scope, estado inicial/final, regra fonte e interpretação. Classificar como
BUG_MODELO_FORMAL, TRADUCAO_INCORRETA, LACUNA_POS_3B ou CONTRADICAO_REAL antes de
alterar regras. Preservar receipt/instância no worklog, removendo volatilidade
apenas da saída documental. Testes Firebase continuam necessários.

## Emenda pré-M8 (HQ-PRE-M8-001)
Quebra e descarte preservam `saldoDesconhecido`; somente VAZIO mantém a exclusão
estrutural desse conjunto. Frames e witnesses conhecido/desconhecido substituem
as antigas assertions de saldo conhecido. Comparação literal M2→M2.4/M4 mantida.
HQ-PRE-M8-002 permanece aberta para autorização técnica de descarte no reencontro;
não inferir cobertura integral de M5 a partir da regressão M0–M4.

## Resolução pré-M8 (HQ-PRE-M8-002)
`EXTRAVIADO` pertence a `SituacaoLocalizacao`, não a `EstadoFisico`. As
transições Alloy preservam `fisico`; `extraviar` revoga a autorização corrente e
`reencontrar` grava `LOCALIZADO` com quarentena. A decisão anterior permanece
como evento histórico. Witnesses cobrem QUEBRADO antes/durante/depois do ciclo;
checks de coerência, preservação física e revogação são UNSAT nos scopes
declarados. Isso não prova implementação TypeScript, exactly-once ou ausência
de concorrência.

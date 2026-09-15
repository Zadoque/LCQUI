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

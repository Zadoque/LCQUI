# Reconciliação Normativa da Identidade e Pendência do Convite (M11 / PRE11-03)

## 1. Contexto e Motivação

Durante a evolução das especificações normativas do marco M11, coexistiram duas noções concorrentes na documentação e código:
1. **Redação preliminar da Seção 5 / Seção 10**: Associava o próprio `docId` de `Convite_Aluno/{id}` ao HMAC derivado do contexto (`turma` ou `global`) e do e-mail normalizado.
2. **Modelo formal CUE (`formal_m11.cue`) / Alloy (`turmas_m11.als`) / 3FN (`Section-4`) / Seção 7 (M11)**:
   - `Convite_Aluno.id` é a chave primária imutável (fato histórico de emissão do convite, preservando status terminal, auditoria, `aceitado_por` e `aceitado_em`).
   - A pendência ativa de convite é governada pela chave determinística `#M11PendenciaConvite.chave_hmac`, materializada na coleção de unicidade `Chaves_Unicas`.

A colisão conceitual impedia criar um novo convite legítimo após a terminalidade (aceite ou expiração) sem sobrescrever o documento histórico anterior, violando a imutabilidade do registro e a rastreabilidade do aceite (`aceitado_por`, `aceitado_em`).

## 2. Decisão Normativa Reconciliada

Conforme a precedência normativa (`documentation/main.tex` Seções 4, 5, 7, 10, CUE e PRE11-03), fica estabelecido o modelo único e canônico:

1. **`Convite_Aluno/{idConvite}`**:
   - É o fato histórico imutável do convite.
   - O `docId` (`idConvite`) é gerado pelo servidor (UUID/ID aleatório do Firestore).
   - Preserva para sempre o histórico: `status`, `convidado_em`, `convidado_por`, `aceitado_por`, `aceitado_em`, `token_hash`, etc.
   - Nunca é excluído (`DELETE` é terminantemente proibido).

2. **Chave de Pendência em `Chaves_Unicas`**:
   - Derivada determinísticamente por `HMAC-SHA256(segredoServidor, contexto + ":" + emailNormalizado)`.
   - Garante no máximo um convite `pendente` por `(contexto, emailNormalizado)`.
   - Aponta para `id_recurso = idConvite`.
   - É **liberada** transacionalmente quando o convite atinge estado terminal (`aceitado` ou `expirado`).

## 3. Semântica Operacional Obrigatória

- **Convite Novo**:
  - Verifica ausência de pendência ativa em `Chaves_Unicas`.
  - Cria novo documento `Convite_Aluno/{novoId}` com `status: "pendente"`.
  - Grava em `Chaves_Unicas` a chave de pendência apontando para `{novoId}`.

- **Reenvio de Convite Pendente**:
  - Identifica o convite pendente existente através da chave em `Chaves_Unicas`.
  - Mantém o **mesmo** documento `Convite_Aluno/{idConvite}` e `convidado_em` original.
  - Gera novo token CSPRNG (32 bytes), atualiza `token_hash = SHA-256(novoToken)`.
  - Atualiza `expira_em = now() + 7 dias` e `ultimo_reenvio_por = request.auth.uid`.
  - Invalida imediatamente o token anterior, sem criar segundo documento de convite.

- **Aceite do Convite (`aceitarConviteAluno`)**:
  - Executado em transação atômica no Firestore.
  - O documento `Convite_Aluno/{idConvite}` é preservado e atualizado para `status: "aceitado"`, preenchendo `aceitado_por` e `aceitado_em`.
  - A chave de pendência correspondente em `Chaves_Unicas` é **deletada/liberada**.

- **Expiração Operacional**:
  - Convite com `expira_em < now()` não pode ser aceito.
  - Reconciliação idempotente transiciona `status: "expirado"` e **libera** a chave de pendência em `Chaves_Unicas`.
  - O documento `Convite_Aluno` histórico permanece preservado.

- **Novo Convite após Terminalidade**:
  - Com a chave de pendência liberada, novo convite para o mesmo e-mail e contexto é permitido.
  - Cria um **novo** documento `Convite_Aluno/{novoId}`.
  - O convite anterior (aceito ou expirado) permanece intacto no Firestore com seus metadados preservados.

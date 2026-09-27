# Reconciliação Normativa da Identidade e Pendência do Convite (M11 / PRE11-03)

## 1. Contexto e Precedência Normativa

Durante a consolidação das especificações normativas do marco M11, coexistiu uma divergência entre as diferentes camadas documentais:

1. **Fontes normativas convergentes**:
   - **Seção 4 (Modelo 3FN)**: `Convite_Aluno` possui chave primária própria (`SERIAL PK`), representando o fato de emissão do convite, com campos de ciclo de vida e auditoria (`convidado_em`, `convidado_por`, `aceitado_por`, `aceitado_em`).
   - **Seção 7 (Regras de Negócio M11)**: Autoridade normativa para o ciclo de vida do convite, unicidade da pendência, reenvio, aceite, expiração, reingresso, idempotência e terminalidade. Estabelece que o convite histórico não se confunde com a pendência ativa.
   - **Formalização executável M11 (`formal_m11.cue`, `turmas_m11.als`, guards e receipts)**: Já separa rigorosamente `#M11Convite.id` (entidade `Convite`) da chave de pendência `#M11PendenciaConvite.chave_hmac` (entidade `Pendencia`), garantindo que aceitação ou expiração eliminam a pendência enquanto o fato histórico do convite permanece preservado.

2. **Projeções residuais divergentes**:
   - A **Seção 5** preliminar e trechos de pseudocódigo da **Seção 10** possuíam redação residual associando o próprio `docId` de `Convite_Aluno` ao HMAC derivado do contexto e do e-mail.
   - Essa associação colapsava a identidade histórica do convite com o mecanismo de unicidade de pendência, impedindo a emissão de um novo convite legítimo após a terminalidade (aceite ou expiração) sem sobrescrever o documento histórico anterior, violando a rastreabilidade do aceite (`aceitado_por`, `aceitado_em`) e a auditoria de convites passados.

Estas projeções divergentes da Seção 5 e Seção 10 estão sendo reconciliadas com a regra normativa já estabelecida pelas Seções 4, 7 e formalização executável. A Seção 7/M11 é a autoridade normativa para o ciclo de vida e invariantes; a Seção 5 define a materialização física correspondente no Firestore; a Seção 10 ilustra a implementação via pseudocódigo.

## 2. Decisão Normativa Reconciliada: Modelo Canônico

Fica estabelecida de forma inequívoca a separação conceitual e física entre **identidade histórica do convite** e **chave determinística de pendência ativa**:

```text
Convite_Aluno/{idConvite}
│
├── identifica uma emissão específica de convite
├── idConvite não muda
│
├── enquanto PENDENTE:
│     token_hash pode ser substituído no reenvio
│     expira_em pode ser renovado
│     ultimo_reenvio_por pode ser atualizado
│
├── ACEITADO:
│     preserva o documento
│     grava aceitado_por
│     grava aceitado_em
│
└── EXPIRADO:
      preserva o documento
```

Separadamente:

```text
Chaves_Unicas/<chaveDeterministicaPendencia>
│
├── chave derivada server-side por HMAC-SHA256
│   sobre serialização canônica e inequívoca de:
│
│     contexto GLOBAL
│     OU
│     contexto TURMA + idTurma
│
│   +
│
│     emailNormalizado
│
└── id_recurso = idConvite atualmente pendente
```

### 2.1 Identidade e Mutabilidade de `Convite_Aluno/{idConvite}`

- `Convite_Aluno/{idConvite}` representa um fato histórico identificável e preservado do ciclo de convite.
- O `docId` (`idConvite`) é imutável e gerado pelo servidor (identificador único no Firestore).
- A identidade daquele convite é imutável.
- **Campos de identidade e histórico preservados**:
  - `idConvite` é imutável;
  - `convidado_em` original não muda no reenvio;
  - `convidado_por` original não muda no reenvio;
  - Após transição para `aceitado`, preservam-se: `status = "aceitado"`, `aceitado_por` e `aceitado_em`.
- **Campos transitórios do estado pendente**:
  - Enquanto `status == "pendente"`, somente as mutações normativamente previstas para esse estado podem ocorrer.
  - No reenvio:
    - `token_hash` é substituído pelo hash SHA-256 do novo token CSPRNG;
    - `expira_em` é renovado (now + 7 dias);
    - `ultimo_reenvio_por` é atualizado com o UID do operador que solicitou o reenvio.
  - A substituição de `token_hash` é in-place; a norma **não** exige nem introduz histórico de tokens anteriores (não existe entidade `Historico_Convite` nem preservação de hashes passados).
- **Terminalidade e Preservação**:
  - Depois que o status atinge estado terminal (`aceitado` ou `expirado`), aquele documento representa um fato terminal preservado e **não pode ser reutilizado** para representar um novo convite.
  - Invariância histórica contra exclusão: `Convite_Aluno` **não é apagado** como consequência de:
    - aceite;
    - expiração;
    - reenvio;
    - liberação da chave de pendência;
    - criação posterior de novo convite para o mesmo contexto/e-mail.
  - O fato terminal permanece preservado no Firestore para auditoria e histórico.

### 2.2 Chave Determinística de Pendência em `Chaves_Unicas`

- A chave determinística de pendência existe exclusivamente para garantir a unicidade de no máximo um convite `pendente` por `(contexto, emailNormalizado)`.
- É derivada no servidor:
  ```text
  chave_hmac = HMAC-SHA256(
      segredoServidor,
      serializacaoCanonica(contextoConvite, emailNormalizado)
  )
  ```
- O contexto é semanticamente distinto entre:
  - `GLOBAL` (quando `id_turma` é nulo); e
  - `TURMA + idTurma` (quando o convite é vinculado a uma turma específica).
- A serialização canônica antes da aplicação do HMAC deve ser determinística, inequívoca, injetiva quanto aos componentes e executada exclusivamente server-side, impedindo colisões entre contextos e sem expor e-mail em claro na chave.
- O documento em `Chaves_Unicas` aponta para `id_recurso = idConvite` (o convite atualmente pendente).
- A chave de pendência é **liberada transacionalmente** (removida de `Chaves_Unicas`) quando o convite atinge estado terminal (`aceitado` ou `expirado`).

## 3. Semântica Operacional Obrigatória do Ciclo de Vida

- **NOVO CONVITE**:
  - Verifica a ausência de pendência ativa em `Chaves_Unicas` para a chave derivada do contexto e e-mail normalizado.
  - Cria um novo documento `Convite_Aluno/{novoId}` com `status: "pendente"`, gerando novo `idConvite`, registrando `convidado_em` e `convidado_por`.
  - Grava atomicamente em `Chaves_Unicas` a chave determinística de pendência apontando para `id_recurso = novoId`.

- **REENVIO DE CONVITE PENDENTE**:
  - Localiza o convite pendente existente através da chave em `Chaves_Unicas` (ou consulta correspondente).
  - Mantém o **mesmo** documento `Convite_Aluno/{idConvite}`, preservando a identidade, `idConvite`, `convidado_em` e `convidado_por` originais.
  - Mantém a mesma identidade de pendência em `Chaves_Unicas`.
  - Substitui `token_hash = SHA-256(novoTokenCSPRNG)`, renova `expira_em = now() + 7 dias` e atualiza `ultimo_reenvio_por = request.auth.uid`.
  - O token anterior é imediatamente invalidado, sem criação de segundo documento e sem arquivamento de hashes anteriores.

- **ACEITE DE CONVITE (`aceitarConviteAluno`)**:
  - Executado em transação atômica no Firestore.
  - Revalida que o convite está `pendente`, não expirado e que o e-mail da conta autenticada corresponde ao convite.
  - O documento `Convite_Aluno/{idConvite}` é preservado e atualizado para `status: "aceitado"`, gravando `aceitado_por = request.auth.uid` e `aceitado_em = serverTimestamp()`.
  - A chave determinística de pendência correspondente em `Chaves_Unicas` é **liberada/excluída** na mesma transação.
  - Cria ou valida registros acadêmicos (`Usuarios`, `Aluno`, `Turma/{id}/Alunos`, espelho `Usuarios/{uid}/Turmas` e incrementa `qtd_alunos`, conforme aplicável).

- **EXPIRAÇÃO OPERACIONAL**:
  - Convite cujo `expira_em < now()` torna-se inaceitável.
  - A rotina/transação de expiração atualiza idempotentemente o documento `Convite_Aluno/{idConvite}` para `status: "expirado"`.
  - A chave de pendência em `Chaves_Unicas` é **liberada/excluída**.
  - O documento `Convite_Aluno` histórico permanece preservado intacto.

- **NOVO CONVITE APÓS TERMINALIDADE**:
  - Estando a chave de pendência liberada após aceite ou expiração, uma nova emissão para o mesmo e-mail e contexto é plenamente permitida.
  - Cria um **novo** documento `Convite_Aluno/{novoId}` com novo `idConvite`, novo token e novo `token_hash`.
  - Cria uma nova pendência em `Chaves_Unicas` utilizando a mesma identidade determinística daquele contexto e e-mail.
  - O documento terminal anterior (aceitado ou expirado) permanece intocado no Firestore com todos os seus metadados de histórico e auditoria preservados.

# M11 / M13 — Reconciliação dos Canais de Entrega de Convite de Aluno e Rejeição Terminal

**Data:** 2026-09-27  
**Status:** APROVADO  
**Contexto:** Reconciliação normativa dos canais de entrega de convites de aluno (M11), adição do tipo de notificação acadêmica `CONVITE_PARA_TURMA` (M13), estado terminal de rejeição (M11) e permissão de convite ordinário pelo Chefe Geral (M9/M11).

---

## 1. Problema Encontrado

Após a implementação de `IMP-ACAD-005/006`, identificou-se uma defasagem normativa: a redação anterior induziu a interpretação de que o sistema LCQUI necessitaria de provedores externos de e-mail (SMTP, SendGrid, Resend, AWS SES) para entrega de links de convite.
Essa abordagem viola a arquitetura desejada do projeto: o LCQUI não deve gerenciar credenciais de envio de e-mail por servidores externos nem armazenar senhas ou gerar senhas provisórias conhecidas pelo sistema.

Adicionalmente:
1. Alunos que já possuem conta no Firebase Auth não necessitam de link externo por e-mail para tomar conhecimento de convites para novas turmas: o canal canônico interno é uma notificação server-owned `CONVITE_PARA_TURMA` na sua caixa pessoal (`Usuarios/{uid}/Notificacoes`).
2. O ciclo de vida de `Convite_Aluno` previa apenas `pendente`, `aceitado` e `expirado`, carecendo do estado explícito e terminal de `rejeitado` com liberação de pendência determinística (`Chaves_Unicas`).
3. O `Chefe_Geral` possuía restrição de emissão de convites ordinários para turmas ativas de professores, sobrecarregando a moderação ou exigindo intervenções extraordinárias desnecessárias.

---

## 2. Contrato Anterior vs. Novo Contrato

| Dimensão | Contrato Anterior | Novo Contrato Reconciliado |
| :--- | :--- | :--- |
| **Canal de Entrega (sem conta Auth)** | E-mail externo genérico (gerava dívida de SMTP/Resend/SES). | **Exclusivamente Firebase Authentication**: provisionamento server-side da conta e disparo do fluxo oficial Firebase de e-mail para definição de senha com `continueUrl` para retorno ao LCQUI. Zero provedores externos. |
| **Canal de Entrega (com conta Auth)** | Tentativa de envio de link externo. | **Notificação interna server-owned** `CONVITE_PARA_TURMA` em `Usuarios/{uid}/Notificacoes/{idConvite}`. Nenhum e-mail externo disparado. |
| **Aceitação de Convite** | Exigia token fornecido pelo cliente em todos os casos. | **Duas portas de entrada convergentes**: (1) Via Externa: `idConvite` + `token`; (2) Via Interna: usuário autenticado + e-mail verificado + notificação própria `CONVITE_PARA_TURMA` (zero token no cliente). Ambas executam `aceitarConviteCoreTx`. |
| **Ciclo de Vida do Convite** | `pendente` $\to$ `aceitado` \| `expirado`. | `pendente` $\to$ `aceitado` \| `rejeitado` \| `expirado`. |
| **Rejeição de Convite** | Inexistente no modelo formal. | Estado terminal auditado (`rejeitado_por`, `rejeitado_em`), libera chave HMAC de pendência em `Chaves_Unicas`, zero matrícula/papel/contador, receipt M7. |
| **Autoridade de Emissão** | Apenas Professor dono da turma. | Professor dono da turma (ordinário ou com exceção nominal de capacidade com justificativa); **Chefe Geral** (apenas convite ordinário, sem exceção de capacidade e com auditoria institucional). |
| **Taxonomia de Notificações (M13)** | 20 valores de enum; 6 tipos acadêmicos. | **21 valores de enum**; **7 tipos acadêmicos** (incluindo `CONVITE_PARA_TURMA`). Alvo autorizado: `Convite_Aluno`. |

---

## 3. Impacto nas Fatias Formais e Normativas

### 3.1. Impacto M11 (Turmas, Matrícula e Convites)
- `#M11StatusConvite` em CUE: adicionado `"rejeitado"`.
- `#M11Convite` em CUE: adicionados `rejeitado_por` e `rejeitado_em` condicionais.
- Modelo Alloy `turmas_m11.als`: adicionado `Rejeitado` a `StatusConvite`; predicado `rejeitarConvite`; asserções provando que rejeição libera lock, não cria vínculo, não incrementa alunos e impede aceitação posterior; witness de rejeição.
- Prova de que nova emissão após terminalidade (`aceitado`, `rejeitado` ou `expirado`) gera novo registro com novo ID.

### 3.2. Impacto M13 (Notificação Unificada)
- `#M13Tipo` em CUE: adicionado `"CONVITE_PARA_TURMA"`.
- `#M13TipoAcademico` em CUE: adicionado `"CONVITE_PARA_TURMA"` (total de 7 tipos acadêmicos).
- `#M13EntidadeAlvo` em CUE: adicionado `"Convite_Aluno"`.
- Regra estrutural: `tipo == "CONVITE_PARA_TURMA" => id_turma != null && expira_em != null && id_quem_fez_acao != null && entidade_alvo == "Convite_Aluno"`.
- Modelo Alloy `notificacoes_m13.als`: adicionado `TConviteParaTurma` a `Tipo` e a `academico`; adicionado `notConvite: lone Convite` a `Notificacao` e em `temAlvoValido`.

### 3.3. Micro-reabertura M9 (Autorização)
- Operação explícita `#M9Decisao.operacao` e Alloy `ConvidarAlunoTurma extends Operacao` adicionada (não confundida com `OPERAR_RECURSO_PROPRIO`).
- Permissão de emissão ordinária para Chefe Geral: o Chefe Geral possui autoridade administrativa específica para emitir convite ordinário para qualquer turma com `status == "Ativo"`. Não assume ownership (`Turma.id_professor` permanece inalterado) e não ganha permissão genérica para operar a turma como professor (`OPERAR_RECURSO_PROPRIO` continua exigindo estritamente `dono = uid`). Qualquer tentativa de `exceder_capacidade = true` falha fechada com `PERMISSION_DENIED`.
- O Professor continua autorizado a convidar para sua própria turma ativa (`dono = uid`), podendo justificar exceção de capacidade conforme RN-TUR-01. Professor terceiro tem a emissão negada.
- 9 novas asserções provadas em Alloy (UNSAT): `ProfessorDonoPodeConvidarAlunoTurma`, `ProfessorTerceiroNaoPodeConvidarAlunoTurma`, `ChefePodeConvidarAlunoTurmaSemOwnership`, `ChefeConvidarNaoTransfereOwnership`, `ChefeNaoGanhaOperarRecursoProprio`, `AlunoNaoPodeConvidarAlunoTurma`, `GestoresNaoPodemConvidarAlunoTurma`, `UsuarioInativoNaoPodeConvidarAlunoTurma`, `ClaimObsoletaNaoAutorizaConvite`.
- Novo witness provado em Alloy (SAT): `WitnessChefeConvidarSemOwnership` (demonstra cenário válido de Chefe X != Professor dono Z emitindo convite para Turma de Z sem alterar o dono).
- Resultado da validação formal M9: 22 checks UNSAT e 10 witnesses SAT.

### 3.4. Impacto Auth e Firestore
- Emissão: detecção de conta no Firebase Auth fora da transação Firestore (`getUserByEmail`).
- Se usuário não possui conta: criação da conta no Firebase Auth e disparo da ação oficial de e-mail de redefinição de senha com URL segura de retorno.
- Se usuário possui conta: gravação atômica da notificação `CONVITE_PARA_TURMA` na subcoleção do usuário.
- Se conta desabilitada: fail-closed imediato.
- Proteção de segredo: token CSPRNG nunca é persistido em claro, nunca é gravado em logs, receipts ou auditoria, e nunca viaja na notificação interna.

### 3.5. Impacto UI / UX
- **UI-10**: Modal/formulário de convite permite ao Chefe Geral emitir convite ordinário para turmas ativas; desabilita opção de exceção de capacidade para quem não é o dono; feedback individual discrimina se o convite foi disponibilizado internamente ou enviado via Firebase Auth.
- **UI-12**: Apresentação de cards do tipo `CONVITE_PARA_TURMA`, exibindo quem convidou, turma, professor dono e expiração, com botões [Aceitar] e [Rejeitar] enquanto pendente.

---

## 4. Rastreabilidade Documental
- `documentation/Section-3-Stakeholders.tex`: Atualizado papel Chefe Geral e matriz de permissões.
- `documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex`: Atualizadas entidades `Convite_Aluno` (status, campos `rejeitado_por/em`) e `Notificacao` (tipo, entidade_alvo, obrigatoriedade de campos).
- `documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex`: Mapeamento de coleções e dicionário de dados atualizados com semântica de rejeição e notificação de convite.
- `documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex`: Seção M11 e Seção M13 atualizadas com canais Auth, rejeição, Chefe Geral e enum de 21 tipos.
- `documentation/Section-8-Descricao-das-telas-Dashboards.tex`: Telas UI-10 e UI-12 atualizadas.
- `documentation/Section-9-Exemplos-de-fluxos.tex`: Fluxos CHE-06, PRO-03 e ALU-01a/b reconciliados.
- `documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/...`: N-12 corrigido para ordenação estrita READS FIRST; N-12b adicionado.
- `documentation/Formal-Spec-M13.tex`: 7 tipos acadêmicos referenciados para guard de drift.

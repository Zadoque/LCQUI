# M12.1 — Posts, comentários, edição/moderação e históricos (validação documental)

## 1. Estado, baseline e fronteira

- **Branch:** `feat/formal-spec-cue-alloy` (única).
- **HEAD de entrada:** `9f5c6713114ee9ef2d77eb98f31e0788053caa7b`, árvore limpa e
  `origin` sincronizada.
- **Baseline:** `just formal-check` exit `0` antes de editar (29 testes Rust, 24
  Node, Alloy PASS, gerador e PDF de 405 páginas). M0–M11 preservados.
- **Tipo:** rodada **exclusivamente documental**. Não altera
  `specification/cue/`, `specification/alloy/`, IR, receipts, validadores/
  gerador Rust, `documentation/generated/`, `frontend/`, `functions/`,
  `firestore.rules`, `storage.rules`, índices nem artefatos M0–M11.
- **Escopo:** Post, Comentário, históricos de edição/moderação e leituras
  acadêmicas (RF19, RF20, UI-11), Q08/Q10/Q11/Q13, M7/M9/M11. Roteiros,
  compartilhamento, Storage/download e a ACL completa de Roteiros são
  **fronteira com M12.2**; a caixa de notificações (UI-12) fica fora, com apenas
  a emissão `POST`/`COMENTARIO` contratada como efeito delimitado.

## 2. Diagnóstico (matriz de operações, evidência por arquivo/linha)

Linhas do estado de entrada, salvo indicação.

| Operação | Ator/escopo | Pré-condições | Transação/efeito | Auditoria/histórico | Falha | UI |
|---|---|---|---|---|---|---|
| Criar Post (RF19) | Professor dono | Turma Ativo; titulo≤150; descricao; roteiro opcional | grava Post; valida acesso ao roteiro; snapshot `roteiro_anexo` (`S5:678`) | histórico quando editado; notificação POST | turma arquivada; sem ownership | UI-11 (`S8:283`), PRO-07 (`S9:255`) |
| Editar Post | Professor dono (Chefe Q13) | Post existe; Turma Ativo | atualiza campos; `Historico_Posts_Turma` (`S4:631`) | `editado_por`+timestamp (`S4:645`) | turma arquivada; terceiro | UI-11 (`S8:283`) |
| Remover/moderar Post | Professor dono / Chefe Q13 | motivo; Turma Ativo | **não definido** no 3FN/dict (Q13 citado em `S4:645`) | só `Registro_de_Auditoria` | — | UI-11 (`S8:283` parcial) |
| Criar Comentário (RF20) | Aluno/Bolsista matriculado | Post existe; texto 1..2000; Turma Ativo | grava Comentário (`S4:808`) | notificação COMENTARIO | turma arquivada; removido | UI-11 (`S8:285`) |
| Editar Comentário | Autor | texto válido | `Historico_Comentario` (`S4:649`) | `editado_por`+timestamp (`S4:560`) | **sem flag `editado`** no 3FN/dict | UI-11 (`S8:285`) |
| Moderar Comentário | Professor dono / Chefe Q13 | motivo 1..2000 | `moderado`+`motivo_moderacao`+`moderado_por/em` (`S4:815-818`, `S5:689-692`) | histórico de moderação **ausente** (`Historico_Comentario` sem `tipo/motivo`) | turma arquivada | UI-11/GUI (`S8:285`) |
| Listar feed | Membro matriculado / Chefe | vínculo canônico atual | paginação data/ID (`S8:283`) | — | removido/moderado | UI-11 |
| Listar comentários | Autor/membro/auditor | vínculo atual | endpoint `listarComentariosPost` (`S11:62,112`) | — | vazamento de original | UI-11 (`S8:285`) |
| Abrir por notificação | Destinatário | acesso revalidado | navegação (`S7:283`) | notificação idempotente M7 | conteúdo sem acesso | UI-12 |

## 3. Achados e resoluções

| ID | Categoria | Evidência | Resolução |
|---|---|---|---|
| M12.1-F01 | LACUNA_DE_DOMINIO | Q13 previa o Chefe ``editar ou remover posts'' (`S4:645`), mas Post não tinha estado de remoção/motivo nem regra. | Campos `removido_da_apresentacao`/`motivo_remocao`/`removido_por`/`removido_em` no 3FN e no dicionário; remoção lógica (soft, RF25), com motivo e auditoria; regra 7.6. **RESOLVIDO**. |
| M12.1-F02 | CONTRADICAO_DOCUMENTAL | UI-11 exigia ``indicação de edição'' (`S8:285`), mas `Comentario`/`Post` não tinham `editado`/`editado_em`. | Campos `editado`/`editado_em` em Post e Comentário (3FN e dicionário). **RESOLVIDO**. |
| M12.1-F03 | LACUNA_DE_HISTORICO | `Historico_Comentario` não distinguia edição de moderação nem guardava motivo. | `tipo` (`edicao`/`moderacao`) e `motivo` adicionados; `novo_texto`/`texto_antigo` condicionais à edição. **RESOLVIDO**. |
| M12.1-F04 | LACUNA_DE_HISTORICO | `Historico_Posts_Turma` só registrava edição. | `tipo` (`edicao`/`moderacao`) e `motivo` adicionados; `editado_por` é o operador. **RESOLVIDO**. |
| M12.1-F05 | LACUNA_DE_DOMINIO | Q08 (`S8:272`) dizia que turma arquivada é somente leitura, mas não explicitava edições e moderação. | Regra 7.6 ``Estado da turma (Q08)'': toda escrita acadêmica negada, inclusive moderação, sem exceção administrativa. **RESOLVIDO**. |
| M12.1-F06 | LACUNA_DE_SEGURANCA | Máscara de comentário moderado, endpoint autorizado e não vazamento estavam espalhados (`S11:112`). | Regra 7.6 ``Leitura, máscara e endpoints'' consolida autor/membro/auditor e proíbe vazamento em cache/notificação/erro; Seção 11 reforçada. **RESOLVIDO**. |
| M12.1-F07 | LACUNA_DE_AUTORIZACAO | Escopo de Q13 para moderação de Post não era explícito. | Regra 7.6: Chefe modera/retira com motivo e auditoria, sem assumir autoria nem criar Post; linha na matriz da Seção 3. **RESOLVIDO**. |
| M12.1-F08 | LACUNA_DE_FRONTEIRA | Notificações poderiam autorizar leitura indevida. | Regra 7.6: efeito delimitado, docId determinístico M7, sem conteúdo protegido no payload, clique revalida acesso. **RESOLVIDO**. |
| M12.1-F09 | DIVERGENCIA_3FN | O 3FN `Post` não tinha o snapshot `roteiro_anexo` presente no dicionário Firestore (`S5:678`). | Documentado como projeção Firestore da fronteira M12.2; o 3FN mantém `id_roteiro_experimento` como FK. **REGISTRADO (fronteira M12.2)**. |
| M12.1-F10 | DIVERGENCIA_IMPLEMENTACAO | `functions/src/posts.ts` e `firestore.rules` reais divergem do alvo (não aplicarão M7/máscara/remoto). | **ABERTO (implementação)**, sem alteração nesta rodada. |

## 4. Human Questions e dependências

- **HQs M12.1: 0.** As escolhas encontradas foram resolvidas por autoridade
  existente: RF25 (nada de exclusão física), Q08 (arquivada somente leitura),
  Q10 (limites), Q11 (edição/moderação e máscara), Q13 (intervenção do Chefe) e
  M11 (vínculo canônico). Restauração de Post removido e transferência de
  ownership não são requisitos V1 efetivos e ficam **fora** de M12.1.
- **Dependência D-M12.1-01 (não bloqueante):** a ACL completa de Roteiros
  (upload, compartilhamento, revogação e emissão de URL) é formalizada em
  M12.2. M12.1 exige validar o acesso atual antes de publicar e revalidar o
  vínculo no download; o núcleo textual de Post/Comentário é independente.

## 5. Arquivos alterados

- `documentation/Section-7-...Regras-de-Negocio.tex` (nova subseção 7.6).
- `documentation/Section-4-...SQL-3FN.tex` (Post, Comentario,
  Historico\_Posts\_Turma, Historico\_Comentario).
- `documentation/Section-5-...Firestore.tex` (dicionários correspondentes).
- `documentation/Section-8-...Dashboards.tex` (UI-11).
- `documentation/Section-9-Exemplos-de-fluxos.tex` (Fluxos M12.1).
- `documentation/Section-11-...Security-Rules.tex` (Posts/Comentários e
  moderação).
- `documentation/Section-3-Stakeholders.tex` (linha de moderação na matriz).
- `documentation/main.pdf`, `documentation/STATUS_ATUAL.md`,
  `FORMAL_SPEC_STATE.md`.

## 6. Gates, regressão e inspeção

- `just formal-check` antes e depois: exit `0` (29 testes Rust, 24 Node,
  `alloy-check` PASS, gerador e stale gate). `git diff --check` = 0.
- Diff de `specification/`, `tools/`, `frontend/`, `functions/`,
  `firestore.rules`, `storage.rules`, `documentation/generated/` e
  `build/*.json`: **vazio**. Receipts e fragmentos M0–M11 intactos.
- PDF `documentation/main.pdf`: **411 páginas** (entrada 405), exit 0, 0 erros,
  0 referências indefinidas, 31 Overfull (perfil herdado; +1). Inspeção visual
  das páginas 126–129 (contrato 7.6), 200–201 (Fluxos M12.1), 42/46/90–91
  (campos 3FN/dicionário) e 181 (UI-11): legíveis, sem corte ou sobreposição.

## 7. Limites

Esta rodada não certifica `functions/src/posts.ts`, o frontend,
`firestore.rules`, `storage.rules`, Firebase, Admin SDK, App Check, Storage,
transações reais, índices nem a caixa de notificações completa (UI-12). Não
cobre Roteiros (M12.2) nem a formalização executável CUE/Alloy/Rust de M12.1,
que é objeto de rodada separada.

## 8. Estado final e próxima ação

**M12.1 = DOCUMENTATION_VALIDATED** (núcleo documental coerente, sem HQ
bloqueante; dependência M12.2 registrada). M0–M11 = **VALIDATED**;
M12.2 = **NOT_STARTED**; M12 = **NOT_STARTED**.

Próxima ação exata:

```text
Formalização executável M12.1 (CUE → IR → Alloy → receipt → Rust → LaTeX →
PDF) em rodada separada; depois M12.2 (Roteiros/Storage) e o fechamento M12.
```

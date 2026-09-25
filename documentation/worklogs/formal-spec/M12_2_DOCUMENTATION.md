# M12.2 — Roteiros de Experimento: validação documental

## 1. Estado e baseline

- Branch: `feat/formal-spec-cue-alloy` (única).
- HEAD de entrada: `b24813c1e77b4a36540a1289abbce0269ed50405`, árvore limpa e
  `origin` sincronizada. HEAD de saída = commit documental seguinte.
- Baseline e final: `just formal-check` exit `0` (31 testes Rust, 30 Node,
  Alloy, gerador e stale gate); `git diff --check` = 0.
- Rodada **exclusivamente documental**: nenhum artefato CUE/IR/Alloy/receipt/
  Rust/gerador, `documentation/generated/`, `frontend/`, `functions/`,
  `firestore.rules`, `storage.rules` ou índices foi alterado. M0–M11 e M12.1
  permanecem byte a byte idênticos.

## 2. Fontes reconciliadas

- Seção 3 (matriz), Seção 4 (`Roteiro_Experimento`,
  `Roteiro_Professor_Compartilhado`), Seção 5 (dicionário e array
  `professores_compartilhados`, nota ``Arquivos''), Seção 7.6 (fronteira
  `acessoRoteiroValidado`/`roteiro_anexo`), Seção 8 (UI-11), Seção 9 (fluxos),
  Seção 10.11 (pseudocódigos ilustrativos) e Seção 11 (Rules/Storage).
- **Q09** localizada com definição efetiva em
  `documentation/MODIFICACOES_CONSOLIDADAS_LCQUI.md` (``Revogação de Roteiro
  Anexado a Post''): a revogação impede a criação de novos posts com o arquivo,
  mas preserva permanentemente os posts históricos via snapshot. A referência da
  UI-11 é resolúvel; Q09 foi incorporada à nova Seção 7.7.
- Implementação consultada apenas como dívida, nunca como autoridade.

## 3. Nova fonte normativa: Seção 7.7

`\label{sec:regras-roteiros-m12-2}` cobre:

1. **Identidade/autoria:** dono imutável `id_professor_upload`; referência
   canônica `storage_path` + `content_type` + `tamanho_bytes` + `owner_uid` +
   `geracao` + `criado_em`; `file_url` legado, nunca credencial; URL temporária
   e limitação de não revogabilidade da URL já emitida.
2. **Upload seguro/publicabilidade:** professor ativo, validação
   App Check/Auth/papel, PDF estritamente $<15$ MiB, bytes `%PDF-`,
   caminho/titularidade/geração; Roteiro publicável só após validação; cancelar
   ou falhar não cria registro utilizável; órfão reconciliado; Firestore–Storage
   sem transação única.
3. **Compartilhamento/revogação (Q09):** só o proprietário autoriza/revoga
   professor ativo; relação única por `(id_roteiro, id_professor)`; array
   server-owned; idempotente (M7); destinatário não redistribui/alterar autoria;
   notificação mínima `ROTEIRO_COMPARTILHADO`; revogação impede novas
   associações e preserva Posts históricos.
4. **Leitura/download:** abas da biblioteca; revalidação server-side por
   propriedade/compartilhamento atual (professor) ou vínculo canônico atual +
   Post acessível (aluno); turma arquivada somente leitura; ex-aluno não lê;
   sem vazamento por URL/cache/erro/notificação; Chefe por Q13; falha fechado se
   objeto/geração ausente.
5. **Associação com Post:** no máximo um roteiro por Post; acesso atual no
   commit inclusive na edição; snapshot imutável com geração; snapshot não é
   autorização; desvincular não exige acesso; histórico M12.1 preserva
   id antigo/novo e objeto retido.
6. **Composição M7/M9:** `idOperacao`/receipt em upload/compartilhar/revogar/
   anexar/desvincular; retry idempotente; reuso incompatível rejeitado; validação
   de Storage é etapa externa reconciliável.

## 4. Matriz regra → fonte → verificação

| Regra | Fonte alterada | Verificação documental |
|---|---|---|
| Referência canônica do arquivo | S4/S5/S7.7/S11 | `storage_path/geracao/owner_uid` presentes; `file_url` legado |
| Upload/publicabilidade | S7.7/S8/S10.11/S11 | regra + pseudocódigo alinhado + Storage |
| Relação única de compartilhamento | S4/S5/S7.7 | PK composta ↔ array server-owned |
| Revogação Q09 | S7.7/S8/S9 | impede novos; preserva históricos |
| Download (dono/share/aluno/Chefe) | S7.7/S9/S11 | revalidação e URL curta; ex-aluno negado |
| Anexo a Post e snapshot | S7.7/S8 | acesso no commit; snapshot imutável |
| M7/M9 | S7.7 | `idOperacao`/receipt; revalidação |

## 5. Arquivos alterados

- `documentation/Section-7-...Regras-de-Negocio.tex` (nova 7.7).
- `documentation/Section-4-...SQL-3FN.tex` (Roteiro + compartilhamento).
- `documentation/Section-5-...Firestore.tex` (dicionário de Roteiro).
- `documentation/Section-8-...Dashboards.tex` (UI-11).
- `documentation/Section-9-Exemplos-de-fluxos.tex` (Fluxos M12.2).
- `documentation/Section-10-.../Section-10-Subsection-11-...tex` (nota M12.2).
- `documentation/Section-11-...Security-Rules.tex` (Roteiro/Storage).
- `documentation/Section-3-Stakeholders.tex` (linha de download).
- `documentation/Formal-Spec-M12-1.tex` (referência à 7.7).
- `documentation/main.pdf`, `STATUS_ATUAL.md`, `FORMAL_SPEC_STATE.md`.

## 6. HQs e divergências de implementação

- **HQs M12.2: 0.** Todos os casos foram resolvidos por Q09 + Seção 11
  (``propriedade, compartilhamento ou post de turma acessível'') + decisão
  explícita de exigir acesso atual ``inclusive na edição''.
- **Dívida de implementação** (não alterada): `functions/src/roteiros.ts` usa
  `compartilhado_com_emails` (array de e-mail) em vez de UID,
  `compartilharRoteiro`/`descompartilharRoteiro` sem `idOperacao`/M7,
  `registrarRoteiro` sem `%PDF-`/geração/URL curta; `functions/src/posts.ts`
  grava `id_roteiro_experimento` sem snapshot/geração nem revalidação;
  `storage.rules` permite `read` de `/roteiros` a qualquer autenticado. Registro
  como divergência; a aplicação não é homologada por esta rodada.

## 7. Auditorias

1. **3FN ↔ Firestore ↔ 7.7 ↔ UI/fluxos ↔ Rules/Storage — limpa:** campos
   canônicos coincidem; `file_url` legado em todas; array ↔ PK composta;
   download mediado; Storage alvo documentado como divergente do real.
2. **Revogação/download/associação — limpa:** Q09 preserva Post histórico;
   aluno com vínculo atual baixa Post acessível; ex-aluno negado; edição que
   mantém anexo após revogação falha fechado; snapshot não autoriza;
   desvinculação registra histórico.

Nenhuma inconsistência nova após as correções.

## 8. Limites e próximo passo

Não certifica `functions/src/roteiros.ts`, `functions/src/posts.ts`, frontend,
`firestore.rules`, `storage.rules`, Firebase, Storage, Auth nem concorrência
real. **M12.2 = DOCUMENTATION_VALIDATED** (sem HQ bloqueante); M0–M11 e M12.1 =
VALIDATED; M12 = NOT_STARTED (composição M12.1/M12.2); M13 = NOT_STARTED
(Notificação unificada).

Próxima ação permitida:

```text
M12.2 executável (CUE → IR → Alloy → receipt → Rust → LaTeX → PDF) em rodada
separada; depois o fechamento de M12 e M13. O fechamento global após M13 é um
gate, sem M14 automático.
```

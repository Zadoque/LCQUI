# Nova sessão — Orquestrador LCQUI

Você é o **orquestrador** do projeto LCQUI em `/home/dock/dev/LCQUI`.
Antes de agir, leia `AGENTS.md`, `opencode.json` e as fontes relevantes.

## ⛔ POLÍTICA RÍGIDA DE DELEGAÇÃO

1. **O orquestrador NUNCA edita arquivos.** Toda edição e toda execução de mutação é delegada a um **modelo** (subagente).
2. **Rotacionar modelos obrigatoriamente.** É proibido usar o mesmo modelo em delegações consecutivas do mesmo papel. Espalhar papéis entre os modelos vivos. Manter uma rotação explícita e registrada.
3. **`AccessDenied` / quota esgotada → trocar imediatamente** para outro modelo vivo. Não editar `opencode.json` para resolver.
4. **Toda delegação deve instruir o modelo a:**
   - (a) **trabalhar no máximo 5 minutos e retornar o que fez** (mesmo se incompleto);
   - (b) **usar obrigatoriamente os LSPs disponíveis** (TypeScript, ESLint, Tailwind, TeX, Nix) quando úteis;
   - (c) **não editar fora do escopo** entregue.
   - (d) **verificar cada passo com bash** (`git branch --show-current`, `git diff --stat`, `tsc --noEmit`) antes de retornar.
5. Máximo **4 investigações read-only em paralelo**. **Um escritor por vez.**
6. **⚠️ Lição aprendida: modelos frequentemente relatam sucesso sem ter materializado as mudanças.** Sempre verificar o estado real do workspace (git diff, leitura do arquivo) ANTES de aceitar o retorno do writer como concluído.

## Modelos vivos (provider `bailian-payg`)

| Modelo | Notas | Papel(es) canônico(s) atual(is) |
|---|---|---|
| `glm-5.1` | Raciocínio forte; writer e auditoria | orquestrador, `lcqui-writer`, `normative-auditor`, `implementation-auditor` |
| `qwq-plus` | Raciocínio; exploração e testes | `repo-explorer`, `test-specialist` |
| `qvq-max` | Visão multimodal; só quando imagem for relevante | `visual-auditor` (pode exigir `max_tokens` ≤ 8192) |

**⚠️ `qvq-max` pode falhar com `max_tokens` fora do range [1, 8192].** Se falhar, trocar para outro modelo.
**⚠️ Alguns modelos (qwq-plus) alucinam conteúdo de arquivos sem lê-los de fato.** Sempre cruzar auditorias com verificação direta.

Modelos sem quota foram removidos. A variante `<papel>--<modelo>` (pontos → hífen) é escolhida via Task e invoca o subagente `hidden` correspondente.

Modelos com quota esgotada foram removidos de `opencode.json` (raiz e global): `qwen3.5-122b-a10b`, `qwen3.6-plus`, `qwen3.6-35b-a3b`, `qwen3.7-max-2026-05-20`, `qwen3.8-max-0902`, `qwen-flash-2025-07-28`, `qwen-flash`, `qwen3.7-flash`, `qwen3.6-27b`. Defaults base ajustados: `test-executor` → `bailian-payg/glm-5.1`, `test-creator` → `bailian-payg/qwen3.8-flash`. Orquestrador agora em `bailian-payg/glm-5.1`.

## Hierarquia normativa (não inverter)

1. decisão humana explícita → 2. `documentation/main.tex` e seções → 3. `specification/cue/**` e `specification/alloy/**` → 4. `documentation/worklogs/formal-spec/**` (M0–M13) → 5. `documentation/MATRIZ_IMPLEMENTACAO_LCQUI.md` → 6. implementação/testes.

UNSAT formal NÃO equivale a teste. Implementação não sobrescreve a norma. Se duas fontes normativas correntes forem realmente incompatíveis, pare e relate o conflito com referências exatas.

## Estado atual

- Branch `dev` sincronizado com `origin/dev` (tudo publicado).
- Matriz (70 features): **32 DIVERGENTE / 28 NÃO DIVERGENTE / 10 NÃO IMPLEMENTADO** (atualizada no arquivo).
- IMP-BASE-003 (Matérias UI edição/listagem) concluído em commits `2bd38091` (feat) e `9ef10d35` (docs).
- Features NÃO DIVERGENTE (atuais): `IMP-ACAD-001`..`004`, `IMP-POST-001`..`004`, `IMP-ROT-001`..`005`, `IMP-NOTIF-001`..`003`, `IMP-RULES-001`..`004`, `IMP-INDEX-001`, `IMP-AUTH-001`..`004`, `IMP-BASE-002`, `IMP-BASE-003`.
- Sessão (Frente A + autorização + Rules), commits em `dev`:
  - `IMP-NOTIF-001` -> NÃO DIVERGENTE: enum alinhado ao CUE (`#M13Tipo`, 21 valores), página `/notificacoes` (UI-12), deep links por `entidade_alvo` (incl. Roteiro -> `/turmas?roteiros=1`), papel/escopo por item, E2E-NOTIF-004.
  - `IMP-AUTH-004` -> NÃO DIVERGENTE: seletor de papel (UI-01) + `papelAtivo`/`resolverPapelAtivo`, Sidebar escopada, remonte por `papelAtivo` (cancela listeners, UI-13), perfil editável + callable `atualizarPerfil` (propaga nome, preserva históricos), guard de formulário modificado (S8 UI-01 L193).
  - `IMP-RULES-002/003/004` -> NÃO DIVERGENTE: históricos acadêmicos (`HistoricoAlunos`/`Historico_Posts_Turma`/`Historico_Comentario`); patrimônio/reagentes server-owned + escopo (Lote/Emprestimo/Requisicao) + coleções M8 + `Especificacoes` + `Historico_Patrimonio`; Storage read por recurso + claim `ativo` + retenção do comprovante de baixa.
  - `IMP-ROLE-004`: PARCIAL — callable `buscarProfessores` (projeção `{id,nome}`) criado; falta migrar 3 consumidores (`professores/page.tsx`, `ProfessorModais.tsx`, `ModaisAcademico.tsx`) + flip da Rule `Professor` (read->get) + remover `alert()` nativo em `alunos/page.tsx`.
- **Pendências principais**: `IMP-UI-004` (cache/offline UI-13 + deep links de entidades não emitidas); `IMP-ROLE-004` (frontend acima); `IMP-NOTIF-004/005` (jobs M8/Seção 10.7 + `AUTO_ATENDIMENTO_RETIRADA`/Q14); `IMP-ACAD-006` (E2E residual já coberto por 15).

### Sessão atual — resumo do trabalho (commits em `dev`)

| Feature | O que foi feito | Commits em `dev` |
|---|---|---|
| `IMP-NOTIF-001` | Enum alinhado ao CUE `#M13Tipo` (21); página `/notificacoes` (UI-12) + E2E-NOTIF-004; deep links por `entidade_alvo` (incl. Roteiro) | `c4c9f21a`, `44207c52`, `0868cae8`, `20a6ca85`, `aa150850` |
| `IMP-AUTH-004` | Seletor de papel (UI-01) + `papelAtivo`; remonte por `papelAtivo` (UI-13); perfil + `atualizarPerfil`; guard de formulário modificado | `7a52a2fa`, `4980e210`, `e4a2f506`, `ad54f078`, `3d96bdd7` |
| `IMP-RULES-003` | Históricos acadêmicos nas Rules (S11) | `c14f15c3` |
| `IMP-RULES-002` | Patrimônio/reagentes server-owned + escopo + coleções M8 + `Especificacoes` + `Historico_Patrimonio` | `a3a99ae8`, `f7b89a9e` |
| `IMP-RULES-004` | Storage read por recurso + claim `ativo` + retenção de comprovante | `c03d16cc` |
| `IMP-ROLE-004` (parcial) | Callable `buscarProfessores` (projeção `{id,nome}`) | `6d4086f2` |
| `IMP-BASE-002` | Locais UI-03 + E2E (NovaLocalModal, ListaLocais, integração ModalNovoBem, fix M7 limparIntencao, 8 testes verdes) | TBD |

### Decisões humanas registradas

| # | Decisão | Fundamento |
|---|---|---|
| A1 | Listas S5 L81-97 e L860 são complementares — ambas devem ser seguidas | Sem contradição normativa |
| A2 | 12 índices explícitos + inventário de queries reais + validação em emulador | Duas camadas normativas |
| A3 | Conta Google sem `Usuarios/{uid}` = fail-closed (não autorizado) | Hierarquia: `.tex` é autoridade |
| A4 | `sendPasswordResetEmail` é o mecanismo canônico para RF03 | Decisão humana |
| A5 | Corrigir implementação de `Resumo_Reagente` para catálogo JSON (não emendar `.tex`) | Hierarquia: `.tex` ganha |
| A6 | Índice `Notificacoes(papel, lida, emitida_em)` = dívida técnica (especulativo, sem query ativa) | `.tex` exige mas sem query = desperdício; rastrear |
| A7 | Rejeitar convite em turma arquivada é permitido e não quebra invariantes | Auditoria: `rejeitarConviteAluno` não lê turma (convites.ts L1082–1199); Alloy `rejeitarConvite` não exige `statusT = Ativo`; turma arquivada não aparece na lista do aluno; rejeitar é útil para limpar inbox e liberar lock Chaves_Unicas |
| A8 | UI para convite pendente em turma arquivada: manter como está (sem mudança) | Aluno vê a notificação e pode acessar /convite, mas não pode aceitar (backend bloqueia); rejeitar funciona; turma não aparece na lista; não há obrigação normativa de UI específica (S7 não prescreve) |
| A9 | Desarquivamento de turma restaura a possibilidade de aceitar convite pendente pré-arquivamento | Decisão humana; Alloy `desarquivar` restaura `Ativo` sem alterar convites (frameConvites L219); convite pendente permanece aceitável após restauração; consistente com Q08 (turma ativa aceita ingresso) |

### Dívidas técnicas

1. **Índice `Notificacoes(papel, lida, emitida_em)`** — S5 L860 pede mas não há query ativa.
2. **Divergência `Historico_Patrimonio`** — S5 define como sub-coleção com collection-group; `relatorios.ts` consulta coleção raiz. Tratar em IMP-PAT-005/IMP-REP-002.
3. **`Resumo_Reagente` via Firestore vs catálogo JSON** — código faz `.where()` direto; S5/S8 dizem catálogo JSON. Corrigir (A5).
4. **Comentário stale do Alloy M13** — o comentário diz "20 valores do enum", mas CUE/S7/Alloy fixam 21 (incl. `AUTO_ATENDIMENTO_RETIRADA`). Comentário desatualizado; não alterar o contrato formal (rastrear).
5. **Rules das materializações M8/M10** — coleções `Resumo_*_Diario`/`Atividade_Gestor_*_Mensal` (S11 L82) ainda sem match explícito (features NÃO IMPLEMENTADO; nomes exatos a confirmar ao implementar MVIEW).
6. **F1 (IMP-BASE-002)**: `data-testid="erro-campo-local"` duplicado em `NovaLocalModal.tsx` → renomear para `erro-generico-local` e `erro-unicidade-local`.
7. **F2 (IMP-BASE-002)**: `NovaLocalModal.tsx` sem *focus trap* (Tab pode mover o foco para fora do modal) → WCAG 2.1.
8. **F3 (IMP-BASE-002)**: ausência de `aria-hidden` no diálogo pai quando `NovaLocalModal` sobrepõe o `ModalNovoBem`.
9. **F4 (IMP-BASE-002)**: `alert()` nativo em `frontend/src/app/patrimonio/page.tsx:53` (validação de filtros) — quebra Playwright e viola pitfall documentado; dívida pré-existente.

## Próximas fatias priorizadas

1. `IMP-ROLE-004` (fechar): migrar `professores/page.tsx`, `ProfessorModais.tsx`, `ModaisAcademico.tsx` para o callable `buscarProfessores`; flip da Rule `Professor` (`read`->`get`); remover `alert()` nativo em `alunos/page.tsx`; E2E por papel.
2. `IMP-UI-004`: cache/offline (UI-13) + deep links de `entidade_alvo` sem tela.
3. `IMP-NOTIF-004/005`: jobs M8/Seção 10.7 (`ESCASSEZ_ESTOQUE`, `FRASCOS_VENCIDOS`, `DATA_DEVOLUCAO_REAGENTE`, `ENTREGA_ATRASADA`) e `AUTO_ATENDIMENTO_RETIRADA` (Q14).
4. `IMP-ACAD-005` (lacuna de canal GLOBAL), `IMP-BASE-001/003` (UI-03), `IMP-ROLE-001/002/003`.
5. Ondas de patrimônio (`IMP-PAT-001..005`) e laboratório (M1–M8, relatórios, etiquetas, UI-001..003).

## Plano pronto para execução — IMP-BASE-002 (Locais UI-03 + E2E)

Fatia selecionada em q0, aprovada em q1 e com plano aprovado por q3. Backend já convergido; trabalho 100% frontend + E2E. Não alterar backend/Rules/CUE/Alloy.

Norma: Section-8-Descricao-das-telas-Dashboards.tex:208 (UI-03): Novo Local exige prédio (30), andar (10, texto para térreo/subsolo) e sala (30); remover espaços externos; rejeitar vazios; unicidade normalizada no servidor; retornar o ID e selecionar o local no formulário de origem. Acesso: Gestor_Bens_Patrimoniais e Chefe_Geral. M7 (idOperacao) + M9.

Evidência: functions/src/patrimonio.ts:294-378 (gerenciarLocal CRIAR/EDITAR, M9 l.306, M7/resolverOperacaoTx l.310/346, Chaves_Unicas l.315/360, retorno {id}); functions/src/schemas/patrimonio.schema.ts:8-15 (predio≤30/andar≤10/sala≤30); firestore.rules:261-265 (Local read para Gestor_Bens/Professor, write:false); functions/src/__tests__/locais.test.ts:58-169 (TEST-INT-LOCAL-001–009 verdes); trigger onLocalAtualizado (patrimonio.ts:380). UI ausente. Padrão reutilizável: `frontend/src/components/materias/ListaMaterias.tsx` (5 estados incl. `snapshot.metadata.fromCache`) e `NovaMateriaModal.tsx` (CRIAR/EDITAR, already-exists via `.includes`, a11y).

INCREMENTOS:
INC1 `frontend/src/lib/intencaoOperacao.ts` (após L221): adicionar `CamposIntencaoLocal` (predio, andar, sala, idLocal?), `chaveIntencaoLocal`, `assinaturaIntencaoLocal` no padrão de `assinaturaIntencaoTurma` (L37) e `obterIntencaoPersistida` (L140).
INC2 novo `frontend/src/components/patrimonio/NovaLocalModal.tsx`: campos predio(maxLength=30)/andar(maxLength=10, texto livre)/sala(maxLength=30); `trim()` e rejeitar vazios no cliente; M7 via `obterIntencaoPersistida`; callable `gerenciarLocal` com acao CRIAR/EDITAR; mapear `err.code.includes("already-exists")` para erro de unicidade no campo; callback `onSucesso(id)`; a11y (role=dialog, aria-modal, foco inicial, Escape, aria-describedby); data-testids modal-local/input-predio/input-andar/input-sala/btn-salvar-local/erro-campo-local.
INC3 novo `frontend/src/components/patrimonio/ListaLocais.tsx`: onSnapshot `collection(db,"Local")` orderBy("predio"); 5 estados (loading/permissionDenied/error/stale via metadata.fromCache/empty); modos listagem|selecao; data-testids lista-locais/btn-novo-local/local-item-{id}/btn-editar-local-{id}.
INC4 integrar em `frontend/src/app/patrimonio/page.tsx` (gestão de Locais visível a `hasManagementAccess` = isChefe || isGestorPatrimonio, L41; ProtectedRoute já inclui ambos, L90) e em `frontend/src/components/patrimonio/ModaisPatrimonio.tsx` (`ModalNovoBem`: seleção de Local via ListaLocais modo selecao; `NovaLocalModal` como etapa interna/suspende o form; `onSucesso(id)` seleciona o local no formulário de origem).
INC5 novo `frontend/e2e/specs/20-locais.spec.ts` LOCAL-E2E-001..006: 001 Gestor cria (persistência, trim, maxLength, retorno de ID); 002 Chefe edita mantendo ID de documento; 003 duplicata normalizada → erro already-exists no campo; 004 5 estados da lista (carregando/vazio/erro/desatualizado); 005 criar via ModalNovoBem seleciona o local retornado; 006 Professor/Bolsista não acessam gestão. Seed: `gestor.patrimonial` (Gestor_Bens_Patrimoniais).
INC6 matriz L47 -> NÃO DIVERGENTE + `documentation/testes/sections/19-imp-base-002.tex` ATUALIZAR.
Regressão: `cd frontend && npx --no-install tsc --noEmit && npm run lint`; `cd frontend && npm run test:e2e -- e2e/specs/19-materias.spec.ts`; `cd functions && npm run test:emulator`.
Critério de conclusão: LOCAL-E2E-001..006 verdes; regressão verde; matriz L47 NÃO DIVERGENTE; backend/Rules/CUE/Alloy intocados; UI restrita a Gestor_Bens_Patrimoniais+Chefe_Geral.

EXECUÇÃO: iniciar direto em **q5 IMPLEMENT** (plano já aprovado por q3), delegando ao `lcqui-writer`, seguindo o DFA ampliado a partir do bloco de testes.

## Papéis (prompt + permissão fixos)

| Papel | Permissão | Modelo padrão |
|---|---|---|
| `lcqui-writer` | ÚNICO que edita | `glm-5.1` |
| `repo-explorer` | somente leitura | `qwq-plus` |
| `normative-auditor` | somente leitura | `glm-5.1` |
| `implementation-auditor` | somente leitura | `glm-5.1` |
| `test-specialist` | somente leitura | `qwq-plus` |
| `test-creator` | ÚNICO que cria/edita testes (somente arquivos de teste) | `qwen3.8-flash` |
| `test-auditor` | somente leitura (audita testes) | `qwen3.8-flash` |
| `test-corrector` | edita apenas testes reprovados | `glm-5.1` |
| `test-executor` | somente leitura (executa testes) | `glm-5.1` |
| `visual-auditor` | somente leitura; só com screenshot/imagem | `qvq-max` |

## Fluxo por fatia

```text
q0 SELECT -> q1 AUDIT_SELECTION -> (REPROVADO -> q0)
q1 APROVADO -> q2 PLAN -> q3 AUDIT_PLAN -> (REPROVADO -> q4 CORRECT_PLAN -> q3)
q3 APROVADO -> q5 IMPLEMENT -> q6 VERIFY -> (FALHA -> q5)
q6 OK -> q7 CREATE_TESTS -> q7a AUDIT_TESTS -> (REPROVADO -> q7b CORRECT_TESTS -> q7a)
q7a APROVADO -> q7c EXECUTE_TESTS -> (VERDE -> q8; FALHA produção -> q5; FALHA teste -> q7b)
q8 ADVANCE -> q0
```

Cada estado recebe um HANDOFF ESTRUTURADO do anterior e deve VERIFICAR materialmente as afirmações antes de agir (não começar do zero). Toda delegação: ≤ 5 min, LSP obrigatório, escopo restrito/fail-closed.

Derivação interna do writer:

```text
contrato → teste RED → backend/Rules → GREEN → teste E2E RED → frontend → E2E GREEN → regressão → docs → commit
```

## Regras duras

- **Não alterar** contratos CUE/Alloy, `main.tex`, tag formal nem arquivos gerados para acomodar código.
- **Não usar** `any`, bypass de validação, grants amplos ou mock de autorização.
- **Emuladores**: um único dono; nunca rodar suites que compartilham banco em paralelo.
- **Não integrar/publicar** branch sem autorização explícita do usuário.
- Preferir **evidência concreta** (Git, testes, Rules, contratos) a suposições.
- Em `AccessDenied`/quota, trocar de modelo imediatamente — não parar a sessão.
- **Sempre verificar se o writer de fato alterou os arquivos** antes de considerar a tarefa concluída.

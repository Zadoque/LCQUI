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

## Hierarquia normativa (não inverter)

1. decisão humana explícita → 2. `documentation/main.tex` e seções → 3. `specification/cue/**` e `specification/alloy/**` → 4. `documentation/worklogs/formal-spec/**` (M0–M13) → 5. `documentation/MATRIZ_IMPLEMENTACAO_LCQUI.md` → 6. implementação/testes.

UNSAT formal NÃO equivale a teste. Implementação não sobrescreve a norma. Se duas fontes normativas correntes forem realmente incompatíveis, pare e relate o conflito com referências exatas.

## Estado atual

- Branch `dev` sincronizado com `origin/dev` (tudo publicado).
- Matriz (70 features): **26 NÃO DIVERGENTE / 34 DIVERGENTE / 10 NÃO IMPLEMENTADO** (atualizada no arquivo).
- Features NÃO DIVERGENTE (atuais): `IMP-ACAD-001`..`004`, `IMP-POST-001`..`004`, `IMP-ROT-001`..`005`, `IMP-NOTIF-001`..`003`, `IMP-RULES-001`..`004`, `IMP-INDEX-001`, `IMP-AUTH-001`..`004`.
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

## Próximas fatias priorizadas

1. `IMP-ROLE-004` (fechar): migrar `professores/page.tsx`, `ProfessorModais.tsx`, `ModaisAcademico.tsx` para o callable `buscarProfessores`; flip da Rule `Professor` (`read`->`get`); remover `alert()` nativo em `alunos/page.tsx`; E2E por papel.
2. `IMP-UI-004`: cache/offline (UI-13) + deep links de `entidade_alvo` sem tela.
3. `IMP-NOTIF-004/005`: jobs M8/Seção 10.7 (`ESCASSEZ_ESTOQUE`, `FRASCOS_VENCIDOS`, `DATA_DEVOLUCAO_REAGENTE`, `ENTREGA_ATRASADA`) e `AUTO_ATENDIMENTO_RETIRADA` (Q14).
4. `IMP-ACAD-005` (lacuna de canal GLOBAL), `IMP-BASE-001/002/003` (UI-03), `IMP-ROLE-001/002/003`.
5. Ondas de patrimônio (`IMP-PAT-001..005`) e laboratório (M1–M8, relatórios, etiquetas, UI-001..003).

## Papéis (prompt + permissão fixos)

| Papel | Permissão | Modelo padrão |
|---|---|---|
| `lcqui-writer` | ÚNICO que edita | `glm-5.1` |
| `repo-explorer` | somente leitura | `qwq-plus` |
| `normative-auditor` | somente leitura | `glm-5.1` |
| `implementation-auditor` | somente leitura | `glm-5.1` |
| `test-specialist` | somente leitura | `qwq-plus` |
| `visual-auditor` | somente leitura; só com screenshot/imagem | `qvq-max` |

## Fluxo por fatia

```text
explorar
→ auditar (normativo + implementação, em paralelo)
→ writer (incrementos ≤ 5 min, cada um com escopo explícito)
→ verificar materialização (git diff, leitura do arquivo) — NÃO confiar no retorno do modelo
→ revisão independente + testes
→ atualizar matriz
→ commit
→ merge FF em dev
```

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

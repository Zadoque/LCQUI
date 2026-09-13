# Dúvidas Pendentes LCQUI

Criação: 13/09/2026. Atualização: 13/09/2026 (resolução formal de todas as pendências).

> **TODAS AS PENDÊNCIAS FORAM RESOLVIDAS.**
> As decisões estão registradas em `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7 e as alterações LaTeX correspondentes em `PLANO_ATUALIZACAO_TEX_LCQUI.md` (Prioridade 3, itens desbloqueados).
> Este arquivo é mantido como registro histórico.

---

## Bloco A — Química e Almoxarifado

### DP-A01 — Posicionamento de `estado_fisico` e `eh_higroscopico`

> **RESOLVIDA** — Ver `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7.1 e Plano P3-02, P3-03.

**Decisão**: Opção 2 — Mover `estado_fisico` e `eh_higroscopico` para `Resumo_Reagente`.
**Justificativa técnica**: Em CNTP (25 °C, 1 atm), substâncias em estados físicos distintos são produtos químicos distintos (ex.: NaOH sólido ≠ Solução aquosa de NaOH, que são resumos do tipo `MISTURA`). `eh_higroscopico` é propriedade intrínseca da espécie química, comum a todas as especificações de pureza do mesmo composto. A unidade operacional de catálogo fica derivada diretamente do resumo: `g` se `SOLIDO`, `ml` se `LIQUIDO`.
**Impacto no Firestore**: Elimina array `estados_fisicos: []` e queries `array-contains`. Consultas usam igualdade escalar: `.where("estado_fisico", "==", "SOLIDO")`.
**Seções afetadas**: 4.16, 4.18, 5.2, 5.9.1. Itens AUD-19 e AUD-20 → `PLANEJADO`.

---

### DP-A02 — Custo de leitura de `eh_higroscopico` na devolução (Q06)

> **RESOLVIDA** — Ver `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7.2 e Plano P3-07 (novo).

**Decisão**: Opção 2 — Denormalizar snapshot `eh_higroscopico: boolean` em `Frasco_Reagente`.
**Justificativa técnica**: No momento do cadastro do frasco, o valor de `Resumo_Reagente.eh_higroscopico` é copiado como campo imutável para `Frasco_Reagente/{id}`. A Cloud Function `registrarDevolucao` lê apenas o frasco, obtendo a tolerância híbrida com **zero leituras adicionais**. Imutabilidade garantida por validação no servidor: campo recusado em updates do cliente.
**Seções afetadas**: 5.9.1, 10.2.2. A cópia é exclusiva do Firestore; fonte canônica 3FN no Resumo_Reagente. Alterações da fonte não reescrevem snapshots históricos. AUD-17 → `PLANEJADO`.

---

### DP-A03 — Constraint de faixa em `Composicao_Reagente` (Q03)

> **RESOLVIDA** — Ver `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7.3 e Plano P3-01 (desbloqueado).

**Decisão**: Opção 1 — Constraint formal declarativa no modelo 3FN.
**Regra técnica**:
```sql
CHECK (valor_max IS NULL OR valor_min <= valor_max)
```
Concentrações pontuais: `valor_min == valor_max` ou `valor_max = NULL`. Faixas: `valor_min < valor_max`.
**Seções afetadas**: 4.17, 4.42.3. AUD-21 → `PLANEJADO`.

---

## Bloco B — Patrimônio

### DP-B01 — Soft-delete em `Bem_Patrimonial`

> **RESOLVIDA** — Ver `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7.4.

**Decisão**: Opção 1 — Não adicionar flag `ativo`; manter máquina de estados pura.
**Justificativa técnica**: O ciclo de vida patrimonial público da UENF é regido pelo status formal: `Ativo → Inservivel → Ja_dado_baixa`. Uma flag `ativo` avulsa criaria redundância e ambiguidade semântica com o status formal. Seção 4.6 permanece sem alterações.
**Seções afetadas**: Nenhuma alteração no LaTeX. AUD-28 → `DECISAO_RESOLVIDA`.

---

### DP-B02 — Foto obrigatória na requisição de adição de bem

> **RESOLVIDA** — Ver `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7.5 e Plano P3-05 (desbloqueado).

**Decisão**: Opção 1 — Foto estritamente obrigatória na submissão pelo professor.
**Justificativa técnica**: O solicitante necessita estar diante do equipamento para levantar plaqueta e conservação; foto sem presença é impossível, então exigir na submissão elimina retrabalho e dependência de vistorias presenciais do gestor.
**Ajuste de schema**: `photo_url_proposta TEXT NOT NULL` em `Requisicao_Adicao_Bem_Patrimonial` (Seção 4.11). Remove fallback `"https://placeholder"` na Seção 10.2.5.
**Seções afetadas**: 4.11, 10.2.5. AUD-25 → `PLANEJADO`.

---

## Bloco C — Acadêmico, Turmas e Roteiros

### DP-C01 — Aluno puro + Gestor_Almoxarifado: combinação permitida?

> **RESOLVIDA** — Ver `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7.6 e Plano P3-06 (desbloqueado).

**Decisão**: Opção 1 — Aluno puro (sem Bolsista) **PODE** exercer Gestor_Almoxarifado.
**Justificativa técnica**: A segregação de funções (SoD) visa impedir que o pesquisador/retirante gerencie o próprio estoque. Alunos regulares de graduação não têm permissão para retirar reagentes; portanto, não há conflito de interesse. A restrição mútua permanece estrita apenas para o conjunto **Aluno + Bolsista + Gestor_Almoxarifado**.
**Regra resultante**: `Bolsista` e `Gestor_Almoxarifado` são mutuamente exclusivos; `Aluno` (sem `Bolsista`) e `Gestor_Almoxarifado` são compatíveis.
**Seções afetadas**: 3.6 (harmonização), 7.4 (matriz). AUD-33 → `PLANEJADO`.

---

### DP-C02 — Visibilidade de comentários moderados

> **RESOLVIDA** — Ver `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7.7 e Plano P3-08 (novo).

**Decisão**: Opção 1 — O autor vê seu próprio texto com marcação de moderação; demais alunos veem aviso institucional.
**Regra técnica**:
- Para o **autor**: exibe texto original com tarja `"Comentário moderado pelo docente: [motivo_moderacao]"`.
- Para **colegas (Aluno/Bolsista, exceto o autor)**: substitui o texto por `"Comentário ocultado pela moderação da turma"`.
- Para **Professor e Chefe_Geral**: exibe texto original e histórico completo para auditoria.
- **Bolsista** segue a mesma visibilidade de Aluno (não tem visibilidade ampliada de moderação).

**Seções afetadas**: 8.8.11 (UI-11), 11.1 (Security Rules). AUD-31 → `PLANEJADO`.

---

### DP-C03 — Invalidação e renovação de token de convite (Q02)

> **RESOLVIDA** — Ver `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7.8 e Plano P1-05 (desbloqueado).

**Decisão**: Opção 1 — Substituição in-place no documento determinístico.
**Regra técnica**: Chave determinística `convite_${HMAC_SHA256(segredoServidor, contextoTurmaGlobalEmailNormalizado)}`. O reenvio executa update atômico sobrescrevendo `token_hash`, recalculando `expira_em = now() + 7 dias` e gravando `ultimo_reenvio_por`. Link antigo é revogado imediatamente; sem duplicação de documentos. Campo `revogado_em` não é necessário (a substituição in-place já serve como revogação implícita).
**Seções afetadas**: 4.35, 5.9.1, 8.8.10. AUD-32 → `PLANEJADO`.

---

## Bloco D — Governança, Multi-Role e Infra

### DP-D01 — Custo de verificação de `Usuarios/{uid}.ativo`

> **RESOLVIDA** — Ver `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7.9 e Plano P3-09 (novo).

**Decisão**: Opção 2 — Validação pontual apenas em mutações de alto impacto.
**Regra técnica**:
- **Confiam no token JWT** (latência máxima 1h de revogação): leituras de catálogo, feeds de turma, listagem de posts e comentários.
- **Leem `Usuarios/{uid}.ativo` obrigatoriamente** (zero tolerância de revogação): empréstimos de reagentes, devoluções, baixas patrimoniais, aprovação/rejeição de requisições e concessão/revogação de papéis.

**Seções afetadas**: 10.2.1 (`validarPermissao` — adicionar parâmetro `requerAtivo`). AUD-38, AUD-05 → `PLANEJADO`.

---

### DP-D02 — Política de retenção de dados de auditoria

> **RESOLVIDA** — Ver `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §7.10.

**Decisão**: Opção 1 — Retenção indefinida para a V1.
**Justificativa técnica**: Política conservadora de rastreabilidade do LCQUI/UENF, sujeita à futura política arquivística/LGPD institucional, sem atribuição de exigência normativa específica, impede expurgo automático. `Registro_de_Auditoria` e `Historico_Frasco_Reagente` nunca são excluídos por rotina automatizada. Notificações expiradas são marcadas com `expirada = true` mas o documento é preservado.
**Seções afetadas**: RF25 e Seção 4.41 ratificados sem alteração. AUD não associado — item de política registrado.

---

## Registro de resolução

| ID | Bloco | Decisão adotada | Plano LaTeX | Status AUD associado |
|---|---|---|---|---|
| DP-A01 | A | Opção 2 — `estado_fisico`/`eh_higroscopico` em `Resumo_Reagente` | P3-02, P3-03 desbloqueados | AUD-19, AUD-20 → PLANEJADO |
| DP-A02 | A | Opção 2 — Snapshot `eh_higroscopico` em `Frasco_Reagente` | P3-07 criado | AUD-17 → PLANEJADO |
| DP-A03 | A | Opção 1 — Constraint `CHECK` formal no modelo 3FN | P3-01 desbloqueado | AUD-21 → PLANEJADO |
| DP-B01 | B | Opção 1 — Máquina de estados pura, sem flag `ativo` | Nenhuma (P3-04 cancelado) | AUD-28 → DECISAO_RESOLVIDA |
| DP-B02 | B | Opção 1 — Foto NOT NULL na submissão do professor | P3-05 desbloqueado | AUD-25 → PLANEJADO |
| DP-C01 | C | Opção 1 — Aluno puro + Gestor_Almoxarifado compatíveis | P3-06 desbloqueado | AUD-33 → PLANEJADO |
| DP-C02 | C | Opção 1 — Autor vê texto moderado; colegas veem aviso | P3-08 criado | AUD-31 → PLANEJADO |
| DP-C03 | C | Opção 1 — Substituição in-place, sem `revogado_em` | P1-05 desbloqueado | AUD-32 → PLANEJADO |
| DP-D01 | D | Opção 2 — `ativo` apenas em mutações de alto impacto | P3-09 criado | AUD-38, AUD-05 → PLANEJADO |
| DP-D02 | D | Opção 1 — Retenção indefinida V1 | Nenhuma (RF25 ratificado) | — |

Precisão de implementação: token de convite usa CSPRNG de 32 bytes, somente SHA-256 persistido e comparação em tempo constante; HMAC do identificador não anonimiza PII. DP-D01 aceita risco residual de token ainda válido em mutações sem requerAtivo=true. DP-A02 é denormalização exclusiva Firestore: Resumo_Reagente permanece fonte 3FN, e mudanças futuras não reescrevem snapshots existentes.

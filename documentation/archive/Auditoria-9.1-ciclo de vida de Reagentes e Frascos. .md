# AUDITORIA 9.1 — Ciclo de Vida de Reagentes e Frascos
### Status: **IMPLEMENTADA E HOMOLOGADA** · 2026-09-20

---

## Sumário Executivo

A Auditoria 9.1 planejou e executou a correção de **10 defeitos metrológicos, lógicos e estruturais** no documento `main.pdf` do projeto LCQUI, distribuídos em 5 seções LaTeX e 2 funções TypeScript críticas.

**Resultado final:** `formal-check` exit 0 · 243 páginas · 9 commits atômicos aplicados na branch `feat/formal-spec-cue-alloy`.

---

## Mapeamento de Problemas → Correções

| ID | Problema | Seção/Função | Status |
|---|---|---|---|
| **MET-01** | Esgotamento não atualizava tara real (`peso_frasco_vazio` ficava com valor de fabricante) | Sec 4 Q06, Sec 7 §7.2.14, `registrarDevolucao` | ✅ CORRIGIDO |
| **MET-02** | Ganho anômalo abortava via rollback, deixando frasco sob custódia nominal do usuário | Sec 4 Q06, Sec 4.43.5, Sec 7 §7.2.14, `registrarDevolucao` | ✅ CORRIGIDO |
| **MET-03** | Evento `ganho_massa_higroscopia` podia ser emitido para frascos não-higroscópicos | `registrarDevolucao` | ✅ CORRIGIDO |
| **MET-04** | `conteudoNominal` opcional na interface e no cálculo; erro de sólido mencionava "densidade" | `cadastrarFrascoFechado`, Sec 7 §7.3 | ✅ CORRIGIDO |
| **MET-05** | Descarte institucional bloqueado para frascos vencidos com remanescente (`ABERTO`/`FECHADO`) | Sec 7 §7.2.20, `descartarFrasco` | ✅ CORRIGIDO |
| **MET-05b** | Descarte permitido mesmo com `disponibilidade = EMPRESTADO`, gerando empréstimo órfão | `descartarFrasco` | ✅ CORRIGIDO |
| **MET-06** | Reencontro podia retornar frasco como `DISPONIVEL`; validade pós-abertura não era recalculada | `registrarExtravioOuReencontro` | ✅ CORRIGIDO |
| **MET-07** | Enum `tipo` de `Historico_Frasco_Reagente` com 11 valores na Seção 5; código emitia 6 valores inexistentes | Sec 5 §5.9.1 | ✅ CORRIGIDO |
| **MET-08** | `gerarRelatorioAlmoxarifado` varria toda a coleção `Emprestimo_Reagente` (N+1); ponto cego D-0 | `gerarRelatorioAlmoxarifado` (Sec 10.2.7) | ✅ CORRIGIDO |
| **MET-09** | Dupla contagem possível ao somar `Resumo_Almoxarifado_Diario` e devoluções de D-0 | `gerarRelatorioAlmoxarifado` | ✅ CORRIGIDO |
| **MET-08b** | Campos `volume_evaporado_no_dia_ml` / `massa_evaporada_no_dia_g` ausentes no dicionário NoSQL | Sec 5 §5.9.1 (`Resumo_Almoxarifado_Diario`) | ✅ CORRIGIDO |

---

## Arquivos Modificados

| Arquivo | Mudanças |
|---|---|
| `Section-4-Modelagem-Entidades-SQL-3FN.tex` | Q06 completa; tabela invariantes 4.43.5 atualizada |
| `Section-5-Notas-de-Mapeamento-para-Firestore.tex` | Enum `tipo` 11→17 valores; campos de evaporação em `Resumo_Almoxarifado_Diario` |
| `Section-7-Requisitos-e-Regras-de-Negocio.tex` | §7.2.14 ganho anômalo sem rollback; §7.2.20 descarte de vencidos; §7.3 `conteudoNominal` obrigatório |
| `Section-10-Subsection-5-Fluxo-de-Reagentes.tex` | `cadastrarFrascoFechado`, `registrarDevolucao`, `registrarExtravioOuReencontro`, `descartarFrasco` |
| `Section-10-Subsection-9-Relatorios-em-PDF.tex` | `gerarRelatorioAlmoxarifado` D-1 + D-0 idempotente |

---

## Decisões Técnicas Consolidadas

| Decisão | Resolução |
|---|---|
| **Tara no esgotamento** | O sistema **deve** atualizar `peso_frasco_vazio` e `peso_atual` para o peso aferido na devolução, homologando a tara real e eliminando o resíduo metrológico. |
| **Alloy M0** | Manter o `pred coerente` para validação ativa de estados. **Não** adicionar `fact` global que tornaria as testemunhas tautológicas. |
| **Ganho anômalo** | Não abortar via rollback. Concluir em `DEVOLVIDO_COM_ANOMALIA` + `INDISPONIVEL` + `em_quarentena: true`. |
| **Recalibração parcial** | `recalibrarTaraParcial = true` com `novoPesoVazioEstimado` e `motivoRecalibracao` desbloqueiam frasco não-vazio com tara danificada, sem gerar falso positivo. |
| **Relatórios D-1/D-0** | Limite superior da query materializada restrito a `dataLimiteResumo < hojeISO`; D-0 exclusivamente via `Emprestimo_Reagente` em tempo real. |

---

## Commits Aplicados

| Hash | Descrição |
|---|---|
| `a8bc3d29` | docs(sec4): Q06 — ganho anômalo via quarentena, tara real, recalibração parcial (MET-01/02/04) |
| `4638c951` | docs(sec7): 7.2.14, 7.2.20 descarte vencidos + trava EMPRESTADO; 7.3 matriz (MET-02/04/05) |
| `48063c0c` | docs(sec10.5): `registrarDevolucao`, `registrarExtravioOuReencontro`, `descartarFrasco` (MET-01…06) |
| `93aacaba` | docs(sec10.9): `gerarRelatorioAlmoxarifado` D-1 + D-0 idempotente (MET-08/09) |
| `fc12417b` | docs(pdf): main.pdf 1ª compilação pós-Auditoria 9.1 (243 p) |
| `f8b8897f` | docs(sec10.5): `cadastrarFrascoFechado` — `conteudoNominal` obrigatório + erros corrigidos (MET-04) |
| `de1dffba` | docs(sec5): enum `tipo` 17 valores + campos evaporação `Resumo_Almoxarifado_Diario` (MET-07/08) |
| `c993137d` | docs(sec4): invariante 4.43.5 — célula Devolução sem texto residual (MET-02) |
| `8d92cbe3` | docs(pdf): main.pdf final — 243 p, 1.295.342 bytes, exit 0 |

---

## Validação Final

```
formal-check: exit 0
  ✓ cargo fmt --check
  ✓ cargo test: 4 testes Rust (ok)
  ✓ cargo clippy: 0 warnings
  ✓ alloy-check: PASS
  ✓ latexmk: 243 páginas, 0 erros LaTeX
  ✓ git diff --exit-code documentation/generated/ (limpo)
  ✓ git diff --check (limpo)
```

# Contract Cards — Lote 3A (Vocabulário e Modelo Canônico)

Este documento atende à regra obrigatória da Fase 3 de produzir "fichas contendo invariantes e definições antes de editar qualquer `.tex`".

---

## 1. PDF-012: `Lote` sem `id_resumo_reagente`

| Campo | Definição |
|---|---|
| **ID** | PDF-012 |
| **Invariante principal** | Todo Lote pertence estruturalmente a uma Especificação, que pertence a um Resumo. Para consultas transversais e limites de negócio, o `id_resumo_reagente` deve constar fisicamente no documento de Lote como projeção imutável. |
| **Fonte normativa** | Modelo Lógico 3FN e regras de desnormalização controlada Firestore. |
| **Entidades envolvidas** | `Lote`, `Resumo_Reagente`. |
| **Coleções/documentos Firestore** | Coleção raiz `Lote`. |
| **Normalização/canonicalização** | O campo `id_resumo_reagente` é uma projeção idêntica ao ID do documento de Resumo correspondente. |
| **Estado persistido** | `id_resumo_reagente` torna-se `NOT NULL` (SQL) e `string; O` (Firestore). |
| **Auditoria/histórico** | N/A (Alteração estrutural retroativa). |
| **Migração/backfill** | **Requerido.** Um script de backfill precisará ler o `id_especificacao_reagente` de cada lote legado, buscar a especificação, extrair o pai (Resumo) e gravar no lote. |
| **Critério de aceite** | O campo consta formalmente nas Seções 4 e 5. A necessidade de backfill está declarada. |

---

## 2. EXTRA-001: Caminho físico de `Especificacoes`

| Campo | Definição |
|---|---|
| **ID** | EXTRA-001 |
| **Invariante principal** | Especificações são documentos dependentes de Resumo. O caminho físico oficial é `Resumo_Reagente/{resumoId}/Especificacoes/{specId}`. Jamais uma coleção raiz. |
| **Fonte normativa** | Decisões consolidadas de modelagem física e ACL (subcoleções encapsulam acesso). |
| **Entidades envolvidas** | `Especificacao_Reagente`. |
| **Coleções/documentos Firestore** | Subcoleção `Especificacoes` sob `Resumo_Reagente`. |
| **Auditoria/histórico** | N/A (apenas adequação de path). |
| **Migração/backfill** | N/A se a base legada já usa subcoleção; se usava coleção raiz, migração de dados é exigida. (A especificação focará no schema novo/corrigido). |
| **Critério de aceite** | O dicionário físico (Seção 5) e as Security Rules (Seção 11) usam `Resumo_Reagente/{resumoId}/Especificacoes/{specId}`. Nenhuma ocorrência solta referindo-se a coleção raiz ativa. |

---

## 3. PDF-022: Natureza Química

| Campo | Definição |
|---|---|
| **ID** | PDF-022 |
| **Estado no HEAD** | `JA_CONSOLIDADO` |
| **Invariante principal** | A natureza química de um reagente é uma classificação curada do item do catálogo, independente da UI. Valores canônicos são finitos: `ORGANICO`, `INORGANICO`, `ELEMENTO`, `HIBRIDO`. |
| **Fonte normativa** | Seção 4 (Entidade Resumo_Reagente) e Seção 5 (Dicionário Firestore). |
| **Critério de aceite** | A documentação atual já diferencia o valor persistido (`HIBRIDO`) do rótulo na UI (ex: Biológico, Complexo), e não mistura isso com Estado Físico. Validado transversalmente sem necessidade de edição. |

---

## 4. PDF-024: Typo em `qtd_frascos_adicionados`

| Campo | Definição |
|---|---|
| **ID** | PDF-024 |
| **Estado no HEAD** | `JA_CONSOLIDADO` |
| **Invariante principal** | O nome do campo de materialização é `qtd_frascos_adicionados`, sem espaços ou underlines espúrios. |
| **Critério de aceite** | Busca transversal (`grep`) atesta que a grafia atual nos `.tex` é uniforme e correta (ex: Seção 6 de materializações usa `qtd_frascos_adicionados`). |

---

## 5. EXTRA-003: `estado_fisico = GASOSO`

| Campo | Definição |
|---|---|
| **ID** | EXTRA-003 |
| **Estado no HEAD** | `JA_CONSOLIDADO` |
| **Invariante principal** | Reagentes gasosos estão fora do escopo do Almoxarifado no DP-A01. O enum `estado_fisico` no `Resumo_Reagente` permite apenas `SOLIDO` e `LIQUIDO`. |
| **Fonte normativa** | DP-A01 e Seção 12 (Implementações em Estudo). |
| **Critério de aceite** | O valor `GASOSO` foi formalmente expurgado da Seção 4, sendo detalhadamente explicado na Seção 12 que gases exigem modelo físico próprio (pressão e $PV=nRT$), impedindo a sua reintrodução acidental. Validado transversalmente. |

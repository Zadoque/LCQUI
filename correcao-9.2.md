# Correção da Auditoria 9.2 — Ciclo de Vida de Reagentes e Frascos

## Escopo da verificação

Este documento registra as falhas encontradas na **Auditoria 9.2** após conferência item a item contra o estado documental vigente:

- `documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex`
- `documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex`
- `documentation/Section-6-Materialized-Views.tex`
- `documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex`
- `documentation/Section-8-Descricao-das-telas-Dashboards.tex`
- `documentation/Section-9-Exemplos-de-fluxos.tex`
- `documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/*.tex`
- `documentation/Formal-Spec-M0.tex` e `documentation/generated/invariants/retirar_frasco.tex`
- `specification/alloy/reagents/withdrawal.als`

Os **diagnósticos** da Auditoria 9.2 (resíduos deixados pela 9.1) em geral procedem. As falhas estão concentradas nas **correções propostas**, que em vários itens contradizem a própria fundamentação normativa citada. Como há falhas, as mudanças **não** foram aplicadas aos `.tex`.

Resumo:

| Item | Diagnóstico | Correção proposta | Situação |
|---|---|---|---|
| MET-01 | Procede | **Incorreta** (contradiz Q06/7.2.14) | Corrigir |
| MET-02 | Procede | Procede | — |
| MET-03 | Procede | Incompleta (só o item 1) | Complementar |
| MET-04 | Procede | **Incorreta** (ignora `abertura_historica_desconhecida`) | Corrigir |
| MET-05 | Procede | Procede | — |
| MET-06 | Procede | Procede | — |
| MET-07 | Procede | **Incorreta** (classifica mal `DISPONIVEL`) | Corrigir |
| MET-08 | Procede | **Incorreta/Incompleta** (campo não modelado; definição da métrica) | Corrigir |
| MET-09 | **Não procede** (invariante já existe) | **Incorreta** e com caminhos de arquivo errados | Descartar |
| MET-10 | Procede | Procede | — |

---

## MET-01 — Conservação de massa no esgotamento

**O que a auditoria propõe (correção):**

```typescript
if (esgotado) {
  pesoConsumido = Math.max(0, emprestimo.peso_saida - dados.pesoRetorno - perdaEvaporacao);
}
```

**Por que está errado.**

1. A fundamentação normativa da própria auditoria manda o contrário. Em **seção-4-subsection-4.44** (Regra Q06), consta literalmente:

   > "Massa consumida = $\max(0, peso_{saida}-peso_{retorno})$ em g."
   >
   > "Retorno abaixo da tara (...): nesse caso a massa consumida é **todo o saldo restante**, $\max(0, peso_{saida}-peso_{vazio})$."

   Em **seção-7-subsection-7.2.14** (item 4), a fórmula canônica é:

   > $Volume_{utilizado} = \dfrac{\max(0, Peso_{saida} - Peso_{retorno})}{Densidade}$ (líquidos).

   Nenhuma das duas fontes subtrai perda por evaporação do consumo.

2. A própria decisão textual da auditoria diz o oposto do código que ela propõe:

   > "a massa consumida registrada no empréstimo é $P_{saida} - P_{retorno}$".

   Logo o item se autocontradiz: o texto manda $P_{saida}-P_{retorno}$ e o código proposto manda $P_{saida}-P_{retorno}-perdaEvaporacao$.

3. No cenário de esgotamento, subtrair `perdaEvaporacao` deixa um resíduo fantasma de reagente, contrariando "a massa consumida é **todo o saldo restante**" (seção-4-subsection-4.44). Após homologar `peso_frasco_vazio = peso_retorno`, o consumo tem de ser exatamente $peso_{saida}-peso_{retorno}$.

**Correção adequada** (mantém a intenção de eliminar a tara antiga, sem violar Q06):

```typescript
if (esgotado) pesoConsumido = Math.max(0, emprestimo.peso_saida - dados.pesoRetorno);
```

Observação: a fórmula-base atual em `Section-10-Subsection-5-Fluxo-de-Reagentes.tex` (linha 579) já subtrai `perdaEvaporacao`. Isso é uma divergência pré-existente entre o código e **seção-4-subsection-4.44** / **seção-7-subsection-7.2.14**; a Auditoria 9.2 deveria reconciliá-la explicitamente, e não propagá-la para o ramo de esgotamento.

---

## MET-04 — Dead code no reencontro pós-extravio

**O que a auditoria propõe (correção):**

```typescript
const eraFechadoAntes = frasco.data_abertura == null;
if (dados.estadoConstatadoAoReencontrar === "ABERTO" && eraFechadoAntes) {
  validadeCalculada = calcularValidadeEfetivaNaAbertura(frasco, agora);
  dataAberturaCalculada = DateTime.fromJSDate(agora, { zone: "America/Sao_Paulo" }).toISODate();
}
```

**Por que está errado.**

O modelo possui um campo dedicado a exatamente esse caso. Em **seção-4-subsection-4.21**, `Frasco_Reagente` tem `abertura_historica_desconhecida BOOLEAN DEFAULT FALSE, NOT NULL`. E o próprio cadastro de frasco aberto (`Section-10-Subsection-5-Fluxo-de-Reagentes.tex`, linha 280) grava `data_abertura: dados.aberturaHistoricaDesconhecida ? null : dados.dataAbertura`.

Portanto, um frasco **originalmente aberto com data de abertura desconhecida** tem `data_abertura == null` e `abertura_historica_desconhecida == true`. A condição `frasco.data_abertura == null` marcaria esse frasco como "era FECHADO antes", recalcularia a validade pós-abertura e **fabricaria a data de abertura como hoje** — o que é proibido por:

- **seção-8-subsection-8.8.6** (UI-06): "Data de abertura anterior desconhecida não deve ser fabricada como hoje (Q05)."
- **seção-7-subsection-7.6**: "Registrar `abertura_historica_desconhecida` quando a data anterior não for conhecida; nunca inventar a data."

**Correção adequada:**

```typescript
const eraFechadoAntes = frasco.data_abertura == null
  && frasco.abertura_historica_desconhecida !== true;
```

Erro secundário de referência: o item cita "Seção 7.2.20" como fonte da regra de reencontro. A regra de reencontro/quarentena está em **seção-9-subsection-9.7.28** (fluxo ALM-06); seção-7-subsection-7.2.20 trata de status/vencimento/descarte e não menciona reencontro. O item também cita "Seção 10.2.4 (Validação de Validade)"; a seção correta é **seção-10-subsection-10.6** ("Validação síncrona de validade no cadastro e na abertura").

---

## MET-07 — Emissão obrigatória de eventos no histórico

**O que a auditoria propõe (correção para `registrarAberturaFrasco`):**

```typescript
tipo: venceu ? (dados.destinoSeVencerNaAbertura === "QUARENTENA" ? "ENTROU_EM_QUARENTENA" : "PENDENTE_DE_DESCARTE") : "AJUSTE",
```

**Por que está errado.**

O destino pós-vencimento tem **três** valores, não dois. Em **seção-7-subsection-7.2.20**:

> "o gestor é obrigado a escolher um desses três destinos: `QUARENTENA`, `PENDENTE_DE_DESCARTE` ou `DISPONIVEL` com uso vencido explicitamente autorizado conforme Q04."

O ternário da auditoria mapeia tudo que não é `QUARENTENA` para `PENDENTE_DE_DESCARTE`. Assim, quando o destino for `DISPONIVEL` (uso vencido autorizado), o evento gravado será `PENDENTE_DE_DESCARTE`, **em vez do tipo correto `USO_VENCIDO_AUTORIZADO`**, que existe no enum de **seção-4-subsection-4.22** ("17 tipos de eventos").

**Correção adequada:**

```typescript
tipo: !venceu
  ? "AJUSTE"
  : dados.destinoSeVencerNaAbertura === "QUARENTENA"
    ? "ENTROU_EM_QUARENTENA"
    : dados.destinoSeVencerNaAbertura === "DISPONIVEL"
      ? "USO_VENCIDO_AUTORIZADO"
      : "PENDENTE_DE_DESCARTE",
```

---

## MET-08 — Segregação dimensional de evaporação nos relatórios D-0

**O que a auditoria propõe (correção):**

```typescript
if (d.unidade_medida_utilizada === "ml") {
  totalVolumeUsado += d.medida_utilizada || 0;
  const dens = d.densidade_aplicada || 1.0;
  totalVolumeEvaporado += (d.peso_perda_evaporacao || 0) / dens;
} else {
  totalMassaUsada += d.medida_utilizada || 0;
  totalMassaEvaporada += d.peso_perda_evaporacao || 0;
}
```

**Por que está errado/incompleto.**

1. O código depende de `densidade_aplicada`, mas esse campo **não existe no modelo relacional**:
   - **seção-4-subsection-4.23** (`Emprestimo_Reagente`) lista os campos da entidade e **não** inclui `densidade_aplicada`;
   - **seção-5-subsection-5.9.1** (dicionário físico) também não o define.
   - O campo só aparece em `Section-10-Subsection-5-Fluxo-de-Reagentes.tex` (linhas 513 e 575), ou seja, no código de exemplo, sem contrapartida no 3FN nem no mapeamento Firestore.
   A auditoria corrige o relatório sem incluir, no seu plano, a harmonização de **seção-4-subsection-4.23** e **seção-5-subsection-5.9.1** para declarar `densidade_aplicada`. Sem isso, a correção se apoia em dado não normatizado (e o default `|| 1.0` mascara silenciosamente a ausência, produzindo volume errado).

2. A definição documental da métrica não prevê a conversão por densidade. Em **seção-5-subsection-5.9.1**, `volume_evaporado_no_dia_ml` é descrito como "acumulada a partir dos campos `peso_perda_evaporacao` das devoluções com `unidade_medida_utilizada = ml`", sem menção a divisão por densidade. Se a métrica é dimensionalmente volume, a definição em **seção-5-subsection-5.9.1** (e a coluna correspondente em **seção-6-subsection-6.2**) precisa ser reescrita para explicitar a conversão; a auditoria só pede a harmonização da tabela 3FN, não a da definição semântica.

Portanto o item aponta um erro real no D-0, mas a correção proposta é incompleta: falha em modelar `densidade_aplicada` e em atualizar a definição da métrica.

---

## MET-09 — Fechamento do modelo formal Alloy M0

**O que a auditoria afirma (diagnóstico):**

> "A Auditoria 9.1 manteve a premissa de que o modelo Alloy não deveria conter restrições de consistência para permitir a geração de testemunhas. Com isso, o Alloy gerou uma testemunha válida contendo um frasco `EXTRAVIADO` marcado como `DISPONIVEL`."

**Por que está errado.**

O invariante já existe e a testemunha jamais admite `EXTRAVIADO + DISPONIVEL`. Em `specification/alloy/reagents/withdrawal.als`, o predicado `coerente` (linhas 17–21) já contém exatamente a restrição:

```alloy
all f: Frasco | (s.fisico[f] in VAZIO + QUEBRADO + DESCARTADO + EXTRAVIADO or f in s.quarentena)
                implies s.disponibilidade[f] = INDISPONIVEL
```

E a testemunha `IndisponivelNaoApto` (linhas 51–55) exige **`EXTRAVIADO` E `INDISPONIVEL`**:

```alloy
pred IndisponivelNaoApto {
  some s: Estado, f: Frasco |
    coerente[s] and s.fisico[f] = EXTRAVIADO and
    s.disponibilidade[f] = INDISPONIVEL and not filtroFisico[s,f]
}
```

O artefato gerado confirma: `documentation/generated/invariants/retirar_frasco.tex` lista `[WIT-DISPONIBILIDADE-001] IndisponivelNaoApto: SAT`. O SAT aqui é a **evidência de que a coerência de `INDISPONIVEL` se sustenta**, não de que existe frasco extraviado disponível. O worklog `documentation/worklogs/formal-spec/M0_INDISPONIVEL_VALIDATION.md` (linha 12) registra a mudança de `DisponivelNaoApto` para `IndisponivelNaoApto` justamente para "evidenciar que `INDISPONIVEL` (sendo coerente em estados inviabilizantes) impede a disponibilidade".

Além disso, a asserção proposta `InvarianteDisponibilidadeConsistente` é redundante: é a mesma condição já embutida em `coerente`, usada como pré-condição de `retirar` e como pós-condição verificada por `check Unicidade`. Acrescentá-la não fecha nada e parte de um diagnóstico falso.

Erros de caminho de arquivo no item:

- A auditoria manda editar `infra_m0.als`. Esse arquivo **não existe**; o modelo está em `specification/alloy/reagents/withdrawal.als`.
- O quadro-resumo aponta `Section-13-Camada-Formal-M0.tex`. Esse arquivo **não existe**; a seção formal M0 é o arquivo `documentation/Formal-Spec-M0.tex` (a 13ª seção do PDF), que consome `generated/entities/frasco_reagente.tex` e `generated/invariants/retirar_frasco.tex`.

Conclusão: o ITEM 9 deve ser descartado por completo.

---

## MET-03 — Dessincronização textual de sólidos fechados (observação)

O diagnóstico procede: em **seção-7-subsection-7.2.14**, item 1, a fórmula está redigida apenas como $Peso_{vazio} = Peso_{total} - (Volume_{nominal} \times Densidade)$, sem o caso sólido. A correção proposta, porém, cobre **apenas o item 1 (frasco fechado)**. Os itens 2 e 3 da mesma regra ("Frasco já Aberto — Opção A/B") continuam formulados exclusivamente em volume/densidade:

- item 2: $Volume_{atual} = \frac{Peso_{total} - Peso_{vazio}}{Densidade}$;
- item 3: $Peso_{vazio} = Peso_{total} - (Volume_{atual} \times Densidade)$.

Para sólidos abertos, o correto seria `Massa_atual = Peso_total - Peso_vazio` e `Peso_vazio = Peso_total - Massa_atual`, coerente com **seção-4-subsection-4.43.4** ("SOLIDO usa g") e com a bifurcação SÓLIDO/LÍQUIDO de `cadastrarFrascoAberto` em `Section-10-Subsection-5-Fluxo-de-Reagentes.tex` (linhas 244–263). A auditoria deveria estender a correção aos itens 2 e 3, não só ao item 1.

---

## Referências normativas usadas

- **seção-4-subsection-4.44** — Regras Q06, Q14 e Q04 (massa/consumo/tolerância; contrato de aceite).
- **seção-4-subsection-4.43.5** — Invariantes da máquina de estados (terminalidade de `DESCARTADO`, quarentena).
- **seção-4-subsection-4.43.4** — Regras químicas fechadas (unidade por estado físico; densidade).
- **seção-4-subsection-4.22** — Enum de 17 tipos de `Historico_Frasco_Reagente`.
- **seção-4-subsection-4.23** — Entidade `Emprestimo_Reagente`.
- **seção-4-subsection-4.21** — Entidade `Frasco_Reagente` (inclui `abertura_historica_desconhecida`).
- **seção-5-subsection-5.9.1** — Dicionário físico Firestore (métricas de evaporação e saldo desconhecido).
- **seção-6-subsection-6.2** — `Resumo_Almoxarifado_Diario` / separação massa vs. volume.
- **seção-7-subsection-7.2.14** — Cálculo de volume e peso (cadastro fechado/aberto; consumo).
- **seção-7-subsection-7.2.20** — Status, vencimento e descarte (três destinos).
- **seção-7-subsection-7.6** — Q04/Q14 e `abertura_historica_desconhecida`.
- **seção-8-subsection-8.8.6** — UI-06 (não fabricar data de abertura; saldo desconhecido).
- **seção-9-subsection-9.7.28** — Fluxo ALM-06 (extravio/reencontro/quarentena).
- **seção-10-subsection-10.6** — Validação síncrona de validade.
- **seção-13** (`Formal-Spec-M0.tex`) / `specification/alloy/reagents/withdrawal.als` — Camada formal M0.

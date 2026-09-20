# M2.0 — Reconciliação localizada do baseline

Estado: VALIDATED (recorte documental M2.0). Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada e baseline documental escolhido para M2:
`9df335bc977bfcf16668bca4baf5f9ed50c2da1a` (Auditoria 9.2).
Árvore de entrada limpa. Não houve reauditoria global.

## Proveniência e decisão

| Consumidor | Encontrado na entrada | Decisão M2.0 |
|---|---|---|
| Estado / worklogs históricos M0/M1 | `db29ea2f17dc785fb0b44ffb3aec16db29c45e94` | Preservar validação histórica |
| README | `10c86c001e35efc0c5338e581a89819a0ff59646` | Explicar separadamente histórico e entrada M2 |
| projection.cue / main.rs | `db29ea2f17dc785fb0b44ffb3aec16db29c45e94` | Não modificar neste checkpoint documental |
| Entrada documental M2 | HEAD real `9df335bc977bfcf16668bca4baf5f9ed50c2da1a` | Fixar fontes atuais das Seções 4/5 |

O commit `89b2897a` mudou apenas o README para `10c86c00` (commit de
arquivamento da Auditoria 7 e introdução da 8). Isso não atualizou o contrato
IR/Rust. Os consumidores não estavam semanticamente sincronizados: o mesmo
rótulo baseline descrevia épocas diferentes, e o modelo M0 recebeu alterações
posteriores sem mudar o hash global. Não interpretar esse hash isolado como
prova de equivalência de toda a documentação atual.

M1 foi fechado em `18d811aee11afc730960daa956af167e638b0ba9` usando o baseline
3B registrado em seu worklog. Esse worklog e os de M0 não foram reescritos.
A correção M0 posterior tem evidência própria em `M0_INDISPONIVEL_VALIDATION.md`.
M2 usará 9df335bc porque contém as correções até Auditoria 9.2; não se declara
que M0/M1 foram revalidados contra ele. A migração do hash corrente IR/Rust e
artefatos vinculados será um checkpoint explícito antes da exportação M2.

## Comparação normativa restrita ao frasco

Fontes atuais: Seção 4, linhas 329–396 (Lote/Frasco e explicação), Seção 5,
linhas 366–398 (dicionário Frasco). Comparação Git desde db29ea2f e consulta do
fechamento M1, sem leitura de PDF ou auditoria das Seções 1–12.

- `disponibilidade` passou de dois para três valores: inclui `INDISPONIVEL`.
  CUE/Alloy M0 já foram atualizados por `64754bf4` / `cc4f4c6d`. Preservar os
  comandos atuais BloqueioFisico, Unicidade, Testemunha e IndisponivelNaoApto.
- `saldo_desconhecido` foi acrescentado em `fb109ba9` (relacional) e
  `d00b38bb` (Firestore): boolean obrigatório, default de criação false;
  indica saldo não quantificado de frasco aberto, excluído dos totais aferidos
  e contado separadamente. M2 deve representar o campo sem implementar agregações.
- `abertura_historica_desconhecida` já constava no baseline 3B e no fechamento
  M1. True exige data_abertura null e estado coerente com abertura anterior.
  Não é novidade pós-M1; é informação ainda ausente da fatia formal M0.
- `id_resumo_reagente`, `id_especificacao_reagente` obrigatório projetado e
  `eh_higroscopico` snapshot imutável Firestore também já constavam no baseline.
  O snapshot vem de Resumo_Reagente, não se torna coluna relacional do frasco.
  DocIds/FKs string Firestore são distintos dos IDs inteiros relacionais.
- A explicação de conteudo_nominal apenas perdeu a referência ao nome antigo;
  null continua desconhecido, distinto de zero. Tipos NUMERIC(10,3) não recebem
  limites físicos positivos inventados.
- Correções adjacentes de devolução/Q06/tara/ganho anômalo (`a8bc3d29`,
  `c993137d`), densidade_aplicada em empréstimo (`fb109ba9`, `d00b38bb`) e
  evaporação/agregados/histórico (`de1dffba`, `d00b38bb`) não pertencem à
  estrutura do registro M2. Não transportar regras desses fluxos para Rust.
  As leituras desses diffs não constituem validação dos milestones posteriores.

## CONTRAEXEMPLO PÓS-M1 M2-IDENTIDADE-001

- Propriedade: uma única rota relacional de identidade química por frasco.
- Fonte: Seção 4, linha 377, Constraint de Identidade Química do Frasco.
- Estado: frasco com id_lote=1 e id_especificacao_reagente=20; lote 1 referencia
  especificação 10. Assume-se existência dessas linhas, não violação de FK.
- Constraint SQL atual: `IS NOT NULL OR IS NOT NULL` aceita o estado.
- Texto normativo: com lote, referência direta deve ser NULL; sem lote,
  referência direta é obrigatória. Rejeita o mesmo estado, mesmo que 10=20.
- Classificação: CONTRADICAO_REAL entre suficiência do CHECK apresentado e
  exclusividade exigida no texto. A divergência já existe em db29ea2f; o ID
  indica descoberta nesta rodada, não introdução após M1.
- Interpretação adotada: XOR na linha relacional M2. Firestore materializa
  referências e não se submete ao mesmo XOR estrutural.
- Nenhuma fonte normativa foi corrigida silenciosamente. Alloy ainda não
  executado: trata-se de contraexemplo documental por tabela-verdade, não SAT
  retornado por solver. M2.2 deverá verificar resolução efetiva única e obter
  testemunhas para ambas as rotas, sem pressupor a própria assertion.

| Lote presente | Especificação direta presente | CHECK OR | Texto XOR |
|---|---|---|---|
| false | false | rejeita | rejeita |
| false | true | aceita | aceita |
| true | false | aceita | aceita |
| true | true | aceita | rejeita |

Reprodução mínima (sem banco ou solver; IS NOT NULL produz boolean não nulo):

```sh
node --input-type=module -e 'import assert from "node:assert/strict"; const cases = [[false,false,false,false],[false,true,true,true],[true,false,true,true],[true,true,true,false]]; for (const [l,e,sql,text] of cases) { assert.equal(l || e, sql); assert.equal(l !== e, text); } console.log("M2-IDENTIDADE-001: 4 casos PASS");'
```

## Validação e continuidade

Gates executados PASS: tabela-verdade acima (4 casos), `git diff --check`, diff vazio para
artefatos formais/generated, aplicação e fontes normativas contra 9df335bc.
CUE/Alloy/Rust/PDF não foram executados neste checkpoint exclusivamente documental.
Arquivos alterados: estado, README, knowledge/FORMAL_SPEC_ARCHITECTURE.md e
este worklog. Próxima unidade: M2.1, conforme passos exatos no estado.
Commit: `chore(spec): reconcile M2 baseline after documentation audits`;
resolver SHA por `git log -1 --format=%H --grep='reconcile M2 baseline'`.
Push será tentado após commit na mesma branch; verificar referência remota.

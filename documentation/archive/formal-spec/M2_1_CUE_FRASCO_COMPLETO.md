# M2.1 — Frasco relacional completo em CUE

Estado: VALIDATED, somente estrutura local CUE; M2 completo não validado.
Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `0ee6c0ce5c688359cbf88a10f64c7403df662413`, árvore limpa.
Baseline M2: `9df335bc977bfcf16668bca4baf5f9ed50c2da1a`.
Fontes: Seção 4, Lote/Frasco (329–396); Seção 5, Frasco (366–398).
M2.0 não foi reaberto; M2-IDENTIDADE-001 permanece registrado, SQL intacto.

## Representação e autoridade

`domain/frasco_completo.cue` acrescenta `frascoCompletoCampos` e
`#FrascoCompleto`. Os 27 descritores coincidem em nomes e ordem com as 27
colunas SQL; comparação automatizada PASS. `#CampoFrasco`, em
`domain/campos_frasco.cue`, deriva #Valor e metadados da mesma definição.
Todos os campos usam presença obrigatória `!`, mesmo nullable; nenhum default
SQL é injetado. Defaults dos metadados do descritor não completam a linha.
`#Frasco` e `campos` M0 permanecem intactos; os dois enums M2 reutilizam seus
valores, conferidos nas fontes. Não são incluídos id_resumo_reagente nem
snapshot eh_higroscopico. A definição fechada rejeita colunas extras.

DATE e TIMESTAMP usam strings como **representação de intercâmbio/teste da
linha normalizada**, sem alterar seus tipos físicos SQL. DATE usa somente a
forma lexical YYYY-MM-DD descrita na Seção 5: não verifica dias existentes,
anos bissextos, ordem temporal ou limites do banco. TIMESTAMP é string, sem
regex ISO, timezone obrigatório ou verificação de relógio: essas garantias não
foram especificadas para este transporte no recorte. A fixture usa
`2026-09-20 10:00:00`, sem converter DATE em instante.

SERIAL/INTEGER são representados por int, sem inferir existência de FK,
sequenciamento, mínimo positivo ou limites de armazenamento do banco.
TEXT é string sem máximo ou padrão adicional. NUMERIC(10,3) usa intervalo
[-9999999.999, 9999999.999] e math.MultipleOf(0.001), seguindo a técnica M1;
representa valor já persistido, não arredondamento de entrada pelo SQL.
Não impõe positividade, relações entre pesos nem equivalência entre null e zero.

## Constraints locais implementadas

- Tipos, nulabilidade e presença explícita das 27 colunas da Seção 4.
- Enums físicos (6 valores) e disponibilidade (3, incluindo INDISPONIVEL).
- Identidade XOR: exatamente uma referência não nula, conforme decisão M2.0.
- Seção 5: validade_apos_aberto_dias é null ou inteiro estritamente positivo.
- Seção 5: abertura_historica_desconhecida=true implica data_abertura=null.
  Não força estado atual ABERTO: há fixture de histórico em EXTRAVIADO.

Deliberadamente adiados: existência global e resolução de FKs, unicidade do
código/PK, imutabilidade, coerência com empréstimos, transições físicas,
validades calculadas, autorização, agregados e Q06. saldo_desconhecido é boolean
obrigatório, sem inferir peso zero/null ou restringir o estado atual a partir
de frase operacional. validade_desconhecida, vencido e uso_vencido_autorizado
não recebem implicações adicionais. em_quarentena é boolean; a exigência de
motivo fica na auditoria das regras operacionais futuras (sem inferir conteúdo
ou suficiência de detalhe_status nesta unidade). Essa limitação é explícita:
aceitação pelo schema não significa aptidão nem conformidade operacional total.

CUE M2.1 verifica estrutura local; Alloy M2.2 tratará relações globais e
resolução da identidade. Nenhum Alloy foi implementado ou executado aqui.

## Fixtures e resultados

Grupo: `tests/frasco-completo`, validado explicitamente com `-d #FrascoCompleto`.

Válidas (5): rota_direta (nulls legítimos), rota_lote (prazo positivo e DATE),
abertura_historica (saldo_desconhecido true), historico_extraviado,
limites_numericos_zero (extremos com sinal, escala e zero legítimo).
A última é testemunha do domínio NUMERIC, não autorização física de pesos negativos.

| Inválida | Propriedade isolada / diagnóstico conferido |
|---|---|
| identidade_ausente | referência direta null quando lote null |
| identidade_dupla | referência direta preenchida quando lote presente |
| nullable_ausente | detalhe_local_armazenamento obrigatório ausente |
| nao_null | peso_atual null |
| estado_enum | estado_fisico_frasco fora do enum |
| disponibilidade_enum | disponibilidade fora do enum |
| prazo_zero | validade_apos_aberto_dias não positivo |
| abertura_historica_com_data | data_abertura preenchida com histórico desconhecido |
| escala_numerica | peso_atual 1.0001 não múltiplo de 0.001 |
| precisao_numerica | peso_atual 10000000 acima do máximo |
| data_formato | validade_fechado fora da forma YYYY-MM-DD |
| timestamp_tipo | cadastrado_em numérico em vez de string |
| saldo_ausente | saldo_desconhecido ausente; default false não injetado |
| projecao_firestore | eh_higroscopico não é coluna relacional |

Cada fixture inválida altera/remove apenas a propriedade indicada da base
rota_direta, exceto abertura_historica_com_data, que ativa a condição e viola
apenas sua consequência. Diagnósticos CUE conferidos para os 14 casos.
Teste adicional temporário: remover individualmente cada uma das 27 chaves de
rota_direta; 27/27 rejeitadas, com diagnóstico referindo a chave removida.

| Grupo | Válidas | Inválidas | Total |
|---|---:|---:|---:|
| M0 | 2 | 5 | 7 |
| M1 resumo | 3 | 11 | 14 |
| M1 especificação | 3 | 14 | 17 |
| M1 par | 2 | 2 | 4 |
| M1 total | 8 | 27 | 35 |
| M2.1 | 5 | 14 | 19 |
| Total sem duplicar subtotal M1 | 15 | 46 | 61 |

Contagens extraídas dos diretórios reais. `just spec-check`: PASS (exit 0),
incluindo vet do módulo, todas as 61 fixtures e gate cue fmt sem mutação.
`git diff --check`: PASS. Diff contra HEAD de entrada vazio para M0/M1,
Alloy, IR/projection, mapeamentos, Rust, build, generated, fontes SQL/Firestore,
LaTeX/PDF e aplicação. O wrapper mudou somente para acrescentar o grupo CUE.

## Problemas e reprodução

Primeira execução no sandbox falhou por spawnSync cue EPERM; repetição
escalonada permitiu o gate. Erro inicial de implementação: #Base declarado
somente dentro de condições não era resolvido lexicalmente em #Valor.
Corrigido declarando #Base no escopo do descritor e restringindo-o pelos tipos.
Não houve fixture aceita indevidamente nem discrepância de semântica CUE que
exigisse novo CUE-M2-XXX. Patch intermediário de alinhamento textual não encontrou
a linha, sem modificar arquivo; ajuste aplicado após leitura.

```sh
export PATH=/nix/store/z4czsax3mdyxx77mwb0yjarnzb1rip00-just-1.58.0/bin:$PATH
just spec-check
git diff --check
```

Não executados spec-export, alloy-check, rust-check, docs-generate, docs-check,
docs-build ou formal-check. Proveniência IR/Rust permanece para M2.3.
Arquivos alterados: dois novos domain/*.cue acima, 19 fixtures do grupo,
tools/formal/check.mjs, FORMAL_SPEC_STATE.md e este worklog.
Commit de implementação: resolver por
`git log -1 --format=%H --grep='feat(cue): model complete reagent bottle record'`.
Resultado de push será registrado no estado após o commit.
Próxima ação EXATA: auditar M2.1 e iniciar M2.2 Alloy para identidade química,
preservando assertions M0. Parar esta execução após commit e push M2.1.

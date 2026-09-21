# M2.4 — composição M0 × M2.2 e integração documental

Estado: IN_PROGRESS. Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada local/remota: `a0388182c406b0768eb8c31cb9307b66fad3dece`.
Árvore limpa; HEAD remota confirmada por `git ls-remote`.

## Reconstrução e gate de entrada

Lidos antes de editar: `FORMAL_SPEC_STATE.md` primeiro; `STATUS_ATUAL.md`;
worklogs `M2_HUMAN_QUESTIONS`, `AUDITORIA_INDEPENDENTE_PRE_M2_4`,
`PRE_M2_4_RECONCILIATION`, `M2_1D_CUE_REALIGNMENT`, `M2_2_ALLOY_RELATIONS`,
`M2_3_PROVENANCE_IR_GENERATION`, `M0_VALIDATION`, `M1_VALIDATION`;
README do archive (registros superados não usados como estado corrente).
Fontes normativas: Seções 4/5 (Frasco, Lote, Empréstimo, histórico e máquina
de estados), 7 (esgotamento/status/descarte), 8 (UI-07/UI-14), 9 (ALM-04..06),
10.5 (retirada sem abertura, devolução, extravio, descarte e quarentena).
Lidos também os três modelos Alloy, os sete arquivos CUE indicados no pedido,
fixtures M0 e fixtures M2 de identidade/quarentena/abertura histórica,
`tools/formal/check.mjs`, fontes Rust `ir/main/render/validation/validation_m2/latex`,
Cargo.toml/lock, `justfile`, IR, ambas evidências e fragmentos/manifest existentes,
Formal-Spec-M0/M1/main.tex, specification/README e os quatro arquivos knowledge,
além de `COMPILACAO_NIX_LCQUI.md`.

Gate: spec-check/export, alloy-check, rust-check, docs-check e diff --check PASS.
CUE: 72 fixtures; IR v3, 29 campos M2. M0: 2 checks/2 runs;
M2.2 identidade: 5 checks/5 runs; estado: 30 checks/11 runs.
HQ001..009 RESOLVED, OPEN=0. M2.1d/M2.2/M2.3 VALIDATED;
M2.4 NOT_STARTED na entrada. Enum publicado: LIBERADO_QUARENTENA;
CORRECAO_OPERACIONAL nas listas canônicas 4/5; nenhum produtor ativo com
SAIU_DA_QUARENTENA. Nenhum desses modelos foi reaberto pela errata.
O primeiro spec-check encontrou spawnSync EPERM; reexecução escalonada PASS.
SSH restrito falhou na configuração do sistema; ls-remote escalonado PASS.

## Matriz de sobreposição — registrada antes do código

| Conceito | M0 | M2.2 | Composição |
|---|---|---|---|
| Frasco | Frasco | Frasco | um único universo Frasco |
| físico | fisico | fisico | mesma relação e mesmo enum |
| disponibilidade | disponibilidade | disponibilidade | mesma relação e mesmo enum |
| quarentena | quarentena | emQuarentena | uma relação emQuarentena |
| empréstimo ativo | ativos | indireto por disponibilidade | ativos, sem status completos |
| saldo desconhecido | — | saldoDesconhecido | mesma dimensão M2 |
| abertura histórica | — | aberturaHistorica | mesma dimensão M2 |
| vencido | — | vencido | mesma dimensão M2 |
| uso vencido | — | usoVencidoAutorizado | mesma dimensão M2 |
| autorização descarte | — | descarteTecnicoAutorizado | mesma dimensão M2 |
| identidade | — | Frasco, Lote, Especificacao | campos estáticos no mesmo Frasco |

## Estratégia e rastreabilidade

Estratégia B: composição aditiva em `bottle_composition.als`. Evita mudar
hashes/semânticas standalone (custo desnecessário de A); dispensa bijeções e
universos duplicados de C. Além da matriz abaixo, o gate compara os corpos
reproduzidos, normalizando apenas comentários, espaços e renomes explícitos.
Assim, drift de predicado de origem falha antes do solver. A evidência composta
vinculará também hashes das três fontes de origem.

| Predicado composto | Origem | Propriedade/fonte |
|---|---|---|
| coerenteM0, filtroFisico, retirarM0 | withdrawal.als: coerente/filtroFisico/retirar | INV-FRASCO-001, INV-EMPRESTIMO-001; Seções 4/5/10.5 |
| coerenteM2 | bottle_state.als: coerente | INV-M2-COERENCIA-001, HQ001/002/008 |
| naoDescartado, aptoParaDescarte, frames | bottle_state.als: mesmos nomes | terminalidade e frames auditados M2.2 |
| extraviarM2, quebrarM2, descartarM2, confirmarEsgotamentoM2, resolverQuarentenaParaDescarteM2 | bottle_state.als: operações homônimas sem sufixo | mesmos efeitos físicos e frames M2.2 |
| estruturaCoerente, viaLote, viaDireta, especEfetiva | bottle_identity.als: mesmos nomes | IDENTIDADE-001..004; XOR textual Seção 4 |
| coerenteIntegrado | conjunção coerenteM0, coerenteM2 e estruturaCoerente | compatibilidade no mesmo estado |
| retirarComposto | retirarM0 + coerência integrada inicial + frames M2 | Seção 10.5 registrarRetirada sem abrirNoEmprestimo; filtro necessário, não autorização completa |
| extraviarComposto | extraviarM2 + remoção de ativos apenas do alvo | Seção 9 ALM-06 e 10.5 registrarExtravioOuReencontro |
| esgotarComposto | confirmarEsgotamentoM2 + remoção de ativos apenas do alvo | Seção 7 esgotamento; Seção 9 ALM-05; 10.5 registrarDevolucao |
| quebrarComposto, descartarComposto, resolverComposto | operação M2 + frame ativos | Seção 8 UI-07, 10.5 descartarFrasco/resolverQuarentenaFrasco; sem encerramento automático |

Retirada conserva físico (recorte M0 sem primeira abertura) e todas as dimensões
M2. Não transforma filtro físico em autorização operacional completa.
Esgotamento é o efeito físico/metrológico abstrato, incluindo fim de custódia
quando existente; não é toda a devolução e não decide anomalia/destino.
Mantém os frames M2.2: validade do alvo livre em quebra/esgotamento; demais
frascos preservados. Identidade estática não pode mudar entre estados.
Sem novas dimensões de metrologia, status de empréstimo, RBAC ou idempotência.

## Evidências e checkpoints

Pendente: modelo, scopes 4/6, validação Rust, stale, geração determinística,
integração LaTeX/PDF e gates finais. Não declarar M2 VALIDATED antes disso.

## Checkpoint A — Alloy

PASS: 12 checks UNSAT + 10 witnesses SAT em scope 4; 5 checks UNSAT +
1 witness SAT em scope 6, sempre exatamente 2 EstadoIntegrado, bitwidth padrão 4.
Frasco/Emprestimo/Lote/Especificacao têm limites superiores 4/6; enums singleton
fixam suas cardinalidades. Witness IdentidadeEstado exige dois frascos, uma rota
por lote e uma direta, com retirada do mesmo frasco identificado. Witnesses com
ativo exigem também outro frasco emprestado, exercitando não-interferência.

| ID | Comando | Scope | Resultado |
|---|---|---|---|
| COMP-M2-RETIRADA-COERENCIA-001 | check RetiradaCoerente | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-RETIRADA-QUARENTENA-001 | check QuarentenaBloqueia | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-RETIRADA-DESCARTE-001 | check DescarteTecnicoBloqueia | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-RETIRADA-TERMINAL-001 | check TerminaisBloqueiam | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-QUEBRA-ATIVO-001 | check QuebraSemAtivo | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-DESCARTE-ATIVO-001 | check DescarteSemAtivo | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-QUARENTENA-ATIVO-001 | check ResolucaoSemAtivo | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-EXTRAVIO-COERENCIA-001 | check ExtravioCoerente | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-ESGOTAMENTO-COERENCIA-001 | check EsgotamentoCoerente | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-TRANSICOES-COERENCIA-001 | check TodasCoerentes | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-ENCERRAMENTO-ALVO-001 | check EncerraSomenteAlvo | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-FRAME-OUTROS-001 | check NaoInterfereOutros | for 4 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-COERENCIA-001 | run EstadoHabitavel | for 4 but exactly 2 EstadoIntegrado | SAT |
| COMP-M2-RETIRADA-001 | run RetiradaHabitavel | for 4 but exactly 2 EstadoIntegrado | SAT |
| COMP-M2-IDENTIDADE-ESTADO-001 | run IdentidadeEstado | for 4 but exactly 2 EstadoIntegrado | SAT |
| COMP-M2-EXTRAVIO-COM-ATIVO-001 | run ExtravioComAtivo | for 4 but exactly 2 EstadoIntegrado | SAT |
| COMP-M2-EXTRAVIO-SEM-ATIVO-001 | run ExtravioSemAtivo | for 4 but exactly 2 EstadoIntegrado | SAT |
| COMP-M2-ESGOTAMENTO-COM-ATIVO-001 | run EsgotamentoComAtivo | for 4 but exactly 2 EstadoIntegrado | SAT |
| COMP-M2-ESGOTAMENTO-SEM-ATIVO-001 | run EsgotamentoSemAtivo | for 4 but exactly 2 EstadoIntegrado | SAT |
| COMP-M2-QUEBRA-001 | run QuebraHabitavel | for 4 but exactly 2 EstadoIntegrado | SAT |
| COMP-M2-DESCARTE-001 | run DescarteHabitavel | for 4 but exactly 2 EstadoIntegrado | SAT |
| COMP-M2-QUARENTENA-001 | run ResolucaoHabitavel | for 4 but exactly 2 EstadoIntegrado | SAT |
| COMP-M2-RETIRADA-COERENCIA-006 | check RetiradaCoerenteAmpliado | for 6 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-RETIRADA-QUARENTENA-006 | check QuarentenaBloqueiaAmpliado | for 6 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-EXTRAVIO-COERENCIA-006 | check ExtravioCoerenteAmpliado | for 6 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-ESGOTAMENTO-COERENCIA-006 | check EsgotamentoCoerenteAmpliado | for 6 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-FRAME-OUTROS-006 | check NaoInterfereOutrosAmpliado | for 6 but exactly 2 EstadoIntegrado | UNSAT |
| COMP-M2-IDENTIDADE-ESTADO-006 | run IdentidadeEstadoAmpliado | for 6 but exactly 2 EstadoIntegrado | SAT |

Nenhum counterexample semântico encontrado, inclusive nas buscas intermediárias.
Falhas instrumentais corrigidas: extração inicial confundiu prefixo Estado com
EstadoFisico (detectada pelo guard antes do solver); expectativa de overall=4
nas buscas ampliadas foi corrigida para 6 após inspeção do receipt. Não foram
alteradas preconditions para obter verde. Modelos standalone/IR/receipts antigos
permanecem byte a byte iguais. Nenhuma HQ nova.

## Checkpoints B/C — evidência, Rust e geração

Receipt separado: `build/formal-validation-m24.json`, versão 1, Alloy 6.2.0,
SAT4J; hash do IR, do modelo composto e das três origens. Contrato Rust
`validation_m24.rs` exige lista exata ordenada de IDs/nomes/tipos/scopes/status.
Testes rejeitam versões/solver, hashes IR/modelo/origens, SAT↔UNSAT, scope,
ID/nome/tipo, remoção/extra/lista vazia, path inesperado e bytes adulterados.
O teste de manifest compara os hashes reais das quatro entradas e de cada saída;
duas renderizações em memória também são comparadas byte a byte.
O guard lexical tem teste de mutação de cada origem e do modelo integrado,
incluído em `alloy-check` (logo também `formal-check`).

Stale demonstrado ANTES da primeira geração: `just docs-check` exit 1,
`Generated stale: MANIFEST.json; execute docs-generate`. Alloy PASS nessa
execução; a rejeição veio do gerador pela nova proveniência M2.4.

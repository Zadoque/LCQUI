# Pré-M8 — reconciliação e backfill executável M5–M7

Estado corrente: BLOQUEADA por HQ-PRE-M8-002. HQ-PRE-M8-001 RESOLVED na retomada autorizada abaixo; nenhum PASS de M5–M7 declarado. Os registros anteriores à retomada são históricos.
HEAD de entrada: `de6de7f49b766c6bd8bb2c94911d6a5cf74adbc6`.
Branch: `feat/formal-spec-cue-alloy`; árvore inicialmente limpa.

## Objetivo e escopo

Reconciliar resíduos correntes de M7 e quitar a dívida executável de M5–M7
até CUE → IR → Alloy → receipts → Rust → LaTeX → PDF. M8 não iniciado.
Autorizados: estado/worklogs, specification/, tools/formal/, tools/spec-doc/,
build/ formal e documentação. Proibidos: lógica de frontend/, functions/,
Rules, configurações Firebase operacionais e mudanças normativas por conveniência.
generated/ só pode ser escrito pelo Rust.

Documentação é autoridade humana; CUE verifica estrutura e quantitativos
expressáveis; Alloy verifica relações/transições em scopes limitados; Rust
valida proveniência/conjuntos exatos e gera evidência determinística; LaTeX
humano explica limites. Nenhuma camada certifica o backend real.

## Leitura e reconciliação mecânica

Lidos os arquivos obrigatórios da fase 0, os contratos normativos pertinentes
das Seções 4/5/7/8/9/10/11/12 e as receitas reais do justfile.

Resíduos correntes encontrados e corrigidos (linhas da HEAD de entrada):

| Arquivo/linha | Resíduo | Correção |
|---|---|---|
| FORMAL_SPEC_STATE.md:6 | M7 documental é o próximo milestone | M5–M7 documentais concluídos; backfill pré-M8 pendente |
| STATUS_ATUAL.md:27 | próxima ação é M7 documental | explicitamente checkpoint histórico |
| STATUS_ATUAL.md:38 | estado corrente M7 NOT_STARTED | DOCUMENTATION_VALIDATED |
| STATUS_ATUAL.md:51 | M7 NOT_STARTED após estado corrente | DOCUMENTATION_VALIDATED |
| STATUS_ATUAL.md:195 | estado corrente M7 NOT_STARTED | DOCUMENTATION_VALIDATED |
| PRE_M5_RECONCILIATION.md:6 | banner corrente M7 NOT_STARTED | DOCUMENTATION_VALIDATED; M8 NOT_STARTED |
| M5_DOCUMENTATION.md:12 | nota corrente pós-M6, M7 NOT_STARTED | nota pré-M8 atualizada |
| M5_DOCUMENTATION.md:232 | “hoje” M7 NOT_STARTED | explicitamente checkpoint pós-M6 |
| M5_DOCUMENTATION.md:236 | próxima ação corrente INICIAR M7 | backfill pré-M8 |

As próximas ações nos dois arquivos de estado agora condicionam a entrada de
M8 à quitação executável. Estados históricos em M6_DOCUMENTATION e
PRE_M7_RECONCILIATION foram preservados. M5–M7 continuam DOCUMENTATION_VALIDATED.

## Finding histórico / HQ-PRE-M8-001 — OPEN naquele checkpoint (RESOLVED na retomada)

Classificação: CONTRADICAO_REAL entre regras normativas, identificada na leitura.
Não é motivo para enfraquecer assertions nem excluir witness.

- Seção 4, linha 401: VAZIO/QUEBRADO/DESCARTADO não mantêm saldo desconhecido.
  Implementada em `bottle_state.als:48`, `bottle_composition.als` e
  `withdrawal_return.als:98` (`coerenteM2`).
- Seção 7, linha 201 (M5): reencontro preserva saldo_desconhecido e permite
  QUEBRADO como quebra constatada; não restringe essa constatação a saldo conhecido.
- Seção 10.5, linhas 1036–1041 e 1060–1077: aceita QUEBRADO e preserva a flag.
- Cenário: ABERTO com saldo desconhecido → EXTRAVIADO preservando a flag →
  reencontrado QUEBRADO, em quarentena, ainda com a flag true. O estado final
  viola `coerenteM2`, embora siga literalmente M5.

Decisão humana solicitada: qual regra prevalece para o reencontro QUEBRADO de
um frasco com saldo anteriormente desconhecido? Não presumir que mudar a flag
equivale a medir quantidade zero. Não rejeitar silenciosamente esse reencontro.
A composição completa de M5 está impedida enquanto ambas as regras forem exigidas.

## Diagnóstico executado — não constitui validação M5

Reprodução da raiz:
`node documentation/worklogs/formal-spec/PRE_M8_HQ001_DIAGNOSTIC.mjs`.
O script copia integralmente o modelo M4 atual para /tmp, sem mudar nenhum
predicado/assertion existente. Acrescenta somente o diagnóstico, selecionado
por `-c HQ*`. O reencontro preserva todas as relações ortogonais representadas;
o saldo desconhecido não é artificialmente removido. A origem satisfaz
`coerenteM4`; a coerência final é a conclusão testada, não hipótese.

Alloy 6.2.0, solver `sat4j`, execução real:

| Comando | Scope | Resultado |
|---|---|---|
| check HQPreservaCoerencia | 4, exactly 2 Estado | SAT — contraexemplo |
| run HQOrigemHabitavel | 4, exactly 2 Estado | SAT — origem habitável |
| check HQPreservaCoerenciaAmpliado | 6, exactly 2 Estado | SAT — contraexemplo |

Modelo de origem SHA-256:
`c8adc6eb5ea9529f45187d3ec8c2b482be8283c1fc2595d758cc2e23035bbdbe`.
Modelo temporário completo com diagnóstico SHA-256:
`2c64c0511d2f6a614e537b21a103827bec898bc35e692e47a65a78f5440a0fc9`.
Receipt bruto e instâncias locais:
`/tmp/lcqui-pre-m8-hq001-JVJ1dL/result/`.
O script versionado permite reproduzir a evidência após limpeza de /tmp.

Instância scope 4 inspecionada: `a=Estado$1`, `b=Estado$0`, `f=Frasco$0`.
Em a: físico EXTRAVIADO, indisponível, membro de saldoDesconhecido.
Em b: físico QUEBRADO, indisponível, em quarentena, ainda membro de
saldoDesconhecido. Status dos empréstimos e demais relações preservados.
A violação é a cláusula QUEBRADO ⇒ ausência de saldoDesconhecido.
Não foi alterado resultado esperado de nenhum check existente. Não se trata
de prova completa da transição M5 nem de reprodução do backend.

## Gates de regressão do escopo existente

`just formal-check` executado com exit 0, incluindo rust-check, alloy-check,
docs-check, docs-build, diff dos gerados e diff-check. Log local:
`/tmp/lcqui-pre-m8-existing-gates.log`. CUE exigiu escalonamento por
`spawnSync cue EPERM` no sandbox; execução autorizada fora dele passou.
O diagnóstico também exigiu execução fora do sandbox.

| Gate | Resultado / limite |
|---|---|
| just spec-check | PASS, 101 fixtures existentes: 31 válidas / 70 inválidas |
| just alloy-check | PASS pela dependência de formal-check, somente M0–M4 |
| just rust-check | PASS por formal-check: fmt, 10 testes, clippy -D warnings |
| just docs-check | PASS por formal-check; nenhuma regeneração de LaTeX |
| just docs-build | PASS por formal-check; latexmk informou up-to-date |
| just formal-check | PASS para o pipeline existente, não para o backfill solicitado |
| git diff --check | PASS |

Contagens Alloy existentes (checks/witnesses): M0 2/2; M2 35/16;
M2.4 17/11; M3 11/11; M4 40/20. Todos os checks UNSAT e witnesses SAT.
Receipts, IR e fragmentos existentes permaneceram byte a byte idênticos.
Não confundir o diagnóstico adverso acima com esses resultados históricos
reexecutados: M4 não modela reencontro.

## Cadeia M5/M6/M7 ainda pendente

| Item | M5 | M6 | M7 |
|---|---|---|---|
| Novos contratos/fixtures CUE | não criados | não criados | não criados |
| Modelo completo integrado / checks / witnesses | não criado; HQ bloqueante | pendente | pendente |
| Receipt formal-validation-mN.json | ausente | ausente | ausente |
| validation_mN.rs / manifest | não integrado | não integrado | não integrado |
| Fragmentos Rust / Formal-Spec-MN.tex | ausentes | ausentes | ausentes |
| Evidência mecânica no PDF | ausente | ausente | ausente |

IR permanece v3 e gerador 0.2.0; nenhuma entrada nova no manifest, nenhum teste
Rust novo ou claim de determinismo M5–M7. O teste de determinismo já existente
passou. Não houve docs-generate nesta rodada. CUE quantitativo M6 e abstração
relacional M6 ainda não implementados; nenhuma prova numérica nova declarada.
M7 ainda não prova idempotência/deduplicação formalmente nesta cadeia, muito
menos exactly-once, concorrência, TOCTOU, deadlock ou trigger loop.

## LaTeX/PDF e preservação

Nenhum Formal-Spec-M5/M6/M7.tex criado/incluído. main.tex inalterado.
main.pdf versionado não recompilado nem substituído nesta rodada. O gate
latexmk verificou o build existente; pdfinfo confirmou 341 páginas no artefato
local. Log final existente: zero erros fatais/referências indefinidas;
overfulls preexistentes, sem novo conteúdo. Não há páginas de evidência mecânica
M5–M7 para inspecionar/publicar. Presença de normas M5–M7 no PDF anterior não
substitui a evidência executável exigida.

Comparação com a HEAD de entrada: diff zero em specification/, tools/, build/
versionado, generated/, main.tex/main.pdf, frontend/, functions/, Rules e
configurações Firebase. As alterações desta rodada são Markdown de estado e
o script diagnóstico no worklog. Nenhum milestone M8+ iniciado.

## Saída e decisão sobre M8

M0–M4: validações históricas preservadas. M5/M6/M7: DOCUMENTATION_VALIDATED,
backfill não concluído. M8 = NOT_STARTED. **M8 NÃO PODE INICIAR** enquanto houver
HQ bloqueante ou gate pendente.

Commits: `b86ac5a6` (reconciliação/registro inicial); segundo commit documental
`docs(pre-m8): preserve Alloy counterexample and block M8 entry` (diagnóstico,
resultado de regressão e estado bloqueado). HEAD de saída é esse segundo commit,
resolvido por `git log -1 --format=%H --grep='preserve Alloy counterexample and block M8 entry'`.
Não há commit declarando quitação ou VALIDATED para M5–M7.

Próxima ação imediata: responder HQ-PRE-M8-001 e reconciliar a regra escolhida;
depois retomar integralmente a cadeia M5–M7. A entrada em M8 não está liberada.

## Retomada autorizada — HEAD ae7eb4c7013ee809b7bfc87efa355c05716116bf

Árvore limpa; mesma branch. Decisão humana recebida: quebra e descarte preservam
conhecimento metrológico; somente VAZIO confirmado resolve o desconhecimento
pela rota válida. HQ001 aguarda implementação e gates, não mais decisão.

Mapa de impacto ANTES da correção: Seções 4:401 e 7:469 contêm a regra antiga;
HQ-M2-002:59 deve receber emenda auditável. Seções 5/9/10.5 precisam explicitar
preservação na quebra/descarte. CUE não proíbe a combinação (ciclo operacional
fora do invariante de linha); adicionar quatro fixtures positivas. Alloy:
bottle_state é a origem; bottle_composition reproduz coerência/transições via
composition.mjs; withdrawal_return reproduz coerenteM2 via withdrawal_return.mjs.
Dois checks obsoletos em check.mjs/validation_m2.rs devem ser substituídos por
frames e ampliados com witnesses. Mutação do teste withdrawal_return precisa
acompanhar a cláusula fonte. IR não precisa mudar por esta emenda; receipts
M2/M2.4/M4 e manifest mudam por hashes/resultados. Fragmento M2 somente via Rust.
Worklog M2.2 terá nota de supersessão; diagnóstico HQ001 anterior preservado.
Busca semântica completa registrada localmente em /tmp/pre-m8-impact.txt.

Emenda implementada: CUE 105 fixtures (35 válidas/70 inválidas). Alloy M2
37 checks UNSAT / 20 witnesses SAT; M2.4 17/11 e M4 40/20 preservados.
Diagnóstico pós-emenda: check scope 4 UNSAT, origem scope 4 SAT, check scope 6
UNSAT; Alloy 6.2.0/sat4j. Hash origem ec5030866906599224c0c39d106f78073a5f3afefa2fe004e0344abb0748a1ec;
hash diagnóstico e33a8dc440cd10ece86c59710b729de373067cd2ec19a8f228e17dad6975b329.
Evidência local /tmp/lcqui-pre-m8-hq001-R5Etg6/result. Nenhuma witness removida.
Fragmento M2 regenerado pelo Rust; diferença deliberada limitada aos dois
frames substituídos e seis comandos novos. IR/M0/M1/M3 inalterados.

## Fechamento da emenda HQ-PRE-M8-001 — RESOLVED

Commit de implementação: `12c4f1db` (`fix(formal): preserve metrological knowledge on breakage and disposal`).
A decisão humana separa condição física de conhecimento metrológico. Quebra e
baixa operacional não medem conteúdo; preservam a flag tanto true como false.
VAZIO confirmado mantém a regra metrológica anterior. Terminalidade de DESCARTADO,
quarentena e política de tara real não foram alteradas.

Supersessões explícitas: `QuebraSaldoConhecido` →
`QuebraPreservaConhecimentoMetrologico`; `DescarteSaldoConhecido` →
`DescartePreservaConhecimentoMetrologico`. As propriedades anteriores aplicavam
indevidamente conhecimento de vazio à quebra/descarte. Os novos frames verificam
igualdade do conjunto antes/depois; quatro witnesses cobrem conhecido/desconhecido
nas duas transições, e dois checks adicionais usam scope 6 (exatamente 2 Estado).
Os demais comandos e scopes não foram reduzidos. As cópias M2.4/M4 passam pelos
comparadores literais de fonte existentes. CUE deliberadamente não impõe o ciclo
de vida como invariante de linha; as quatro fixtures protegem a aceitação estrutural.

Diagnóstico HQ001 ampliado preserva os três comandos anteriores e acrescenta
origem habitável no scope 6: checks 4/6 UNSAT, runs 4/6 SAT, exatamente 2 Estado.
O resultado anterior SAT permanece no registro histórico acima. Resultado novo,
hashes completos e comandos: `PRE_M8_DIAGNOSTIC_EVIDENCE/HQ001-after.json`.
Alloy 6.2.0, SAT4J; origem M4 ec5030866906599224c0c39d106f78073a5f3afefa2fe004e0344abb0748a1ec;
modelo diagnóstico 1cd5fcfd0818a2f08d5cee4d674630c085b39eb53af475913a0fefc160af3c4d.
Assim, a origem e o reencontro continuam habitáveis sem contraexemplo à coerência
no recorte de HQ001 (sem autorização técnica de descarte anterior).

Regressão executada após a correção: CUE 105 fixtures, 35 válidas/70 inválidas;
Alloy M0 2 checks/2 runs; M2 37/20; M2.4 17/11; M3 11/11; M4 40/20.
Todos os checks UNSAT e runs SAT. M1 conserva evidência estrutural CUE.
Rust 0.2.0: 10 testes PASS, fmt/clippy PASS; validators e manifest reconciliados
com os receipts reais. Duas gerações consecutivas pelo Rust, seguidas de
`git diff --exit-code -- documentation/generated/`, produziram diferença zero.
IR v3 mantido: esta emenda não introduz novo contrato exportado. Fragmentos
históricos M0/M1/M3/M4 sem alterações; M2 muda deliberadamente por supersessão,
com manifest e receipts M2/M2.4/M4 atualizados por proveniência.

`just formal-check` PASS (exit 0), incluindo rust-check, spec-check/spec-export,
alloy-check, docs-check, docs-build e git diff --check. PDF efetivamente recompilado:
343 páginas, zero erros fatais/zero referências indefinidas no log; 33 ocorrências
overfull registradas, sem alegação de eliminação dos warnings históricos.
Poppler pdfinfo/pdftotext confirmou emendas e frames novos. Páginas 97 (norma) e
326 (evidência M2) renderizadas e inspecionadas visualmente; sem corte das tabelas
ou texto ilegível nessas páginas. `documentation/main.pdf` atualizado do build.
Este PDF NÃO contém capítulos formais M5–M7: o backfill continua bloqueado abaixo.

## HQ-PRE-M8-002 — OPEN / bloqueante para composição M5

Nova escolha humana, independente de conhecimento metrológico: qual é o ciclo de
vida da autorização técnica de descarte quando o frasco é reencontrado?

Fontes: HQ-M2-008/B; Seção 5 (`Pendencias_Descarte_Frasco` é autorização corrente,
consumida por descarte); Seção 10.5 `resolverQuarentenaFrasco` (~1409) cria a
autorização; `reencontrarFrasco` (~1054) impõe quarentena sem remover a autorização.
M2.4 `coerenteM2` (~64) proíbe autorização ativa com quarentena; `extraviarM2`
preserva a autorização. M5 permite extravio desse frasco e exige reencontro em
quarentena. A emenda HQ001 não determina revogação nem suspensão de autorização.

Reprodução: `node documentation/worklogs/formal-spec/PRE_M8_HQ002_DIAGNOSTIC.mjs`.
Usa fonte integral M2.4 e suas transições reais `resolverComposto` e
`extraviarComposto`; acrescenta reencontro conforme atualização normativa,
preservando os demais campos. Nenhum comando histórico é editado. Alloy 6.2.0,
SAT4J, scopes 4 e 6, exatamente 4 EstadoIntegrado. Checks de coerência SAT
(CONTRAEXEMPLO, não PASS); witnesses do ciclo SAT nos dois scopes.

Instância concreta, Frasco$0 (saldo já conhecido em TODOS os quatro estados):

| Estado | Físico | Quarentena | Autorização técnica |
|---|---|---|---|
| EstadoIntegrado$3 | ABERTO | sim | não |
| EstadoIntegrado$2 | ABERTO | não | sim |
| EstadoIntegrado$1 | EXTRAVIADO | não | sim |
| EstadoIntegrado$0 | QUEBRADO | sim | sim |

Último estado viola a exclusividade autorização/quarentena. Origem e as duas
transições existentes são coerentes; não depende de saldo desconhecido, scope
insuficiente ou antecedente impossível. Hash da fonte:
1706613e01c89c45067b99d201dd5fb3a11ff77258272f4b3f4ef5d5a86c2cf5;
hash do modelo diagnóstico:
36e713cc0aa2db7e6d349cf50350e1f6d7d6cc315a586bdcd6c0c535d7ebff63.
Resultados exatos em `PRE_M8_DIAGNOSTIC_EVIDENCE/HQ002-after.json`; instância real
preservada em `HQ002-counterexample-scope4.json`. São diagnósticos, NÃO receipts
válidos de M5 e NÃO entradas do manifest.

Decisão solicitada ao responsável: no reencontro, revogar a autorização anterior
(preservando histórico e exigindo nova decisão após inspeção) ou conservá-la
suspensa durante a quarentena? Não assumir nenhuma alternativa, não proibir o
reencontro para obter UNSAT e não alterar o saldo. A decisão é bloqueante porque
altera autoridade operacional de descarte e não decorre da emenda epistemológica.

M5 permanece dependente dessa resposta; etapas M6/M7 foram solicitadas após PASS
integral de M5/M6, respectivamente. Não há modelos/receipts/validators/capítulos
formais M5–M7 novos, nem alteração de IR para eles. Nenhuma validação desse escopo
é declarada. Arquivos frontend/, functions/, Rules/configurações Firebase intactos.

Estado: HQ001 RESOLVED; HQ002 OPEN; M0–M4 VALIDATED no escopo existente;
M5/M6/M7 DOCUMENTATION_VALIDATED; M8 NOT_STARTED. M8 NÃO FOI INICIADO e NÃO PODE
INICIAR. Próxima ação imediata: RESOLVER HQ-PRE-M8-002, depois concluir a cadeia
executável pré-M8 e seus gates. Não há autorização para promover M5–M7 agora.

Commits desta retomada: `12c4f1db` e o commit de saída
`docs(pre-m8): resolve HQ001 and preserve authorization counterexample`.
HEAD final resolvível por `git log -1 --format=%H` após esse commit; nenhum
commit declara backfill concluído.

Auditoria final após o registro: `just formal-check` novamente PASS (exit 0);
reexecução do script HQ002 versionado reproduziu exatamente comandos, hashes e
resultados registrados. `git diff --check` PASS. Diff dos caminhos proibidos vazio.
A segunda chamada docs-build estava up-to-date porque a recompilação efetiva de
343 páginas já havia ocorrido e sido inspecionada nesta retomada.

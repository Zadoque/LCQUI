# Catálogos independentes — conciliação normativa e plano de implementação

## Decisão normativa

A V1 passa a tratar Resumo de Reagente, Especificação de Reagente, Substância
Química e Matéria como quatro projeções JSON independentes. Firestore continua
sendo a fonte canônica; JSON e cache local são somente projeções de busca e
apresentação. A especificação referencia `id_resumo_reagente` na raiz e não é
duplicada dentro do catálogo de resumos.

O documento `Sistema_Catalogo_Reagentes/estado` mantém, para cada catálogo,
`versao_fonte`, `versao_publicada`, `storage_path` e `sha256`. O manifesto
versionado anuncia apenas o conjunto compatível de versões publicadas. Uma
mutação incrementa somente a versão do catálogo afetado; edição de matéria
incrementa somente `materias`. A publicação só avança após o objeto do catálogo
ser gravado com sucesso.

## Impacto auditado

- UI-04: pesquisa de resumos e especificações localmente; substâncias e matérias
  possuem projeções próprias.
- UI-05/ALM-01: composição de substâncias puras e misturas pesquisa nome, CAS ou
  fórmula no catálogo local; a validação final continua server-side.
- UI-06/ALM-02: o frasco exige resumo e especificação efetiva da mesma fotografia
  compatível; nenhum cadastro é enviado sem os dois IDs.
- MAT-01: a edição de matéria invalida/publica somente o catálogo de matérias.
- UI-01, movimentações, empréstimos e estoque não passam a usar JSON como fonte
  operacional: retirada, devolução, saldo e disponibilidade continuam canônicos
  no Firestore e nas Functions.

## Evidência formal

- CUE: `specification/cue/domain/catalogos.cue` e fixtures em
  `specification/cue/tests/catalogos/` cobrem descritores, manifesto e a
  condição de publicação.
- Alloy: `specification/alloy/operations/catalogos_v2.als` comprova que o
  manifesto reflete versões publicadas, mutações não vazam entre catálogos,
  edição de matéria é isolada e publicação não regride.
- Receipt: `build/formal-validation-catalogos.json` registra Alloy 6.2.0 com
  solver MiniSat; quatro invariantes ficaram UNSAT e quatro witnesses ficaram
  SAT. Os milestones históricos continuam usando SAT4J.
- `just spec-check`: verde.
- `node --test tools/formal/*.test.mjs`: 47/47 verdes.

## Ordem de implementação

1. Alterar o contrato formal e a documentação normativa.
2. Materializar as quatro projeções e o manifesto no backend, com incremento
   transacional por catálogo.
3. Expor as projeções pelas callables autorizadas e reconstruir no frontend os
   índices locais necessários à apresentação.
4. Trocar selects de substância por busca local de nome/CAS/fórmula e bloquear
   envio sem substância/composição obrigatória.
5. Manter a seleção de resumo/especificação no cadastro de frasco e revalidar o
   par na transação de backend.
6. Executar Jest/Rules/Emulator e E2E no Node.js 20; somente depois atualizar a
   matriz com IDs de testes e evidências concretas.

## Critério de conclusão

A linha só permanece `NÃO DIVERGENTE` quando o contrato formal, os documentos
normativos, o backend, Rules, UI e os E2E aplicáveis estiverem verdes. O
deployment externo continua sendo uma etapa posterior para Storage, Scheduler,
índices reais e provedores externos.

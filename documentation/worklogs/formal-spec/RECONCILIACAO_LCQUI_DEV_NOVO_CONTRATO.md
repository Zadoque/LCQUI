# Reconciliação do `lcqui-dev` com o contrato de catálogos V2

**Data da auditoria:** 2026-10-12  
**Projeto:** `lcqui-dev`  
**Escopo:** somente leitura; nenhuma escrita, exclusão ou deploy foi realizado
durante esta auditoria.

## Resultado executivo

O projeto real já possui os registros canônicos importados, mas ainda não está
materializado integralmente no contrato de catálogos V2. A conciliação é
viável e deve ser feita como uma publicação idempotente de novas projeções,
sem alterar os IDs dos registros operacionais e sem apagar os objetos legados.

O estado observado é:

- Firestore Native na região `southamerica-east1`;
- `Sistema_Catalogo_Reagentes/estado` ainda no formato legado, com
  `schema_version: 1`, `versao_fonte: 2`, `versao_publicada: 2` e ponteiro para
  `catalogo-reagentes/v2-...json`;
- `catalogo/reagentes_v1.json` ainda existe, mas contém `schema_version: 1` e
  zero resumos;
- o objeto legado atualmente apontado em `catalogo-reagentes/` contém
  `schema_version: 1`, 273 resumos, 247 especificações aninhadas, 69 resumos
  líquidos e 204 sólidos; 61 das especificações possuem densidade;
- o Storage ainda não apresenta, na listagem auditada, os prefixos novos
  `catalogo-resumos/`, `catalogo-especificacoes/`, `catalogo-substancias/`,
  `catalogo-materias/` e `catalogo-manifestos/`;
- o Firestore possui as coleções de fonte `Resumo_Reagente`,
  `Especificacao_Reagente`, `Substancia_Quimica` e `Materia`, além do documento
  de estado legado;
- a amostra auditada confirmou que os documentos de especificação existem tanto
  no espelho top-level `Especificacao_Reagente` quanto na subcoleção normativa
  `Resumo_Reagente/{id}/Especificacoes/{id}`.

Portanto, o deploy do código novo não deve ser tratado como uma simples troca
de nome de arquivo. É uma migração de projeção: Firestore continua sendo a
fonte canônica; os JSONs são artefatos derivados de busca e apresentação.

## Contrato que deve ser publicado

O contrato corrente define quatro projeções independentes:

1. `resumos` — documentos `Resumo_Reagente`;
2. `especificacoes` — documentos `Especificacao_Reagente`, referenciando
   `id_resumo_reagente` na raiz;
3. `substancias` — documentos `Substancia_Quimica`;
4. `materias` — documentos `Materia`.

O manifesto deve anunciar, para cada projeção, `versao_fonte`,
`versao_publicada`, `storage_path` e `sha256`. Sua compatibilidade deve apontar
somente para versões efetivamente publicadas. A edição de uma matéria deve
incrementar apenas `catalogos.materias.versao_fonte`; a criação de uma
especificação deve incrementar apenas `catalogos.especificacoes.versao_fonte`.

Essa estrutura é a definida em `specification/cue/domain/catalogos.cue`,
`specification/alloy/operations/catalogos_v2.als` e no plano
`CATALOGOS_INDEPENDENTES_PLANO_IMPLEMENTACAO.md`.

## Riscos de dados identificados

### Dupla representação da especificação

As operações transacionais de frasco e a resolução de integridade usam a
subcoleção `Resumo_Reagente/{id}/Especificacoes/{id}`. A materialização do
catálogo usa o espelho top-level `Especificacao_Reagente`. A publicação só é
segura depois de uma verificação de consistência entre os dois conjuntos:

- mesmos IDs de especificação;
- mesmo `id_resumo_reagente`;
- mesmos campos normativos;
- nenhuma especificação órfã;
- densidade presente quando o resumo é `LIQUIDO`;
- composição válida para `MISTURA` e substância efetiva para `PURA`.

Não se deve escolher silenciosamente uma das representações se houver
divergência. O procedimento de reconciliação deve parar e emitir um relatório
de conflito.

### Legado no Storage

Os objetos `catalogo/reagentes_v1.json` e
`catalogo-reagentes/v2-...json` não devem ser sobrescritos nem removidos na
primeira publicação V2. Eles podem ser necessários para uma versão do frontend
já publicada. A nova publicação deve usar caminhos imutáveis com hash:

```text
catalogo-resumos/vN-<sha256>.json
catalogo-especificacoes/vN-<sha256>.json
catalogo-substancias/vN-<sha256>.json
catalogo-materias/vN-<sha256>.json
catalogo-manifestos/vN-<sha256>.json
```

Repetições com o mesmo conteúdo devem reutilizar o caminho determinístico. Uma
nova versão só deve existir quando o conteúdo efetivamente mudar. A limpeza
dos objetos antigos é uma política posterior de retenção, nunca parte da
primeira conciliação.

## Procedimento seguro de conciliação

1. **Congelar a evidência:** exportar o documento
   `Sistema_Catalogo_Reagentes/estado`, registrar as gerações dos objetos
   legados e obter um inventário somente leitura das quatro coleções e das
   subcoleções de especificações.
2. **Executar o comparador em modo dry-run:** comparar o espelho top-level com
   as subcoleções; validar cada registro contra CUE e executar as invariantes
   Alloy. Qualquer conflito interrompe o processo.
3. **Publicar as quatro projeções:** usar a função de publicação V2, que lê as
   fontes canônicas, grava objetos versionados no Storage e só então atualiza o
   estado Firestore.
4. **Publicar o manifesto:** atualizar o manifesto somente depois de todas as
   quatro projeções terem `versao_publicada == versao_fonte` e hashes válidos.
5. **Validar o resultado:** baixar cada objeto publicado, conferir hash,
   contagens, referências e filtro local do frontend; confirmar que a
   resolução transacional ainda usa os IDs originais.
6. **Ativar o frontend:** somente depois da validação, apontar o frontend e as
   Functions para o contrato V2. Não alterar diretamente dados de negócio para
   “corrigir” a projeção.
7. **Rollback:** em caso de falha, restaurar o backup do documento de estado e
   manter os objetos V2 imutáveis para investigação. Não apagar o legado durante
   o rollback.

## Custo e idempotência

A primeira publicação V2 fará leituras das coleções fonte e gravará até cinco
objetos JSON mais o documento de estado/manifesto. As leituras são cobradas de
acordo com o plano do Firestore; o download dos JSONs é operação do Storage,
não uma leitura de cada documento do Firestore pelo navegador.

Depois da publicação, a busca do frontend deve consumir o catálogo local. Uma
nova consulta por nome, CAS ou estado físico não deve listar novamente as
coleções do Firestore. Uma repetição sem mudança não deve criar novos objetos:
o caminho contém a versão e o hash do conteúdo. Alterações futuras devem
incrementar somente o catálogo afetado.

## Critério de liberação

A conciliação real só pode ser considerada concluída quando houver, no projeto
`lcqui-dev`:

- quatro objetos V2 válidos no Storage;
- um manifesto V2 apontando para os quatro objetos;
- estado Firestore com os quatro descritores publicados;
- comparação top-level/subcoleção sem conflitos;
- validação CUE e Alloy verde para o manifesto produzido;
- E2E publicado verificando busca local, seleção de IDs e criação de frasco;
- preservação comprovada dos objetos legados e possibilidade de rollback.

Até que esses itens sejam comprovados, o estado real deve ser descrito como
**dados canônicos presentes, projeção V2 ainda não conciliada**, e não como
catálogo V2 publicado.

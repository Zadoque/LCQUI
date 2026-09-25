# CUE estrutural — M0, M1 e M3

- `domain/frasco.cue`: fatia M0 fechada de três dimensões do frasco.
- `domain/resumo_reagente.cue`: registro normalizado de Resumo_Reagente.
- `domain/especificacao_reagente.cue`: registro normalizado e par com resumo.
- `domain/campos_catalogo.cue`: descritores que geram constraints e documentação.
- `domain/emprestimo_reagente.cue`: registro normalizado M3 de Emprestimo_Reagente (33 colunas).
- `domain/campos_emprestimo.cue`: descritor M3 (NUMERIC(10,5), VARCHAR(100)).
- `docs/projection.cue`: IR v3 concreto das entidades, com exemplos validados.
- `firestore/mapeamentos.cue`: notas documentais de mapeamento, não schemas de
  documentos completos. Composição ainda não migrada.

Os registros M1 têm IDs relacionais inteiros, todos os campos presentes e null
explícito quando permitido. Não são payloads de criação: defaults SQL não são
injetados. DocIds e FKs Firestore são strings; o mapeamento não muda o backend.

Fontes: Seção 4, entidades Resumo/Especificação; Seção 5, dicionário físico.
`#ParCatalogo` valida igualdade da FK e exige densidade para LIQUIDO. A existência
global da FK e a imutabilidade de densidade não são provadas por um par estático.

```sh
cd specification/cue
cue fmt ./...
cue vet ./...
cue vet -c ./domain ./tests/catalogo/resumo/valid/liquido.json -d '#ResumoReagente'
cue vet -c ./domain ./tests/catalogo/par/valid/liquido.json -d '#ParCatalogo'
cue export ./docs -e ir
```

Na raiz, `just spec-check` inclui todos os grupos de fixtures e gate de formatação;
`just spec-export` escreve build/spec-ir.json. Não exportar #Definition supondo
que será incluída automaticamente; o objeto concreto `ir` importa o domínio.
Campos `!` em M1 exigem presença, mesmo se a constraint puder inferir null.

No contrato de frasco, `estado_fisico_frasco` contém somente os estados físicos;
`situacao_localizacao` separa `LOCALIZADO` e `EXTRAVIADO`. Fixtures cobrem a
combinação de localização extraviada com estado físico preservado.

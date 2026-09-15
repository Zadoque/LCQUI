# CUE estrutural — fatia M0

Fonte: `domain/frasco.cue`. `#Frasco` é parcial e fechado: valida somente a fatia,
não um documento Firestore completo. Todos os três campos são obrigatórios e
não aceitam null; disponibilidade não implica aptidão. Descritores normativos de campo
geram tanto o schema (#Valor) quanto a projeção documental. `docs/projection.cue` contém uma
projeção concreta com exemplo unificado ao schema, não exporta `#Definition`
implicitamente. Tipos e obrigatoriedade são derivados dos descritores #Enum/#Boolean e da
compreensão que constrói #Frasco; não há segundo schema documental.

```sh
cd specification/cue
cue fmt ./...
cue vet ./...
cue vet -c ./domain ./tests/valid/fechado.json -d '#Frasco'
cue export ./docs -e ir
```

Na raiz: `just spec-check` inclui fixtures negativas e gate de formatação;
`just spec-export` valida e escreve `build/spec-ir.json`.
Fonte congelada: Seção 4, entidade Frasco_Reagente; Seção 10.5, retirada.
Campos de pesos, datas e projeções Firestore aguardam próximos milestones.

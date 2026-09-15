# CUE

CUE unifica constraints e dados; `cue vet -c` exige instâncias concretas.
Definições `#...` não são dados exportados automaticamente. A projeção `ir`
importa o domínio e valida o exemplo com `domain.#Frasco`; listas de enum são
compartilhadas com o schema. Não criar outro schema documental independente.

`cue fmt ./...` formata; `cue vet ./...` valida o módulo;
`cue export ./docs -e ir` exporta JSON concreto. Executar dentro de specification/cue.
Na raiz, `just spec-check` também verifica fixtures de rejeição e formatação.
Não transformar ausência/null em zero; ampliar o schema somente conforme baseline.

## M1: presença, nulabilidade e limites

Um campo regular restringido a null pode ser completado pelo CUE durante vet;
isso não prova que o documento de entrada continha a chave. Para registros com
presença obrigatória use campos `!`, incluindo nas condições. Fixtures negativas
com chave ausente são indispensáveis. Os schemas M1 representam linhas completas,
não defaults de criação ou política de campos opcionais do Firestore.

Descritores #TextoCatalogo derivam o limite VARCHAR de max_caracteres usando
[strings.MaxRunes](https://pkg.go.dev/cuelang.org/go/pkg/strings#MaxRunes), que
conta codepoints Unicode. #DensidadeCatalogo usa escala 0.0001 via
[math.MultipleOf](https://pkg.go.dev/cuelang.org/go/pkg/math#MultipleOf), com
limites NUMERIC(8,4). null continua distinto de zero.

IR v2 usa entidades[]; exemplos são unificados aos schemas normativos. O par
exemplo também valida FK e densidade condicional. Não duplicar schemas em docs/.

# CUE

CUE unifica constraints e dados; `cue vet -c` exige instâncias concretas.
Definições `#...` não são dados exportados automaticamente. A projeção `ir`
importa o domínio e valida o exemplo com `domain.#Frasco`; listas de enum são
compartilhadas com o schema. Não criar outro schema documental independente.

`cue fmt ./...` formata; `cue vet ./...` valida o módulo;
`cue export ./docs -e ir` exporta JSON concreto. Executar dentro de specification/cue.
Na raiz, `just spec-check` também verifica fixtures de rejeição e formatação.
Não transformar ausência/null em zero; ampliar o schema somente conforme baseline.

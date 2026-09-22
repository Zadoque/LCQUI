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

IR v3 usa entidades[]; exemplos são unificados aos schemas normativos. O par
exemplo também valida FK e densidade condicional. Não duplicar schemas em docs/.

## M3: Emprestimo_Reagente

`#CampoEmprestimo` espelha `#CampoFrasco`, acrescentando NUMERIC(10,5)
(escala 0.00001) e VARCHAR(100) via `strings.MaxRunes`. O descritor exige
`#Base: _` no topo para que `#Valor` resolva. `emprestimoReagenteCampos` é a
fonte estrutural única; `#EmprestimoReagente` impõe presença (`!`) e constraints
locais: densidade condicional por `unidade_medida_utilizada` (ml exige densidade
positiva, g exige null), pendência de anomalia (`DEVOLVIDO_COM_ANOMALIA` com
`consumo_validado = false` exige valores quantitativos nulos) e sua resolução
(com `consumo_validado = true` exige os três valores), bundle de
`ENCERRADO_EXTRAORDINARIO` e `nao_negativo` para grandezas de massa/volume
(`medida_utilizada`, pesos e perda estimada) com `>= 0` (zero válido; distinto de
`positivo`, que é `> 0`; `densidade_aplicada` permanece `positivo`). A paridade
nomes/ordem/quantidade com a Seção 4 é verificada em `tools/formal/check.mjs`,
não em lista paralela.

`#CampoFrasco` recebeu o mesmo metadado `nao_negativo`; em `frasco_completo.cue`
os campos `conteudo_nominal`, `peso_no_cadastrado`, `peso_atual`,
`peso_frasco_vazio` e `medida_usada` passaram a exigir `>= 0`. O milestone M2 não
foi reaberto; a correção é registrada no erratum de M3.

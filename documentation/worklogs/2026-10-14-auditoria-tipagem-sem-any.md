# Auditoria de tipagem sem `any`

## Escopo

Foi realizada uma busca global no código, testes e trechos TypeScript da
documentação. Não permanecem coerções sem tipagem explícita nem supressões da
regra de tipagem sem forma fora das dependências de terceiros e dos artefatos
gerados.

## Correções

- Resultados de operações idempotentes de reagentes, estoque e patrimônio foram
  tipados em `functions/src/types/`.
- O PDF passou a usar o tipo concreto do `pdfkit-table`.
- Requests dos testes passaram a usar uma fábrica tipada centralizada em
  `functions/src/types/testing.ts`; a adaptação para o token decodificado e o
  `Request` do runtime fica isolada nessa fronteira de teste.
- Uploads do Storage usam um adaptador de `UploadTask` para `Promise`, porque a
  API de Rules exige uma Promise nativa embora o SDK retorne uma tarefa
  thenable.
- A validação Zod usa `unknown` e `ZodError.issues`, sem perder a estrutura do
  erro.
- Os exemplos TypeScript da documentação foram alinhados à mesma regra.

## Evidências

- `functions`: lint e build verdes.
- Unitários: 146 testes passando.
- Rules Emulator: 165 testes passando.
- Integração de reagentes: passando.
- Frontend: `tsc --noEmit` e lint verdes.

A integração de usuários ainda reproduz dois testes de concorrência de
revogação já existentes (`TEST-INT-ROLE-002-001` e `TEST-INT-ROLE-002-002`),
independentemente da troca dos mocks para tipos explícitos. Eles permanecem
registrados como pendência de concorrência M9, não como falha de tipagem.

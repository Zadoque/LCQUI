# M0 — Diagnóstico das pendências de implementação

Retomada em `e95a42ab`, branch `feat/formal-spec-cue-alloy`, Git inicialmente
limpo e sincronizado com a referência local origin. As duas falhas foram
reproduzidas antes de editar. O diff de frontend/functions contra 9d97ed30
estava vazio. Não são contraexemplos CUE/Alloy nem mudanças de regra 3B.

## APP-BASELINE-001 — Prop não consumida

`frontend/src/app/reagentes/page.tsx:524` passa `tipoSubstanciaResumo` para
`ModalNovaEspecificacao`. A interface ModalProps e a desestruturação da função
em `frontend/src/components/reagentes/ModaisReagentes.tsx` não possuem esse campo.
A prop não é lida nem encaminhada pelo componente. Remover apenas o argumento
não muda o comportamento executado: corrige o contrato TypeScript da chamada.
Não adicionar campo fictício à interface nem desabilitar o typecheck.
O carregamento/seleção de dados interno do modal não é redesenhado nesta correção.

## APP-BASELINE-002 — Fixture viola duas regras

O teste fornece Bolsista + Gestor_Almoxarifado sem Aluno. `validarMatrizPapeis`
rejeita primeiro Bolsista sem Aluno, portanto não chega à validação específica
de incompatibilidade Bolsista/Gestor. Ambas as regras são normativas na Seção 7
(DP-C01) e Seção 8 (concessão de papéis).

Correção: manter caso explícito que verifica a exigência de Aluno, incluindo
Bolsista isolado e Bolsista+Gestor sem Aluno; usar Aluno+Bolsista+Gestor no teste
de incompatibilidade, mantendo a mensagem específica e classe HttpsError.
Assim cada teste exercita uma regra distinta; não alterar a ordem ou lógica do
backend, nem tornar a expectativa genérica apenas para fazê-la passar.

## Escopo da correção

Esta unidade trata as pendências registradas no estado como manutenção pontual,
separada da infraestrutura formal. Não altera arquitetura, entidades, regras
operacionais, configurações Firebase ou documentação congelada. A exigência de
preservação refere-se à aplicação existente, que permanece nos mesmos diretórios;
registrar explicitamente os dois arquivos reparados em vez de continuar alegando
diff vazio da aplicação. Não iniciar M1 nesta rodada.

## Validação planejada

```sh
frontend/node_modules/.bin/tsc --noEmit --incremental false -p frontend/tsconfig.json
functions/node_modules/.bin/tsc --noEmit -p functions/tsconfig.json
npm test --prefix functions -- --runInBand src/__tests__/domain
just formal-check
```

Não afirmar homologação de toda a UI ou Firebase Emulator com esses gates.

## Resultado da correção

- Chamada do modal ajustada removendo somente a prop não consumida.
- Fixtures separadas: Bolsista isolado e Bolsista+Gestor sem Aluno exercitam a
  exigência de Aluno; Aluno+Bolsista+Gestor exercita a incompatibilidade.
- TypeScript frontend e functions: exit 0.
- Jest domain: 2 suítes, 12 testes aprovados (antes: 9/10).
- `just formal-check`: exit 0; Rust, CUE, Alloy e stale passaram. latexmk confirmou
  PDF atualizado, sem necessidade de recompilar fontes LaTeX que não mudaram.
- Nenhum arquivo de lógica executável do backend, schema formal, fragmento gerado,
  configuração Firebase, PDF ou worklog congelado foi alterado nesta unidade.
- Não há mudança de regra 3B ou contraexemplo pós-3B. O escopo validado é M0 mais
  os checks de aplicação acima, não homologação ponta a ponta ou Firebase Emulator.

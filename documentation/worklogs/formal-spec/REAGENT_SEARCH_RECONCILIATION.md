# Reconciliação documental — busca de reagentes (pós-M10)

## Estado e escopo

- **Branch:** `feat/formal-spec-cue-alloy` (única).
- **HEAD de entrada:** `03aa2771b7237afb59d22daae6e29198503f8034`, árvore limpa,
  `origin/feat/formal-spec-cue-alloy` sincronizada.
- **Tipo:** reconciliação documental pequena e verificável; não implementa o
  pipeline JSON nem altera frontend, backend, Rules, índices, CUE, IR, Alloy,
  receipts, validadores Rust ou fragmentos gerados. Não inicia M11.
- **Baseline e gate depois:** `just formal-check` exit `0` antes e depois.

## Achados e evidências

| ID | Achado | Evidência | Resolução |
|---|---|---|---|
| RS-F01 | Seção 5 reintroduzia `letra_inicial` de `Resumo_Reagente` como requisito de filtro de igualdade no Firestore. | `Section-5` §``Reintrodução``, quadro de coleções, nota ``Reagentes`` e 5.10.1. | Depreciação proposta registrada; campo/mapping mantidos como **legado**, sem tratá-los como requisito da busca JSON e sem novo índice. Rodada formal separada para remover (altera CUE/IR/hashes). |
| RS-F02 | 5.10.1 exigia filtro obrigatório e query Firestore para reagentes. | ``O usuário deve obrigatoriamente escolher...``. | Reescrita: busca em memória sobre o catálogo JSON inteiro (Seção 10.5), sem consulta por tecla e sem filtro prévio; filtros opcionais. |
| RS-F03 | Seção 8 justificava o seletor do modal ``Adicionar Frasco`` por limitação de busca. | ``Section-8`` modal e UI-06. | Seletor nome/CAS/fórmula passa a ser escolha opcional de UX; preservadas especificação, lote, autorização e validação canônica. |
| RS-F04 | 10.5 listava papéis sem `Aluno` e dizia ``Aluno puro não ganha acesso apenas por estar autenticado``. | Seção 3 (``Consultar estoque de reagentes`` = ✓ para Aluno), M9/Seção 7 (delega à Seção 3) e Seção 11 (já incluía `Aluno`). | Alinhado: papéis da matriz da Seção 3 (Chefe, Gestor Almox., Professor, Aluno, Bolsista); autenticação sozinha não concede; acesso mediado e fallback com mesma decisão. Sem HQ (autoridade inequívoca). |
| RS-F05 | `frontend/src/app/reagentes/page.tsx` (`searchFirestore`) exige filtro, consulta `Resumo_Reagente` e filtra por inicial; `filteredReagentes` faz substring só depois. | Linhas 265--293. | **Dívida de implementação**, não alterada nesta rodada. |
| RS-F06 | `generated/firestore/resumo_reagente.tex` afirma `letra_inicial` como denormalização exclusiva do Firestore. | Nota do mapeamento CUE (`specification/cue/firestore/mapeamentos.cue`). | Não alterado (fragmento gerado/CUE). A depreciação de RS-F01 só se concretiza em rodada formal própria. |

## Decisões

1. **Fonte canônica e projeção.** Firestore permanece a fonte canônica; o
   catálogo JSON publicado é projeção autorizada de busca/apresentação; o cache
   local é descartável. A busca de reagentes ocorre em memória sobre o catálogo
   inteiro, sem consulta Firestore por tecla e sem filtro prévio.
2. **`letra_inicial` de Reagentes.** Prova de referências: fora de Reagentes o
   campo só aparece em Alunos (`letra_inicial`) e Patrimônio
   (`letra_inicial_nome`), estratégias próprias; em Reagentes nenhuma obrigação
   de produto, autorização, integridade ou índice depende dele além da antiga
   busca. Mantido como legado; depreciação proposta para rodada formal separada.
3. **Apresentação e navegação.** Lista inicial ordenada por
   `Intl.Collator('pt-BR', {numeric:true, sensitivity:'base'})` com desempate por
   ID; janela de até 50 resultados renderizados com expansão progressiva
   (virtualização é opção); toda a busca/filtro considera o catálogo inteiro;
   reinício de janela e estados de carregamento/erro/versão antiga preservados;
   categoria `#` explícita para nomes cujo primeiro elemento significativo
   normalizado não é A--Z; A--Z/`#` são navegação opcional derivada, nunca campo
   obrigatório. Busca tolerante a caixa/acentos preservando símbolos e dígitos.
4. **Acesso do Aluno.** Resolvido pela matriz da Seção 3 + delegação M9
   (Seção 7) + Seção 11; 10.5 alinhada. Nenhuma permissão ampliada ou reduzida
   por suposição.

## Arquivos alterados

- `documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex`
- `documentation/Section-8-Descricao-das-telas-Dashboards.tex`
- `documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/Section-10-Subsection-5-Fluxo-de-Reagentes.tex`
- `documentation/main.tex` (nenhuma alteração; PDF recompilado)
- `documentation/main.pdf` (publicado) e `build/latex/main.pdf` (artefato)
- `documentation/STATUS_ATUAL.md`, `FORMAL_SPEC_STATE.md` (status corrente)

## Comandos e resultados

- Antes: `git status --short --branch`, `git fetch origin`, `just formal-check`
  → exit `0`; árvore limpa; `documentation/generated/` sem diff.
- Depois: `just formal-check` → exit `0` (rust-check, alloy-check/guards,
  docs-check, docs-build, stale gate e `git diff --check`).
- PDF: `latexmk` exit `0`, **390 páginas**, 0 erros, 0 referências indefinidas,
  29 Overfull (perfil herdado; nenhum novo nos trechos editados após ajuste),
  14 avisos ``Infinite glue shrinkage`` (baseline: 15).
- Inspeção visual das páginas afetadas: 3 (sumário), 55, 100--101, 162 e
  270--271 legíveis, sem corte ou sobreposição.

## Impacto em M0--M10

Nenhum. CUE, fixtures, IR, Alloy, receipts, validadores Rust e
`documentation/generated/` permanecem inalterados; stale gate sem diff. M0--M10
seguem **VALIDATED**. O PDF do trabalho agora tem 390 páginas (de 389).

## Dívida da aplicação

O frontend atual (§RS-F05) ainda implementa a estratégia antiga de busca no
Firestore. O pipeline de catálogo JSON, a atualização por versão publicada, o
fallback por ID e a apresentação/janela normativas continuam **especificados,
não implementados**. Esta reconciliação não proclama que a aplicação implementa
o contrato documental.

## Human Questions

**Nenhuma.** O conflito de acesso do Aluno tem autoridade inequívoca (Seção 3 +
M9/Seção 7 + Seção 11) e foi reconciliado. A depreciação de `letra_inicial` não
é ambígua: é decisão de rodada formal própria por alterar o baseline.

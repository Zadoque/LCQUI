# DECISOES_DOCUMENTAIS_NECESSARIAS — Consolidação Gemini Spark × LaTeX LCQUI

Decisões que não podem ser derivadas das decisões vigentes e requerem escolha humana.

Lote 3B: decisões abaixo identificadas na revisão de `5c8a6ad9`. Não alteram retroativamente a validação do Lote 3A. As alternativas são propostas para deliberação, não contratos aprovados.

## DDP-3B-01 — Quebra/esgotamento durante empréstimo sem medição válida

**Estado:** DECISAO_PENDENTE.

**Contexto:** Seção 4 proíbe VAZIO/QUEBRADO + EMPRESTADO; UI-07 exige encerramento auditado antes da transição. O empréstimo só possui estados de devolução e o cálculo ordinário exige peso de retorno. Não há contrato de encerramento excepcional quando o recipiente quebra e não pode ser pesado. A regra Q06 cobre esgotamento e recalibração, mas não autoriza inventar medição ou classificar perda como consumo.

**Alternativas:** (1) encerramento excepcional com consumo não apurável/perda discriminada e eventual mudança de modelo; (2) manter empréstimo pendente até apuração formal com procedimento institucional definido. Não adotar devolução com peso fictício.

**Pergunta ao responsável:** Quem registra e como se encerra uma quebra durante empréstimo quando não é possível medir o retorno? Que valor/status de consumo e perda deve permanecer?

**IDs/contratos dependentes:** PDF-014, quebra/vazio excepcional, e respectivo encerramento. Retirada/devolução nominal e fórmula Q06 não dependem dessa escolha.

**Arquivos dependentes:** Seções 4/5 (se mudar modelo), 7, UI-07, ALM-06, seção 10/Fluxo-de-Reagentes, seção 11 e relatórios afetados.

## DDP-3B-02 — Quarentena de frasco emprestado

**Estado:** DECISAO_PENDENTE.

**Contexto:** Quarentena é dimensão ortogonal que bloqueia nova retirada, mas o baseline não diz se pode ser registrada enquanto EM_USO/ATRASADO nem se exige recolhimento prévio.

**Alternativas:** (1) marcar quarentena e manter empréstimo ativo até retorno; (2) exigir devolução anterior à quarentena. A primeira exige definir liberação/retorno e rastreabilidade enquanto o frasco permanece com o portador.

**Pergunta ao responsável:** A quarentena pode ser aplicada durante empréstimo, preservando-o até o retorno, ou exige primeiro a devolução?

**IDs/contratos dependentes:** PDF-014, entrada/liberação de quarentena com empréstimo ativo. Quarentena de frasco disponível já tem efeito de bloqueio definido.

**Arquivos dependentes:** Seção 7, UI-07, ALM-06 e seção 10/Fluxo-de-Reagentes.

## DDP-3B-03 — Pendência de descarte de frasco íntegro não vencido

**Estado:** DECISAO_PENDENTE.

**Contexto:** O rótulo é derivado de VAZIO/QUEBRADO ou vencido sem autorização e fora da quarentena. Não há campo para decisão independente de pendência de descarte. O prompt exige contrato da operação, mas não amplia explicitamente sua elegibilidade.

**Alternativas:** (1) restringir a operação às situações já representáveis; (2) permitir pendência independente e definir representação ortogonal, motivo, revogação, efeito no empréstimo e relatórios. Não usar detalhe_status como enum oculto nem falsear vencimento.

**Pergunta ao responsável:** A operação deve ficar restrita aos casos derivados existentes ou também abranger frasco íntegro não vencido?

**IDs/contratos dependentes:** PDF-014, pendência de descarte fora dos casos já modelados.

**Arquivos dependentes:** Seções 4/5 se ampliar modelo, 7, UI-07, ALM-06 e seção 10/Fluxo-de-Reagentes.

## DDP-3B-04 — Abandono e persistência intermediária do wizard

**Estado:** DECISAO_PENDENTE.

**Contexto:** UI-05 diz que salvar cada entidade retorna seu ID, e ALM-01 manda persistir cada etapa. Não há status RASCUNHO, contrato de exclusão por abandono nem confirmação de que entidades sem frascos constituem cadastros independentes completos.

**Alternativas:** (1) preservar entidades intermediárias confirmadas como catálogo independente, visível conforme papéis, e retomar por seleção dos IDs; (2) rever a persistência para confirmação conjunta ou rascunhos com lifecycle completo. A opção 1 é a mais próxima do salvamento por entidade existente; ainda exige decisão explícita sobre abandono e visibilidade. Mistura só pode ser salva com composição válida.

**Pergunta ao responsável:** Ao cancelar/fechar o navegador depois de criar Resumo, Especificação ou Lote, esses cadastros confirmados permanecem como entidades independentes reutilizáveis? Se não, qual política deve substituí-los?

**IDs/contratos dependentes:** PDF-021, criação intermediária/abandono/retomada. Seleção de entidades já existentes e cadastro final não dependem de inventar rascunhos.

**Arquivos dependentes:** UI-05/06, ALM-01/02, seção 10/Fluxo-de-Reagentes e seção 11.

## Formato para novas entradas

```
## DDP-NNN — Título

**Contexto:** ...

**Alternativas mutuamente exclusivas:**
1. ...
2. ...

**Impactos:**
- Opção 1: ...
- Opção 2: ...

**Recomendação técnica fundamentada:** ...

**Pergunta objetiva ao responsável:** ...

**IDs bloqueados:** PDF-XXX, ...

**Arquivos que dependem da decisão:** Section-X.tex, ...
```

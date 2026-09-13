# Plano de Atualização dos Arquivos LaTeX — LCQUI

Criação: 13/09/2026. Este plano lista apenas alterações LaTeX matematicamente certas — ou seja, cujas decisões de domínio já estão registradas em `MODIFICACOES_CONSOLIDADAS_LCQUI.md` e que não dependem de itens abertos em `DUVIDAS_PENDENTES_LCQUI.md`. Alterações condicionadas a decisões pendentes estão marcadas com **[BLOQUEADO por DP-X]**.

Regra geral: não alterar arquivos `.tex` diretamente durante a análise. Toda alteração de `.tex` requer compilação prévia com `latexmk -pdf -halt-on-error` em diretório isolado (`/tmp/lcqui-tex-build`) e verificação de ausência de erros e referências indefinidas.

---

## Prioridade 1 — Crítico (bloqueiam implementação de código)

### P1-01 — Adicionar `roteiro_anexo` ao dicionário Seção 5.9 §Post
**Arquivo**: `Section-5-Notas-de-Mapeamento-para-Firestore.tex`
**Localização**: Parágrafo `\paragraph{Post}` (circa linha 559–570)
**Ação**: Adicionar após o campo `\item[\texttt{criado\_em}]` o seguinte item de dicionário:
```
\item[\texttt{roteiro\_anexo}] map; N. Snapshot embutido do roteiro vinculado ao post, gravado no momento da publicação para viabilizar download por alunos sem acesso à coleção raiz \texttt{Roteiro\_Experimento}. Subcampos: \texttt{id\_roteiro} (string; O), \texttt{nome\_arquivo} (string; O; máximo 150 caracteres), \texttt{tamanho\_bytes} (number inteiro positivo; O), \texttt{storage\_path} (string; O). Imutável após publicação do post; revogação de compartilhamento não remove o snapshot histórico.
```
**Justificativa**: MODIFICACOES §3.1; AUD-29.
**Dependência**: Nenhuma — decisão já registrada.

---

### P1-02 — Remover `Roteiro_Professor_Compartilhado` da tabela de mapeamento e adicionar ACL ao dicionário §Roteiro_Experimento
**Arquivo**: `Section-5-Notas-de-Mapeamento-para-Firestore.tex`
**Localização A**: Tabela de mapeamento (circa linha 110) — linha com `Roteiro\_Professor\_Compartilhado & Coleção raiz & ...`
**Ação A**: Substituir essa linha por nota explicativa de que a coleção 3FN é mantida apenas no modelo relacional; no Firestore, a ACL é implementada como array `professores_compartilhados` no documento `Roteiro_Experimento`.
**Localização B**: Parágrafo `\paragraph{Roteiro\_Experimento}` (circa linha 457–465)
**Ação B**: Adicionar campo `\item[\texttt{professores\_compartilhados}]` ao dicionário.
**Justificativa**: MODIFICACOES §3.2; AUD-30.
**Dependência**: Nenhuma — decisão já registrada.

---

### P1-03 — Atualizar pseudocódigo de `registrarDevolucao` na Seção 10 para fórmula Q06 híbrida
**Arquivo**: `Section-10-Tecnologia-e-Relatorios-Vercel-Firebase.tex`
**Localização**: Listagem `registrarDevolucao` (circa linha 467–563)
**Ações**:
1. Substituir `const MARGEM_HIGROSCOPICA = 0.02` e `limiteMaxRetorno = peso_saida * 1.02` pela fórmula híbrida:
   ```typescript
   // Resolver eh_higroscopico via cadeia Frasco → Especificacao → Resumo
   const ehHigroscopico: boolean = /* resolverEhHigroscopico(frasco) */;
   const deltaMax = ehHigroscopico
     ? Math.max(2.0, 0.02 * emprestimo.peso_saida)
     : Math.max(1.0, 0.005 * emprestimo.peso_saida);
   const limiteMaxRetorno = emprestimo.peso_saida + deltaMax;
   ```
2. Quando `dados.pesoRetorno > emprestimo.peso_saida` mas dentro da tolerância: registrar consumo `0` (não incrementar `medida_usada`), atualizar `peso_atual = pesoRetorno`, criar entrada `Historico_Frasco_Reagente` do tipo `AJUSTE` com `campo_ajustado = 'ganho_massa_higroscopia'`.
3. Adicionar nota de que `medida_usada` acumula **sempre em gramas** (não mL), conforme Seção 5.9.
**Justificativa**: MODIFICACOES §2.1–2.3; AUD-17, AUD-18.
**Dependência**: DP-A01 (posicionamento de `eh_higroscopico`) e DP-A02 (estratégia de leitura) devem ser resolvidos antes de finalizar este item.

---

### P1-04 — Adicionar campos Q11 à entidade `Comentario` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Comentario` (circa linha 637–644)
**Ação**: Adicionar ao bloco `\begin{entidade}{Comentario}`:
```latex
\campo{moderado}{BOOLEAN}{DEFAULT FALSE, NOT NULL}
\campo{motivo\_moderacao}{TEXT}{NULL}
```
**Justificativa**: MODIFICACOES §Q11; AUD-31.
**Dependência**: DP-C02 (visibilidade do histórico de moderação) deve ser resolvido antes, pois pode adicionar campo `moderado_por INTEGER FK NULL`.

---

### P1-05 — Adicionar `token_hash` à entidade `Convite_Aluno` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Convite para Aluno` (circa linha 545–562)
**Ação**: Adicionar campo ao bloco:
```latex
\campo{token\_hash}{VARCHAR(100)}{NOT NULL}
```
Adicionar também regra de chave determinística:
```latex
\begin{regra}
O docId do convite no Firestore é determinístico: \texttt{convite\_\{turmaId||'global'\}\_\{hashEmail\}}, impedindo convites simultâneos para o mesmo destinatário na mesma turma. O \texttt{token\_hash} é o hash do segredo de convite; nunca armazenar o token em claro.
\end{regra}
```
**Justificativa**: MODIFICACOES §Q02; AUD-32.
**Dependência**: DP-C03 (estratégia de renovação) deve ser resolvida antes para saber se adicionar campo `revogado_em`.

---

### P1-06 — Adicionar `Bolsista` ao enum `papel_destinatario` de `Notificacao` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Notificação (Unificada)` (circa linha 564–602), campo `papel_destinatario`
**Ação**: Adicionar `Bolsista` ao enum:
```latex
\campo{papel\_destinatario}{ENUM}{
  \shortstack[l]{%
    Aluno, Professor, Bolsista,\\ Gestor\_Bens\_Patrimoniais,\\ Gestor\_Almoxarifado%
  }
}{NOT NULL}
```
**Justificativa**: MODIFICACOES §Q12; AUD-34.
**Dependência**: Nenhuma — decisão já registrada.

---

## Prioridade 2 — Alta (completam entidades e dicionário)

### P2-01 — Adicionar `abertura_historica_desconhecida` à entidade `Frasco_Reagente` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Frasco de Reagente / Solvente` (circa linha 317–365), após campo `data_abertura`
**Ação**:
```latex
\campo{abertura\_historica\_desconhecida}{BOOLEAN}{DEFAULT FALSE, NOT NULL}
```
**Justificativa**: MODIFICACOES §Q05; AUD-22. Permite distinguir `data_abertura = null` (nunca aberto) de `data_abertura = null, abertura_historica_desconhecida = true` (aberto em data desconhecida).
**Dependência**: Nenhuma — decisão já registrada em Q05.

---

### P2-02 — Adicionar `auto_atendimento` à entidade `Emprestimo_Reagente` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Empréstimo de Reagente / Solvente` (circa linha 395–413)
**Ação**:
```latex
\campo{auto\_atendimento}{BOOLEAN}{DEFAULT FALSE, NOT NULL}
```
Com nota de regra:
```latex
\begin{regra}
Q14: Quando o único gestor ativo registra empréstimo para si mesmo, \textit{auto\_atendimento = true} é gravado pelo servidor, notificação de auditoria é enviada ao Chefe Geral e justificativa obrigatória é registrada.
\end{regra}
```
**Justificativa**: MODIFICACOES §Q14; AUD-23.
**Dependência**: Nenhuma.

---

### P2-03 — Adicionar invariante de não-negatividade à entidade `Emprestimo_Reagente` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Após campo `medida_utilizada` (circa linha 408)
**Ação**: Adicionar nota explícita:
```latex
\begin{regra}
Q06 §2.1: \textit{medida\_utilizada} $\geq 0$. O consumo é $\max(0, \textit{peso\_saida} - \textit{peso\_retorno})$; nunca negativo. Ganho higroscópico dentro da tolerância registra consumo 0 no empréstimo e cria entrada de ajuste em \textit{Historico\_Frasco\_Reagente}.
\end{regra}
```
**Justificativa**: MODIFICACOES §2.1; AUD-24.
**Dependência**: Nenhuma.

---

### P2-04 — Adicionar `novo_id_resumo_bem_patrimonial` e `versao_bem_origem` a `Requisicao_Edicao_Bem_Patrimonial` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Requisicao Professor edicao Bem patrimonial` (circa linha 97–113)
**Ação**: Adicionar campos:
```latex
\campo{novo\_id\_resumo\_bem\_patrimonial}{INTEGER}{FK, NULL}
\campo{versao\_bem\_origem}{INTEGER}{NOT NULL}
```
Com nota:
```latex
\begin{regra}
Reclassificação: quando \textit{novo\_nome} é preenchido, o aprovador resolve (ou cria) um \textit{Resumo\_Bem\_Patrimonial} alvo e grava \textit{novo\_id\_resumo\_bem\_patrimonial}; a aprovação altera apenas o bem solicitado, sem renomear globalmente o resumo original. \textit{versao\_bem\_origem} detecta edições concorrentes ao mesmo bem.
\end{regra}
```
**Justificativa**: MODIFICACOES §5.3; AUD-25, AUD-26.
**Dependência**: Nenhuma.

---

## Prioridade 3 — Média (aguardam decisão de DP ou são cosméticas)

### P3-01 — Atualizar `Composicao_Reagente` para Q03 (Seção 4) — **[BLOQUEADO por DP-A03]**
Após resolução de DP-A03, substituir campos `valor_composicao`/`unidade` por `valor_min NUMERIC NULL`, `valor_max NUMERIC NULL`, `notacao_original_fabricante VARCHAR(50) NULL` e adicionar constraint de faixa.

### P3-02 — Mover ou adicionar `estado_fisico`/`eh_higroscopico` a `Resumo_Reagente` — **[BLOQUEADO por DP-A01]**
Após resolução de DP-A01, aplicar alteração na entidade `Resumo_Reagente` (Seção 4) e no dicionário 5.9.

### P3-03 — Atualizar query de `estados_fisicos` para escalar na Seção 5 — **[BLOQUEADO por DP-A01]**
Depende de DP-A01.

### P3-04 — Adicionar `ativo` a `Bem_Patrimonial` — **[BLOQUEADO por DP-B01]**
Após resolução de DP-B01.

### P3-05 — Esclarecer foto obrigatória em `Requisicao_Adicao_Bem_Patrimonial` — **[BLOQUEADO por DP-B02]**
Após resolução de DP-B02.

### P3-06 — Clarificar combinação Aluno+Gestor_Almoxarifado na matriz de Seção 7 — **[BLOQUEADO por DP-C01]**
Após resolução de DP-C01.

---

## Procedimento de validação após cada alteração

1. Executar:
   ```sh
   cd /home/dock/dev/LCQUI/documentation
   latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-build main.tex
   ```
2. Verificar: zero erros, zero referências indefinidas (`undefined reference`).
3. Inspecionar visualmente as páginas afetadas no PDF gerado.
4. Copiar PDF para `documentation/main.pdf` somente após aprovação visual.
5. Registrar o resultado em `STATUS_ATUAL.md`.

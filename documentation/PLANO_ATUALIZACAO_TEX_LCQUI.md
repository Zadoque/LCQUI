# Plano de Atualização dos Arquivos LaTeX — LCQUI

Criação: 13/09/2026. Atualização: 13/09/2026 (desbloqueio de P3 após resolução DP-A01–DP-D02).

Regra geral: não alterar arquivos `.tex` diretamente durante a análise. Toda alteração de `.tex` requer compilação prévia com `latexmk -pdf -halt-on-error` em diretório isolado (`/tmp/lcqui-tex-build`) e verificação de ausência de erros e referências indefinidas.

---

## Prioridade 1 — Crítico (bloqueiam implementação de código)

### P1-01 — Adicionar `roteiro_anexo` ao dicionário Seção 5.9 §Post
**Arquivo**: `Section-5-Notas-de-Mapeamento-para-Firestore.tex`
**Localização**: Parágrafo `\paragraph{Post}` (circa linha 559–570)
**Ação**: Adicionar após o campo `\item[\texttt{criado\_em}]`:
```latex
\item[\texttt{roteiro\_anexo}] map; N. Snapshot embutido do roteiro vinculado ao post,
gravado no momento da publicação para viabilizar download por alunos sem acesso à coleção
raiz \texttt{Roteiro\_Experimento}. Subcampos: \texttt{id\_roteiro} (string; O),
\texttt{nome\_arquivo} (string; O; máximo 150 caracteres), \texttt{tamanho\_bytes}
(number inteiro positivo; O), \texttt{storage\_path} (string; O). Imutável após
publicação do post; revogação de compartilhamento não remove o snapshot histórico.
```
**Justificativa**: MODIFICACOES §3.1; AUD-29. **Status**: ✅ Pronto para execução.

---

### P1-02 — Remover `Roteiro_Professor_Compartilhado` da tabela de mapeamento; adicionar ACL ao §Roteiro_Experimento
**Arquivo**: `Section-5-Notas-de-Mapeamento-para-Firestore.tex`
**Localização A**: Tabela de mapeamento (circa linha 110)
**Ação A**: Substituir linha `Roteiro\_Professor\_Compartilhado & Coleção raiz & ...` por nota explicativa: coleção existe apenas no modelo relacional 3FN; no Firestore, a ACL é o array `professores_compartilhados` no documento `Roteiro_Experimento`.
**Localização B**: Parágrafo `\paragraph{Roteiro\_Experimento}` (circa linha 457–465)
**Ação B**: Adicionar campo:
```latex
\item[\texttt{professores\_compartilhados}] array de strings; N. Lista de UIDs de
professores com acesso de leitura ao roteiro, gerenciada pelo servidor; nunca aceitar
adição direta por cliente.
```
**Justificativa**: MODIFICACOES §3.2; AUD-30. **Status**: ✅ Pronto para execução.

---

### P1-03 — Atualizar pseudocódigo de `registrarDevolucao` na Seção 10 (fórmula Q06 híbrida + unidade `medida_usada`)
**Arquivo**: `Section-10-Tecnologia-e-Relatorios-Vercel-Firebase.tex`
**Localização**: Listagem `registrarDevolucao` (circa linha 467–563)

> ⚠️ **Dependência de execução — aplicar P3-07 antes ou junto com este item.**
> O pseudocódigo referencia `frasco.eh_higroscopico`. P3-07 documenta o campo físico na Seção 5; ele não integra a entidade relacional 3FN.
>
> ⚠️ **Dependência de assinatura — usar a assinatura atualizada de P3-09.**
> A chamada dentro de `registrarDevolucao` deve usar o parâmetro `requerAtivo = true` introduzido em P3-09:
> ```typescript
> await validarPermissao(request, ["Chefe_Geral", "Gestor_Almoxarifado"], true);
> await validarGestorDoAlmoxarifado(request, frasco.id_almoxarifado);
> ```

**Ações**:
1. Substituir margem plana `MARGEM_HIGROSCOPICA = 0.02` pela fórmula híbrida (lê `eh_higroscopico` direto do frasco — snapshot gravado no cadastro, conforme DP-A02):
```typescript
const ehHigroscopico: boolean = frasco.eh_higroscopico ?? false;
const deltaMax = ehHigroscopico
  ? Math.max(2.0, 0.02 * emprestimo.peso_saida)   // higroscópico: max(2g, 2%)
  : Math.max(1.0, 0.005 * emprestimo.peso_saida);  // normal: max(1g, 0,5%)
const limiteMaxRetorno = emprestimo.peso_saida + deltaMax;
```
2. Quando `pesoRetorno > peso_saida` mas dentro da tolerância: consumo = 0, `peso_atual = pesoRetorno`, gerar `Historico_Frasco_Reagente` tipo `AJUSTE` com `campo_ajustado = 'ganho_massa_higroscopia'`. **Não** incrementar `medida_usada`.
3. Substituir `FieldValue.increment(volumeUtilizado)` em `medida_usada` por `FieldValue.increment(pesoConsumido)` (sempre em **gramas**). O consumo em mL pertence exclusivamente a `Emprestimo_Reagente.medida_utilizada`.

**Justificativa**: MODIFICACOES §2.1–2.3, §7.2; AUD-17, AUD-18; DP-A01 ✅ DP-A02 ✅. **Status**: ✅ Desbloqueado — pronto para execução (executar após P3-07 e P3-09).

---

### P1-04 — Adicionar campos Q11 + moderado_por à entidade `Comentario` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Comentario` (circa linha 637–644)
**Ação**: Adicionar ao bloco `\begin{entidade}{Comentario}`:
```latex
\campo{moderado}{BOOLEAN}{DEFAULT FALSE, NOT NULL}
\campo{motivo\_moderacao}{TEXT}{NULL}
\campo{moderado\_por}{INTEGER}{FK, NULL}
```
Adicionar regra de visibilidade:
```latex
\begin{regra}
DP-C02: O autor vê seu texto com tarja de moderação. Colegas veem aviso institucional.
Professor e Chefe\_Geral veem o texto original e o histórico. Bolsista segue visibilidade
de Aluno.
\end{regra}
```
**Justificativa**: MODIFICACOES §Q11, §7.7; AUD-31; DP-C02 ✅. **Status**: ✅ Desbloqueado — pronto para execução.

---

### P1-05 — Adicionar `token_hash` e campo `ultimo_reenvio_por` à entidade `Convite_Aluno` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Convite para Aluno` (circa linha 545–562)
**Ação**: Adicionar campos:
```latex
\campo{token\_hash}{VARCHAR(100)}{NOT NULL}
\campo{ultimo\_reenvio\_por}{INTEGER}{FK, NULL}
```
Adicionar regra:
```latex
\begin{regra}
DP-C03: docId determinístico derivado no servidor por HMAC-SHA-256 do contexto
(turma/global) e e-mail normalizado, usando segredo exclusivo do servidor.
Reenvio substitui \texttt{token\_hash} e \texttt{expira\_em} in-place (sem campo
\texttt{revogado\_em}); link anterior é revogado imediatamente. Nunca armazenar token
em claro. Gerar token aleatório com CSPRNG (32 bytes) e persistir somente SHA-256
do token; comparação em tempo constante, expiração e consumo único transacional.
Não usar hash simples de e-mail como identificador público; HMAC é pseudonimização,
não anonimização, e o documento continua com acesso restrito.
\end{regra}
```
**Justificativa**: MODIFICACOES §Q02, §7.8; AUD-32; DP-C03 ✅. **Status**: ✅ Desbloqueado — pronto para execução.

---

### P1-06 — Adicionar `Bolsista` ao enum `papel_destinatario` de `Notificacao` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Notificação (Unificada)` (circa linha 564–602), campo `papel_destinatario`
**Ação**: Adicionar `Bolsista` ao enum:
```latex
\campo{papel\_destinatario}{ENUM}{Aluno, Professor, Bolsista, Gestor\_Bens\_Patrimoniais,
Gestor\_Almoxarifado}{NOT NULL}
```
**Justificativa**: MODIFICACOES §Q12; AUD-34. **Status**: ✅ Pronto para execução.

---

## Prioridade 2 — Alta (completam entidades e dicionário)

### P2-01 — Adicionar `abertura_historica_desconhecida` à entidade `Frasco_Reagente` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Frasco de Reagente / Solvente` (circa linha 317–365), após campo `data_abertura`
**Ação**:
```latex
\campo{abertura\_historica\_desconhecida}{BOOLEAN}{DEFAULT FALSE, NOT NULL}
```
**Justificativa**: MODIFICACOES §Q05; AUD-22. **Status**: ✅ Pronto para execução.

---

### P2-02 — Adicionar `auto_atendimento` à entidade `Emprestimo_Reagente` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Empréstimo de Reagente / Solvente` (circa linha 395–413)
**Ação**:
```latex
\campo{auto\_atendimento}{BOOLEAN}{DEFAULT FALSE, NOT NULL}
```
```latex
\begin{regra}
Q14: Quando o único gestor ativo registra empréstimo para si mesmo,
\textit{auto\_atendimento = true} é gravado pelo servidor, notificação de auditoria é
enviada ao Chefe Geral e justificativa obrigatória é registrada.
\end{regra}
```
**Justificativa**: MODIFICACOES §Q14; AUD-23. **Status**: ✅ Pronto para execução.

---

### P2-03 — Adicionar invariante de não-negatividade à entidade `Emprestimo_Reagente` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Após campo `medida_utilizada` (circa linha 408)
**Ação**:
```latex
\begin{regra}
Q06 §2.1: \textit{medida\_utilizada} $\geq 0$. Consumo = $\max(0, \textit{peso\_saida}
- \textit{peso\_retorno})$. Ganho higroscópico dentro da tolerância registra consumo 0
no empréstimo e cria entrada de ajuste em \textit{Historico\_Frasco\_Reagente}.
\end{regra}
```
**Justificativa**: MODIFICACOES §2.1; AUD-24. **Status**: ✅ Pronto para execução.

---

### P2-04 — Adicionar `novo_id_resumo_bem_patrimonial` e `versao_bem_origem` a `Requisicao_Edicao_Bem_Patrimonial` (Seção 4)
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Requisicao Professor edicao Bem patrimonial` (circa linha 97–113)
**Ação**:
```latex
\campo{novo\_id\_resumo\_bem\_patrimonial}{INTEGER}{FK, NULL}
\campo{versao\_bem\_origem}{INTEGER}{NOT NULL}
```
```latex
\begin{regra}
Reclassificação: quando \textit{novo\_nome} é preenchido, o aprovador resolve (ou cria)
um \textit{Resumo\_Bem\_Patrimonial} alvo e grava
\textit{novo\_id\_resumo\_bem\_patrimonial}; a aprovação altera apenas o bem solicitado,
sem renomear globalmente o resumo original. \textit{versao\_bem\_origem} detecta edições
concorrentes ao mesmo bem.
\end{regra}
```
**Justificativa**: MODIFICACOES §5.3; AUD-25, AUD-26. **Status**: ✅ Pronto para execução.

---

### P2-05 — Remover filtro de prédio/sala do painel de Professor e documentar como escopo V2 (Q01)
**Arquivos**:
- `Section-8-Descricao-das-telas-Dashboards.tex`
- `Section-12-Implementacoes-em-Estudo-para-Versoes-Futuras.tex`

**Localização A**: Subseção `§8.3.3 — Filtros de busca de Professor` (campo de filtro por prédio/número de sala)
**Ação A**: Remover o item *"Prédio ou número da sala"* da lista de filtros disponíveis na tela de busca de professores. Manter apenas: Nome, Matéria lecionada, Centro e Laboratório.
Substituir a referência ao filtro por nota:
```latex
\begin{nota}
Q01: O filtro por lotação física (prédio/gabinete/sala) foi postergado para a V2.
Na V1, a busca de professor suporta apenas Nome, Matéria lecionada, Centro e Laboratório.
\end{nota}
```
**Localização B**: Seção 12.5 (ou nova subseção) — Implementações Futuras
**Ação B**: Adicionar parágrafo documentando o escopo postergado:
```latex
\subsubsection{Lotação física de gabinete e alocação de salas (V2)}
Q01: A vinculação de professores a gabinetes, prédios e salas específicas foi removida da
V1 por insuficiência de dados estruturados. Na V2, serão integrados os dados de lotação da
SECRETARIA/UENF para permitir filtragem espacial no mapa do campus.
```
**Justificativa**: MODIFICACOES §Q01. **Status**: ✅ Pronto para execução.

---

### P2-06 — Expandir enum `finalidade_uso` e adicionar `justificativa_metodologica` em `Emprestimo_Reagente` (Q04)
**Arquivos**:
- `Section-4-Modelagem-Entidades-SQL-3FN.tex`
- `Section-8-Descricao-das-telas-Dashboards.tex`

**Localização A**: Subseção `§4.22 — Emprestimo_Reagente` (ou a subseção que define `finalidade_uso`)
**Ação A**: Expandir o enum `finalidade_uso` e adicionar campo opcional:
```latex
\campo{finalidade\_uso}{ENUM}{
  \shortstack[l]{%
    AULA\_PRATICA, DEMONSTRACAO,\\
    PESQUISA\_TCC\_POS, ESTUDO\_DEGRADACAO\_RESIDUOS%
  }
}{NOT NULL}
\campo{justificativa\_metodologica}{TEXT}{NULL}
```
Adicionar regra de governança:
```latex
\begin{regra}
Q04: Quando \textit{finalidade\_uso} $\in$ \{\texttt{PESQUISA\_TCC\_POS},
\texttt{ESTUDO\_DEGRADACAO\_RESIDUOS}\} e o frasco está vencido
(\textit{data\_validade} $<$ \texttt{now()}), a retirada exige
\textit{justificativa\_metodologica} preenchida e aceite de Termo de Ciência e
Responsabilidade pelo solicitante. Sem o aceite, o servidor rejeita a operação.
\end{regra}
```
**Localização B**: Subseção `UI-07` (tela de registro de retirada de reagente)
**Ação B**: Descrever a trava de governança na interface:
```latex
\begin{ui-comportamento}[UI-07 — Retirada com frasco vencido para pesquisa]
Q04: Quando o usuário seleciona \textit{PESQUISA\_TCC\_POS} ou
\textit{ESTUDO\_DEGRADACAO\_RESIDUOS} e o frasco está com validade expirada, a
interface exibe modal de Termo de Ciência e Responsabilidade (TCR) com texto
institucional parametrizado. O botão ``Confirmar retirada'' só é habilitado após o aceite
explícito do TCR. A ausência de \textit{justificativa\_metodologica} bloqueia o envio.
\end{ui-comportamento}
```
**Rastreabilidade obrigatória**: persistir no empréstimo `tcr_versao`, `tcr_aceito_em` (Timestamp servidor), `tcr_aceito_por` (UID autenticado do solicitante) e `tcr_auditoria_id`, com evento correspondente em `Registro_de_Auditoria`. O aceite deve ser obtido em sessão do retirante e vinculado ao frasco/operação/finalidade, validado pelo backend na retirada; gestor não pode declarar aceite em nome de terceiro. Persistência transacional/idempotente, versão institucional vigente e justificativa de 20–2000 caracteres. Checkbox/modal são UX. O TCR registra ciência e responsabilidade, sem substituir regras institucionais de segurança química. Aplicar também nas Seções 5, 7, 9 e 10.

**Justificativa**: MODIFICACOES §Q04. **Status**: ✅ Pronto para execução.

---

## Prioridade 3 — Desbloqueados após resolução das pendências (antes bloqueados)

### P3-01 — Atualizar `Composicao_Reagente` para Q03 + constraint de faixa (Seção 4)
**Desbloqueado por**: DP-A03 ✅
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Composição do Reagente` (circa linha 246–269)
**Ação**: Substituir campos `valor_composicao`/`unidade` por:
```latex
\campo{valor\_min}{NUMERIC}{NULL}
\campo{valor\_max}{NUMERIC}{NULL}
\campo{notacao\_original\_fabricante}{VARCHAR(50)}{NULL}
```
Adicionar constraint:
```latex
\begin{regra}
DP-A03: \texttt{CHECK (valor\_max IS NULL OR valor\_min <= valor\_max)}.
Concentrações pontuais: \texttt{valor\_min = valor\_max} ou \texttt{valor\_max = NULL}.
Faixas: \texttt{valor\_min < valor\_max}.
\end{regra}
```
**Justificativa**: MODIFICACOES §Q03, §7.3; AUD-21. **Status**: ✅ Desbloqueado — pronto para execução.

---

### P3-02 — Adicionar `estado_fisico` e `eh_higroscopico` à entidade `Resumo_Reagente` (Seção 4)
**Desbloqueado por**: DP-A01 ✅
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Resumo do Reagente / Solvente` (circa linha 209–230)
**Ação**: Adicionar ao bloco `\begin{entidade}{Resumo_Reagente}`:
```latex
\campo{estado\_fisico}{ENUM(SOLIDO,LIQUIDO)}{NOT NULL}
\campo{eh\_higroscopico}{BOOLEAN}{DEFAULT FALSE, NOT NULL}
```
Substituir nota que afirma que estado físico é propriedade exclusiva da Especificacao por:
```latex
\begin{explicacao}
DP-A01: Em CNTP, substâncias em estados físicos distintos são produtos químicos
distintos e, portanto, resumos distintos. \texttt{estado\_fisico} e
\texttt{eh\_higroscopico} são propriedades do grupo de substâncias representado pelo
resumo, não da especificação comercial individual. A unidade operacional de catálogo
(\texttt{g} para SOLIDO, \texttt{ml} para LIQUIDO) é derivada diretamente deste campo.
\end{explicacao}
```
**Justificativa**: MODIFICACOES §1.1, §7.1; AUD-19. **Status**: ✅ Desbloqueado — pronto para execução.

---

### P3-03 — Atualizar queries de busca de catálogo na Seção 5 (escalar → `array-contains` eliminado)
**Desbloqueado por**: DP-A01 ✅
**Arquivo**: `Section-5-Notas-de-Mapeamento-para-Firestore.tex`
**Localização**: Subseção `Estratégia de Busca Textual → Reagentes` (circa linha 728–730) e dicionário `\paragraph{Resumo\_Reagente}` (circa linha 286–296)
**Ações**:
1. No dicionário §Resumo_Reagente: remover campo `estados_fisicos` (array) e adicionar `estado_fisico` (enum escalar) e `eh_higroscopico` (boolean).
2. Na subseção de busca: substituir menção a `array-contains` por filtro de igualdade escalar `.where("estado_fisico", "==", "SOLIDO")`. Remover nota sobre `estados_fisicos`.

**Justificativa**: MODIFICACOES §1.1, §7.1; AUD-20. **Status**: ✅ Desbloqueado — pronto para execução.

---

### P3-04 — ~~Adicionar `ativo` a `Bem_Patrimonial`~~ — CANCELADO
**Cancelado por**: DP-B01 ✅ — Decisão: Opção 1, máquina de estados é suficiente. **Nenhuma alteração no LaTeX.**

---

### P3-05 — Alterar `photo_url_proposta` para NOT NULL em `Requisicao_Adicao_Bem_Patrimonial` (Seção 4)
**Desbloqueado por**: DP-B02 ✅
**Arquivo**: `Section-4-Modelagem-Entidades-SQL-3FN.tex`
**Localização**: Subseção `Requisicao Professor adicao Bem patrimonial` (circa linha 130)
**Ação**: Alterar nullability do campo:
```latex
% Antes:
\campo{photo\_url\_proposta}{TEXT}{NULL}
% Depois:
\campo{photo\_url\_proposta}{TEXT}{NOT NULL}
```
Adicionar regra:
```latex
\begin{regra}
DP-B02: O solicitante deve estar diante do equipamento para levantar plaqueta e estado de
conservação. Foto obrigatória na submissão elimina retrabalho de vistoria presencial do
gestor. O backend rejeita a requisição sem foto e remove o placeholder \texttt{https://placeholder}.
\end{regra}
```
**Justificativa**: MODIFICACOES §7.5; AUD-25. **Status**: ✅ Desbloqueado — pronto para execução.

---

### P3-06 — Harmonizar Seção 3.6 e Seção 7.4 sobre Aluno + Gestor_Almoxarifado
**Desbloqueado por**: DP-C01 ✅
**Arquivo A**: `Section-3-Stakeholders.tex`
**Localização A**: §Bolsista (circa linha 99)
**Ação A**: Precisar a restrição de exclusividade:
```latex
% Substituir a frase ambígua por:
É mutuamente exclusivo com o papel de \textit{Gestor de Almoxarifado} para uma mesma conta
\emph{somente quando combinado com o papel de Bolsista}. Aluno sem papel de Bolsista pode
acumular o papel de Gestor de Almoxarifado.
```
**Arquivo B**: `Section-7-Requisitos-e-Regras-de-Negocio.tex`
**Localização B**: Matriz de combinações de papéis (circa linha 149–161)
**Ação B**: Acrescentar linha explícita à tabela ou lista:
```latex
\item \textbf{Bolsista} e \textbf{Gestor\_Almoxarifado} são mutuamente exclusivos
(SoD: quem retira não pode gerir o estoque). Aluno sem Bolsista pode exercer
Gestor\_Almoxarifado.
```
**Justificativa**: MODIFICACOES §7.6; AUD-33. **Status**: ✅ Desbloqueado — pronto para execução.

---

### P3-07 — Snapshot físico de higroscopicidade (Seção 5)
**Decisão**: DP-A02 preservada. **Estado**: PLANEJADO.
**Arquivo**: `Section-5-Notas-de-Mapeamento-para-Firestore.tex`.
Adicionar `Frasco_Reagente.eh_higroscopico` ao dicionário físico: boolean obrigatório, denormalização imutável preenchida exclusivamente pelo backend no cadastro a partir de `Resumo_Reagente.eh_higroscopico`. Alterações futuras do resumo não reescrevem snapshots existentes. Não adicionar a cópia à entidade relacional: a fonte canônica 3FN permanece no resumo. Cadastro e devolução da Seção 10 devem respeitar esse contrato; dado histórico ausente exige reconciliação explícita, não inferência silenciosa.

---

### P3-08 — Adicionar regras de visibilidade de moderação à Seção 8 (UI-11) e Seção 11 (Security Rules)
**Desbloqueado por**: DP-C02 ✅
**Arquivo A**: `Section-8-Descricao-das-Telas-Interface.tex` (ou equivalente)
**Localização A**: Subseção UI-11 (Comentários em Posts)
**Ação A**: Adicionar parágrafo de comportamento de moderação:
```latex
\begin{regra}[Visibilidade de Comentários Moderados]
DP-C02: Para o \textbf{autor} do comentário: exibe o texto original com tarja
``Comentário moderado pelo docente: [\textit{motivo\_moderacao}]''. Para
\textbf{colegas} (Aluno ou Bolsista não-autores): substitui o texto por
``Comentário ocultado pela moderação da turma''. Para \textbf{Professor} e
\textbf{Chefe\_Geral}: exibe texto original e histórico completo. Bolsista segue
visibilidade de Aluno.
\end{regra}
```
**Arquivo B**: `Section-11` (Security Rules ou equivalente)
**Localização B**: Regras de leitura de `Comentarios/{id}`
**Ação B**: Rules não fazem projeção de campos. Negar leitura direta do documento original a colegas quando moderado; fornecer aviso institucional por endpoint autorizado, com resposta filtrada no servidor. Autor, Professor responsável e Chefe Geral recebem o conteúdo conforme DP-C02. Proteger igualmente o histórico e impedir que um allow amplo anule a restrição. A UI não é barreira de segurança.
**Justificativa**: MODIFICACOES §7.7; AUD-31. **Status**: ✅ Desbloqueado — pronto para execução.

---

### P3-09 — Atualizar `validarPermissao` na Seção 10.2.1 para verificação seletiva de `ativo`
**Desbloqueado por**: DP-D01 ✅
**Arquivo**: `Section-10-Tecnologia-e-Relatorios-Vercel-Firebase.tex`
**Localização**: Listagem `validarPermissao` (circa linha 60–67)
**Ação**: Adicionar parâmetro `requerAtivo` e leitura condicional:
```typescript
async function validarPermissao(
  request: {auth?: {uid: string; token: Record<string, unknown>}},
  papeisPermitidos: string[],
  requerAtivo = false  // true em mutações de alto impacto
): Promise<string[]> {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  if (requerAtivo) {
    const snap = await admin.firestore().collection("Usuarios").doc(request.auth.uid).get();
    if (!snap.exists || snap.data()?.ativo === false)
      throw new HttpsError("permission-denied", "Conta desativada.");
  }
  const papeis = resolverPapeisDoToken(request.auth);
  if (!papeisPermitidos.some((p) => papeis.includes(p)))
    throw new HttpsError("permission-denied", "Usuário sem papel autorizado para esta ação.");
  return papeis;
}
```
Risco residual DP-D01: mutações que não exigirem `requerAtivo=true` podem continuar confiando em token ainda válido até renovação (até aproximadamente 1h). A verificação seletiva de ativo não garante atualização imediata de papéis em conta que permanece ativa.

Adicionar nota: funções que devem chamar com `requerAtivo = true`: `registrarRetirada`, `registrarDevolucao`, `responderRequisicaoAdicaoBem`, `responderRequisicaoEdicaoBem`, `concederPapel`, `revogarPapel`.
**Justificativa**: MODIFICACOES §5.1, §7.9; AUD-38, AUD-05. **Status**: ✅ Desbloqueado — pronto para execução.

---

## Sumário de status por item

| Item | Título resumido | Status |
|---|---|---|
| P1-01 | `roteiro_anexo` em §Post (Seção 5) | ✅ Pronto |
| P1-02 | Remover `Roteiro_Professor_Compartilhado` Firestore | ✅ Pronto |
| P1-03 | `registrarDevolucao` fórmula Q06 + `medida_usada` em g | ✅ Pronto ⚠️ após P3-07 e P3-09 |
| P1-04 | `moderado`/`motivo_moderacao`/`moderado_por` em `Comentario` | ✅ Pronto |
| P1-05 | `token_hash` + `ultimo_reenvio_por` em `Convite_Aluno` | ✅ Pronto |
| P1-06 | `Bolsista` no enum `papel_destinatario` | ✅ Pronto |
| P2-01 | `abertura_historica_desconhecida` em `Frasco_Reagente` | ✅ Pronto |
| P2-02 | `auto_atendimento` em `Emprestimo_Reagente` | ✅ Pronto |
| P2-03 | Invariante `medida_utilizada >= 0` | ✅ Pronto |
| P2-04 | `novo_id_resumo_bem_patrimonial` + `versao_bem_origem` | ✅ Pronto |
| P2-05 | Remover filtro prédio/sala do painel Professor + documentar V2 | ✅ Pronto (novo) |
| P2-06 | `finalidade_uso` enum expandido + `justificativa_metodologica` + TCR | ✅ Pronto (novo) |
| P3-01 | `Composicao_Reagente` Q03 + CHECK constraint | ✅ Desbloqueado |
| P3-02 | `estado_fisico`/`eh_higroscopico` em `Resumo_Reagente` | ✅ Desbloqueado |
| P3-03 | Busca textual Seção 5 — escalar em vez de array | ✅ Desbloqueado |
| P3-04 | `ativo` em `Bem_Patrimonial` | ❌ Cancelado (DP-B01: Opção 1) |
| P3-05 | `photo_url_proposta` NOT NULL | ✅ Desbloqueado |
| P3-06 | Harmonizar Aluno+Gestor_Almoxarifado (Seções 3 e 7) | ✅ Desbloqueado |
| P3-07 | `eh_higroscopico` snapshot em `Frasco_Reagente` | ✅ Desbloqueado |
| P3-08 | Moderação UI-11 e Security Rules | ✅ Desbloqueado |
| P3-09 | `validarPermissao` com `requerAtivo` | ✅ Desbloqueado |

**Total**: 21 itens | 20 prontos para execução | 1 cancelado.

Contagem conferida na Fase 0: 6 P1 + 6 P2 + 9 P3. O total anterior era erro aritmético; nenhum item foi acrescentado ou removido por esta correção.

### Ordem de execução recomendada para os itens com dependências

```
P3-07  →  P3-09  →  P1-03   (dependências cruzadas: campo no modelo antes do pseudocódigo)
P3-02  →  P3-03             (estado_fisico no 3FN antes de corrigir busca na Seção 5)
P3-01                       (independente, mas conveniente junto com P3-02)
Demais P1, P2, P3            (sem dependências entre si)
```

---

## Procedimento de validação após cada alteração

1. Executar:
   ```sh
   cd /home/dock/dev/LCQUI/documentation
   latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=/tmp/lcqui-tex-build main.tex
   ```
2. Verificar: zero erros, zero referências indefinidas (`undefined reference`).
3. Inspecionar visualmente as páginas afetadas no PDF gerado.
4. Copiar PDF para `documentation/main.pdf` somente após o build final da Fase 2 passar e inspeção visual.
5. Registrar o resultado em `STATUS_ATUAL.md`.

## Execução por rodadas

A: P3-07, P3-09. B: P1-01–06. C: P3-01–03, P2-01–04, P2-06. D: P3-05, P3-06, P3-08, P2-05. Cada rodada exige compilação sem erros e commit próprio. Depois: validação documental completa, hardening AUD-35/36 e código AUD-37, preparação de migração AUD-27 sem execução remota, higiene final.

# M10 — Patrimônio: validação documental

## Estado, baseline e fontes

- **Branch:** `feat/formal-spec-cue-alloy` (a única utilizada).
- **HEAD de entrada:** `ca76f5f2319f75be6a93c8173ea147088727a589`.
- **HEAD de saída documental antes do registro de estado/PDF:** `665bfdfb0c77e1bcdfddb3e1fb91f145d751362d`.
- **Árvore de entrada:** limpa; `origin/feat/formal-spec-cue-alloy` apontava para o mesmo SHA (ahead/behind `0/0`).
- **Baseline:** `just formal-check`, no ambiente Nix documentado, terminou com exit code `0`: testes Rust, `clippy`, testes Node, CUE, Alloy, receipts, validators e documentação de M0--M9 passaram. Não houve regressão prévia.

Foram lidos integralmente `FORMAL_SPEC_STATE.md`, `documentation/STATUS_ATUAL.md`, os worklogs M9 documental e executável, os worklogs relevantes de M7 e M8, a matriz de implementação e as Seções 3--12 (com ênfase nas Seções 4, 5, 6, 7, 8, 9, 10.2, 10.3, 10.8, 10.9, 11 e 12). A evidência de implementação consultada foi `functions/src/patrimonio.ts`, seu schema e testes, páginas e componentes patrimoniais do frontend, `firestore.rules`, `storage.rules`, `firebase.json` e as configurações/auxiliares relacionados. Código e Rules são evidência de divergência, nunca autoridade normativa nesta rodada.

## Mapa de impacto e contratos herdados

M10 reconcilia `Bem_Patrimonial`, `Resumo_Bem_Patrimonial`, `Historico_Bem_Patrimonial`, `Alteracao_Bem_Patrimonial`, a subcoleção `Historico_Patrimonio`, requisições de edição/adição, locks, `Chaves_Unicas`, locais, foto e comprovante de baixa. As seções normativas modificadas são 4, 5, 7, 8, 9 e 10.8; nenhum artefato CUE/IR/Alloy/Rust/receipt/generated foi tocado.

- **M7:** cada comando crítico é identificado por `(uid, tipo_operacao, payload_hash)` e um retry reaproveita o receipt; lock, unicidade e versão são mecanismos distintos. Histórico, notificação e baixa não podem ser duplicados.
- **M8:** projeções e notificações são server-owned e idempotentes; uma projeção não é a autoridade do bem.
- **M9:** no commit, servidor revalida autenticação, usuário ativo, papel, versão de permissões, escopo global V1 do Gestor de Bens, vínculo/ownership quando aplicável e a regra de domínio. Claims/UI/Rules não bastam; `Chefe_Geral` tampouco contorna invariantes patrimoniais.

## Contrato normativo consolidado

### Identidade, resumo, local e plaqueta

`Resumo_Bem_Patrimonial` é o tipo/modelo catalográfico; seu nome canônico é projetado em `Bem_Patrimonial.nome_equipamento`. Um bem é uma unidade física. Assim, alterar o nome solicitado para uma unidade é reclassificação para resumo existente ou criação explícita de outro resumo, nunca renomeação silenciosa do resumo compartilhado. `id_local` é autoridade; `predio`, `andar` e `sala` são projeções para consulta.

`numero_patrimonio` é a identidade externa da unidade: a forma canônica é `trim().toUpperCase()`, não vazia e com no máximo 30 caracteres. Essa forma é armazenada e usada identicamente no bem, na requisição, na busca, no lock e em `Chaves_Unicas/Bem_Patrimonial__{numeroNormalizado}`. A chave única é permanente: uma baixa preserva o bem e nunca libera plaqueta para reuso.

### Estado, baixa e versão

As dimensões `estado_conservacao` (`BOM`, `REGULAR`, `RUIM`) e status (`Ativo`, `Inservivel`, `Ja_dado_baixa`) são independentes. A máquina V1 é:

```text
Ativo -> Inservivel -> Ja_dado_baixa
```

Não há retorno de `Inservivel` para `Ativo`, baixa direta de `Ativo`, nem saída de `Ja_dado_baixa`; o último é terminal para mutações de negócio. Retenção e leitura/auditoria permanecem possíveis. A baixa é operação própria, só pelo rito institucional autorizado, requer justificativa, responsável SEI, PDF válido e imutável, autoria, data, histórico e incremento de versão. Professor não pede nem executa diretamente `Ja_dado_baixa`; não existe hard delete.

`versao` começa em `1` e representa mudança de fato canônico da unidade. Cada edição aprovada, reclassificação, mudança de local, foto, conservação, status ou baixa incrementa-a uma vez na transação que grava o fato e o histórico. Não incrementam a versão as projeções puramente derivadas do nome do resumo ou dos campos de Local; isso evita conflito falso. A aprovação compara `versao_bem_origem` com a versão corrente dentro da transação e converte a divergência de domínio em término idempotente da requisição, liberando somente seu lock.

### Requisições, locks, unicidade e fan-out

Há no máximo uma edição pendente por bem (`bem_edicao_{idBem}`) e uma adição pendente por plaqueta canônica (`bem_adicao_{numeroNormalizado}`). O lock é criado junto da requisição, contém `id_requisicao`, tipo e chave do recurso, não é timeout de negócio e só pode ser removido se pertencer à requisição terminal. Ele é removido em aprovação, rejeição, conflito e rejeição sistêmica de domínio; falhas transitórias propagam e preservam a pendência. `Chaves_Unicas` não é lock: protege permanentemente a identidade aprovada.

Toda aprovação/rejeição é uma transação que revalida M9, estado pendente, lock, unicidade, versão, resumo/local, foto/objeto e precondições antes das escritas. O cadastro aprovado grava bem, chave única, resumo quando criado, requisição, lock e evento histórico `cadastro`; edição e baixa gravam deltas/fato histórico no mesmo commit. Fan-out de resumo/local é server-side, em chunks, idempotente por `eventId`/operação M7, sem loop e com retry seguro; como é derivado, não altera a versão nem cria delta de negócio enganoso.

### Storage, histórico e responsabilidade

Foto é obrigatória no cadastro da unidade, JPEG/PNG validado também por assinatura binária, tamanho, caminho, geração e vínculo transacional. O comprovante de baixa é exclusivamente PDF (`%PDF-`), `NULL` antes da baixa, preservado sem substituição depois do vínculo e não serve a outra finalidade. MIME/extensão não são prova.

A arquitetura normativa de destino do histórico é `Bem_Patrimonial/{id}/Historico_Patrimonio/{eventoId}`; `Historico_Bem_Patrimonial` e `Alteracao_Bem_Patrimonial` definem o conteúdo do evento, não uma segunda fonte raiz concorrente. Tipos mínimos são `cadastro`, `edicao` e `baixa`; reclassificação, local, foto e conservação são deltas de `edicao`. O delta usa o valor realmente substituído e o valor committed, atômico com o bem. Coleções, locks, chaves, histórico, mutações do bem e objetos já vinculados são server-owned: cliente só envia intenção.

## Findings

| ID | Categoria | Evidência e impacto | Resolução/estado |
|---|---|---|---|
| M10-F01 | ERRO_MECANICO | Seções usavam a plaqueta bruta em pontos distintos; caixa/espaço poderiam divergir entre lock, requisição e busca. | Canonicalização única e chave normalizada documentadas nas Seções 4, 5, 7, 9 e 10.8. **RESOLVIDO**. |
| M10-F02 | LACUNA_DE_CONCORRENCIA | Lock não tinha contrato explícito de proprietário/recurso; uma conclusão poderia apagar lock alheio. | `id_requisicao`, tipo, chave e liberação condicional reconciliados. **RESOLVIDO**. |
| M10-F03 | CONTRADICAO_DOCUMENTAL | A entidade histórica exigia cadastro, mas o pseudocódigo de aprovação não o registrava. | Evento `cadastro` atômico adicionado ao alvo normativo. **RESOLVIDO**. |
| M10-F04 | LACUNA_DE_DOMINIO | Estado patrimonial, baixa e semântica de versão não estavam fechados entre 3FN, RF e fluxo. | Máquina V1, terminalidade, independência da conservação e versão canônica consolidadas. **RESOLVIDO**. |
| M10-F05 | LACUNA_DE_SEGURANCA | Pseudocódigo patrimonial não declarava explicitamente M7+M9 dentro da transação. | Revalidação no commit, receipt M7 e server-owned introduzidos como contrato. **RESOLVIDO**. |
| M10-F06 | DIVERGENCIA_IMPLEMENTACAO | `functions/src/patrimonio.ts` decide só por claims antes da transação; não revalida usuário ativo, versão de permissões, escopo e domínio no commit. | Dívida RF06--RF12; nenhuma alteração real nesta rodada. **ABERTO (implementação)**. |
| M10-F07 | DIVERGENCIA_IMPLEMENTACAO | Implementação não aplica receipt M7/`Chaves_Unicas`, usa lock bruto, permite foto nula/placeholder e não completa os efeitos transacionais de adição/edição. | Registrado; requer implementação posterior. **ABERTO (implementação)**. |
| M10-F08 | DIVERGENCIA_IMPLEMENTACAO | Não há baixa server-side completa; histórico de cadastro/delta, conflito de versão, fan-out idempotente e limpeza de lock são parciais ou ausentes. | Registrado, inclusive AUD-27. **ABERTO (implementação)**. |
| M10-F09 | DIVERGENCIA_IMPLEMENTACAO | `firestore.rules` permite escritas diretas em coleções patrimoniais e usa claims amplas, contrariando server-owned/M9. | Registrado; Rules não protegem Admin SDK. **ABERTO (implementação)**. |
| M10-F10 | DIVERGENCIA_IMPLEMENTACAO | `storage.rules` aceita update/delete cliente e só valida papel/MIME/extensão; não garante assinatura, geração nem imutabilidade vinculada. | Registrado. **ABERTO (implementação)**. |
| M10-F11 | DIVERGENCIA_IMPLEMENTACAO | Frontend expõe escolhas/fluxos patrimoniais que podem sugerir escrita direta e baixa genérica; UI não é controle de segurança. | Registrado; backend normativo deve negar. **ABERTO (implementação)**. |
| M10-F12 | DIVIDA_FUTURA | Não há configuração versionada de índices Firestore apesar dos filtros patrimoniais documentados. | Planejar índices e testar consultas na implementação, sem redesenhar M10. **ABERTO (futuro)**. |

## Human Questions

**Nenhuma HQ bloqueante.** As decisões potencialmente sensíveis foram decididas pelas fontes existentes: a baixa já preservava a entidade/UNIQUE em 3FN, RF12 já a tratava como rito próprio, e a versão já era o compare-and-set de edição. O efeito de fan-out foi resolvido como projeção derivada (logo não é versão de fato canônico), sem introduzir nova política de negócio.

## Casos de regressão documentais

- Cadastro: bem novo válido; plaqueta existente; duas adições simultâneas; variação de caixa/espaço; resumo existente/novo/inválido; local inexistente; foto ausente ou JPEG/PNG inválido.
- Edição: edição válida; duas pendências; rejeição, aprovação e resposta repetida; conflito de versão; alteração de local, resumo e foto.
- Locks: lock correto e de outra requisição; aprovação, rejeição e conflito liberam apenas o próprio lock; idade não o libera; falha transitória preserva a pendência.
- Status/baixa: `Ativo`, `Inservivel`, `Ja_dado_baixa`; somente a cadeia V1; baixa com PDF válido, sem PDF, PDF inválido, repetida ou tentada por professor; nenhuma edição de negócio após baixa.
- Histórico: cadastro gera evento; edição registra delta real; baixa registra fato; retry M7 não duplica histórico/notificação.
- M9/M5--M8: gestor revogado ou claim antiga antes do commit; professor sem aprovação; cliente em escrita direta; fan-out não é autoridade nem duplica; operação autorizada não evita quarentena M5, pendência M6 ou receipt M7.

## Três auditorias integrais finais

1. **Auditoria A — limpa:** cruzamento 3FN, Firestore, RF06--RF12, UI, fluxos e pseudocódigo: nenhum finding novo após M10-F01--F05.
2. **Auditoria B — limpa:** cruzamento M7/M8/M9, Rules, Storage, concorrência, histórico, locks e implementação real: apenas M10-F06--F12, já registrados; nenhum finding normativo novo.
3. **Auditoria C — limpa:** revisão de fronteira, casos de regressão, nomes canônicos, PDF e declaração de escopo: nenhum finding novo.

## Validação e PDF

Após a reconciliação, `git diff --check`, `cargo fmt --check`, `cargo test --locked`, `cargo clippy --all-targets -- -D warnings` e `just formal-check` foram executados no ambiente Nix documentado com resultado PASS; M0--M9 permaneceram PASS. A compilação de `documentation/main.tex` terminou com exit code `0`; o PDF final tem **381 páginas** (baseline M9: 375, diferença +6). Não há erro LaTeX nem referência indefinida no build final; os avisos Overfull são os 28 herdados. Foram inspecionadas visualmente as páginas patrimoniais alteradas 18, 57, 117, 170 e 285: tabelas, pseudocódigo, sublinhados, quebras, referências e margens estão legíveis, sem corte ou sobreposição.

## Limites, estado final e próxima ação

Esta rodada não certifica `functions/`, frontend, Firestore Rules, Storage Rules, Firebase, IAM, App Check, objetos implantados, concorrência real nem infraestrutura. M10 é uma consolidação normativa, não implementação patrimonial. M10 = **DOCUMENTATION_VALIDATED**; M0--M9 = **VALIDATED**; M11+ = **NOT_STARTED**. A única próxima ação permitida é:

```text
Formalização executável de M10 em rodada separada
(CUE → IR → Alloy → receipt → Rust → LaTeX → PDF).
```

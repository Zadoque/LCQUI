# M13 — Notificação unificada — contrato documental

Estado: **DOCUMENTATION_VALIDATED**. Rodada exclusivamente documental. A
formalização executável (CUE → IR → Alloy → receipt → Rust → LaTeX → PDF) é a
Etapa B, em rodada separada, e ainda não foi iniciada. Nada em `functions/`,
`frontend/`, `firestore.rules`, `storage.rules`, `specification/`, `tools/`,
IR, receipts ou `documentation/generated/` foi alterado.

## 1. Entrada e saída

- Branch: `feat/formal-spec-cue-alloy` (única).
- HEAD de entrada: `430fb0ad2b2df6f5542635d7a7bbea43e311ae5f`, árvore limpa,
  `origin` sincronizada.
- Baseline `just formal-check` **exit 0** antes das edições: Rust 34 testes,
  40 testes Node, `alloy-check` PASS, `docs-check` PASS, PDF de 442 páginas,
  `git diff --check` PASS.
- Verificação de integridade dos receipts: M12 = 37 checks UNSAT + 18 witnesses
  SAT = 55; M12.2 = 52 checks UNSAT + 27 witnesses SAT = 79; solver `sat4j`,
  Alloy 6.2.0, todas as buscas coerentes.
- Estado demonstrado na entrada: M0–M12 = VALIDATED; M13 = NOT_STARTED.

## 2. Fonte normativa criada

Nova subseção **7.8 Notificação unificada (M13)**
(`\label{sec:regras-notificacoes-m13}`) na
`documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex`, após as
subsubseções históricas e antes da matriz formal. Ela é a fonte normativa da
entidade única `Notificacao` e da caixa (UI-12), compondo M7, M8, M9, M11,
M12.1 e M12.2 sem reabrir suas provas.

Regras decididas incorporadas:

1. **RN-M13-01 — identidade, caixa única e leitura.** `Usuarios/{uid}/Notificacoes/{id}`;
   `uid` do caminho = `id_destinatario` = destinatário autenticado. Um único
   sino/caixa por conta, reunindo todos os `papel_destinatario`; o papel visual
   é contexto de apresentação, não filtra a caixa nem concede papel. Inclui
   Bolsista (Q12) e Chefe. Leitura da caixa alheia negada.
2. **RN-M13-02 — mutação e `Limpar tudo`.** Criação/marcação/limpeza
   server-owned; `lida = false ⇒ lida_em = null`; retry idempotente. `Limpar
   tudo` marca ativas do próprio UID, inclusive outros papéis, paginado e
   reentrante; sem `DELETE`; corte estável por rodada; avisos posteriores ao
   corte ficam para a próxima rodada; sem promessa de transação ilimitada.
3. **RN-M13-03 — vida temporal.** `expira_em = null` = sem expiração automática
   (`ESCASSEZ_ESTOQUE`); expirado sai do ativo sem apagar fato; aviso expirado/lido
   nunca autoriza; prazos só os determinados na fonte; `DATA_DEVOLUCAO_REAGENTE`
   por `{id_emprestimo}--{janela}` (`VENCE_AMANHA`/`VENCE_HOJE`).
4. **RN-M13-04 — alvo/deep link.** `entidade_alvo` em lista fechada; `id_alvo` é
   ID, nunca URL. Abrir relê autorização corrente de M9 e do domínio (vínculo
   canônico, remoção/moderação, posse/compartilhamento de Roteiro, escopo Q13);
   revogação/remoção dão resposta neutra; URL de Storage já emitida mantém o
   prazo curto da Seção 7.7; o aviso não é credencial.
5. **RN-M13-05 — privacidade.** Payload mínimo; sem conteúdo protegido,
   e-mail/token/URL assinada; listagem/cache/erro não vazam; Firestore Rules não
   mascaram campos.
6. **RN-M13-06 — emissão/deduplicação.** Reutiliza M7, M12.1, M12.2 e a prova
   M8 de `ESCASSEZ_ESTOQUE` (sem reconstruir M8); conserva o docId de
   `DATA_DEVOLUCAO_REAGENTE`; sem fórmula universal de docId nem emissão
   obrigatória para os 20 tipos; só `ALREADY_EXISTS` é no-op.
7. **RN-M13-07 — contexto.** `id_turma` obrigatório para tipos acadêmicos e nulo
   para operacionais; enum 3FN × Seção 5 coincidente.
8. **RN-M13-08 — projeção M12.2.** `roteiro_anexo` inclui `geracao`.

Inclui a lista de tipos com emissão V1 efetivamente especificada
(`ESCASSEZ_ESTOQUE`, `FRASCOS_VENCIDOS`, `POST`, `COMENTARIO`,
`ROTEIRO_COMPARTILHADO`, `DATA_DEVOLUCAO_REAGENTE`) separada dos 14 valores
meramente taxonômicos, a matriz regra → fonte → contrato → prova planejada →
fronteira, os casos de regressão e a fronteira da prova.

## 3. Projeções coerentes nas Seções 3–6 e 8–11

- **Seção 3:** linha ``Receber notificações próprias (caixa única por conta)'' na
  matriz de papéis e nota de que a caixa é única por UID (inclui Bolsista/Chefe)
  e o papel visual não filtra.
- **Seção 4:** item de nullabilidade de `id_turma` reconciliado com RN-M13-07;
  explicação da entidade `Notificacao` esclarece `uid = id_destinatario`,
  `papel_destinatario` como apresentação e `Limpar tudo` paginado.
- **Seção 5:** `roteiro_anexo` passa a incluir `geracao` (RN-M13-08); nota de
  que Rules não mascaram campos e o payload é mínimo (RN-M13-05).
- **Seção 6:** novo parágrafo distinguindo notificações de cache/materialização.
- **Seção 8 (UI-12):** caixa única por UID, papel visual não filtra,
  `Limpar tudo` paginado/reentrante com corte estável, resposta neutra.
- **Seção 9:** novos fluxos M13 (caixa multi-role, marcar/limpar, expiração,
  alvo revogado/dedup) e casos de regressão.
- **Seção 11:** linha de `Notificacoes` e parágrafo de mutações reforçam caixa
  única, `Limpar tudo` sem `DELETE` e ausência de mascaramento por Rules.

## 4. Reconciliações pontuais

- **M13-REC-01 (id_turma).** A nota antiga da Seção 4 (``id_turma da notificação
  de professor quando o tipo não é COMENTARIO'') contradizia a regra acadêmica
  posterior. Reconciliada em favor da regra posterior: obrigatório para os seis
  tipos acadêmicos e nulo para operacionais; a redação antiga fica como
  histórico.
- **M13-REC-02 (geracao no anexo).** O dicionário da Seção 5 omitia `geracao` no
  snapshot `roteiro_anexo`, embora a Seção 7.7, o CUE `#M12_2RoteiroAnexo` e a
  prova M12.2 o exijam. Emenda textual mínima, sem alterar M12.1 nem receipts.

## 5. Comportamentos registrados

`Limpar tudo` diante de falha parcial/retry retoma do corte; revogação após
emissão corta novas emissões mas preserva o fato e a URL já emitida até expirar;
expiração retira do ativo sem apagar; papéis múltiplos compartilham a caixa sem
o papel visual filtrar; alvo removido/inacessível dá resposta neutra; Chefe sem
escopo Q13 não acessa; colisão de dedup (mesma identidade M7/chave M8) não
duplica, chaves distintas podem emitir; erro de emissão distinto de ``code 6''
propaga. A prova executável (Etapa B) cobre o abstrato; a implementação real
(`functions/`, `frontend/`, Rules, Firestore/Storage, relógio e concorrência)
permanece fora e é dívida de implementação.

## 6. Gates da Etapa A

- `just formal-check` **exit 0**: `cargo fmt --check`; 34 testes Rust;
  `cargo clippy --all-targets -- -D warnings`; 40 testes Node; `alloy-check`
  PASS; `docs-check` PASS; `git diff --exit-code -- documentation/generated/`
  PASS; `git diff --check` PASS.
- PDF: **450 páginas**, exit 0, zero erros e zero referências indefinidas,
  **31 Overfull** (idêntico ao baseline verificado em worktree limpo em
  `/tmp/opencode/base`). `documentation/main.pdf` republicado a partir de
  `build/latex/main.pdf`.
- Nenhum artefato formal (`specification/`, `tools/`, IR, receipts,
  `documentation/generated/`) foi alterado; nenhum receipt mudou.
- M13 marcado como **DOCUMENTATION_VALIDATED**; a marcação `VALIDATED` fica
  reservada à Etapa B.

## 7. Limites e próxima ação

A rodada não certifica a implementação Firebase, Rules, Auth, Storage, relógio
real, paginação/concorrência real nem entrega externa. Não há HQ bloqueante. A
próxima ação é a **Etapa B** (CUE → IR → Alloy → receipt → Rust → LaTeX → PDF),
com estado Alloy composto e ponte para M7/M8/M9/M12. O fechamento global após
M13 é um gate separado, sem M14 automático.

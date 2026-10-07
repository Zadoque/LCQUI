# Dívida formal: convite GLOBAL na caixa M13

## Decisão operacional desta rodada

Por decisão humana, `IMP-ACAD-005` passa a entregar convite GLOBAL a uma conta
Firebase Authentication existente pela caixa interna
`Usuarios/{uid}/Notificacoes`, usando o tipo operacional já implementado
`CONVITE_PARA_TURMA` e mantendo `id_turma = null`. O fluxo continua sem token
no cliente e a aceitação global não cria matrícula.

Essa decisão segue a regra corrente de entrega da Seção 7 (S7, linhas 398–403)
e a UX de UI-10 (Seção 8, linha 274), que determinam entrega interna para
destinatário com conta existente e confirmação de convite global.

## Alinhamento formal posterior obrigatório

O CUE M13 (`specification/cue/domain/formal_m13.cue`, linhas 28–32 e 68–84)
e RN-M13-07 (S7, linhas 1449–1455) atualmente exigem `id_turma` não nulo para
`CONVITE_PARA_TURMA`, enquanto o CUE M11 (`formal_m11.cue`, linhas 125–134)
define convite GLOBAL por `id_turma = null`. O modelo Alloy M11 preserva a
distinção de contexto GLOBAL/TURMA, mas ainda não expressa a entrega M13 do
convite GLOBAL.

Na próxima manutenção formal, CUE e Alloy devem ser atualizados conjuntamente
para uma destas formas normativamente escolhida: (a) permitir explicitamente
`CONVITE_PARA_TURMA` GLOBAL com `id_turma = null`; ou (b) criar um tipo formal
específico de convite GLOBAL e seus invariantes de entrega/aceitação. Até lá,
esta exceção é dívida conhecida, não deve ser silenciosamente reinterpretada.

# Regras de Negócio — Atribuição e Revogação de Papéis (Multi-Role)

## RN-ROLE-01 — Chefe Geral não pode possuir múltiplos papéis
O papel `Chefe_Geral` é mutuamente exclusivo com todos os demais papéis do sistema.
Um usuário que possua `Chefe_Geral` não pode possuir simultaneamente:
* `Professor`;
* `Aluno`;
* `Bolsista`;
* `Gestor_Almoxarifado`;
* `Gestor_Bens_Patrimoniais`;
* qualquer outro papel do sistema.
Consequentemente, um usuário com `Chefe_Geral` nunca é considerado `Multi-Role`.

## RN-ROLE-02 — Chefe Geral não pode revogar o papel de outro Chefe Geral
Um usuário com o papel `Chefe_Geral` não pode alterar ou revogar o papel `Chefe_Geral` de outro usuário que também possua esse papel.
Um Chefe Geral somente pode iniciar o processo de revogação do próprio papel.

## RN-ROLE-03 — Auto-revogação de Chefe Geral
Um Chefe Geral pode revogar o próprio papel `Chefe_Geral` somente quando existir pelo menos outro usuário ativo com o papel `Chefe_Geral`.
A operação deve ser rejeitada quando o usuário for o único Chefe Geral ativo do sistema.
A finalidade dessa regra é impedir que o sistema fique sem qualquer usuário com capacidade de administração global.

## RN-ROLE-04 — Revogação de Chefe Geral desativa a conta
Como `Chefe_Geral` é um papel exclusivo, sua revogação sempre resulta na ausência de outros papéis para o usuário.
Nesse caso:
1. o papel `Chefe_Geral` é removido;
2. os Custom Claims são recalculados;
3. a conta do usuário é marcada como desativada (`ativo = false`);
4. o usuário permanece armazenado no sistema;
5. seus registros históricos e de auditoria são preservados;
6. a conta não deve ser excluída fisicamente.

## RN-ROLE-05 — Almoxarifado deve possuir pelo menos um gestor
Todo almoxarifado ativo deve possuir obrigatoriamente pelo menos um `Gestor_Almoxarifado` responsável.
Um Gestor de Almoxarifado somente poderá ter seu papel revogado se, após a operação, cada almoxarifado que ele gerencia continuar possuindo pelo menos um outro Gestor de Almoxarifado.
Portanto, a operação deve verificar individualmente todos os almoxarifados vinculados ao gestor.
Se ele for o único gestor de qualquer um deles, a revogação deverá ser rejeitada.

## RN-ROLE-06 — Gestores de Almoxarifado não possuem exclusividade sobre movimentações
Não existe exigência de que o mesmo Gestor de Almoxarifado que registrou uma movimentação precise posteriormente registrar a movimentação complementar.
Quando um almoxarifado possuir dois ou mais gestores:
* qualquer um dos gestores autorizados poderá registrar a entrada de um frasco;
* qualquer um dos gestores autorizados poderá registrar a saída;
* qualquer um dos gestores autorizados poderá registrar a devolução;
* qualquer um dos gestores autorizados poderá registrar outras movimentações para as quais possua permissão.
O fato de um gestor ter registrado a saída de determinado frasco não impede que outro gestor autorizado registre posteriormente sua entrada ou devolução.
A autoria da operação deve permanecer registrada para fins de auditoria.

## RN-ROLE-07 — Revogação de Gestor de Almoxarifado em usuário Multi-Role
Quando um usuário possuir `Gestor_Almoxarifado` e pelo menos outro papel válido, a revogação de `Gestor_Almoxarifado` não desativa sua conta.
O sistema deve:
1. validar as regras de revogação dos almoxarifados;
2. remover `Gestor_Almoxarifado` dos papéis do usuário;
3. recalcular seus Custom Claims;
4. manter os demais papéis;
5. manter a conta ativa;
6. remover da interface as funcionalidades exclusivas de Gestor de Almoxarifado.

## RN-ROLE-08 — Revogação de Gestor de Bens Patrimoniais em usuário Multi-Role
Quando um usuário possuir `Gestor_Bens_Patrimoniais` e pelo menos outro papel válido, a revogação de `Gestor_Bens_Patrimoniais` não desativa sua conta.
O sistema deve:
1. verificar a condição necessária para a revogação;
2. remover o papel;
3. recalcular os Custom Claims;
4. preservar os demais papéis;
5. manter a conta ativa;
6. retirar da interface as funcionalidades exclusivas do Gestor de Bens Patrimoniais.

## RN-ROLE-09 — Gestor de Bens Patrimoniais não pode ser o único
A revogação de `Gestor_Bens_Patrimoniais` somente será permitida quando existir pelo menos outro usuário ativo que continue exercendo esse papel.
Caso o usuário seja o único Gestor de Bens Patrimoniais ativo, a revogação deverá ser rejeitada.
A finalidade é impedir que o sistema fique sem nenhum responsável pela gestão patrimonial.

## RN-ROLE-10 — Revogação do último papel desativa a conta
Quando um usuário possuir apenas um papel ativo e esse papel for revogado, sua conta deverá ser desativada.
Isso se aplica a todos os papéis. A conta não deve ser excluída.
O usuário deverá permanecer no sistema para preservação de auditoria, histórico, autoria de operações, etc.

## RN-ROLE-11 — Revogação de papel não significa exclusão do usuário
A revogação de qualquer papel deve preservar a identidade histórica do usuário.
Fluxo correto: Revogar papel -> Validar regras -> Remover papel -> Recalcular conjunto -> Atualizar Custom Claims -> Possui outro papel? (Sim = ativo, Não = desativado).

## RN-ROLE-12 — Usuário Multi-Role
Um usuário será considerado `Multi-Role` quando possuir dois ou mais papéis simultaneamente, exceto `Chefe_Geral`.
A remoção de um papel de um usuário Multi-Role deve afetar somente aquele papel específico.

## RN-ROLE-13 — Usuário com apenas um papel
Se o único papel de um usuário for revogado, o usuário ficará com 0 papéis e sua conta será desativada, mas o usuário permanece armazenado para fins históricos e de auditoria.

## RN-ROLE-14 — Recalculo dos Custom Claims
Os Custom Claims devem representar o conjunto efetivo de papéis do usuário após a operação. O backend deve recalcular o conjunto completo de papéis autorizados e então atualizar os Custom Claims. Se o conjunto resultante for vazio, a conta deverá ser marcada como desativada.

## RN-ROLE-15 — Auditoria das alterações de papéis
Toda atribuição e toda revogação de papel devem gerar registro de auditoria contendo: usuário afetado, usuário que executou a operação, papel adicionado/removido, data/hora, resultado, justificativa e situação da conta. Revogações rejeitadas também devem ser registradas.

## Regra de Ouro
* REVOGAR PAPEL ≠ EXCLUIR USUÁRIO
* REVOGAR PAPEL → altera autorização
* SEM PAPÉIS → desativa conta (`ativo: false`)
* NUNCA → excluir identidade e histórico

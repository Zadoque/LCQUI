# Retomada

1. Ler somente FORMAL_SPEC_STATE.md na raiz para descobrir estado, decisões,
   arquivos, commits, comandos e próxima ação exata.
2. Executar git status, git log --oneline -10 e git branch --show-current.
3. Permanecer em feat/formal-spec-cue-alloy; ler fontes apontadas no estado.
4. Executar validações mínimas indicadas e continuar a ação exata, sem nova auditoria.
5. Atualizar estado após cada unidade, validação, problema e antes/depois de commit.

Somente VALIDATED é concluído. Estados possíveis: NOT_STARTED, IN_PROGRESS,
BLOCKED, IMPLEMENTED, VALIDATED. Não avançar milestones silenciosamente.
Sandbox pode exigir escalonamento para .git, daemon Nix e subprocessos Node.
Consultar documentation/COMPILACAO_NIX_LCQUI.md para TeX Live existente; não trocar
ambiente ou criar Docker para contornar problema de acesso.

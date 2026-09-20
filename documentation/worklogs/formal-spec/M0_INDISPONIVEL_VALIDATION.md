# M0 — Validação do enum INDISPONIVEL

Esta rodada corrige a omissão da categoria `INDISPONIVEL` na especificação formal M0, conforme detectado na Auditoria 8.

## Alterações Realizadas

1. **CUE**: Em `specification/cue/domain/frasco.cue`, adicionamos `INDISPONIVEL` aos valores de `disponibilidade`.
2. **Fixture**: O teste de rejeição `specification/cue/tests/invalid/enum.json` usava `INDISPONIVEL` como valor inválido. Foi atualizado para `INVENTADO` para continuar garantindo a falha em valores estranhos.
3. **Alloy**: Em `specification/alloy/reagents/withdrawal.als`:
   - Incluímos `INDISPONIVEL` na assinatura abstrata.
   - Atualizamos a coerência (predicado `coerente`) para forçar `INDISPONIVEL` sempre que o frasco físico estiver em estado que bloqueia a operação (VAZIO, QUEBRADO, DESCARTADO, EXTRAVIADO) ou em quarentena.
   - Ajustamos o predicado da testemunha de `DisponivelNaoApto` para `IndisponivelNaoApto`, evidenciando que `INDISPONIVEL` (sendo coerente em estados inviabilizantes) impede a disponibilidade.

## Resultados da Verificação

O ciclo completo de verificação com CUE + Alloy + Rust foi re-executado:

- O CUE vetou corretamente os casos inválidos e aceitou o novo enum.
- O Alloy manteve a prova de bloqueio e unicidade de empréstimo (`UNSAT` para `INV-FRASCO-001` e `INV-EMPRESTIMO-001`).
- O gerador de documentação Rust produziu sem erros os artefatos em `documentation/generated`.
- O documento `main.pdf` foi compilado com sucesso, incluindo os novos contratos.

A validação formal foi concluída e atestada por `just formal-check` validando a sintaxe limpa e o determinismo do processo.

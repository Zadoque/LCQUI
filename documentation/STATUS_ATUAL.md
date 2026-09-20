# Status atual do LCQUI

Snapshot de 13/09/2026. Branch: `docs/realinhamento-especificacao-lcqui`.

## Plano e decisões

21 itens enumerados: 6 P1, 6 P2 e 9 P3; 20 aplicados à documentação e 1 cancelado (P3-04, DP-B01). O total anterior 20/19 era erro aritmético. Nenhum item foi removido para acomodar a contagem.
As 10 decisões DP-A01–DP-D02 estão resolvidas em `DUVIDAS_PENDENTES_LCQUI.md`; não há decisão de domínio bloqueando execução. Os 20 itens executáveis foram APLICADO_DOCUMENTACAO nas rodadas A–D; código não é atestado por isso.

## Implementação e riscos

RF01–RF25 e RN-ROLE-01–15 permanecem parciais; documentação não comprova código ou homologação. AUD-35/36: hardening de baixa prioridade, pois deny-all já protege as coleções internas. AUD-37: exclusividade já validada fora de transação, sem garantia concorrente; correção pendente. AUD-27: caminho patrimonial divergente, migração ainda não preparada nem executada.
DP-D01 mantém verificação seletiva de ativo; mutações sem requerAtivo=true podem confiar em token ainda válido até renovação. Claims antigas em conta ainda ativa também exigem consideração explícita. DP-D02 mantém retenção indefinida V1 como política conservadora LCQUI/UENF sujeita à futura política arquivística/LGPD institucional.

## Execução e validação

Fase 0 e rodadas A–D concluídas em commits separados. Validação final aprovada: 172 páginas, exit 0, zero erros/referências indefinidas; 19 avisos tipográficos Overfull remanescentes; código e preparação de migração ainda pendentes. Builds isolados aprovados, todos exit 0, zero erros e referências indefinidas:

| Build | Páginas |
|---|---|
| Inicial | 164 |
| A | 166 |
| B | 167 |
| C | 171 |
| D | 173 |

Nenhum teste funcional executado nesta sessão até esta etapa. Nenhum deploy, merge ou migração remota.

## Histórico de marcos

- 11/09/2026: contratos UI, fluxos, dicionário e RN-ROLE consolidados. Build histórico de 164 páginas; resultado não reutilizado como validação atual.
- 13/09/2026: resolução formal das 10 DPs e inclusão de P2-05/P2-06 no plano.
- 20/09/2026: Auditoria 8 (Especificação Consolidada V5) aplicada integralmente à documentação LaTeX e validador formal M0 (CUE + Alloy + Rust) atualizado para contemplar o status INDISPONIVEL de frascos.

Inspeção visual: páginas 61 (snapshot), 143 (TCR), 145 (Q06) e 169 (Rules) do PDF final legíveis, sem cortes de conteúdo nas amostras. Build final /tmp/lcqui-tex-final; PDF atualizado somente após aprovação.

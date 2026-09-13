# Status atual do LCQUI

Snapshot de 13/09/2026. Branch: `docs/realinhamento-especificacao-lcqui`.

## Plano e decisões

21 itens enumerados: 6 P1, 6 P2 e 9 P3; 20 executáveis e 1 cancelado (P3-04, DP-B01). O total anterior 20/19 era erro aritmético. Nenhum item foi removido para acomodar a contagem.
As 10 decisões DP-A01–DP-D02 estão resolvidas em `DUVIDAS_PENDENTES_LCQUI.md`; não há decisão de domínio bloqueando execução. As correções LaTeX permanecem PLANEJADO até aplicação nas rodadas A–D.

## Implementação e riscos

RF01–RF25 e RN-ROLE-01–15 permanecem parciais; documentação não comprova código ou homologação. AUD-35/36: hardening de baixa prioridade, pois deny-all já protege as coleções internas. AUD-37: exclusividade já validada fora de transação, sem garantia concorrente; correção pendente. AUD-27: caminho patrimonial divergente, migração ainda não preparada nem executada.
DP-D01 mantém verificação seletiva de ativo; mutações sem requerAtivo=true podem confiar em token ainda válido até renovação. Claims antigas em conta ainda ativa também exigem consideração explícita. DP-D02 mantém retenção indefinida V1 como política conservadora LCQUI/UENF sujeita à futura política arquivística/LGPD institucional.

## Execução e validação

Fase 0: saneamento dos controles aplicado. Rodadas A–D, validação final, código, migração preparada e higiene final ainda não concluídos. Build inicial aprovado: latexmk exit 0, 164 páginas, zero erros e referências indefinidas; saída isolada em /tmp/lcqui-tex-baseline. Nenhum teste funcional executado nesta sessão. Nenhum deploy, merge ou migração remota.

## Histórico de marcos

- 11/09/2026: contratos UI, fluxos, dicionário e RN-ROLE consolidados. Build histórico de 164 páginas; resultado não reutilizado como validação atual.
- 13/09/2026: resolução formal das 10 DPs e inclusão de P2-05/P2-06 no plano.

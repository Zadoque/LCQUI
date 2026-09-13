# Contexto de desenvolvimento LCQUI

LCQUI gerencia almoxarifado químico, patrimônio e atividades acadêmicas. Frontend: Next.js/React/TypeScript/Tailwind. Backend: Firebase Functions/TypeScript, Firestore, Auth e Storage; schemas Zod e testes Jest no repositório. Nomes e versões reais devem ser conferidos em package.json e código, não presumidos.

## Leitura inicial

1. Leia STATUS_ATUAL.md, AUDITORIA_ATUALIZADA.md e MATRIZ_IMPLEMENTACAO_LCQUI.md.
2. Leia a seção 3 (papéis), 4 (modelo 3FN), 5.9 (dicionário físico), 7 (regras), 8 (UI-01–13), 9 (fluxos) e 11 (autorização) do LaTeX para o domínio da tarefa.
3. Consulte DUVIDAS_PENDENTES_LCQUI.md. Opções recomendadas não são decisões aprovadas; não invente política de domínio para fechar implementação.
4. Inspecione AGENTS.md aplicáveis e o código antes de editar. Documentação de comportamento esperado não prova implementação atual.

## Identidade e dados

Papéis/claims canônicos: `Chefe_Geral`, `Gestor_Almoxarifado`, `Gestor_Bens_Patrimoniais`, `Professor`, `Aluno`, `Bolsista`. Não usar aliases admin/chefe nem tratar Bolsista como booleano sem perfil. Chefe é exclusivo; Bolsista exige Aluno; Professor/Aluno e Bolsista/Gestor_Almoxarifado são incompatíveis. Aplicar RN-ROLE-01–15, escopo de almoxarifado, proteção do último responsável e preservação de identidade.

`roles` no token e seleção visual são coisas distintas. Atualizar claims não invalida imediatamente tokens antigos. Conta ativa, versão de permissões, reconciliação Auth e testes de revogação são pendências reais, não garantias já implementadas.

Firestore alvo: `Usuarios`, `Turma`, `Usuarios/uid/Turmas`, `Resumo_Reagente/id/Especificacoes`, `Frasco_Reagente`, `Bem_Patrimonial` e demais caminhos da seção 5.9. Código atual tem divergências de caminho: planejar migração explícita, sem manter duas fontes canônicas. 3FN define dependências; projeções de leitura e snapshots históricos são exceções distintas.

## Contratos essenciais

- Validar input, usuário ativo, papel, escopo e estado no servidor. Rules atuais possuem permissões excessivas: deny-all raiz não as anula.
- Transações leem antes de escrever; operações externas exigem idempotência/reconciliação. Não enviar e-mail em callback transacional.
- Peso bruto/tara em g; líquidos usam densidade para mL; não somar g e mL. Vencido, quarentena e disponibilidade são dimensões separadas.
- Código LCQUI-N nasce na transação de cadastro em `Contador_Codigo_Frasco/singleton`. Virgens não reservam IDs; segunda via tem no máximo dez frascos e uma etiqueta/ficha.
- Relatório personalizado: até 31 dias inclusivos, sem futuro, escopo autorizado. Backend atual entrega base64; comprovantes e roteiros permanecem no Storage.
- UI segue campos, falhas, paginação e acessibilidade da seção 8. Cache por identidade/escopo; localStorage só para preferências não sensíveis, nunca autorização.

## Como registrar progresso

Trabalhe dentro da autorização da sessão. Para cada mudança, associe RF/RN/UI/fluxo, evidência de código e verificação adequada. Não declarar teste aprovado apenas porque existe arquivo. Atualize matriz/status/auditoria com comando, resultado e limitações; `VALIDADO` exige prova de ponta a ponta e homologação. Não repetir percentuais antigos de prontidão. Não alterar dados externos, enviar mensagens ou publicar sem autorização aplicável.

Decisões DP-A01–DP-D02 resolvidas: não reabrir sem contradição técnica objetiva. DP-D01 mantém verificação seletiva de ativo; mutações sem requerAtivo=true podem confiar em token válido até renovação. Snapshot de higroscopicidade é exclusivamente físico no Firestore, com fonte canônica no resumo. Retenção indefinida V1 é política conservadora institucional, não exigência legal genérica. Estado do plano: 21 itens enumerados, 20 aplicados à documentação e P3-04 cancelado.

Rodadas A–D aplicadas nos .tex e compiladas; antes de retomar compilação, ler COMPILACAO_NIX_LCQUI.md. Código ainda divergente nos demais AUD; não copiar estado documental para implementação.

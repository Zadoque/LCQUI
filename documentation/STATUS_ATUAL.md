# Status Atual do Projeto LCQUI

Este documento serve para acompanhar o progresso global em tempo real do plano de ação de auditoria (Sessão 5).

## O que foi concluído recentemente
- **FASE 0**: Criação da Matriz Oficial de Rastreabilidade (`MATRIZ_IMPLEMENTACAO_LCQUI.md`).
- **FASE 1**: Fechamento das regras de segurança do Firestore (`firestore.rules`). 
- **FASE 2**: Fechamento da Segurança do Firebase Storage (`storage.rules`), garantindo metadata ownership.
- **FASE 3**: Validação robusta de entrada no backend com *Zod* (em todas as rotas exportadas via `onCall`), e substituição da geração de PDFs para string em Base64 no backend.
- **FASE 4**: Implementação e testes sistemáticos do suporte a multi-role. Lógica de papéis, desativação de usuários em vez de deleção, segurança do Firestore ajustada para coleções de Identidade, e testes automatizados.
- **FASE 5**: Aperfeiçoamentos nas relações Aluno–Turma. Implementação de atualização atômica de contagem de alunos, desvínculo limpo, arquivamento de turmas, permissões do professor e testes unitários exaustivos do domínio, sem verificações artificiais.
- **FASE 6**: Lapidação do domínio de Reagentes, Patrimônio, Notificações e Roteiros (criação de esquemas transacionais, testes com firebase-functions-test sem checagens artificiais, e controle de acesso a Roteiros).
## O que estamos fazendo agora
- **FASE 7+**: Refatoração da UI Global (Sessão 5) e estabilização de relatórios/testes ponta a ponta.

## Próximos Passos (Futuros)
- Iniciar os ajustes finais da UI do React (Next.js).

# Status Atual do Projeto LCQUI

Este documento serve para acompanhar o progresso global em tempo real do plano de ação de auditoria (Sessão 5).

## O que foi concluído recentemente
- **FASE 0**: Criação da Matriz Oficial de Rastreabilidade (`MATRIZ_IMPLEMENTACAO_LCQUI.md`).
- **FASE 1**: Fechamento das regras de segurança do Firestore (`firestore.rules`). 
- **FASE 2**: Fechamento da Segurança do Firebase Storage (`storage.rules`), garantindo metadata ownership.
- **FASE 3**: Validação robusta de entrada no backend com *Zod* (em todas as rotas exportadas via `onCall`), e substituição da geração de PDFs para string em Base64 no backend.
- **FASE 4**: Implementação e testes sistemáticos do suporte a multi-role. Lógica de papéis, desativação de usuários em vez de deleção, segurança do Firestore ajustada para coleções de Identidade, e testes automatizados.

## O que estamos fazendo agora
- **FASE 5**: Aperfeiçoamentos nas relações Aluno–Turma.
  - O objetivo é implementar a atualização atômica de contagem de alunos, garantir o desvínculo limpo, arquivamento de turmas, validação e persistência correta, e permissões do professor.

## Próximos Passos (Futuros)
1. **FASE 6+**: Lapidação do domínio de Reagentes, Patrimônio, Notificações, Roteiros, Busca Global, Refatoração da UI Global (Sessão 5) e estabilização de relatórios/testes ponta a ponta.

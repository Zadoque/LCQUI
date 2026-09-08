# Status Atual do Projeto LCQUI

Este documento serve para acompanhar o progresso global em tempo real do plano de ação de auditoria (Sessão 5).

## O que foi concluído recentemente
- **FASE 0**: Criação da Matriz Oficial de Rastreabilidade (`MATRIZ_IMPLEMENTACAO_LCQUI.md`).
- **FASE 1**: Fechamento das regras de segurança do Firestore (`firestore.rules`). 
  - Estabelecemos acesso baseado em *deny-by-default*.
  - Mapeamos permissões para *Custom Claims* de multi-role (Chefe, Professor, Gestor Patrimonial, Gestor Almoxarifado, Aluno, Bolsista).
  - Desenvolvemos e passamos 100% da bateria de testes automatizados de segurança no backend (Jest).

## O que estamos fazendo agora
- **FASE 2**: Fechamento da Segurança do Firebase Storage (`storage.rules`).
  - Estabelecimento de permissões de leitura/gravação, regras de propriedade de arquivos e restrições de formato/tamanho para fotos de perfil, roteiros, patrimônios, etc.
  - Implementação das exceções arquiteturais recém-definidas (ex: PDFs de Etiquetas gerados em memória, sem persistência no Storage).

## Próximos Passos (Imediatos e Futuros)
1. **(Atual)** Aprovar e executar a Fase 2 (Storage).
2. **FASE 3**: Validação robusta de entrada no backend usando *Schemas* definitivos.
3. **FASE 4**: Implementação e testes aprimorados do suporte a multi-role.
4. **FASE 5**: Aperfeiçoamentos nas relações Aluno–Turma.
5. **FASE 6+**: Lapidação do domínio de Reagentes, Patrimônio, Notificações, Roteiros, Busca Global, Refatoração da UI Global (Sessão 5) e estabilização de relatórios/testes ponta a ponta.

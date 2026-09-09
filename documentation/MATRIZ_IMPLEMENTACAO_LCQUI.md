# Matriz Oficial de Rastreabilidade LCQUI

Esta matriz rastreia a implementação completa de todos os Requisitos Funcionais (RF), Regras de Negócio (RN) e Fluxos (FLOW) do sistema LCQUI, cruzando com os artefatos de código, testes e segurança.

## Legenda de Status
- **ESPECIFICADO**: Requisito compreendido e mapeado, mas sem código.
- **EM_DESENVOLVIMENTO**: Implementação em andamento em alguma das camadas.
- **PARCIAL**: Implementado no código, mas faltam testes, segurança ou outra camada.
- **IMPLEMENTADO**: Todas as camadas (código, tela, banco, segurança, testes unitários) prontas.
- **VALIDADO**: Testado de ponta a ponta (E2E) e homologado.

---

## 1. Requisitos Funcionais (RF01–RF25)

| ID | Descrição | Tela | Componente | Cloud Function | Coleção Firestore | Security Rule | Teste unitário | Teste integração | Teste E2E | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **RF01** | Login e-mail/senha | `/login` | `LoginForm` | Auth | — | N/A | Pendente | Pendente | Pendente | PARCIAL |
| **RF02** | Login Google | `/login` | `GoogleLoginButton` | Auth | — | N/A | Pendente | Pendente | Pendente | PARCIAL |
| **RF03** | Recuperação de senha | `/forgot-password` | `RecoverPassword` | Auth | — | N/A | Pendente | Pendente | Pendente | PARCIAL |
| **RF04** | Multi-role | Dashboard | `RoleSelector` | `setCustomClaims` | `Usuarios` | IMPLEMENTADO 
| **RF05** | Alternância de papel | Header | `RoleSwitcher` | `switchRole` | `Usuarios` | IMPLEMENTADO 
| **RF06** | Cadastro/manutenção patrimonial | `/patrimonio` | `PatrimonioForm` | — | `Patrimonio` | IMPLEMENTADO 
| **RF07** | Histórico patrimonial auditável | `/patrimonio/:id` | `HistoricoPatrimonio` | `logAudit` | `Auditoria` | IMPLEMENTADO 
| **RF08** | Requisição de adição | `/patrimonio/novo` | `RequisicaoForm` | — | `Requisicoes` | IMPLEMENTADO 
| **RF09** | Requisição de edição | `/patrimonio/editar` | `RequisicaoForm` | — | `Requisicoes` | IMPLEMENTADO 
| **RF10** | Apenas 1 edição pendente/bem | — | — | `validarEdicao` | `Requisicoes` | IMPLEMENTADO 
| **RF11** | Aprovar/rejeitar requisições | `/requisicoes` | `ApproveReject` | `processarRequisicao`| `Requisicoes` | IMPLEMENTADO 
| **RF12** | Baixa patrimonial | `/patrimonio/baixa` | `BaixaForm` | — | `Patrimonio` | IMPLEMENTADO 
| **RF13** | Cadastro de almoxarifados | `/almoxarifados` | `AlmoxarifadoForm` | — | `Almoxarifados` | IMPLEMENTADO 
| **RF14** | Cálculo peso/volume/densidade | — | — | `calcularConsumo` | `Frascos` | IMPLEMENTADO 
| **RF15** | Empréstimo/devolução/descarte | `/estoque` | `MovimentacaoForm` | `movimentarFrasco` | `Frascos` / `Auditoria`| IMPLEMENTADO 
| **RF16** | Consulta e filtros | Todas | `SearchBar` / `Filters`| — | Várias | IMPLEMENTADO 
| **RF17** | Criação de turma/capacidade | `/turmas/nova` | `TurmaForm` | `criarTurma` | `Turmas` | IMPLEMENTADO 
| **RF18** | Entrada por código/e-mail | `/turmas/entrar` | `JoinTurma` | `entrarTurma` | `Turmas` / `Usuarios` | IMPLEMENTADO 
| **RF19** | Posts pelo professor | `/turmas/:id` | `PostForm` | — | `Posts` | IMPLEMENTADO 
| **RF20** | Comentários | `/turmas/:id` | `CommentSection` | — | `Comentarios` | IMPLEMENTADO 
| **RF21** | Upload roteiro PDF | `/roteiros` | `UploadRoteiro` | — | `Roteiros` / Storage | IMPLEMENTADO 
| **RF22** | Compartilhamento de roteiro | `/roteiros` | `ShareModal` | — | `Roteiros` | IMPLEMENTADO 
| **RF23** | Associar roteiro a post/turma | `/turmas/:id` | `SelectRoteiro` | — | `Posts` | IMPLEMENTADO 
| **RF24** | Relatórios mensais/período | `/relatorios` | `RelatorioView` | `gerarRelatorio` | Várias | IMPLEMENTADO 
| **RF25** | Histórico sem apagar fatos | — | — | — | `Auditoria` | IMPLEMENTADO 

---

## 2. Regras de Negócio (RN)

| ID | Descrição | Tela | Componente | Cloud Function | Coleção Firestore | Security Rule | Teste unitário | Teste integração | Teste E2E | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **RN01** | Chefe Geral não pode possuir outro papel | — | — | `setCustomClaims` | `Usuarios` | IMPLEMENTADO 
| **RN02** | Aluno não pode ser Professor | — | — | `setCustomClaims` | `Usuarios` | IMPLEMENTADO 
| **RN03** | Bolsista não acumula Gestor Almoxarifado | — | — | `setCustomClaims` | `Usuarios` | IMPLEMENTADO 
| **RN04** | Densidade/peso/volume regras de sinal | — | — | `validarFrasco` | `Frascos` | IMPLEMENTADO 
| **RN05** | Frasco em quarentena exige detalhe | — | — | `atualizarFrasco` | `Frascos` | IMPLEMENTADO 
| **RN06** | Preservar erros internos (invalid-argument, etc) | — | — | Todas | — | — | Pendente | Pendente | Pendente | PARCIAL |

*(Adicionar demais regras conforme aprofundamento)*

---

## 3. Fluxos (FLOW) - E2E

| ID | Descrição | Tela | Componente | Cloud Function | Coleção Firestore | Security Rule | Teste unitário | Teste integração | Teste E2E | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **FLOW01** | Login -> Dashboard -> Multi-role | Várias | Várias | Auth | `Usuarios` | IMPLEMENTADO 
| **FLOW02** | Professor -> Cria turma -> Aluno entra -> Post -> Comentário | Várias | Várias | `criarTurma`, `entrarTurma`| `Turmas`, `Posts` | IMPLEMENTADO 
| **FLOW03** | Gestor -> Reagente -> Frasco -> Retira -> Devolve -> Consumo | Várias | Várias | `movimentarFrasco` | `Frascos`, `Reagentes`| IMPLEMENTADO 
| **FLOW04** | Professor -> Requisição Patrimônio -> Gestor Aprova -> Bem criado | Várias | Várias | `processarRequisicao` | `Requisicoes`, `Patrimonio`| IMPLEMENTADO 
| **FLOW05** | Patrimônio -> Baixa -> PDF -> Auditoria | Várias | Várias | `baixarPatrimonio` | `Patrimonio`, `Auditoria`| IMPLEMENTADO 
| **FLOW06** | Chefe -> Cria Usuário -> Atribui Papel -> Claims -> Dashboard | Várias | Várias | `setCustomClaims` | `Usuarios` | IMPLEMENTADO 


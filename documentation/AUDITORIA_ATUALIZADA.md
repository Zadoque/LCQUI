# Auditoria RF01–RF25 + Regras de Negócio + Sessão 5

A auditoria foi feita cruzando cinco dimensões:

1. **Código** — existe implementação funcional no backend/frontend.
2. **Tela** — a funcionalidade prevista na Sessão 5 está implementada.
3. **Firestore** — estrutura, persistência e consultas necessárias existem.
4. **Segurança** — autorização e validações estão implementadas.
5. **Teste** — existe teste real verificando o comportamento.

Não considero a simples existência de um arquivo ou função como implementação completa.

---

# 1. Auditoria RF01–RF25

### Legenda

- 🟢 **Completo** — fluxo essencial implementado e coerente.
- 🟡 **Parcial** — existe implementação, mas falta uma ou mais dimensões.
- 🔴 **Ausente** — não existe implementação suficiente.

| RF | Requisito | Código | Tela | Firestore | Segurança | Teste | Estado |
|---|---|---:|---:|---:|---:|---:|---|
| RF01 | Login e-mail/senha | ✅ | ✅ | — | ✅ | ⚠️ | 🟡 |
| RF02 | Login Google | ✅ | ✅ | — | ✅ | ⚠️ | 🟡 |
| RF03 | Recuperação de senha | ✅ | ✅ | — | ✅ | ⚠️ | 🟢 |
| RF04 | Multi-role | ✅ | ✅ | ✅ | ✅ | ⚠️ | 🟢 |
| RF05 | Alternância de papel | ✅ | 🟡 | ✅ | ✅ | ❌ | 🟡 |
| RF06 | Cadastro/manutenção patrimonial | ✅ | 🟡 | ✅ | ✅ | ⚠️ | 🟡 |
| RF07 | Histórico patrimonial auditável | ✅ | 🟡 | ✅ | ✅ | ⚠️ | 🟡 |
| RF08 | Requisição de adição | ✅ | 🟡 | ✅ | ✅ | ⚠️ | 🟡 |
| RF09 | Requisição de edição | ✅ | 🟡 | ✅ | ✅ | ⚠️ | 🟡 |
| RF10 | Apenas 1 edição pendente/bem | ✅ | 🟡 | ✅ | ✅ | ⚠️ | 🟡 |
| RF11 | Aprovar/rejeitar requisições | ✅ | 🟡 | ✅ | ✅ | ⚠️ | 🟡 |
| RF12 | Baixa patrimonial | ✅ | ✅ | ✅ | 🟡 | ⚠️ | 🟡 |
| RF13 | Cadastro de almoxarifados | ✅ | ✅ | ✅ | ✅ | ⚠️ | 🟢/🟡 |
| RF14 | Cálculo peso/volume/densidade | ✅ | ✅ | ✅ | ✅ | ⚠️ | 🟡 |
| RF15 | Empréstimo/devolução/descarte etc. | ✅ | 🟡 | ✅ | ✅ | ⚠️ | 🟡 |
| RF16 | Consulta e filtros | 🟡 | 🟡 | 🟡 | ✅ | ❌ | 🟡 |
| RF17 | Criação de turma/capacidade | ✅ | ✅ | ✅ | ✅ | 🟢 | 🟢 |
| RF18 | Entrada por código/e-mail | ✅ | ✅ | ✅ | ✅ | 🟢 | 🟢* |
| RF19 | Posts pelo professor | ✅ | ✅ | ✅ | ✅ | ⚠️ | 🟢/🟡 |
| RF20 | Comentários | ✅ | ✅ | ✅ | ✅ | ⚠️ | 🟡 |
| RF21 | Upload roteiro PDF | ✅ | ✅ | ✅ | 🟡 | ⚠️ | 🟡 |
| RF22 | Compartilhamento de roteiro | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | 🟡 |
| RF23 | Associar roteiro a post/turma | ✅ | ✅ | ✅ | ✅ | ⚠️ | 🟢/🟡 |
| RF24 | Relatórios mensais/período | ✅ | 🟡 | ✅ | 🟡 | ⚠️ | 🟡 |
| RF25 | Histórico sem apagar fatos | ✅ | 🟡 | ✅ | ✅ | ⚠️ | 🟡 |

\* O problema conhecido da relação N:N Aluno–Turma não entra no cálculo da prontidão, conforme definido anteriormente.

### Resultado RF

A prontidão funcional ponderada de RF01–RF25 fica aproximadamente em:

**69%**

---

# 2. Segurança e infraestrutura

O `firebase.json` atual configura:

- Cloud Functions;
- Storage;
- emuladores de Auth;
- Firestore;
- Storage;

mas não referencia um arquivo `firestore.rules`.

Isso é um bloqueador importante porque a documentação define uma política de Firestore baseada em **deny-by-default**.

Portanto:

> O modelo Firestore está avançado, mas a cadeia de segurança/deploy ainda não está fechada.

---

# 3. Testes

Esse é um dos maiores problemas encontrados.

Existem testes cujo nome descreve um comportamento real, mas cujo corpo é apenas:

```ts
expect(true).toBe(true);
```

Isso ocorre em diferentes módulos, inclusive:

* Reagentes;
* Patrimônio;
* Relatórios;
* Turmas.

Assim:

> Quantidade de testes não representa cobertura real.

O projeto precisa substituir esses testes artificiais por testes comportamentais.

Exemplo:

```ts
it("deve exigir detalhe_status para colocar frasco em quarentena", async () => {
  // chamada real
  // expectativa real
});
```

---

# 4. Sessão 5 — Descrição das Telas

A Sessão 5 acrescenta requisitos além de RF01–RF25.

Entre eles:

* header comum;
* perfil;
* logout;
* alternância de papel;
* sidebar;
* dashboards diferentes por papel;
* gerenciamento de gestores;
* busca e filtros;
* notificações;
* histórico de ações;
* gerenciamento de roteiros;
* compartilhamento de roteiros;
* Meus Reagentes;
* Feed de turma;
* comentários;
* empréstimo/devolução;
* etiquetas;
* relatórios;
* baixa patrimonial;
* dashboards específicos de Chefe Geral, Professor, Gestor de Almoxarifado e Gestor de Bens Patrimoniais.

A própria descrição das telas deixa claro que o produto esperado é maior que simplesmente “os 25 RFs implementados”.

---

# 5. Estimativa da Sessão 5

| Área                          | Prontidão |
| ----------------------------- | --------: |
| Header/autenticação           |       75% |
| Multi-role                    |       70% |
| Dashboard Chefe Geral         |       50% |
| Dashboard Professor           |       60% |
| Dashboard Gestor Almoxarifado |       55% |
| Dashboard Gestor Patrimonial  |       55% |
| Busca/filtros                 |       45% |
| Notificações                  |       45% |
| Reagentes na UI               |       55% |
| Patrimônio na UI              |       60% |
| Turmas/feed                   |       70% |
| Roteiros                      |       55% |
| Relatórios                    |       50% |
| Impressão de etiquetas        |       45% |

Estimativa global da camada de telas e fluxos:

**~57%**

---

# 6. Regras de Negócio

## 6.1 Identidade e papéis

Regras importantes:

* Chefe Geral não pode possuir outro papel.
* Usuário pode possuir múltiplos papéis permitidos.
* Aluno não pode ser Professor.
* Aluno pode ser Bolsista.
* Bolsista não pode acumular Gestor de Almoxarifado.
* Professor pode acumular Gestor Patrimonial.
* Professor pode acumular Gestor de Almoxarifado.
* Aluno pode acumular determinados papéis de gestão.
* Somente Chefe Geral pode transformar Aluno em Bolsista.

O backend já possui uma base sólida de resolução de papéis e Custom Claims, mas essas combinações precisam ser testadas sistematicamente.

---

# 7. Reagentes

O backend já possui implementação para:

* cadastro de frasco fechado;
* cadastro de frasco aberto;
* cálculo por densidade;
* validade;
* quarentena;
* estados do frasco;
* geração de código;
* movimentação.

Porém é necessário provar todas essas regras por testes reais.

### Devem ser testados, entre outros:

```text
densidade <= 0
peso negativo
volume negativo
peso retorno > peso saída
quarentena sem detalhe
retirada de frasco em quarentena
frasco vencido
abertura e validade pós-abertura
cálculo de volume
cálculo de consumo
frasco sólido usando regra de líquido
```

---

# 8. Patrimônio

Fluxo esperado:

```text
Cadastro
    ↓
Requisição
    ↓
Aprovação
    ↓
Criação/edição
    ↓
Histórico
    ↓
Baixa
    ↓
PDF comprobatório
    ↓
Auditoria
```

O ponto fundamental é garantir que isso funcione ponta a ponta.

Especialmente:

```text
Frontend
    ↓
Upload PDF
    ↓
Storage
    ↓
Backend
    ↓
Firestore
    ↓
Auditoria
    ↓
Relatório
```

---

# 9. Turmas

Este é atualmente um dos módulos mais maduros.

Já existem implementações de:

* criação;
* capacidade máxima;
* entrada por código;
* remoção;
* arquivamento;
* convites;
* histórico;
* auditoria;
* posts;
* comentários.

Ainda existem pendências de fechamento, principalmente:

### Tratamento de erros

Algumas funções podem converter erros específicos em:

```text
internal
```

Isso dificulta o tratamento correto pelo frontend.

Deve-se preservar erros como:

```text
invalid-argument
permission-denied
already-exists
not-found
failed-precondition
```

quando apropriado.

### Testes

Os testes atuais ainda possuem muitos placeholders e precisam realmente executar os comportamentos previstos.

---

# 10. Matérias

O backend já possui criação de matéria e validação de código único.

Porém ainda havia referências temporárias como:

```text
MAT_TEMP_ID
Matéria Temporária
```

Essa etapa foi considerada resolvida e, portanto, não entra mais como pendência desta auditoria.

O fluxo definitivo deve permanecer:

```text
Firestore
    ↓
Seleção de matéria
    ↓
Turma
    ↓
Professor
    ↓
Aluno
```

---

# 11. Notificações

A documentação determina que as notificações de devolução de reagentes sejam geradas pelo backend para:

* atrasado;
* vence hoje;
* vence amanhã.

Além disso, deve haver idempotência.

Fluxo:

```text
Scheduler
    ↓
Cloud Function
    ↓
buscar EM_USO
    ↓
classificar datas
    ↓
aplicar idempotência
    ↓
criar Notificacao
```

Depois:

```text
Frontend
    ↓
consulta notificações
    ↓
agrupa visualmente
    ↓
exibe ao usuário
```

A criação da notificação deve permanecer responsabilidade do backend.

---

# 12. Nova estimativa geral

| Dimensão            | Prontidão |
| ------------------- | --------: |
| RF01–RF25           |   **69%** |
| Regras de negócio   |   **65%** |
| Sessão 5            |   **57%** |
| Firestore/modelagem |   **72%** |
| Backend             |   **66%** |
| Frontend            |   **59%** |
| Security Rules      |   **45%** |
| Testes reais        |   **35%** |
| Infra/release       |   **55%** |

Aplicando pesos maiores para funcionalidade, segurança, testes e integração:

# **Prontidão geral atual: ~63%**

Esse é o valor que eu adotaria oficialmente:

# **LCQUI = 63% de prontidão**

---

# 13. Definição de 100%

Um requisito somente estará em **100%** quando possuir:

```text
RF/RN
 +
Código
 +
Tela
 +
Firestore
 +
Security Rules
 +
Teste
 +
Integração
 +
Documentação sincronizada
```

Portanto:

> Código funcionando sozinho não significa 100%.

---

# 14. Plano de desenvolvimento até 100%

A ordem recomendada é:

```text
P0 — Fundação
 ↓
P1 — Segurança
 ↓
P2 — Domínio/backend
 ↓
P3 — Módulos
 ↓
P4 — Frontend/Sessão 5
 ↓
P5 — Testes
 ↓
P6 — Integração
 ↓
P7 — Homologação
 ↓
P8 — Release
```

---

# FASE 0 — Criar a matriz oficial de rastreabilidade

Criar:

```text
documentation/
└── MATRIZ_IMPLEMENTACAO_LCQUI.md
```

Cada requisito deve possuir:

```text
ID
Descrição
Tela
Componente
Cloud Function
Coleção Firestore
Security Rule
Teste unitário
Teste integração
Teste E2E
Status
```

Status:

```text
ESPECIFICADO
EM_DESENVOLVIMENTO
PARCIAL
IMPLEMENTADO
VALIDADO
```

Nenhum RF, RN ou fluxo deve ficar fora dessa matriz.

---

# FASE 1 — Fechar Firestore Security Rules

## Passo 1.1

Criar:

```text
firestore.rules
```

Começar com:

```text
allow read, write: if false;
```

e liberar explicitamente cada operação autorizada.

## Passo 1.2

Registrar o arquivo no:

```text
firebase.json
```

## Passo 1.3

Criar testes das Security Rules.

Testar:

```text
não autenticado → negar
aluno → negar operações administrativas
professor → permitir somente o autorizado
gestor → permitir somente seu domínio
chefe → permitir administração
usuário fora da turma → negar
usuário fora do almoxarifado → negar
```

---

# FASE 2 — Fechar Storage Security

Revisar:

```text
/relatorios
/etiquetas
/roteiros
/baixas_patrimoniais
```

Para cada um definir:

```text
quem lê
quem grava
quem substitui
quem apaga
ownership
MIME permitido
tamanho máximo
namespace
```

---

# FASE 3 — Validação de entrada no backend

Eliminar dependência de:

```ts
request.data as Interface
```

como mecanismo de validação.

Criar schemas reais para:

```text
Usuario
Materia
Turma
Patrimonio
Reagente
Frasco
Emprestimo
Requisicao
Post
Comentario
Roteiro
```

Validar:

```text
tipos
enums
obrigatoriedade
ranges
datas
IDs
relacionamentos
```

---

# FASE 4 — Multi-role

Criar matriz oficial de compatibilidade:

| Papel A   | Papel B             | Permitido |
| --------- | ------------------- | --------- |
| Chefe     | qualquer outro      | ❌         |
| Professor | Gestor Patrimonial  | ✅         |
| Professor | Gestor Almoxarifado | ✅         |
| Aluno     | Professor           | ❌         |
| Aluno     | Bolsista            | ✅         |
| Bolsista  | Gestor Almoxarifado | ❌         |
| Aluno     | Gestor Patrimonial  | ✅         |

Depois transformar cada regra em teste.

---

# FASE 5 — Turmas

## Passo 5.1

Finalizar a consistência da relação Aluno–Turma.

Estrutura:

```text
Turma/{turmaId}/Alunos/{uid}
```

e espelho:

```text
Usuarios/{uid}/Turmas/{turmaId}
```

## Passo 5.2

Garantir atualização atômica dos dois lados.

## Passo 5.3

Na remoção, remover também o espelho.

## Passo 5.4

Garantir comportamento correto no arquivamento/desarquivamento.

## Passo 5.5

Garantir que Professor e Aluno consultem a estrutura definitiva.

---

# FASE 6 — Reagentes

Implementar e validar:

```text
Cadastro
 ↓
Frasco
 ↓
Retirada
 ↓
Em uso
 ↓
Devolução
 ↓
Cálculo de consumo
 ↓
Atualização de estado
 ↓
Histórico
```

Testar:

```text
PURA
MISTURA
SOLIDO
LIQUIDO
QUARENTENA
VENCIDO
VAZIO
QUEBRADO
DESCARTADO
```

E também todas as fórmulas de massa, volume e consumo.

---

# FASE 7 — Patrimônio

Fechar:

```text
Cadastro
 ↓
Requisição
 ↓
Aprovação/Rejeição
 ↓
Edição
 ↓
Histórico
 ↓
Baixa
 ↓
PDF
 ↓
Auditoria
```

Testar:

```text
número duplicado
requisição duplicada
aprovação sem permissão
rejeição
baixa sem PDF
baixa com PDF
auditoria
responsável
```

---

# FASE 8 — Notificações

Implementar definitivamente o scheduler:

```text
Scheduler
    ↓
Cloud Function
    ↓
EM_USO
    ↓
classificação
 ┌─────┼─────┐
 ↓     ↓     ↓
ATRAS. HOJE AMANHÃ
    ↓
idempotência
    ↓
Notificacao
```

Testar com datas controladas.

---

# FASE 9 — Roteiros

Completar:

```text
Upload
 ↓
Storage
 ↓
Metadata Firestore
 ↓
Meus Roteiros
 ↓
Compartilhados comigo
 ↓
Post
 ↓
Turma
```

Garantir:

```text
PDF válido
ownership
compartilhamento único
permissão
download
histórico
```

---

# FASE 10 — Busca

Criar estratégia específica para:

```text
Reagentes
Frascos
Patrimônio
Professores
Alunos
Turmas
```

Para cada busca documentar:

```text
campo
filtro
query
índice
paginação
limite
ordenação
```

Evitar queries genéricas gigantescas.

---

# FASE 11 — Frontend/Sessão 5

## 11.1 Shell global

Implementar:

```text
Header
Perfil
Logout
Multi-role
Sidebar
Loading
Errors
```

## 11.2 Chefe Geral

Implementar:

```text
Almoxarifados
Patrimônio
Professores
Alunos
Gestores
Relatórios
```

## 11.3 Professor

Implementar:

```text
Turmas
Feed
Posts
Comentários
Roteiros
Requisições
Meus Reagentes
Notificações
```

## 11.4 Gestor de Almoxarifado

Implementar:

```text
Estoque
Cadastro de Reagente
Cadastro de Frasco
Retirada
Devolução
Descarte
Alertas
Relatórios
Etiquetas
```

## 11.5 Gestor de Bens Patrimoniais

Implementar:

```text
Busca
Requisições
Aprovação
Baixa
Auditoria
Relatórios
```

Cada tela deve apontar para RF/RN/Fluxo na matriz.

---

# FASE 12 — Refatoração dos testes

Separar:

```text
unit/
integration/
security/
e2e/
```

Para cada RF crítico:

```text
1 caminho feliz
1 falha de validação
1 falha de autorização
```

Para cada mutação crítica:

```text
request
 ↓
function
 ↓
firestore
 ↓
audit
```

deve haver teste de integração.

---

# FASE 13 — Testes E2E

### E2E-01

```text
Login
 ↓
Dashboard
 ↓
Multi-role
```

### E2E-02

```text
Professor
 ↓
Cria turma
 ↓
Aluno entra
 ↓
Professor cria post
 ↓
Aluno comenta
```

### E2E-03

```text
Gestor
 ↓
Cadastra reagente
 ↓
Cadastra frasco
 ↓
Retira
 ↓
Devolve
 ↓
Calcula consumo
```

### E2E-04

```text
Professor
 ↓
Requisita patrimônio
 ↓
Gestor aprova
 ↓
Patrimônio criado
```

### E2E-05

```text
Patrimônio
 ↓
Baixa
 ↓
PDF
 ↓
Auditoria
```

### E2E-06

```text
Chefe
 ↓
Cria usuário
 ↓
Atribui papel
 ↓
Custom Claim
 ↓
Usuário acessa dashboard
```

---

# FASE 14 — Materialized Views e Relatórios

Validar:

```text
Resumo diário
Resumo mensal
Consumo em mL
Consumo em g
Movimentações
Patrimônio
Histórico
```

Testar idempotência:

```text
mesmo evento processado duas vezes
        ↓
não duplicar resumo
```

---

# FASE 15 — Tratamento de erros e observabilidade

Padronizar:

```text
HttpsError
logging
erros esperados
erros inesperados
```

Preservar códigos corretos:

```text
invalid-argument
permission-denied
not-found
already-exists
failed-precondition
internal
```

Usar `internal` somente para falhas realmente internas.

---

# FASE 16 — Homologação

Criar usuários de teste:

```text
Chefe
Professor
Aluno
Bolsista
Gestor Almoxarifado
Gestor Patrimonial
Multi-role
```

Criar massa de dados:

```text
Turmas
Reagentes
Frascos
Patrimônios
Posts
Roteiros
Requisições
```

Executar toda a matriz.

---

# FASE 17 — Release

Antes do primeiro release:

```text
✓ Build frontend
✓ Build Functions
✓ Lint
✓ Unit tests
✓ Integration tests
✓ Security Rules tests
✓ E2E
✓ Firebase Emulator
✓ Deploy de Rules
✓ Deploy Functions
✓ Deploy Storage
✓ Configuração de índices
✓ Variáveis de ambiente
✓ Smoke test
```

---

# 15. Meta de evolução

A progressão esperada pode ser:

| Marco                                     | Prontidão |
| ----------------------------------------- | --------: |
| Estado atual                              |   **63%** |
| Security Rules + infraestrutura           |   **68%** |
| Domínio/backend fechado                   |   **75%** |
| Reagentes + Patrimônio + Turmas completos |   **82%** |
| Sessão 5 completa                         |   **90%** |
| Testes reais + integração                 |   **95%** |
| E2E + homologação + documentação final    |  **100%** |

---

# 16. Critério definitivo para 100%

O LCQUI somente deve ser considerado 100% quando:

```text
RF01  → VALIDADO
RF02  → VALIDADO
...
RF25  → VALIDADO

RN001 → VALIDADO
RN002 → VALIDADO
...
RNxxx → VALIDADO

FLOW001 → VALIDADO
FLOW002 → VALIDADO
...
FLOWxxx → VALIDADO
```

e cada item possuir:

```text
✓ Código
✓ Tela
✓ Firestore
✓ Security Rules
✓ Teste unitário quando aplicável
✓ Teste de integração quando aplicável
✓ Teste E2E quando aplicável
✓ Documentação sincronizada
```

---

# Conclusão

O LCQUI está aproximadamente em:

# **63% de prontidão**

Esse número não significa que apenas 63% do código foi escrito.

A situação real é mais próxima de:

```text
Arquitetura/documentação  → avançadas
Domínio                   → avançado
Backend                   → parcialmente fechado
Frontend                  → intermediário
Firestore                 → relativamente avançado
Segurança                 → incompleta
Testes reais              → insuficientes
Integração ponta a ponta  → incompleta
```

O maior trabalho restante não é simplesmente “programar mais funcionalidades”.

É fechar o ciclo:

```text
Requisito
   ↓
Regra de negócio
   ↓
Firestore
   ↓
Backend
   ↓
Security Rules
   ↓
Tela
   ↓
Teste
   ↓
Integração
   ↓
Homologação
```

Quando esse ciclo estiver fechado para todos os RFs, RNs e fluxos da Sessão 5, o LCQUI estará efetivamente em **100%.**

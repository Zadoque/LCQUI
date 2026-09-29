# Guia de Testes E2E e Roteiro Manual para LCQUI

## 1. Arquitetura dos testes E2E

Os testes E2E do LCQUI utilizam o framework Playwright Test, com os arquivos de especificação localizados em `frontend/e2e/specs/*.spec.ts`. É importante distinguir dois usos distintos do Playwright:

- O CLI `playwright cli` (`npm run pw`) serve para exploração e depuração interativa
- Os arquivos `*.spec.ts` servem para assertions permanentes e regressão automatizada

A arquitetura dos helpers se divide em:

- `frontend/e2e/helpers/ui.ts`: Contém ações de UI como `login`, `abrirTurma`, `criarPost`, `comentar`, `abrirComentarios`, `cartaoDoPost`, `editarPost`, `editarComentario`, `capturarCallable`, `esperarCallable`, `observarConsole`
- `frontend/e2e/helpers/emulator.ts`: Funções para interagir com os emuladores como `listarColecao`, `lerDocumento`, e manipulação de OOB codes

A suíte de testes E2E utiliza o Firebase Emulator Suite (auth, firestore, functions, storage) e depende do seed canônico localizado em `functions/scripts/seed.ts`.

O arquivo `frontend/e2e/global-setup.ts` é responsável por validar que os emuladores estão disponíveis, resetar e re-semeiar o estado antes de executar os testes.

Os fixtures do seed incluem exemplos como:
- `professor.alpha@lcqui.local` (usuário com permissão de dono das turmas T1–T4)
- `aluno.matriculado@lcqui.local` (membro da turma `seed-turma-ultima-vaga`/“Química Geral — T2 Última Vaga”)
- `aluno.colega.a@lcqui.local` e `aluno.colega.b@lcqui.local` (membros da turma `seed-turma-colegas`/“Química Geral — T3 Colegas”)
- `chefe.seed@lcqui.local`

A senha padrão para todos os usuários do seed é `Test123456!`.

## 2. Como rodar

Existem diferentes formas de executar os testes E2E:

- Emuladores + suíte completa: `cd frontend && npm run test:e2e:emulators` (sobe os emuladores, executa os testes e derruba os emuladores após o término)
- Com emuladores já ativos: `cd frontend && npm run test:e2e -- e2e/specs/05-posts.spec.ts --grep "POST-E2E-00[1-3]"`
- Recomendação: Rodar **de 3 em 3 testes** (por exemplo, `--grep "COMMENT-E2E-00[1-3]"`), não a suíte inteira de uma vez. Isso reduz o tempo de execução e ajuda a detectar deadlocks ou travamentos mais rapidamente.
- Caso um teste demore muito além do tempo normal, suspeite de um deadlock operacional (como espera por um elemento que nunca aparece ou requisição abortada).
- Os emuladores usam 1 worker do Playwright por padrão; evite paralelizar suites que compartilham o mesmo banco de dados para evitar conflitos.

## 3. Como montar um roteiro manual a partir dos testes que falharam

Quando ocorrem falhas nos testes E2E, siga este processo para criar um roteiro manual de testes:

1. Liste os cenários E2E que não passaram (por exemplo: `COMMENT-E2E-001`, `004`, `005`, `006`, `007`)
2. Para cada cenário, escreva:
   - Objetivo do teste
   - Pré-condições necessárias
   - Passos numerados com os textos exatos de botões/campos e os logins necessários
   - Resultado esperado na tela
   - Verificação opcional no Firestore Emulator UI (`http://127.0.0.1:4000/firestore`) dos campos relevantes (`editado`, `editado_em`, `moderado`, `texto`, `titulo`, `descricao`) e subcoleções (`Historico_Posts_Turma`, `Historico_Comentario`)
3. Inclua uma seção "Como reportar" contendo: o cenário específico, o passo que falhou, o que foi observado, o que era esperado e uma screenshot do problema
4. Utilize como referência o roteiro existente: `documentation/worklogs/formal-spec/ROTEIRO_MANUAL_EDITAR_POST_COMENTARIO.md`

## 4. Pitfalls reais encontrados (lições aprendidas)

Durante o desenvolvimento e manutenção dos testes E2E, identificamos diversos problemas recorrentes:

1. **`prompt()`/`alert()` nativos quebram o Playwright e escondem problemas de UX.** A moderação de comentário inicialmente usava `prompt()` para solicitar o motivo; foi substituída por UI inline (textarea + botões "Confirmar moderação"/"Cancelar"). Sempre prefira UI própria em vez de diálogos nativos do navegador.

2. **Race condition com callables.** O helper anteriormente afirmava visibilidade do texto imediatamente após o clique; como o formulário virou `<textarea>`, o `getByText` casava com o VALOR do textarea antes da callable responder. O teste então fechava o contexto e abortava a requisição (visível no trace como `adicionarComentario` com `status: -1`) — o comentário nunca era persistido. Correção: aguardar `esperarCallable(page, "<nome>")` antes de afirmar a visibilidade e antes de fechar o contexto.

3. **`getByText` pode casar com valor de `<textarea>`.** Não derive locators de texto que muda durante a edição. Use `data-testid` estáveis para garantir consistência dos testes.

4. **Locator derivado de texto mutável quebra.** Ao entrar em edição/moderação inline, o texto do comentário é substituído pelo formulário; `getByText(textoOriginal)` deixa de casar. A solução é escopar ao card do Post (`cartaoDoPost`) ou usar `data-testid` específicos como `comentario-item`, `comentario-texto`, `editar-texto-comentario`, `salvar-edicao-comentario`.

5. **Truncamento do último post no feed.** O estilo `h-[calc(100vh-64px)]` no feed ignorava o header/barra do professor; foi corrigido para `h-full`. Sem essa correção, testes com 3+ posts não conseguiam alcançar o último post/comentários.

6. **Textarea de comentário não crescia.** Textos longos estouravam a tela; corrigido com `min-h`, `max-h` e `overflow-y-auto` para garantir usabilidade com conteúdos longos.

7. **Lacuna de notificações**: Painel e itens sem contraste adequado e mensagens genéricas ("COMENTARIO"). Documentado em `documentation/worklogs/formal-spec/LACUNAS_NOTIFICACOES.md` e pendente de correção.

## 5. Como investigar uma falha

Ao investigar uma falha nos testes E2E:

- Leia o arquivo `frontend/test-results/<teste>/error-context.md` (inclui snapshot da página no momento do erro)
- Extraia o trace usando: `nix-shell -p unzip --run 'unzip -o -q <trace.zip>'` e inspecione o arquivo `*-trace.network` procurando os callables (`us-central1/<nome>`); `status: -1` indica requisição abortada/sem resposta
- Para visualização interativa do trace: `npx playwright show-trace <trace.zip>`
- Compare o comportamento observado com a especificação formal (Seções 7/8/9 do `main.tex`, CUE/Alloy)

## 6. Preferências de locators

Siga esta ordem de preferência para selecionar elementos na interface:

- Primeira opção: `getByRole`
- Segunda opção: `getByLabel`  
- Terceira opção: `getByText` (quando o texto é estável)
- Quarta opção: `getByTestId`

Evite seletores CSS frágeis baseados na estrutura visual. Para evitar ambiguidade e garantir robustez, use atributos `data-testid` onde necessário.
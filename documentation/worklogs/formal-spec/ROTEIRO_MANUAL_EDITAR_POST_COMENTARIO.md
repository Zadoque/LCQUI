# Roteiro Manual — Edição e Moderação de Post e Comentário (M12.1)

Este roteiro cobre cenários críticos da fatia `editarPost`/`editarComentario` cujos testes E2E automatizados estão instáveis. Siga os passos exatos para validar manualmente a funcionalidade no ambiente local com emuladores.

## Ambiente

- **Professor dono:** `professor.alpha@lcqui.local` / senha `Test123456!`
- **Aluno membro de "Química Geral — T2 Última Vaga" (QGV102):** `aluno.matriculado@lcqui.local` / `Test123456!`
- **Alunos membros de "Química Geral — T3 Colegas" (QGV103):** `aluno.colega.a@lcqui.local` e `aluno.colega.b@lcqui.local` / `Test123456!`
- **Frontend:** `http://localhost:3000`
- **Firestore Emulator UI:** `http://127.0.0.1:4000/firestore`

### Como subir os emuladores e o frontend

```bash
# Terminal 1
cd /home/dock/dev/LCQUI
./functions/node_modules/.bin/firebase emulators:start --project lcqui-uenf --only auth,firestore,functions,storage

# Terminal 2
cd frontend && npm run dev
```

Aguarde até que ambos estejam prontos antes de iniciar os testes.

---

## Cenário 1 — COMMENT-E2E-001: Aluno participante comenta no post e o comentário persiste

### Objetivo
Verificar que um aluno matriculado pode criar um comentário em um post e que ele permanece visível após recarregar a página.

### Pré-condições
- Turma "Química Geral — T2 Última Vaga" (QGV102) está ativa.
- Professor já criou um post na turma QGV102.

### Passos
1. Faça login como `aluno.matriculado@lcqui.local`.
2. Navegue até a turma "Química Geral — T2 Última Vaga".
3. Abra o post criado pelo professor.
4. No campo "Escreva um comentário...", digite: `Comentário de teste do aluno matriculado.`.
5. Clique no botão "Publicar comentário".
6. Recarregue a página do navegador.

### Resultado esperado
- O comentário aparece na lista com o texto exato digitado.
- Após recarregar, o comentário continua visível.
- Na UI, não há indicação de "(editado)" nem "(moderado)".

### Verificação no Firestore Emulator UI
- Acesse `http://127.0.0.1:4000/firestore`.
- Navegue até a coleção `Comentarios` e localize o documento do comentário.
- Confirme que os campos `texto` contém o texto digitado, `editado` é `false` e `moderado` é `false`.

---

## Cenário 2 — COMMENT-E2E-004: Professor dono modera comentário; autor vê original marcado como "(moderado)"; professor (auditor) vê o motivo

### Objetivo
Verificar que ao moderar um comentário, o autor vê o texto original com marcação "(moderado)", enquanto o professor dono (como auditor) vê tanto o texto original quanto o motivo da moderação.

### Pré-condições
- Cenário 1 foi executado com sucesso (comentário existe).
- Usuário logado como professor dono tem permissão para moderar.

### Passos
#### Parte A: Moderar o comentário
1. Faça logout e faça login como `professor.alpha@lcqui.local`.
2. Navegue até a turma "Química Geral — T2 Última Vaga".
3. Abra o post com o comentário do aluno.
4. Passe o mouse sobre o comentário do aluno e clique no ícone de "Moderar comentário".
5. No campo de texto que aparece com placeholder "Motivo da moderação...", digite: `Conteúdo inadequado para o contexto acadêmico.`.
6. Clique no botão "Confirmar moderação".

#### Parte B: Ver como autor
7. Faça logout e faça login novamente como `aluno.matriculado@lcqui.local`.
8. Navegue até a turma "Química Geral — T2 Última Vaga".
9. Abra o mesmo post.

#### Part C: Ver como auditor (professor)
10. Faça logout e faça login como `professor.alpha@lcqui.local`.
11. Navegue até a turma "Química Geral — T2 Última Vaga".
12. Abra o mesmo post.

### Resultado esperado
- **Como autor:** O comentário aparece com o texto original seguido de "(moderado)" em cinza.
- **Como auditor (professor):** O comentário aparece com o texto original, e abaixo dele, em destaque, o motivo da moderação: "Conteúdo inadequado para o contexto acadêmico.".

### Verificação no Firestore Emulator UI
- Localize o documento do comentário em `Comentarios`.
- Confirme que `moderado` é `true`, `motivo_moderacao` contém o texto digitado, e `texto` ainda contém o texto original.
- Verifique a subcoleção `Historico_Comentario`: deve haver um documento com `tipo: "moderacao"`, `motivo` preenchido e `novo_texto` ausente.

---

## Cenário 3 — COMMENT-E2E-005: Colega de turma vê aviso institucional, nunca o texto do comentário moderado

### Objetivo
Verificar que um colega de turma (outro aluno matriculado na mesma turma) vê apenas um aviso institucional genérico e nunca o conteúdo original do comentário moderado.

### Pré-condições
- Cenário 2 foi executado com sucesso (comentário está moderado).

### Passos
1. Faça logout e faça login como `aluno.colega.a@lcqui.local`.
2. Navegue até a turma "Química Geral — T2 Última Vaga".
3. Abra o post com o comentário moderado.

### Resultado esperado
- O comentário aparece com um aviso institucional como: "Este comentário foi moderado por conter conteúdo inadequado.".
- O texto original do comentário **nunca** é exibido.

### Verificação no Firestore Emulator UI
- Não é necessário acessar o Firestore, pois a verificação é puramente visual na UI.
- Confirme que a lógica de máscara não expõe `texto` para colegas.

---

## Cenário 4 — COMMENT-E2E-006: Autor edita seu comentário e aparece o indicador "(editado)"

### Objetivo
Verificar que quando o autor edita seu próprio comentário (não moderado), o indicador "(editado)" aparece junto ao comentário.

### Pré-condições
- Crie um novo post ou use um existente sem comentários moderados.
- Aluno `aluno.matriculado@lcqui.local` está matriculado na turma.

### Passos
1. Faça login como `aluno.matriculado@lcqui.local`.
2. Navegue até a turma "Química Geral — T2 Última Vaga".
3. Abra um post e publique um novo comentário: `Texto inicial do comentário.`.
4. Passe o mouse sobre seu comentário e clique em "Editar comentário".
5. Altere o texto para: `Texto editado do comentário.`.
6. Clique em "Salvar edição".

### Resultado esperado
- O comentário agora exibe o novo texto seguido de "(editado)" em cinza.
- O texto original não é mais visível.

### Verificação no Firestore Emulator UI
- Localize o documento do comentário em `Comentarios`.
- Confirme que `texto` contém o novo texto, `editado` é `true` e `editado_em` está preenchido.
- Verifique a subcoleção `Historico_Comentario`: deve haver um documento com `tipo: "edicao"`, `texto_antigo` com o texto inicial e `novo_texto` com o texto editado.

---

## Cenário 5 — COMMENT-E2E-007: Edição do autor não desfaz a moderação

### Objetivo
Verificar que mesmo após o autor editar um comentário que já foi moderado, a moderação permanece ativa e o colega continua vendo apenas o aviso institucional.

### Pré-condições
- Cenário 2 foi executado com sucesso (comentário está moderado).

### Passos
1. Faça login como `aluno.matriculado@lcqui.local`.
2. Navegue até a turma "Química Geral — T2 Última Vaga".
3. Abra o post com o comentário moderado.
4. Clique em "Editar comentário" (deve estar disponível para o autor mesmo após moderação).
5. Altere o texto para: `Novo texto após moderação.`.
6. Clique em "Salvar edição".
7. Faça logout e faça login como `aluno.colega.a@lcqui.local`.
8. Navegue até a mesma turma e abra o post.

### Resultado esperado
- **Como autor:** O comentário exibe o novo texto seguido de "(moderado)" (não "(editado)").
- **Como colega:** Continua vendo apenas o aviso institucional, nunca o novo texto.

### Verificação no Firestore Emulator UI
- Localize o documento do comentário em `Comentarios`.
- Confirme que `moderado` permanece `true`, `texto` contém o novo texto, e `editado` é `true`.
- Verifique a subcoleção `Historico_Comentario`: deve haver dois documentos — um de `tipo: "moderacao"` e outro de `tipo: "edicao"`.

---

## Como reportar falhas

Se algum cenário não produzir o resultado esperado:

1. **Anote o cenário** (ex: COMMENT-E2E-004).
2. **Identifique o passo exato** que falhou.
3. **Descreva o comportamento observado** (o que realmente aconteceu).
4. **Compare com o comportamento esperado** (descrito neste roteiro).
5. **Capture um screenshot** da tela no momento da falha.
6. Envie todas essas informações para o responsável pelo desenvolvimento.

Mantenha o ambiente dos emuladores ativo até que todas as verificações sejam concluídas.
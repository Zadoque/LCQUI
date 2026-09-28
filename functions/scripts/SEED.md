# Fixture manual do Emulator Suite

O seed canônico cobre o baseline corrente de M9, M11 e M13. Ele exige
`FIRESTORE_EMULATOR_HOST` e `FIREBASE_AUTH_EMULATOR_HOST`; não define hosts por
conta própria e encerra com erro se essas variáveis não existirem.

Em outro terminal, na raiz do repositório:

```bash
firebase emulators:start --project lcqui-uenf --only auth,firestore
```

Depois, em `functions/`:

```bash
npm run seed:emulator:reset  # limpar o Emulator Suite e semear novamente
npm run seed:emulator        # semear sem limpar; repetição é idempotente
npm run seed:emulator:verify # somente reler e verificar invariantes
```

O projeto `lcqui-dev` também é aceito porque é o ID usado pelos scripts de
teste do repositório. O seed exige que o `GCLOUD_PROJECT` fornecido pelo CLI
seja um desses IDs explicitamente permitidos.

As credenciais e os IDs são impressos ao final. A senha comum é exclusivamente
do Auth Emulator: `Test123456!`. O baseline não cria convites, notificações de
convite, tokens, hashes de convite nem receipts M7; esses fatos devem ser
produzidos pela interface durante o teste manual.

Cenários principais: Professor Alpha e Professor Beta, Chefe Geral, gestor de
almoxarifado, gestor patrimonial, bolsista, aluno existente, conta Auth sem
papel Aluno, conta não verificada, Auth desabilitado, aluno matriculado, aluno
removido e e-mail sem conta Auth. Turmas: vazia, última vaga, cheia,
arquivada e turma de Professor Beta.

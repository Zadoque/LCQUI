# Rodada de UI, listeners e evidências E2E — 2026-10-13

## Escopo

Esta rodada cobre alterações de interface e de transporte que não mudam os
contratos normativos do domínio:

- cadastro de frasco contextualizado ao resumo/especificação e conferência de lote;
- filtro de tipo no catálogo de reagentes;
- busca administrativa por letra inicial;
- ações de gestores patrimoniais e almoxarifados;
- paginação/busca de matérias no convite de professor;
- recolhimento do painel de turmas em telas estreitas;
- identidade visual e ícone do LCQUI.

## Contratos corrigidos

`Professor_x_Materia` é lido por `id_professor` e `id_materia`. A consulta do
frontend ainda usava o campo legado `id_usuario`, embora o seed canônico e a
norma corrente já o proibissem. A correção foi aplicada em
`frontend/src/services/turmas/turmasService.ts` e validada no fluxo de criação
de turma.

O caminho de concessão do papel de professor também foi alinhado: novas
relações em `Professor_x_Materia` passam a gravar somente
`id_professor`/`id_materia`, sem reintroduzir `id_usuario`.

O modal de gestores mantém o salvamento bloqueado enquanto a lista de gestores
e os vínculos atuais ainda estão sendo carregados. Assim, uma seleção vazia
temporária não pode substituir o vínculo existente.

## Cache e listeners

O frontend passou a inicializar o Firestore Web com `persistentLocalCache` e
`persistentMultipleTabManager` quando o IndexedDB está disponível. O
`onSnapshot` continua sendo encerrado ao sair da tela e reaberto ao retornar;
o cache persistente permite entregar o estado já materializado e sincronizar
alterações. Isso é otimização de transporte, não garantia de custo zero: a
revalidação do servidor e mudanças reais ainda podem gerar leituras cobradas.

Auditoria do projeto `lcqui-dev` nos logs de acesso a dados do Firestore, janela
de três horas, antes desta alteração:

| método | principal | eventos |
|---|---|---:|
| `BatchGetDocuments` | service account de compute | 196 |
| `Listen` | service account de Rules | 149 |
| `RunQuery` | service account de compute | 127 |
| `Commit` | service account de compute | 84 |
| `Listen` | `zadoquepiresdedeus@gmail.com` | 58 |
| `ListCollectionIds` | `zadoquepiresdedeus@gmail.com` | 11 |
| `ListDocuments` | `zadoquepiresdedeus@gmail.com` | 6 |

Os eventos não são equivalentes um-para-um a leituras faturáveis. Os seis
`ListDocuments` foram atribuídos ao principal do usuário e devem ser
investigados no Console/administração; o frontend usa `getDocs`/`onSnapshot`,
não a operação REST `ListDocuments`. Os eventos administrativos de
`BatchGetDocuments`, `RunQuery` e `Commit` vieram da service account usada por
Functions/rotinas administrativas.

## Evidência executada

Todos os comandos abaixo foram executados dentro do shell Node.js 20 do projeto
e contra o Firebase Emulator Suite com `LCQUI_E2E_PROJECT_ID=lcqui-dev`:

- `25-catalogo-reagentes.spec.ts`: 6/6 verdes;
- `19-materias.spec.ts`: 9/9 verdes;
- `09-turmas.spec.ts`: 5 verdes e 1 cenário explicitamente ignorado;
- `21-patrimonio-requisicoes.spec.ts`: 4/4 verdes;
- `21-almoxarifados.spec.ts` + `23-role-001.spec.ts`: 17/18 verdes na
  regressão inicial; o único cenário falhou por corrida de carregamento e
  passou 1/1 após o bloqueio do salvamento durante a leitura dos vínculos;
- os cenários existentes de frascos e metrologia correlatos permaneceram
  verdes na execução anterior: 10/10.

O seed e os emuladores foram usados somente localmente. Nenhuma carga ou
alteração no Firebase real foi feita nesta rodada.

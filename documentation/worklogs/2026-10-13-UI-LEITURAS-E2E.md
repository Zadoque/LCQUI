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

## Seletor de novo professor — RN-ROLE-01/UI-02

Antes da correção, o modal chamava `buscarUsuariosParaPapel` sem informar o
papel pretendido. A resposta incluía identidades ativas incompatíveis, como o
Chefe Geral, embora a mutação posterior fosse rejeitada por
`validarMatrizPapeis`. A norma corrente (`RN-ROLE-01`) exige que Chefe Geral
seja mutuamente exclusivo com Professor e todos os demais papéis.

O serviço passou a solicitar explicitamente a projeção para `Professor`, e o
modal passou a assinar/desassinar uma camada de cache dessa projeção. Não foi
criado `onSnapshot` direto de `Usuarios`: as Rules permitem somente leitura
individual nessa coleção e a UI-02 exige pesquisa autorizada por projeção
mínima server-side. O cache evita chamadas callable duplicadas entre aberturas
do modal enquanto a projeção não for invalidada; não é apresentado como um
listener Firestore nem como garantia de custo zero.

Evidência: `22-role-004.spec.ts` passou com 4/4 cenários, incluindo a ausência
de `seed-chefe-geral` no seletor e a reutilização da única chamada
`buscarUsuariosParaPapel` ao fechar e reabrir o modal.
## Busca administrativa de pessoas: cache e debounce

`/pessoas` usa a callable `buscarUsuariosParaPapel`, conforme UI-02/UI-13. A
lista não usa `onSnapshot`: as Rules não permitem listar `Usuarios` diretamente
no cliente e a norma exige uma projeção mínima server-side. A busca passou a
usar cache de sessão em memória cuja chave contém UID, recurso, papel, letra e
termo. A tela aplica debounce de 300 ms antes de disparar uma nova busca. Assim,
digitação rápida não gera uma callable por caractere e filtros já consultados
na sessão são reutilizados. O cache é invalidado após concessão ou revogação de
papel; a validação normativa continua sempre no backend.

Evidência E2E: `ROLE-001-E2E-002` comprova a consulta inicial, a consulta de
um filtro novo e a reutilização do filtro anteriormente consultado sem uma
quarta chamada.

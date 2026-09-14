# PLANO_IMPLEMENTACAO_LOTE_3B_APOS_3B1

Data: 2026-09-14  
Base semântica: `AVALIACAO_RESPOSTAS_FASE_3B1_R2.md` — revisão R2.1  
Gate: `SEMANTIC_GATE = PASS`

## Objetivo

Aplicar documentalmente as decisões fechadas da Fase 3B.1 sem reiniciar o Lote 3B, preservando decisões anteriores e fechando os bloqueadores de PDF-014, PDF-021 e PDF-025.

## Ordem obrigatória de implementação

1. Executar o **checkpoint técnico de `disponibilidade` para EXTRAVIADO** antes de editar o modelo: rastrear a semântica e todos os consumidores de `disponibilidade` nas Seções 4–11; não criar `INDISPONIVEL` nem escolher outro valor por conveniência.
2. Atualizar fontes canônicas de dados/semântica: Seções 4 e 5.
3. Atualizar materializações e regras de negócio: Seções 6 e 7.
4. Atualizar UI/UX e fluxos: Seções 8 e 9.
5. Atualizar contratos operacionais/jobs/relatórios/consolidação na Seção 10.
6. Atualizar Security Rules da Seção 11.
7. Atualizar Contract Cards do Lote 3B.
8. Executar revisão transversal de identidade, NULL vs zero, desativação x exclusão, idempotência e Q06.
9. Executar `git diff --check`.
10. Criar commit funcional/documental e registrar SHA.
11. Compilar exatamente esse SHA; inspecionar páginas alteradas; atualizar `VALIDACAO_LATEX.md`, depois `CHECKPOINT.md`, e `main.pdf` por último.

---

# DDP-3B1-01 — Extravio recuperável

## Checkpoint técnico obrigatório — semântica de `disponibilidade`

Antes de alterar enum/campo, localizar todas as definições e usos de `Frasco_Reagente.disponibilidade` nas Seções 4–11 e classificar a semântica vigente:

- se `disponibilidade` representa **ocupação/vínculo de empréstimo** (`DISPONIVEL` = sem empréstimo ativo; `EMPRESTADO` = com empréstimo ativo), um frasco `EXTRAVIADO` após encerramento pode não estar emprestado, mas isso **não o torna apto para retirada**. Nesse caso, o predicado operacional deve obrigatoriamente exigir `estado_fisico_frasco` elegível, além de disponibilidade, quarentena, descarte etc.; UI/relatórios não podem chamar o extraviado de “disponível para uso”.
- se `disponibilidade` representa **aptidão operacional para retirada**, o domínio `DISPONIVEL|EMPRESTADO` torna-se insuficiente para `EXTRAVIADO`; ampliar/remodelar o domínio é então correção técnica necessária.

Não introduzir `INDISPONIVEL` automaticamente. Registrar no worklog qual leitura é sustentada pelo conjunto normativo e propagar a menor solução consistente. Somente abrir nova DDP se os documentos revelarem uma escolha institucional genuína que não possa ser deduzida tecnicamente.

### Seção 4 — 3FN
- adicionar `EXTRAVIADO` ao domínio do estado físico;
- extravio não equivale a descarte físico;
- histórico registra `EXTRAVIOU_EM_EMPRESTIMO` e `REENCONTRADO_APOS_EXTRAVIO`;
- `reencontrado_em/por`, se mantidos no snapshot, são projeções do último evento, não fonte histórica canônica;
- preservar `peso_atual` como última medição válida/ausente; nunca usar 0 para ausência;
- só alterar o domínio de `disponibilidade` se o checkpoint demonstrar necessidade semântica.

### Seção 5 — Firestore
- qualquer consulta de estoque apto exclui `EXTRAVIADO` por contrato;
- não persistir combinação que faça o consumidor interpretar extraviado como apto para retirada;
- reencontro atômico valida estado anterior, grava evento, atualiza estado físico observável e `em_quarentena=true`;
- empréstimo extraordinariamente encerrado permanece fechado.

### Seção 6 — materializações
- separar extraviados, quarentena e estoque apto;
- reencontro não volta ao saldo apto antes da liberação.

### Seção 7 — RN/RF
- formalizar ausência recuperável + reingresso obrigatório por quarentena;
- formalizar predicado de elegibilidade de retirada, incluindo exclusão de `EXTRAVIADO`.

### Seção 8 — UI/UX
- “Registrar reencontro” apenas para extraviados;
- extraviado nunca aparece como apto/disponível para retirada;
- reencontrado aparece em quarentena.

### Seção 9 — fluxos
- empréstimo -> encerramento extraordinário -> extravio -> eventual reencontro -> quarentena -> liberação/descarte.

### Seção 10
- função server-side idempotente de reencontro;
- relatórios distinguem extravio, reencontro e descarte.

### Seção 11
- cliente não muda livremente `EXTRAVIADO` para estado operacional nem retira quarentena.

### Contract Cards / PDF-014
- encerramento extraordinário sem peso fictício;
- reencontro sem reabertura do empréstimo;
- contrato de disponibilidade deve refletir a conclusão do checkpoint, sem enum inventado.

### Migração/backfill
- não converter descarte histórico em extravio sem evidência inequívoca.

### Índices
- somente os necessários às consultas finais de extraviados/quarentena/estoque apto.

### Testes/adversarial
- retry duplo e reencontro concorrente;
- tentativa de retirada enquanto extraviado/quarentena;
- consulta de estoque nunca inclui extraviado;
- caso com última pesagem conhecida e sem pesagem válida;
- teste específico do significado final de `disponibilidade` escolhido no checkpoint.

---

# DDP-3B1-02 — Confirmação por entidade completa

### Seção 4
- Resumo, Especificação e Lote permanecem entidades independentes;
- composição de mistura é dependência obrigatória/atômica da Especificação;
- `ativo=false` representa desativação operacional, não apagamento histórico.

### Seção 5
- persistir cada entidade somente após confirmação completa;
- retomada usa IDs persistidos;
- **desativação lógica e exclusão física são operações distintas**.

#### Contrato de desativação lógica
- `ativo=false` preserva a entidade e referências históricas existentes;
- não exigir `COUNT(frascos)==0` nem ausência de toda referência histórica como precondição universal;
- impedir novos usos/vínculos incompatíveis enquanto inativa;
- consultas de seleção para novos cadastros filtram entidades inativas conforme o domínio;
- relatórios/histórico continuam resolvendo a entidade.

#### Contrato de exclusão física
- operação excepcional, não sinônimo de desativar;
- só permitida se não houver referências impeditivas e se o domínio autorizar remoção definitiva;
- verificar frascos, lotes, composição, estoque mínimo, histórico, notificações/referências e demais refs/FKs relevantes;
- não usar `COUNT(frascos)==0` como critério suficiente;
- proteger contra TOCTOU por transação/precondição/lock ou proibir delete quando a garantia robusta não for possível.

### Seção 6
- materializações/históricos continuam resolvendo entidades desativadas usadas no passado.

### Seção 7
- “Salvar [Entidade] e continuar” confirma; “Próximo” não confirma implicitamente;
- cancelar etapas posteriores preserva confirmados;
- formalizar separação `desativar` versus `excluir definitivamente`.

### Seção 8
- feedback de persistência explícito;
- permitir selecionar entidade já criada;
- UI não apresenta Desativar e Excluir como equivalentes; exclusão física, se existir, exige alerta/justificativa adequada.

### Seção 9
- ALM-01/02 distinguem formulário, entidade confirmada, entidade inativa e eventual remoção física.

### Seção 10
- criação idempotente;
- desativação idempotente e preservadora de histórico;
- exclusão física com checagem integral e proteção de concorrência.

### Seção 11
- impedir novos vínculos incompatíveis a entidade inativa;
- exclusão física somente via backend privilegiado/contrato seguro quando existir.

### Contract Cards / PDF-021
- persistência por entidade completa;
- abandono/retomada por IDs;
- ciclo de vida: ativo -> inativo sem destruição de referências; delete excepcional separado.

### Migração/backfill
- auditar órfãos/incompletos; não inferir nem apagar automaticamente.

### Índices
- seleção por `ativo` e campos realmente consultados.

### Testes/adversarial
- cancelamento após Resumo/Especificação;
- desativar entidade que possui histórico/referências e verificar preservação;
- tentativa de novo vínculo com entidade inativa;
- criação concorrente de referência durante delete;
- delete com referência impeditiva;
- retry de desativação.

---

# DDP-3B1-03 — localStorage em bancada compartilhada

### Seções 4/5
- nenhum rascunho incompleto no banco.

### Seção 7
- exceção da UI-13 só para rascunho de catálogo;
- whitelist explícita; proibir credenciais, tokens, PII, anexos/documento fiscal completo e segredos.

### Seção 8
- Restaurar/Descartar com idade do rascunho;
- não restaurar automaticamente em terminal compartilhado;
- troca de usuário nunca acessa rascunho de UID diferente.

### Seção 9
- restauração é local até confirmação.

### Seção 10
- UID é namespacing, não isolamento;
- TTL validado no boot/leitura, não “expiração automática” do navegador;
- limpeza em sucesso/logout/troca de identidade;
- schema version/chaves antigas;
- múltiplas abas com versão/timestamp;
- CSP/sanitização/redução de scripts como defesa contra XSS.

### Seção 11
- Security Rules não protegem `localStorage`.

### Contract Cards / PDF-021
- risco residual explícito e separação rascunho local x entidade confirmada.

### Testes
- usuário A fecha sem logout e B entra;
- duas abas;
- TTL expirado;
- crash;
- inspeção de whitelist/XSS.

---

# DDP-3B1-04 — conteudo_nominal

### Seção 4
- nominal = quantidade original declarada no rótulo/fabricante;
- `NULL` só se nominal original for desconhecido/ilegível;
- saldo atual é conceito separado.

### Seções 5–10
- não usar nominal como saldo/projeção de estoque restante;
- materializações/relatórios distinguem nominal, pesagens e desconhecido;
- UI rotula explicitamente “Conteúdo nominal do rótulo/fabricante”;
- cadastro aberto preserva nominal conhecido sem inventar saldo.

### Seção 11
- validações não transformam desconhecido em zero.

### Contract Cards
- PDF-014/PDF-021 propagam a semântica consolidada.

### Migração/backfill
- legados só reinterpretados com proveniência comprovável.

### Testes
- aberto com rótulo 500 mL e saldo desconhecido;
- rótulo ilegível;
- relatório/materialização que antes confundia nominal e saldo.

---

# DDP-3B1-05 — Estoque mínimo por Especificação × Almoxarifado

### Seção 4
- `Estoque_Minimo_Almoxarifado` com PK composta relacional;
- nenhum limiar global na Especificação.

### Seção 5
- configuração sob Almoxarifado com identidade não ambígua da Especificação;
- armazenar `id_resumo_reagente + id_especificacao_reagente` ou path/reference canônico;
- descrição denormalizada é projeção;
- `specId` isolado não é chave canônica global sem contrato explícito.

### Seção 6
- contagens/materializações usam mesma identidade e predicado de frasco apto do job.

### Seção 7/8/9
- par configurado = intenção de estocar;
- limiar 0 explicado;
- ativo/notificação ativa distintos;
- fluxo de criação/edição/desativação da configuração.

### Seção 10 — Jobs
- apenas K pares configurados ativos;
- `America/Sao_Paulo` no schedule e na data civil;
- gestores/vínculos ativos;
- notifId com identidade completa + almoxarifado + data + destinatário;
- `create`/precondition `exists=false` ou transação equivalente;
- retry não altera `lida`, `lida_em`, `expira_em` nem interação do usuário;
- BulkWriter com falhas por operação/retry seletivo;
- não alegar economia concreta sem medição: apenas A×E -> K é garantido arquiteturalmente.

### Seção 10 — Relatórios/Consolidação
- mesmas regras/identidade do job;
- remover pseudocódigo destrutivo.

### Seção 11
- só gestores autorizados da unidade configuram limiar.

### Migração/backfill
- nunca criar A×E;
- nenhum default inventado;
- só pares cuja intenção e limiar sejam demonstráveis.

### Índices
- alinhar às queries efetivas e à identidade completa; não indexar somente `specId` se a consulta exige `resumoId+specId`.

### Testes
- execução duplicada no mesmo dia;
- leitura entre retry;
- IDs locais iguais sob resumos distintos;
- spec/almox/par inativos;
- limiar 0/estoque 0;
- falha parcial BulkWriter.

---

# DDP-3B1-06 — retorno esgotado e tara após higienização

### Seções 4–7
- `peso_retorno` do empréstimo e `peso_frasco_vazio` posterior são fatos distintos;
- atualização de tara + evento histórica atômica;
- Q06 permanece `max(0, peso_saida-peso_retorno)` com duas leituras válidas;
- massa removida na lavagem não é consumo didático.

### Seções 8/9
- devolução fecha no balcão;
- ação separada para aferição posterior.

### Seção 10
- reutilizar `AJUSTE` + `campo_ajustado=peso_frasco_vazio` quando suficiente;
- não recalcular consumos antigos;
- command/idempotency key para retry.

### Seção 11
- somente papel autorizado ajusta tara.

### Contract Cards / PDF-025
- Q06 permanece regression check; só incorporar separação retorno x tara posterior.

### Testes
- tara dias depois;
- duas aferições concorrentes;
- retry/duplo clique;
- tentativa de usar tara posterior como peso_retorno;
- recipiente descartável sem aferição.

---

# Fechamento do Lote 3B

## PDF-014
Fechar apenas após: encerramento extraordinário sem peso fictício; extravio recuperável via quarentena; predicado operacional sem contradição de `disponibilidade`; identidade de estoque não ambígua; descarte técnico preservado.

## PDF-021
Fechar apenas após: persistência por entidade completa; localStorage com risco residual/whitelist/TTL; desativação lógica separada de exclusão física; `conteudo_nominal` propagado corretamente.

## PDF-025
Permanece regression check de Q06. Tara posterior não retroage consumo; nenhuma nova fórmula é autorizada.

---

# Gate final antes da compilação

Confirmar explicitamente:

- checkpoint de `disponibilidade` concluído e documentado;
- nenhuma enumeração inventada silenciosamente;
- desativação lógica != exclusão física;
- desconhecido != zero;
- identidade Firestore não ambígua;
- retries não destroem interação do usuário;
- denormalizações têm fonte canônica;
- `America/Sao_Paulo` consistente;
- Q06 preservada;
- PDF-014/021/025 sem regressões.

Somente com `SEMANTIC_GATE = PASS`:

1. `git diff --check`;
2. commit funcional/documental;
3. registrar SHA;
4. compilar exatamente esse SHA;
5. inspecionar páginas alteradas;
6. atualizar `VALIDACAO_LATEX.md`;
7. atualizar `CHECKPOINT.md`;
8. atualizar `main.pdf` por último.

Build bem-sucedido não transforma gate semântico FAIL em PASS.
# PLANO_IMPLEMENTACAO_LOTE_3B_APOS_3B1

Data: 2026-09-14  
Base semântica: `AVALIACAO_RESPOSTAS_FASE_3B1_R2.md`  
Gate: `SEMANTIC_GATE = PASS`

## Objetivo

Aplicar documentalmente as decisões fechadas da Fase 3B.1 sem reiniciar o Lote 3B, preservando os contratos e decisões anteriores e fechando os bloqueadores remanescentes de PDF-014, PDF-021 e PDF-025.

## Ordem obrigatória de implementação

1. Atualizar fontes canônicas de dados/semântica: Seções 4 e 5.
2. Atualizar materializações e regras de negócio: Seções 6 e 7.
3. Atualizar UI/UX e fluxos: Seções 8 e 9.
4. Atualizar contratos operacionais/jobs/relatórios/consolidação na Seção 10.
5. Atualizar Security Rules da Seção 11.
6. Atualizar Contract Cards do Lote 3B.
7. Executar revisão transversal de identidade, NULL vs zero, idempotência e Q06.
8. Executar `git diff --check`.
9. Criar commit funcional/documental.
10. Compilar exatamente o commit funcional, inspecionar páginas alteradas, registrar em `VALIDACAO_LATEX.md`, atualizar `CHECKPOINT.md` e somente por último atualizar `main.pdf`.

---

# Matriz por decisão

## DDP-3B1-01 — Extravio recuperável

### Seção 4 — 3FN
- adicionar `EXTRAVIADO` ao domínio de estado físico do frasco;
- deixar explícito que extravio não equivale a descarte físico;
- histórico deve registrar `EXTRAVIOU_EM_EMPRESTIMO` e `REENCONTRADO_APOS_EXTRAVIO`;
- se `reencontrado_em/por` permanecerem no snapshot atual, documentá-los como projeção do último reencontro, não fonte canônica histórica;
- preservar `peso_atual` como última medição válida; nunca usar zero para ausência.

### Seção 5 — Firestore
- estado `EXTRAVIADO` deve ser inelegível para retirada;
- não usar `disponibilidade=DISPONIVEL` com significado de disponibilidade operacional durante extravio;
- reencontro atômico: validar estado anterior, registrar evento, atualizar estado observável e `em_quarentena=true`;
- preservar empréstimo encerrado extraordinariamente.

### Seção 6 — materializações
- separar contagens de extraviados, quarentena e disponíveis;
- não reinserir automaticamente reencontrado em estoque apto antes da liberação de quarentena.

### Seção 7 — RN/RF
- formalizar: extravio é ausência recuperável; reencontro só retorna via quarentena;
- liberação exige fluxo técnico existente de quarentena.

### Seção 8 — UI/UX
- ação “Registrar reencontro” apenas para extraviados;
- após registro, item aparece em quarentena, não em disponíveis;
- exibir histórico do sinistro preservado.

### Seção 9 — fluxos
- fluxo extraordinário: empréstimo encerrado -> frasco extraviado -> eventual reencontro -> quarentena -> liberação/descarte.

### Seção 10 — contratos/jobs/relatórios
- função de reencontro server-side e idempotente;
- relatórios distinguem extravio, reencontro e descarte.

### Seção 11 — Security Rules
- cliente não pode mudar livremente `EXTRAVIADO` para estado operacional nem retirar quarentena; somente backend autorizado.

### Contract Cards
- PDF-014 deve incorporar encerramento extraordinário sem peso fictício e reencontro sem reabertura do empréstimo.

### Migração/backfill
- não converter descarte histórico em extravio sem evidência inequívoca.

### Índices
- índices para listagem por `estado_fisico_frasco=EXTRAVIADO`, almoxarifado e ordenação temporal se aplicável.

### Testes/adversarial
- retry duplo de reencontro;
- reencontro concorrente por dois gestores;
- tentativa de retirada enquanto extraviado/quarentena;
- extravio com peso anterior conhecido e desconhecido.

---

## DDP-3B1-02 — Confirmação por entidade completa

### Seção 4
- manter Resumo, Especificação e Lote como entidades independentes;
- composição de mistura é dependência obrigatória atômica da Especificação.

### Seção 5
- persistir cada entidade somente após confirmação explícita e validação completa;
- retomada usa IDs persistidos;
- excluir/desativar não pode depender apenas de `COUNT(frascos)==0`.

### Seção 6
- materializações não devem apagar referências a entidade desativada usada historicamente.

### Seção 7
- “Salvar [Entidade] e continuar” confirma; “Próximo” sem salvar não confirma;
- cancelar etapas posteriores preserva entidades confirmadas.

### Seção 8
- botões e feedback visual deixam estado de persistência explícito;
- permitir selecionar entidade previamente criada.

### Seção 9
- fluxo ALM-01/02 deve distinguir entidade confirmada de estado de formulário.

### Seção 10
- criação idempotente;
- política de desativação/exclusão considera FKs/refs: frascos, composição, lote, histórico, estoque mínimo e referências auditáveis;
- evitar TOCTOU.

### Seção 11
- clientes autorizados criam entidades completas; exclusão física, quando existir, deve ser backend/transacional ou fortemente restrita.

### Contract Cards
- PDF-021: persistência por entidade completa, abandono e retomada por IDs.

### Migração/backfill
- auditar órfãos/incompletos legados; não inferir automaticamente intenção.

### Índices
- consultas de seleção/retomada por ativo, nome normalizado, parent refs relevantes.

### Testes/adversarial
- dois usuários salvando mesma entidade;
- cancelamento após Resumo/Especificação;
- criação concorrente de frasco durante tentativa de desativação/exclusão.

---

## DDP-3B1-03 — localStorage em bancada compartilhada

### Seção 4/5
- nenhum rascunho incompleto no banco.

### Seção 7
- exceção expressa da UI-13 apenas para rascunhos de catálogo;
- whitelist de campos permitidos;
- proibir credenciais, tokens, PII e anexos/documento fiscal completo.

### Seção 8
- banner Restaurar/Descartar;
- mostrar idade do rascunho;
- não restaurar automaticamente em terminal compartilhado;
- troca de usuário não acessa rascunho de outro UID.

### Seção 9
- fluxo de reabertura/restauração é apenas local até confirmação.

### Seção 10
- chave com UID é namespacing, não isolamento;
- TTL validado na inicialização/leitura;
- limpeza em sucesso, logout e troca de identidade;
- schema version para invalidar chaves antigas;
- controle de múltiplas abas com versão/timestamp.

### Seção 11
- registrar que Security Rules não protegem `localStorage`; controles são frontend/CSP/operacionais.

### Contract Cards
- PDF-021 inclui risco residual e separação entre rascunho local e entidade confirmada.

### Migração/backfill
- expurgo de chaves antigas por versão de schema.

### Índices
- nenhum.

### Testes/adversarial
- usuário A sai sem logout e usuário B entra;
- duas abas alteram o mesmo rascunho;
- TTL expirado;
- XSS simulado/inspeção da whitelist;
- crash do navegador.

---

## DDP-3B1-04 — conteudo_nominal

### Seção 4
- definir `conteudo_nominal` como quantidade original declarada no rótulo/fabricante;
- `NULL` apenas se nominal original é desconhecido/ilegível;
- saldo atual é conceito separado e não derivado automaticamente.

### Seção 5
- mesma semântica no Firestore;
- não nomear projeção do nominal como saldo.

### Seção 6
- materializações de estoque/consumo não usam nominal como substituto de quantidade restante.

### Seção 7
- RN explícita: nominal conhecido permanece conhecido em frasco aberto; saldo pode ser desconhecido.

### Seção 8
- rótulo de UI “Conteúdo nominal do rótulo/fabricante”;
- “desconhecido” em vez de 0 para saldo não apurado.

### Seção 9
- cadastro de frasco aberto não apaga nominal conhecido nem inventa saldo.

### Seção 10
- relatórios distinguem nominal, pesagens e cobertura dos agregados.

### Seção 11
- validações impedem valores semanticamente inválidos onde possível, sem falsear desconhecido.

### Contract Cards
- PDF-021 e PDF-014 devem usar a semântica consolidada.

### Migração/backfill
- valores legados só são reinterpretados quando a proveniência for comprovável.

### Índices
- nenhum específico.

### Testes/adversarial
- frasco aberto com rótulo 500 mL e saldo desconhecido;
- rótulo ilegível;
- frasco fechado com nominal conhecido;
- relatório que antes usava nominal como saldo.

---

## DDP-3B1-05 — Estoque mínimo por Especificação × Almoxarifado

### Seção 4
- criar `Estoque_Minimo_Almoxarifado` com PK composta relacional;
- sem limiar global em Especificação.

### Seção 5
- configuração sob `Almoxarifado/{id}/Estoques_Configurados/{configId}`;
- armazenar `id_resumo_reagente` + `id_especificacao_reagente` ou path canônico;
- descrição denormalizada é somente projeção;
- `specId` isolado não é chave canônica global.

### Seção 6
- materialização/contagem usa mesma identidade e mesma definição de frasco apto do job;
- não compensar especificações distintas.

### Seção 7
- configuração explícita do par define intenção de estocar;
- limiar 0 é permitido e semanticamente explicado;
- par inativo/removido deixa de gerar alertas.

### Seção 8
- tela de configuração por unidade + especificação;
- explicar limiar 0 e estado ativo/notificação ativa.

### Seção 9
- fluxo de criação/edição/desativação da configuração.

### Seção 10 — Jobs
- job percorre apenas K pares configurados ativos;
- `America/Sao_Paulo` no schedule e na data civil;
- filtros de gestores/vínculos ativos;
- count por par usando identidade completa e filtros canônicos de disponibilidade;
- notifId inclui identidade completa, almoxarifado, data civil e destinatário;
- usar create/precondition ou transação para não sobrescrever notificação existente;
- retry não altera `lida`, `lida_em`, `expira_em` ou interação do usuário;
- BulkWriter com captura de falhas por operação e retry seletivo.

### Seção 10 — Relatórios
- relatórios de escassez usam as mesmas regras/identidade do job.

### Seção 10 — Consolidação
- remover pseudocódigo inseguro com `merge:false` + `lida:false` em retry;
- documentar custo O(K) e não alegar performance sem medição.

### Seção 11
- só gestores autorizados da unidade configuram limiar;
- leitura de configuração conforme papéis definidos.

### Contract Cards
- PDF-014/PDF-021 onde houver impactos de identidade e estoque;
- registrar o job como contrato operacional idempotente.

### Migração/backfill
- não criar produto cartesiano A×E;
- criar apenas pares conhecidos/decididos; nenhum default inventado.

### Índices
- configs por `ativo`/`notificacao_ativa` quando necessário;
- frascos por almoxarifado + identidade completa da especificação + disponibilidade + estado + quarentena + descarte conforme consulta suportada;
- vínculos de gestor por almoxarifado + ativo.

### Testes/adversarial
- job executado duas vezes no mesmo dia;
- usuário lê notificação entre retry e segunda tentativa;
- specId iguais sob resumos diferentes;
- almoxarifado/spec desativados durante execução;
- limiar 0, estoque 0;
- falha parcial no BulkWriter.

---

## DDP-3B1-06 — Retorno esgotado e tara após higienização

### Seção 4
- distinguir `peso_retorno` do empréstimo e `peso_frasco_vazio` aferido depois;
- histórico de ajuste registra aferição posterior sem reescrever empréstimo.

### Seção 5
- atualização de tara + evento deve ser atômica;
- empréstimo fechado permanece imutável salvo mecanismo auditado de correção já existente.

### Seção 6
- consumo/materializações usam somente medidas válidas do empréstimo;
- tara posterior não retroage Q06.

### Seção 7
- Q06 permanece `max(0, peso_saida - peso_retorno)` com duas leituras válidas;
- esgotamento exige devolução física;
- massa removida pela lavagem não é consumo didático.

### Seção 8
- devolução fecha no balcão;
- ação separada para aferição de tara após higienização quando aplicável.

### Seção 9
- fluxo em dois momentos claramente separados.

### Seção 10
- reutilizar evento canônico `AJUSTE` + `campo_ajustado=peso_frasco_vazio` quando suficiente;
- não criar `AJUSTE_TARA_POS_HIGIENIZACAO` se redundante;
- relatórios não recalculam consumos históricos após nova tara.

### Seção 11
- só papel autorizado executa ajuste de tara.

### Contract Cards
- PDF-025 permanece regression check de Q06; somente separação entre retorno e tara posterior é incorporada.

### Migração/backfill
- nenhuma recomputação retroativa de consumo por tara posterior.

### Índices
- histórico por frasco/tipo/data se necessário.

### Testes/adversarial
- tara aferida dias depois;
- duas aferições concorrentes;
- retry da aferição;
- tentativa de usar tara posterior como peso_retorno;
- frasco descartável sem aferição posterior.

---

# Fechamento específico dos PDFs do Lote 3B

## PDF-014
Fechar com:
- encerramento extraordinário de quebra/extravio sem peso fictício;
- extravio recuperável e reencontro via quarentena;
- descarte técnico independente preservado;
- estoque/alertas usando identidade não ambígua;
- desconhecido distinto de zero.

## PDF-021
Fechar com:
- persistência por entidade completa;
- abandono/retomada por IDs confirmados;
- localStorage apenas para rascunho de catálogo, com whitelist, TTL e troca de identidade segura;
- `conteudo_nominal` como valor original do rótulo.

## PDF-025
Manter como regression check:
- Q06 inalterada para empréstimos mensuráveis;
- retorno esgotado é medido antes da higienização;
- tara posterior é ajuste técnico separado e não retroativo.

---

# Critérios de aceite antes do commit funcional

- nenhuma ocorrência normativa de ausência de medição representada por zero;
- nenhum extravio representado como descarte;
- nenhum frasco `EXTRAVIADO` elegível para retirada;
- nenhum `specId` isolado tratado como global no Firestore sem contrato;
- nenhum retry de notificação que sobrescreva `lida`/interação;
- nenhum `COUNT==0` seguido de exclusão sujeito a TOCTOU sem proteção;
- nenhum `localStorage` apresentado como isolado por UID;
- nenhuma tara pós-higienização usada para recalcular Q06;
- nenhum nominal de rótulo tratado como saldo atual;
- Q06 permanece consistente em Seções 4–10 e PDF-025;
- `America/Sao_Paulo` preservado para job e data civil.

# Status

Plano aprovado para execução documental. Próximo passo: aplicar as mudanças nos `.tex` e Contract Cards, depois executar o gate final e a validação LaTeX.
# M2.1a — Auditoria normativa independente

Estado: IN_PROGRESS.
HEAD entrada: ce299d4281cfef3b4cf187c8fc8c769f73eccaf8, árvore limpa.
Branch: feat/formal-spec-cue-alloy. Baseline M2 histórico: 9df335bc.
Decisões adicionais: DEC-M2-HUMAN-001 (lote opcional com identidade conhecida)
e DEC-M2-HUMAN-002 (justificativa humana obrigatória: trim, mínimo 20).
Não alterar baseline IR/Rust nem iniciar Alloy. Worklogs M2.0/M2.1 são históricos.

## Inventário inicial, anterior às edições normativas/CUE

Fontes S4/S5: Seções 4/5, entidades/dicionários Frasco e Histórico de Frasco.
S10.5: Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/Section-10-Subsection-5-Fluxo-de-Reagentes.tex.
Referências por função/âncora são estáveis; números iniciais correspondem ao HEAD de entrada.

| ID | Propriedade | Fonte | Estado atual | Classificação | Ação |
|---|---|---|---|---|---|
| A01 | Lote nullable, identidade conhecida | S4:377; S10.5:9,64,103,168,227,275; DEC-001 | SQL nullable, contrato opcional, consulta condicional | DERIVADA_DE_DECISAO_HUMANA | Preservar e explicitar; nenhuma quarentena por ausência |
| A02 | XOR relacional | M2-IDENTIDADE-001; S4:377 | CHECK OR diverge do texto | CONTRADITORIA | Preservar decisão XOR e evidência; não alterar CHECK |
| A03 | Quarentena requer detalhe associado | S5:390,392; S7:51 | CUE ainda não exige detalhe não nulo | CONFIRMADA | Documentar e acrescentar apenas implicação local |
| A04 | Justificativa humana obrigatória após trim >=20 | DEC-002; S10.5:36,200,383 | Truthiness aceita whitespace | DERIVADA_DE_DECISAO_HUMANA | Harmonizar documentação e contratos humanos inequívocos |
| A05 | Mensagens automáticas não são entrada humana | S10.5:674–680,414,746 | Backend produz textos internos | CONFIRMADA | Não aplicar mínimo global ao campo persistido |
| A06 | Histórico desconhecido implica data null | S5:396; CUE | Formalizado | CONFIRMADA | Preservar |
| A07 | Estados permitidos com histórico desconhecido | S5:396 | Conjunto não enumerado | AMBIGUA | HQ-M2-001; não implementar |
| A08 | Ciclo de vida saldo_desconhecido | S5:397; S10.5 cadastro aberto | Inicial ABERTO; política posterior incompleta | AMBIGUA | HQ-M2-002; não implementar |
| A09 | Escopo humano de cada motivo | S4 Histórico; S7:382; S10.5, S10.11 pesagem | Mistura humano/sistema | AMBIGUA | Inventariar operações em HQ-M2-003 antes de editar |
| A10 | NUMERIC(10,3), DATE/TIMESTAMP de intercâmbio | S4; S5; worklog M2.1 | Limites/escala, DATE lexical, TIMESTAMP string | TECNICA_NAO_DOMINIO | Preservar; não alegar física/calendário |

Próxima ação: concluir classificação das entradas humanas, criar suíte HQ,
harmonizar .tex e fazer checkpoint documental antes da alteração CUE.

## Checkpoint documental (antes de editar CUE)

IMPLEMENTED, validação textual PASS. Inventário A/B/C por operação e fontes
exatas em M2_HUMAN_QUESTIONS.md (HQ-001/002/003 OPEN, sem respostas).
DEC-001 preservado: dois contratos idLote opcionais, duas persistências null,
consulta/existência/correspondência somente quando lote informado. Não foi
identificada fonte atual exigindo lote para frasco aberto/vencido no recorte.
CHECK OR original permanece, como solicitado; não é corrigido por esta rodada.

DEC-002 aplicado às entradas A: quarentena nos dois cadastros e abertura;
extravio/reencontro; recalibração manual e recalibração na devolução; Q04/Q14
nos contratos humanos já condicionais. Campos opcionais não viraram obrigatórios
fora dessas condições. Textos B preservados. Itens C aguardam resposta.
A tabela HQ documenta descarte, pesagem de rotina, segunda via, entrada/saída
manual sem contrato específico e justificativa adicional na devolução.

Arquivos .tex: Seções 4, 5, 7, 10.5, 10.6 e 10.10. As três últimas extensões
além das fontes principais são referências diretas encontradas na busca, não
uma auditoria global. Limite máximo 2000 específico de Q04 era preexistente;
não foi introduzido máximo geral. A contagem técnica dos exemplos segue
trim().length JavaScript; a validação não reescreve payload ou texto persistido.

Validação textual/diff:
- git diff --check PASS.
- Helper extraído literalmente do .tex (removendo apenas anotações TS): 11
  casos PASS: undefined/null/número/vazio/espaços/curto/19/19 com bordas rejeitados;
  20/20 com bordas/frase longa aceitos. Não avalia qualidade da justificativa.
- Três chamadas detalheStatus presentes; nenhum antigo && !dados.detalheStatus.
- Linhas de payload/hash/canonicalização e identidade comparadas ao HEAD de
  entrada: idênticas. Novas validações de motivo executam após replay idempotente.
- Verificação inicial de ambientes interrompida: faltava end{lstlisting} antes de Registrar Retirada, já no HEAD de entrada (5 aberturas/4 fechamentos). Delimitador reparado nesta auditoria; verificação final balanceada nos seis .tex. Não equivale a compilação PDF.
- Busca repetida para motivos/quarentena e lote/especificação em documentation
  e specification; históricos/archive/generated não reescritos como normas novas.
- Textos automáticos de devolução continuam presentes; entrada em quarentena
  persiste texto, não null. Limpezas observadas ocorrem com quarentena false.
  Necessidade de humano adicional nesse fluxo permanece HQ-003.

Próxima ação deste checkpoint: commit/push documental; depois apenas CUE
em_quarentena=true implica detalhe_status!=null e duas fixtures. Não impor
mínimo global no registro sem informação de autoria.

Correção de evidência pós-checkpoint 4e0e60e5: o primeiro comparador de linhas
incluiu prosa nova e falhou; restringido aos listings, confirmou código de
payload/hash/identidade idêntico. A checagem subsequente encontrou o delimitador
preexistente acima; o registro inicial de PASS de ambientes era prematuro e foi
corrigido antes da etapa CUE. Correção documental adicional, sem regra de domínio.

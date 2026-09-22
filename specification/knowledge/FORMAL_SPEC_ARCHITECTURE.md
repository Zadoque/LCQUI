# Arquitetura e autoridade

Aplicação existente + especificação formal aditiva. `frontend/` é o nome real da
UI, `functions/` é backend TypeScript e Firestore é banco operacional. Nenhum
desses componentes é gerado por CUE/Alloy ou reescrito em Rust.

CUE possui autoridade estrutural apenas na fatia migrada; Alloy descreve
relações e transições abstratas; IR/resultados transportam dados; Rust renderiza;
LaTeX mantém texto humano. M0 cobre três dimensões, não o contrato completo.
O baseline 3B registra a validação histórica de M0/M1. Para M2, as fontes de
entrada são as do commit `9df335bc977bfcf16668bca4baf5f9ed50c2da1a`, conforme
reconciliação M2.0 no estado. O IR v3 distingue proveniência histórica M0/M1 e documental M2, migrada em M2.3.

CUE → spec-ir.json (v3) e Alloy → formal-validation.json (M0) e
formal-validation-m2.json (M2.2) e formal-validation-m24.json (composição)
e formal-validation-m3.json (M3) e formal-validation-m4.json (retirada/devolução)
→ Rust → generated → main.tex.
O validador exporta CUE antes de Alloy e vincula hashes; não há geração de Alloy
pelo Rust. Não presumir equivalência semântica automática entre linguagens.
`just formal-check` é o gate local utilizável por CI em ambiente provisionado.

## Ampliação M1

Os registros normalizados de resumo/especificação usam IDs relacionais inteiros
conforme Seção 4 e campos nullable explícitos. As notas da Seção 5 documentam
IDs string/docId e denormalizações; não são um segundo schema do catálogo nem
validação completa de Firestore. CUE valida o par local; Alloy permanece M0.
IR v3 contém entidades[] (projeção M2 completa ao lado da fatia M0) com
proveniência estruturada; Rust 0.2.0 mantém compatibilidade de leitura v1/v2.
Fragmentos M2 são integrados por Formal-Spec-M2.tex após M1.

M2.4 usa estratégia B: bottle_composition.als é aditivo, com um único Frasco
e EstadoIntegrado. O guard lexical compara vocabulário/predicados com as três
origens, admitindo somente renomes explícitos. A evidência vincula seus hashes;
validation_m24 exige resultados/scopes exatos. Coerência final é assertion,
não fact. Modelos standalone e IR permanecem independentes e preservados.

## M3

M3 cobre o ciclo de vida do Emprestimo_Reagente sem compor Frasco: um único
universo com relação estática empréstimo->frasco e `status` por estado. A
abstração `ativos` (EM_USO + ATRASADO) equivale conceitualmente às dimensões
`disponibilidade`/`ativos` de M0/M2.4, mas `bottle_composition.als` não é
alterado. O IR v3 ganha a projeção `emprestimo_reagente` e
`baseline_documental_m3`; a evidência standalone fica em
formal-validation-m3.json, validada por validation_m3. Retirada e devolução
completas continuam fora da composição.

## M4

M4 compõe o Frasco e o Emprestimo no mesmo universo (`withdrawal_return.als`) e
substitui a relação `ativos` por um `status` parcial (`Emprestimo -> lone
Status`), em que ausência de status representa empréstimo ainda não criado.
`coerenteM4` reúne `coerenteM2`, a unicidade de M3 e a equivalência
disponibilidade EMPRESTADO <=> exatamente um ativo. O CUE/IR não mudam; a
evidência fica em formal-validation-m4.json, validada por validation_m4, com
guard de drift das origens (`withdrawal_return.mjs`). As guardas externas
(RBAC/tomador/TCR), o atraso, o vencimento e os resultados metrológicos são fatos
abstratos; Q06/tara (M6), extravio/quarentena completos (M5), idempotência (M7) e
autorização (M9) permanecem fora.

# Arquitetura e autoridade

Aplicação existente + especificação formal aditiva. `frontend/` é o nome real da
UI, `functions/` é backend TypeScript e Firestore é banco operacional. Nenhum
desses componentes é gerado por CUE/Alloy ou reescrito em Rust.

CUE possui autoridade estrutural apenas na fatia migrada; Alloy descreve
relações e transições abstratas; IR/resultados transportam dados; Rust renderiza;
LaTeX mantém texto humano. M0 cobre três dimensões, não o contrato completo.
O baseline 3B registra a validação histórica de M0/M1. Para M2, as fontes de
entrada são as do commit `9df335bc977bfcf16668bca4baf5f9ed50c2da1a`, conforme
reconciliação M2.0 no estado. O hash global IR/Rust ainda é histórico; sua
migração deve ocorrer em checkpoint separado antes de exportar M2.

CUE → spec-ir.json (v3) e Alloy → formal-validation.json (M0) e
formal-validation-m2.json (M2.2) → Rust → generated → main.tex.
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
Fragmentos M2 são gerados, mas não integrados ao main.tex.

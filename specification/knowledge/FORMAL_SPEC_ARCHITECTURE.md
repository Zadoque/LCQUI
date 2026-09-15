# Arquitetura e autoridade

Aplicação existente + especificação formal aditiva. `frontend/` é o nome real da
UI, `functions/` é backend TypeScript e Firestore é banco operacional. Nenhum
desses componentes é gerado por CUE/Alloy ou reescrito em Rust.

CUE possui autoridade estrutural apenas na fatia migrada; Alloy descreve
relações e transições abstratas; IR/resultados transportam dados; Rust renderiza;
LaTeX mantém texto humano. M0 cobre três dimensões, não o contrato completo.
O baseline 3B permanece normativo para todo o conteúdo ainda não migrado.

CUE → spec-ir.json e Alloy → formal-validation.json → Rust → generated → main.tex.
O validador exporta CUE antes de Alloy e vincula hashes; não há geração de Alloy
pelo Rust. Não presumir equivalência semântica automática entre linguagens.
`just formal-check` é o gate local utilizável por CI em ambiente provisionado.

## Ampliação M1

Os registros normalizados de resumo/especificação usam IDs relacionais inteiros
conforme Seção 4 e campos nullable explícitos. As notas da Seção 5 documentam
IDs string/docId e denormalizações; não são um segundo schema do catálogo nem
validação completa de Firestore. CUE valida o par local; Alloy permanece M0.
IR v2 contém entidades[] e Rust 0.2.0 mantém compatibilidade de leitura v1.

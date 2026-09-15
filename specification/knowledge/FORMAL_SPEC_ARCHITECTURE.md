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

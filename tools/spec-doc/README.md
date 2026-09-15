# lcqui-spec-doc

Gerador Rust determinístico, sem lógica de backend. Lê `build/spec-ir.json` e
`build/formal-validation.json`, verifica hashes e resultados, renderiza fragmentos de entidades, mapeamentos e invariantes, além de `MANIFEST.json`. Nenhum timestamp ou caminho local entra na saída.

Dependências: serde/serde_json (IR tipado, JSON e manifest) e sha2 (proveniência).
Cargo.lock fixa versões; templates simples são funções Rust em `src/render.rs`.
Não há necessidade de engine de templates ou diretórios vazios.

Na raiz:

```sh
cargo fmt --manifest-path tools/spec-doc/Cargo.toml --check
cargo test --locked --manifest-path tools/spec-doc/Cargo.toml
cargo clippy --locked --manifest-path tools/spec-doc/Cargo.toml --all-targets -- -D warnings
cargo run --locked --manifest-path tools/spec-doc/Cargo.toml -- .
cargo run --locked --manifest-path tools/spec-doc/Cargo.toml -- --check .
```

Antes de gerar, execute `just alloy-check`. `--check` compara bytes e detecta
arquivos ausentes, alterados ou extras, sem escrever generated. Hash é vínculo
de proveniência, não assinatura; sempre reexecute Alloy no gate completo.
Escaping único em `src/latex.rs`; não inserir LaTeX bruto no IR.
Para reprodução offline, use `cargo fetch --locked` previamente e `--offline`.

## Formatos suportados

Versão 0.2.0: lê IR v1 (singular M0) e IR v2 (entidades[]), emitido pelo CUE M1.
A saída M0 permanece idêntica; novos arquivos entities/resumo_reagente.tex,
entities/especificacao_reagente.tex e os correspondentes firestore/*.tex são
aditivos. O manifest registra versão 0.2.0 e os novos hashes. O gerador rejeita
nomes de saída inseguros/duplicados e versões desconhecidas.

Quatro testes verificam escaping, proveniência/resultados adulterados,
compatibilidade de leitura e nomes de saída. Limites e padrões vêm dos
metadados normativos CUE. Notas de mapeamento não constituem validação de um
documento Firestore completo.

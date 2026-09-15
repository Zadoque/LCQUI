# lcqui-spec-doc

Gerador Rust determinístico, sem lógica de backend. Lê `build/spec-ir.json` e
`build/formal-validation.json`, verifica hashes e resultados, renderiza dois
fragmentos e `MANIFEST.json`. Nenhum timestamp ou caminho local entra na saída.

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

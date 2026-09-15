set shell := ["bash", "-euc"]

spec-check:
    node tools/formal/check.mjs spec-check

spec-export:
    node tools/formal/check.mjs spec-export

alloy-check:
    node tools/formal/check.mjs alloy-check

rust-check:
    cargo fmt --manifest-path tools/spec-doc/Cargo.toml --check
    cargo test --locked --manifest-path tools/spec-doc/Cargo.toml
    cargo clippy --locked --manifest-path tools/spec-doc/Cargo.toml --all-targets -- -D warnings

docs-generate: alloy-check
    cargo run --locked --manifest-path tools/spec-doc/Cargo.toml -- .

docs-check: alloy-check
    cargo run --locked --manifest-path tools/spec-doc/Cargo.toml -- --check .

docs-build:
    mkdir -p build/latex
    latexmk -cd -pdf -interaction=nonstopmode -halt-on-error -outdir="{{justfile_directory()}}/build/latex" documentation/main.tex

# Não regenera .tex antes do gate stale.
formal-check: rust-check docs-check docs-build
    git diff --exit-code -- documentation/generated/
    git diff --check

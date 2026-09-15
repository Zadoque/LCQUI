# Rust → LaTeX

Rust transforma IR validado e resultado Alloy em apresentação mecânica. Não
implementar regras operacionais, servidor ou UI aqui. serde/serde_json fazem
leitura estrita; sha2 vincula entradas ao manifest; BTreeMap ordena arquivos.

`just docs-generate` recalcula entradas e gera. `just docs-check` recalcula
entradas e compara saída sem sobrescrevê-la. `just rust-check` executa fmt,
testes e clippy. Escaping central cobre _ % & # $ { } ~ ^ e barra invertida.
Não gerar UX/rationale; esses textos ficam no LaTeX humano. Não incluir relógio,
UUID aleatório, diretórios temporários ou tempos do solver no manifest.

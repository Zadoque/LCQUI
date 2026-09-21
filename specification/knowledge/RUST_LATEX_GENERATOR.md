# Rust → LaTeX

Rust transforma IR validado e resultado Alloy em apresentação mecânica. Não
implementar regras operacionais, servidor ou UI aqui. serde/serde_json fazem
leitura estrita; sha2 vincula entradas ao manifest; BTreeMap ordena arquivos.

`just docs-generate` recalcula entradas e gera. `just docs-check` recalcula
entradas e compara saída sem sobrescrevê-la. `just rust-check` executa fmt,
testes e clippy. Escaping central cobre _ % & # $ { } ~ ^ e barra invertida.
Não gerar UX/rationale; esses textos ficam no LaTeX humano. Não incluir relógio,
UUID aleatório, diretórios temporários ou tempos do solver no manifest.

## IR v3 / gerador 0.2.0

Lista entidades[] com nomes de arquivo estáveis, escopo, campos e exemplo; notas
opcionais de mapeamento geram firestore/*.tex. Leitura v1/v2 permanece disponível,
normalizada internamente sem alterar bytes dos fragmentos M0/M1. Versões
desconhecidas, nomes de arquivo inseguros e nomes duplicados são rejeitados antes
de escrever.

Campos documentam limites vindos de CUE, não calculados como novas regras Rust;
v3 acrescenta `sql`, `minimo_numero` e `maximo_numero` para a projeção M2.
A proveniência é estruturada (`baseline_historico_m0_m1` e
`baseline_documental_m2`) e validada no `generated()`. O manifest vincula IR,
evidência M0, evidência M2.2 e saídas, sem timestamps. O wrapper Alloy seleciona
somente a entidade frasco_reagente (M0) para verificar vocabulário; o modelo M2.2
é validado em `validation_m2` a partir de `build/formal-validation-m2.json`.

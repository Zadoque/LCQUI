use crate::{ir::Ir, latex::escape, validation::Validation};
use std::collections::BTreeMap;

pub fn render(ir: &Ir, v: &Validation) -> BTreeMap<String, String> {
    let mut files = BTreeMap::new();
    let mut entity = format!(
        "% Gerado por lcqui-spec-doc; não editar.\n\\subsection*{{{} --- fatia M0}}\n{}\n\\begin{{description}}\n",
        escape(&ir.entidade),
        escape(&ir.escopo)
    );
    for c in &ir.campos {
        entity.push_str(&format!(
            "\\item[{}] Tipo: {}. Obrigatório: {}. Aceita nulo: {}.\n",
            escape(&c.nome),
            escape(&c.tipo),
            if c.obrigatorio { "sim" } else { "não" },
            if c.nulo { "sim" } else { "não" }
        ));
        if !c.valores.is_empty() {
            entity.push_str(&format!(
                "Valores: {}.\n",
                c.valores
                    .iter()
                    .map(|s| escape(s))
                    .collect::<Vec<_>>()
                    .join(", ")
            ));
        }
    }
    entity.push_str("\\end{description}\n");
    files.insert("entities/frasco_reagente.tex".into(), entity);
    let mut inv = String::from(
        "% Gerado por lcqui-spec-doc; não editar.\n\\subsection*{Verificação abstrata de retirada}\n\\begin{description}\n",
    );
    for r in &v.resultados {
        inv.push_str(&format!(
            "\\item[{}] {}: {}.\\newline Escopo: \\texttt{{{}}}.\n",
            escape(&r.id),
            escape(&r.assertion),
            escape(&r.status),
            escape(&r.scope)
        ));
    }
    inv.push_str("\\end{description}\nUNSAT significa ausência de contraexemplo no escopo declarado; SAT indica testemunha encontrada. Não certifica a implementação Firebase.\n");
    files.insert("invariants/retirar_frasco.tex".into(), inv);
    files
}

use crate::{ir::Ir, latex::escape, validation::Validation};
use std::collections::BTreeMap;

pub fn render(ir: &Ir, v: &Validation) -> BTreeMap<String, String> {
    let mut files = BTreeMap::new();
    for entity_ir in &ir.entidades {
        let mut entity = format!(
            "% Gerado por lcqui-spec-doc; não editar.\n\\subsection*{{{} --- {}}}\n{}\n\\begin{{description}}\n",
            escape(&entity_ir.entidade),
            escape(&entity_ir.etapa),
            escape(&entity_ir.escopo)
        );
        for c in &entity_ir.campos {
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
            if let Some(max) = c.max_caracteres {
                entity.push_str(&format!("Máximo: {max} caracteres.\n"));
            }
            if let Some(min) = c.minimo {
                entity.push_str(&format!("Mínimo: {min}.\n"));
            }
            if let Some(min) = c.minimo_exclusivo {
                entity.push_str(&format!("Maior que {min}.\n"));
            }
            if let Some(max) = c.maximo_exclusivo {
                entity.push_str(&format!("Menor que {max}.\n"));
            }
            if let Some(step) = c.multiplo {
                entity.push_str(&format!("Múltiplo de {step}.\n"));
            }
            if let Some(pattern) = &c.padrao
                && pattern != ".*"
            {
                entity.push_str(&format!("Padrão: {}.\n", escape(pattern)));
            }
            if !c.observacao.is_empty() {
                entity.push_str(&format!("{}\n", escape(&c.observacao)));
            }
        }
        entity.push_str("\\end{description}\n");
        files.insert(format!("entities/{}.tex", entity_ir.arquivo), entity);
        if let Some(mapping) = &entity_ir.mapeamento {
            let mut text = format!(
                "% Gerado por lcqui-spec-doc; não editar.\n\\subsection*{{Mapeamento: {}}}\nCaminho: \\texttt{{{}}}.\n\\begin{{itemize}}\n",
                escape(&entity_ir.entidade),
                escape(&mapping.caminho)
            );
            for note in &mapping.notas {
                text.push_str(&format!("\\item {}\n", escape(note)));
            }
            text.push_str("\\end{itemize}\n");
            files.insert(format!("firestore/{}.tex", entity_ir.arquivo), text);
        }
    }
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

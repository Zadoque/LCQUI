use crate::{ir::Ir, latex::escape, validation::Validation, validation_m2::ValidationM2};
use std::collections::BTreeMap;

pub fn render(ir: &Ir, v: &Validation, v2: &ValidationM2) -> BTreeMap<String, String> {
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
            if let Some(sql) = &c.sql {
                entity.push_str(&format!("SQL: {}.\n", escape(sql)));
            }
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
            if let Some(min) = c.minimo_numero {
                entity.push_str(&format!("Mínimo: {min}.\n"));
            }
            if let Some(min) = c.minimo_exclusivo {
                entity.push_str(&format!("Maior que {min}.\n"));
            }
            if let Some(max) = c.maximo_exclusivo {
                entity.push_str(&format!("Menor que {max}.\n"));
            }
            if let Some(max) = c.maximo_numero {
                entity.push_str(&format!("Máximo: {max}.\n"));
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

    // Evidência Alloy M2.2, gerada separadamente da evidência M0.
    let mut m2 = String::from(
        "% Gerado por lcqui-spec-doc; não editar.\n\\subsection*{Evidência formal M2.2 --- Frasco\\_Reagente}\n",
    );
    for modelo in &v2.modelos {
        m2.push_str(&format!(
            "\\subsection*{{{}}}\n\\begin{{description}}\n",
            escape(&modelo.model)
        ));
        for r in &modelo.resultados {
            m2.push_str(&format!(
                "\\item[{}] {}: {}.\\newline Escopo: \\texttt{{{}}}.\n",
                escape(&r.id),
                escape(&r.assertion),
                escape(&r.status),
                escape(&r.scope)
            ));
        }
        m2.push_str("\\end{description}\n");
    }
    m2.push_str(
        "UNSAT para check: nenhum contraexemplo no escopo declarado. SAT para run: testemunha encontrada no escopo declarado. Os módulos M0 e M2.2 foram verificados separadamente; esta geração não constitui prova da composição M0 e M2.2, que permanece para M2.4. Não certifica a implementação backend/Firebase.\n",
    );
    files.insert("invariants/frasco_reagente_m2.tex".into(), m2);
    files
}

pub fn render_composed(v: &crate::validation_m24::ValidationM24) -> String {
    let mut text = String::from(
        "% Gerado por lcqui-spec-doc; não editar.\n\\subsection*{Evidência composta M2.4}\nM2.4 verifica compatibilidade de M0 e M2.2 em uma abstração integrada: mesmo Frasco, estado físico, disponibilidade e quarentena, com empréstimos ativos e identidade química.\n\\begin{description}\n",
    );
    for r in &v.resultados {
        text.push_str(&format!(
            "\\item[{}] {}: {}.\\newline Escopo: \\texttt{{{}}}.\n",
            escape(&r.id),
            escape(&r.assertion),
            escape(&r.status),
            escape(&r.scope)
        ));
    }
    text.push_str("\\end{description}\nUNSAT para check: nenhum contraexemplo encontrado no escopo declarado. SAT para run: testemunha encontrada. As buscas limitadas não são prova universal.\n\nNão certifica implementação Firebase, concorrência Firestore completa, estados completos de Emprestimo\\_Reagente, metrologia Q06, autorização/RBAC nem idempotência operacional. Esses temas permanecem para milestones futuros.\n");
    text
}

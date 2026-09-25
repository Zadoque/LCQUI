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

// Evidência M3 do ciclo de vida do Emprestimo_Reagente.
pub fn render_loan(v: &crate::validation_m3::ValidationM3) -> String {
    let mut text = String::from(
        "% Gerado por lcqui-spec-doc; não editar.\n\\subsection*{Evidência formal M3 --- Emprestimo\\_Reagente}\nM3 formaliza o registro do empréstimo (34 colunas, incluindo o snapshot imutável \\texttt{vencido\\_na\\_retirada}) e sua máquina abstrata de status: ativos EM\\_USO/ATRASADO, encerramentos e unicidade de empréstimo ativo por frasco.\n\\begin{description}\n",
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
    text.push_str("\\end{description}\nUNSAT para check: nenhum contraexemplo encontrado no escopo declarado. SAT para run: testemunha encontrada. As buscas limitadas não são prova universal.\n\nNão certifica implementação Firebase/backend, concorrência, Q06, tara numérica, validade calculada, TCR completo, autorização/RBAC, idempotência nem a operação completa de retirada/devolução (M4). Não compõe Emprestimo com Frasco.\n");
    text
}

// Evidência M4 da retirada e devolução compostas.
pub fn render_withdrawal_return(v: &crate::validation_m4::ValidationM4) -> String {
    let mut text = String::from(
        "% Gerado por lcqui-spec-doc; não editar.\n\\subsection*{Evidência M4 --- retirada e devolução compostas}\nM4 reúne o estado do Frasco (M2.4) e o ciclo de vida do Emprestimo (M3) no mesmo universo. A disponibilidade \\texttt{EMPRESTADO} equivale a exatamente um empréstimo ativo (\\texttt{EM\\_USO} ou \\texttt{ATRASADO}) por frasco. A retirada grava o snapshot imutável \\texttt{vencido\\_na\\_retirada} a partir do vencimento resultante de eventual primeira abertura; a devolução lê o vencimento persistido do frasco (autoridade atual, sem recálculo pelo relógio), preserva \\texttt{vencido} e o snapshot, e classifica o retorno em venceu-durante, já-vencido, validade-desconhecida ou normal. Anomalia e vazio têm precedência sobre o destino de validade.\n\\begin{description}\n",
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
    text.push_str("\\end{description}\nUNSAT para check: nenhum contraexemplo encontrado no escopo declarado. SAT para run: testemunha encontrada. As buscas limitadas não são prova universal.\n\nNão certifica Q06 ou tara (M6), extravio/reencontro/quarentena completos (M5), idempotência transacional (M7), RBAC (M9), Firestore/backend nem concorrência real. A validade calculada, a primeira abertura que vence, o vencimento persistido e a validade desconhecida são representados por fatos abstratos; o snapshot vencido\\_na\\_retirada é formalizado, mas o cálculo efetivo de validade pertence a M6.\n");
    text
}

fn render_milestone(title: &str, scope: &str, resultados: &[crate::validation::Result]) -> String {
    let mut text = format!(
        "% Gerado por lcqui-spec-doc; não editar.\n\\subsection*{{Evidência formal {title}}}\n{}\n\\begin{{description}}\n",
        escape(scope)
    );
    for r in resultados {
        text.push_str(&format!(
            "\\item[{}] {}: {}.\\newline Escopo: \\texttt{{{}}}.\n",
            escape(&r.id),
            escape(&r.assertion),
            escape(&r.status),
            escape(&r.scope)
        ));
    }
    text.push_str("\\end{description}\nUNSAT para check indica ausência de contraexemplo no escopo declarado; SAT para run indica testemunha encontrada. A evidência não certifica a implementação Firebase/backend.\n");
    text
}
pub fn render_m5(v: &crate::validation_m5::ValidationM5) -> String {
    render_milestone(
        "M5 --- extravio, reencontro e quarentena",
        "M5 separa estado físico, localização e autorização operacional. CUE verifica contratos estruturais; Alloy verifica preservação física, quarentena, terminalidade e revogação.",
        &v.resultados,
    )
}
pub fn render_m6(v: &crate::validation_m6::ValidationM6) -> String {
    render_milestone(
        "M6 --- metrologia quantitativa",
        "CUE verifica estrutura e sinais; Rust calcula Q06 normal/higroscópico, classifica ganho e valida evaporação contra a perda bruta; Alloy verifica a relação abstrata escalada, as três rotas, preservação de peso histórico e interação com quarentena. A abstração Alloy não prova ponto flutuante real.",
        &v.resultados,
    )
}
pub fn render_m7(v: &crate::validation_m7::ValidationM7) -> String {
    render_milestone(
        "M7 --- idempotência",
        "Alloy verifica identidade, retry, deduplicação e materialização substitutiva. Rust é a referência determinística para proveniência e canonicalização; isto não prova exactly-once da infraestrutura, TOCTOU ou deadlock.",
        &v.resultados,
    )
}
pub fn render_m8(v: &crate::validation_m8::ValidationM8) -> String {
    render_milestone(
        "M8 --- estoque, escassez e notificações",
        "CUE verifica os shapes de configuração, resultado de estoque, cache e notificação. Alloy verifica a aptidão única (frascoAptoParaUso), a fronteira estritamente menor da escassez, a invalidação/publicação do cache por geração e a emissão idempotente de ESCASSEZ_ESTOQUE. Rust valida a proveniência do receipt e os limites determinísticos (escassez estritamente menor que o limiar, idade do cache estritamente menor que 30 segundos, rate limit de 5 por minuto, chave determinística e agregação que segrega saldo desconhecido e não soma g com mL). A evidência não certifica a implementação Firebase atual.",
        &v.resultados,
    )
}

pub fn render_m9(v: &crate::validation_m9::ValidationM9) -> String {
    render_milestone(
        "M9 --- autorização e usuários",
        "CUE verifica shapes de usuário, papel fechado, versão de permissões, claim, vínculo, ownership e decisão. Alloy verifica a autoridade única podeExecutar: usuário autenticado/ativo, papel persistido permitido, versão corrente, vínculo ou ownership aplicável, recurso não server-owned; também verifica revogação, claim obsoleta, TOCTOU abstrato e que autorização não substitui precondição de domínio. Rust valida proveniência, ordem exata do receipt e a decisão determinística fail-closed. A evidência não certifica Firebase, Rules, Admin SDK, UI, token refresh ou concorrência real.",
        &v.resultados,
    )
}

pub fn render_m10(v: &crate::validation_m10::ValidationM10) -> String {
    render_milestone(
        "M10 --- patrimônio",
        "CUE verifica shapes de bem, resumo catalográfico, requisições de adição/edição, lock, baixa, evento histórico e alteração, com enums fechados, nulabilidade e limites de comprimento. Alloy verifica a identidade Resumo x Bem, a plaqueta canônica única e não reutilizável, Chaves_Unicas como reserva permanente distinta de lock, a máquina V1 Ativo -> Inservivel -> Ja_dado_baixa, a terminalidade, a ortogonalidade da conservação, o versionamento canônico (fan-out derivado não incrementa), os conflitos de versão/unicidade com liberação do próprio lock, a presença/ownership do lock, o histórico cadastro/edição/baixa e a composição abstrata com M7 (retry não duplica) e M9 (autorização necessária, domínio não dispensado). Rust valida proveniência, ordem exata do receipt e a canonicalização determinística N(s)=trim().toUpperCase() preservando zeros iniciais. A evidência não certifica Firebase, backend, Rules, Storage, assinatura real de PDF, Chaves_Unicas/backfill, índices, migração de histórico legado nem concorrência sob carga.",
        &v.resultados,
    )
}

pub fn render_m11(v: &crate::validation_m11::ValidationM11) -> String {
    render_milestone(
        "M11 --- turma, matrícula e convite",
        "CUE verifica shapes de turma, vínculo canônico Aluno--Turma, espelho mínimo de consulta, evento de inclusão/exclusão, convite e chave de pendência, com enums fechados, nulabilidade, condicionais (justificativa de exceção, autoria do aceite, modo de ingresso, contexto global) e limites locais. Alloy verifica a unicidade e a reserva permanente de codigo_turma, o arquivamento e desarquivamento preservando ID/membros/código/histórico e bloqueando escrita acadêmica enquanto arquivada, o ingresso ordinário apenas com vaga estrita em turma Ativa, a exceção nominal válida que pode exceder a capacidade, a proibição de editar capacidade abaixo da ocupação (HQ-M11-001 = A), a coerência vínculo canônico--contador--espelho, a remoção e o reingresso por convite, a unicidade de pendência por (e-mail, contexto) com distinção GLOBAL/turma, expiração, reenvio, terminalidade e preservação de histórico, a idempotência M7 (retry não duplica; reuso incompatível não herda) e a composição M9 (revogação/ownership impedem commit tardio; espelho não autoriza). Rust valida proveniência, ordem exata do receipt e as regras determinísticas de capacidade/exceção e canonicalização de e-mail. A evidência não certifica Firebase, Auth, envio de e-mail, HMAC concreto, Firestore/Storage Rules, backend, índices nem concorrência sob carga.",
        &v.resultados,
    )
}

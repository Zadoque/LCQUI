use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

// M13 — Notificação unificada: caixa única, leitura/marcação/Limpar tudo,
// expiração, alvo/deep link com revalidação corrente, privacidade e
// emissão/deduplicação. Modelo composto que reproduz os predicados de
// autorização de M12.1/M9 (guard de drift tools/formal/m13_composition.mjs) e
// registra as origens de composição por hash.
pub const MODEL: &str = "specification/alloy/operations/notificacoes_m13.als";
pub const ORIGINS: [&str; 5] = [
    "specification/alloy/operations/posts_m12_1.als",
    "specification/alloy/operations/authorization_m9.als",
    "specification/alloy/operations/idempotency_m7.als",
    "specification/alloy/reagents/stock_cache_scarcity_m8.als",
    "specification/alloy/operations/roteiros_m12_2.als",
];
// Contrato fechado: não inferir IDs/tipos/scopes a partir da evidência recebida.
const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "M13-INV-001",
        "TransicoesPreservamCoerencia",
        "check",
        "UNSAT",
        "check TransicoesPreservamCoerencia for 4",
    ),
    (
        "M13-INV-002",
        "NaoLeCaixaAlheia",
        "check",
        "UNSAT",
        "check NaoLeCaixaAlheia for 4",
    ),
    (
        "M13-INV-003",
        "PapelVisualNaoFiltraCaixa",
        "check",
        "UNSAT",
        "check PapelVisualNaoFiltraCaixa for 4",
    ),
    (
        "M13-INV-004",
        "BolsistaVeCaixa",
        "check",
        "UNSAT",
        "check BolsistaVeCaixa for 4",
    ),
    (
        "M13-INV-005",
        "PapelVisualNaoConcedeRecurso",
        "check",
        "UNSAT",
        "check PapelVisualNaoConcedeRecurso for 4",
    ),
    (
        "M13-INV-006",
        "MarcarSoProprias",
        "check",
        "UNSAT",
        "check MarcarSoProprias for 4",
    ),
    (
        "M13-INV-007",
        "MarcaIdempotente",
        "check",
        "UNSAT",
        "check MarcaIdempotente for 4",
    ),
    (
        "M13-INV-008",
        "LoteSoProprias",
        "check",
        "UNSAT",
        "check LoteSoProprias for 4",
    ),
    (
        "M13-INV-009",
        "SemDelete",
        "check",
        "UNSAT",
        "check SemDelete for 4",
    ),
    (
        "M13-INV-010",
        "LimparTudoCorteEstavel",
        "check",
        "UNSAT",
        "check LimparTudoCorteEstavel for 5",
    ),
    (
        "M13-INV-011",
        "MarcaNaoReverte",
        "check",
        "UNSAT",
        "check MarcaNaoReverte for 4",
    ),
    (
        "M13-INV-012",
        "ExpiracaoDistingueNull",
        "check",
        "UNSAT",
        "check ExpiracaoDistingueNull for 4",
    ),
    (
        "M13-INV-013",
        "ExpiradoForaDoAtivo",
        "check",
        "UNSAT",
        "check ExpiradoForaDoAtivo for 4",
    ),
    (
        "M13-INV-014",
        "AlvoInvalidoNaoNavega",
        "check",
        "UNSAT",
        "check AlvoInvalidoNaoNavega for 4",
    ),
    (
        "M13-INV-015",
        "UrlArbitrariaNaoNavega",
        "check",
        "UNSAT",
        "check UrlArbitrariaNaoNavega for 4",
    ),
    (
        "M13-INV-016",
        "AlertaNaoContornaAcl",
        "check",
        "UNSAT",
        "check AlertaNaoContornaAcl for 4",
    ),
    (
        "M13-INV-017",
        "RevogacaoCortaClique",
        "check",
        "UNSAT",
        "check RevogacaoCortaClique for 4",
    ),
    (
        "M13-INV-018",
        "VinculoCanonicoRequerido",
        "check",
        "UNSAT",
        "check VinculoCanonicoRequerido for 4",
    ),
    (
        "M13-INV-019",
        "ObjetoRemovidoNaoNavega",
        "check",
        "UNSAT",
        "check ObjetoRemovidoNaoNavega for 4",
    ),
    (
        "M13-INV-020",
        "ChefeSemEscopoNaoAcessa",
        "check",
        "UNSAT",
        "check ChefeSemEscopoNaoAcessa for 4",
    ),
    (
        "M13-INV-021",
        "NotificacaoNaoExpoeOriginal",
        "check",
        "UNSAT",
        "check NotificacaoNaoExpoeOriginal for 4",
    ),
    (
        "M13-INV-022",
        "EmissaoMesmaIdentidadeNaoDuplica",
        "check",
        "UNSAT",
        "check EmissaoMesmaIdentidadeNaoDuplica for 4",
    ),
    (
        "M13-INV-023",
        "ErroEmissaoNaoViraSucesso",
        "check",
        "UNSAT",
        "check ErroEmissaoNaoViraSucesso for 4",
    ),
    (
        "M13-INV-024",
        "ComposicaoM7RetryNaoDuplica",
        "check",
        "UNSAT",
        "check ComposicaoM7RetryNaoDuplica for 4",
    ),
    (
        "M13-INV-025",
        "IdTurmaAcademicoObrigatorio",
        "check",
        "UNSAT",
        "check IdTurmaAcademicoObrigatorio for 4",
    ),
    (
        "M13-INV-026",
        "IdTurmaOperacionalNulo",
        "check",
        "UNSAT",
        "check IdTurmaOperacionalNulo for 4",
    ),
    (
        "M13-INV-027",
        "PonteM9ExigeAuth",
        "check",
        "UNSAT",
        "check PonteM9ExigeAuth for 4",
    ),
    (
        "M13-INV-028",
        "PonteM12NaoAfrouxaAcl",
        "check",
        "UNSAT",
        "check PonteM12NaoAfrouxaAcl for 4",
    ),
    (
        "M13-WIT-029",
        "WitnessCaixaMultiRole",
        "run",
        "SAT",
        "run WitnessCaixaMultiRole for 4",
    ),
    (
        "M13-WIT-030",
        "WitnessBolsistaVeAlerta",
        "run",
        "SAT",
        "run WitnessBolsistaVeAlerta for 4",
    ),
    (
        "M13-WIT-031",
        "WitnessMarcarLidaPropria",
        "run",
        "SAT",
        "run WitnessMarcarLidaPropria for 4",
    ),
    (
        "M13-WIT-032",
        "WitnessMarcacaoIdempotente",
        "run",
        "SAT",
        "run WitnessMarcacaoIdempotente for 4",
    ),
    (
        "M13-WIT-033",
        "WitnessLimparTudoProprias",
        "run",
        "SAT",
        "run WitnessLimparTudoProprias for 4",
    ),
    (
        "M13-WIT-034",
        "WitnessLimparTudoRetry",
        "run",
        "SAT",
        "run WitnessLimparTudoRetry for 5",
    ),
    (
        "M13-WIT-035",
        "WitnessLimparTudoCorteComNovaEmissao",
        "run",
        "SAT",
        "run WitnessLimparTudoCorteComNovaEmissao for 5",
    ),
    (
        "M13-WIT-036",
        "WitnessExpiraAtivo",
        "run",
        "SAT",
        "run WitnessExpiraAtivo for 4",
    ),
    (
        "M13-WIT-037",
        "WitnessNullNaoExpira",
        "run",
        "SAT",
        "run WitnessNullNaoExpira for 4",
    ),
    (
        "M13-WIT-038",
        "WitnessNavegaAlvoValido",
        "run",
        "SAT",
        "run WitnessNavegaAlvoValido for 4",
    ),
    (
        "M13-WIT-039",
        "WitnessAlvoInvalidoNaoNavega",
        "run",
        "SAT",
        "run WitnessAlvoInvalidoNaoNavega for 4",
    ),
    (
        "M13-WIT-040",
        "WitnessRevogacaoPreservaFato",
        "run",
        "SAT",
        "run WitnessRevogacaoPreservaFato for 4",
    ),
    (
        "M13-WIT-041",
        "WitnessEmissaoUnica",
        "run",
        "SAT",
        "run WitnessEmissaoUnica for 4",
    ),
    (
        "M13-WIT-042",
        "EmissaoChaveDistintaEmite",
        "run",
        "SAT",
        "run EmissaoChaveDistintaEmite for 4",
    ),
    (
        "M13-WIT-043",
        "WitnessErroNaoEmite",
        "run",
        "SAT",
        "run WitnessErroNaoEmite for 4",
    ),
    (
        "M13-WIT-044",
        "WitnessChefeComEscopo",
        "run",
        "SAT",
        "run WitnessChefeComEscopo for 4",
    ),
    (
        "M13-WIT-045",
        "WitnessIdTurmaAcademico",
        "run",
        "SAT",
        "run WitnessIdTurmaAcademico for 4",
    ),
    (
        "M13-WIT-046",
        "WitnessIdTurmaOperacional",
        "run",
        "SAT",
        "run WitnessIdTurmaOperacional for 4",
    ),
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Origin {
    pub model: String,
    pub model_sha256: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM13 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub origens: Vec<Origin>,
    pub resultados: Vec<Resultado>,
}
impl ValidationM13 {
    pub fn check(&self, ir: &[u8], model: &[u8], origins: [&[u8]; 5]) -> bool {
        self.versao == 1
            && self.alloy == "6.2.0"
            && self.solver == "sat4j"
            && self.spec_ir_sha256 == hash(ir)
            && self.model == MODEL
            && self.model_sha256 == hash(model)
            && self.origens.len() == ORIGINS.len()
            && self
                .origens
                .iter()
                .zip(ORIGINS)
                .zip(origins)
                .all(|((o, path), bytes)| o.model == path && o.model_sha256 == hash(bytes))
            && self.resultados.len() == EXPECTED.len()
            && self
                .resultados
                .iter()
                .zip(EXPECTED)
                .all(|(r, (id, name, kind, status, scope))| {
                    r.id == *id
                        && r.assertion == *name
                        && r.tipo == *kind
                        && r.status == *status
                        && r.scope == *scope
                })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json};
    #[test]
    fn accepts_real_receipt_and_rejects_all_required_tampering() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let ir = std::fs::read(root.join("build/spec-ir.json")).unwrap();
        let model = std::fs::read(root.join(MODEL)).unwrap();
        let origins = ORIGINS.map(|p| std::fs::read(root.join(p)).unwrap());
        let original: Value = serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m13.json")).unwrap(),
        )
        .unwrap();
        let valid = |value: Value| {
            serde_json::from_value::<ValidationM13>(value).is_ok_and(|v| {
                v.check(
                    &ir,
                    &model,
                    [
                        &origins[0],
                        &origins[1],
                        &origins[2],
                        &origins[3],
                        &origins[4],
                    ],
                )
            })
        };
        assert!(valid(original.clone()));
        for (pointer, replacement) in [
            ("/versao", json!(2)),
            ("/alloy", json!("other")),
            ("/solver", json!("other")),
            ("/spec_ir_sha256", json!("0".repeat(64))),
            ("/model_sha256", json!("0".repeat(64))),
            ("/model", json!(ORIGINS[0])),
            ("/resultados/0/status", json!("SAT")),
            ("/resultados/28/status", json!("UNSAT")),
            (
                "/resultados/0/scope",
                json!("check TransicoesPreservamCoerencia for 1"),
            ),
            ("/resultados/0/id", json!("unexpected")),
            ("/resultados/0/assertion", json!("unexpected")),
            ("/resultados/0/tipo", json!("run")),
            ("/origens/0/model", json!("unexpected")),
            ("/origens/0/model_sha256", json!("0".repeat(64))),
            ("/origens/4/model_sha256", json!("0".repeat(64))),
        ] {
            let mut bad = original.clone();
            *bad.pointer_mut(pointer).unwrap() = replacement;
            assert!(!valid(bad), "tampering aceito: {pointer}");
        }
        for list in ["resultados", "origens"] {
            for action in ["remove", "extra", "empty"] {
                let mut bad = original.clone();
                let values = bad[list].as_array_mut().unwrap();
                match action {
                    "remove" => {
                        values.pop();
                    }
                    "extra" => {
                        values.push(values[0].clone());
                    }
                    _ => values.clear(),
                }
                assert!(!valid(bad), "{list}: {action}");
            }
        }
        let v: ValidationM13 = serde_json::from_value(original).unwrap();
        assert!(!v.check(
            b"changed IR",
            &model,
            [
                &origins[0],
                &origins[1],
                &origins[2],
                &origins[3],
                &origins[4]
            ]
        ));
        assert!(!v.check(
            &ir,
            b"changed model",
            [
                &origins[0],
                &origins[1],
                &origins[2],
                &origins[3],
                &origins[4]
            ]
        ));
    }
}

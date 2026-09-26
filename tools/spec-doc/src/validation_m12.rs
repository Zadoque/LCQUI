use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

// Composição M12.1 x M12.2: um único EstadoIntegrado, transições ligadas e ponte
// de acesso Roteiro/Post. Não reabre as provas isoladas; o guard de drift
// (tools/formal/m12_composition.mjs) prova a reprodução dos predicados de
// fronteira.
pub const MODEL: &str = "specification/alloy/operations/composition_m12.als";
pub const ORIGINS: [&str; 2] = [
    "specification/alloy/operations/posts_m12_1.als",
    "specification/alloy/operations/roteiros_m12_2.als",
];
// Contrato fechado: não inferir IDs/tipos/scopes a partir da evidência recebida.
const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "M12-INV-001",
        "PublicacaoCompostaExigeDono",
        "check",
        "UNSAT",
        "check PublicacaoCompostaExigeDono for 4",
    ),
    (
        "M12-INV-002",
        "PublicacaoCompostaRefinaAcessoM12_1",
        "check",
        "UNSAT",
        "check PublicacaoCompostaRefinaAcessoM12_1 for 4",
    ),
    (
        "M12-INV-003",
        "SemAcessoM12_1NaoPublicaComposto",
        "check",
        "UNSAT",
        "check SemAcessoM12_1NaoPublicaComposto for 4",
    ),
    (
        "M12-INV-004",
        "PublicacaoCompostaProvaGeracao",
        "check",
        "UNSAT",
        "check PublicacaoCompostaProvaGeracao for 4",
    ),
    (
        "M12-INV-005",
        "AnexoCompostoUsaGeracaoCanonica",
        "check",
        "UNSAT",
        "check AnexoCompostoUsaGeracaoCanonica for 4",
    ),
    (
        "M12-INV-006",
        "TerceiroNaoPublicaComAnexo",
        "check",
        "UNSAT",
        "check TerceiroNaoPublicaComAnexo for 4",
    ),
    (
        "M12-INV-007",
        "ProvisorioNaoPublicaComAnexo",
        "check",
        "UNSAT",
        "check ProvisorioNaoPublicaComAnexo for 4",
    ),
    (
        "M12-INV-008",
        "ValidadoNaoPublicaComAnexo",
        "check",
        "UNSAT",
        "check ValidadoNaoPublicaComAnexo for 4",
    ),
    (
        "M12-INV-009",
        "GeracaoDivergenteNaoPublicaComAnexo",
        "check",
        "UNSAT",
        "check GeracaoDivergenteNaoPublicaComAnexo for 4",
    ),
    (
        "M12-INV-010",
        "CompartilhamentoCompostoSoPublicavel",
        "check",
        "UNSAT",
        "check CompartilhamentoCompostoSoPublicavel for 4",
    ),
    (
        "M12-INV-011",
        "AcessoCompartilhadoFundamentaM12_1",
        "check",
        "UNSAT",
        "check AcessoCompartilhadoFundamentaM12_1 for 4",
    ),
    (
        "M12-INV-012",
        "RevogacaoCompostaPreservaPost",
        "check",
        "UNSAT",
        "check RevogacaoCompostaPreservaPost for 4",
    ),
    (
        "M12-INV-013",
        "RevogacaoCompostaPreservaAnexo",
        "check",
        "UNSAT",
        "check RevogacaoCompostaPreservaAnexo for 4",
    ),
    (
        "M12-INV-014",
        "RevogacaoCompostaPreservaObjeto",
        "check",
        "UNSAT",
        "check RevogacaoCompostaPreservaObjeto for 4",
    ),
    (
        "M12-INV-015",
        "RevogacaoCompostaPreservaUrls",
        "check",
        "UNSAT",
        "check RevogacaoCompostaPreservaUrls for 4",
    ),
    (
        "M12-INV-016",
        "RevogadoNaoMantemAnexoSemAcesso",
        "check",
        "UNSAT",
        "check RevogadoNaoMantemAnexoSemAcesso for 4",
    ),
    (
        "M12-INV-017",
        "DesvinculacaoNaoExigeAcesso",
        "check",
        "UNSAT",
        "check DesvinculacaoNaoExigeAcesso for 4",
    ),
    (
        "M12-INV-018",
        "HistoricoAnexoCompostoPreservado",
        "check",
        "UNSAT",
        "check HistoricoAnexoCompostoPreservado for 4",
    ),
    (
        "M12-INV-019",
        "DesvinculoConservaObjeto",
        "check",
        "UNSAT",
        "check DesvinculoConservaObjeto for 4",
    ),
    (
        "M12-INV-020",
        "RotaAcademicaExigePapelEVinculo",
        "check",
        "UNSAT",
        "check RotaAcademicaExigePapelEVinculo for 4",
    ),
    (
        "M12-INV-021",
        "PostRemovidoNaoBaixaComposto",
        "check",
        "UNSAT",
        "check PostRemovidoNaoBaixaComposto for 4",
    ),
    (
        "M12-INV-022",
        "ChefeComVinculoLegadoNaoBaixaComposto",
        "check",
        "UNSAT",
        "check ChefeComVinculoLegadoNaoBaixaComposto for 4",
    ),
    (
        "M12-INV-023",
        "ClaimAntigaNaoAutorizaComposto",
        "check",
        "UNSAT",
        "check ClaimAntigaNaoAutorizaComposto for 4",
    ),
    (
        "M12-INV-024",
        "UrlEmitidaCompostaSobreviveRevogacao",
        "check",
        "UNSAT",
        "check UrlEmitidaCompostaSobreviveRevogacao for 4",
    ),
    (
        "M12-INV-025",
        "UrlExpiradaNaoUsavelComposto",
        "check",
        "UNSAT",
        "check UrlExpiradaNaoUsavelComposto for 4",
    ),
    (
        "M12-INV-026",
        "UrlAtivaUsavelComposto",
        "check",
        "UNSAT",
        "check UrlAtivaUsavelComposto for 4",
    ),
    (
        "M12-INV-027",
        "ChefeNaoPublicaPostComposto",
        "check",
        "UNSAT",
        "check ChefeNaoPublicaPostComposto for 4",
    ),
    (
        "M12-INV-028",
        "ChefeNaoCompartilhaComposto",
        "check",
        "UNSAT",
        "check ChefeNaoCompartilhaComposto for 4",
    ),
    (
        "M12-INV-029",
        "ChefeSemEscopoNaoEmiteComposto",
        "check",
        "UNSAT",
        "check ChefeSemEscopoNaoEmiteComposto for 4",
    ),
    (
        "M12-INV-030",
        "EscopoQ13CompostoExigePostRemovido",
        "check",
        "UNSAT",
        "check EscopoQ13CompostoExigePostRemovido for 4",
    ),
    (
        "M12-INV-031",
        "TurmaArquivadaNegaEscritaComposta",
        "check",
        "UNSAT",
        "check TurmaArquivadaNegaEscritaComposta for 4",
    ),
    (
        "M12-INV-032",
        "ChefeAnexoSoQ13",
        "check",
        "UNSAT",
        "check ChefeAnexoSoQ13 for 4",
    ),
    (
        "M12-INV-033",
        "PrimeiraExecucaoCompostaProduzReceipt",
        "check",
        "UNSAT",
        "check PrimeiraExecucaoCompostaProduzReceipt for 4",
    ),
    (
        "M12-INV-034",
        "RetryCompostoNaoDuplicaFato",
        "check",
        "UNSAT",
        "check RetryCompostoNaoDuplicaFato for 4",
    ),
    (
        "M12-INV-035",
        "ReusoIncompativelCompostoNaoHerda",
        "check",
        "UNSAT",
        "check ReusoIncompativelCompostoNaoHerda for 4",
    ),
    (
        "M12-INV-036",
        "RevogacaoVinculoCompostaImpedeCommit",
        "check",
        "UNSAT",
        "check RevogacaoVinculoCompostaImpedeCommit for 4",
    ),
    (
        "M12-INV-037",
        "PromoverChefeCompostoPreservaVinculo",
        "check",
        "UNSAT",
        "check PromoverChefeCompostoPreservaVinculo for 4",
    ),
    (
        "M12-WIT-038",
        "WitnessEstadoComposto",
        "run",
        "SAT",
        "run WitnessEstadoComposto for 4",
    ),
    (
        "M12-WIT-039",
        "WitnessTrajetoriaCompartilhaRevoga",
        "run",
        "SAT",
        "run WitnessTrajetoriaCompartilhaRevoga for 5",
    ),
    (
        "M12-WIT-040",
        "WitnessPublicaRoteiroCompartilhado",
        "run",
        "SAT",
        "run WitnessPublicaRoteiroCompartilhado for 4",
    ),
    (
        "M12-WIT-041",
        "WitnessProvisorioNaoPublica",
        "run",
        "SAT",
        "run WitnessProvisorioNaoPublica for 4",
    ),
    (
        "M12-WIT-042",
        "WitnessValidadoNaoPublica",
        "run",
        "SAT",
        "run WitnessValidadoNaoPublica for 4",
    ),
    (
        "M12-WIT-043",
        "WitnessAlunoBaixaAtivo",
        "run",
        "SAT",
        "run WitnessAlunoBaixaAtivo for 4",
    ),
    (
        "M12-WIT-044",
        "WitnessAlunoBaixaArquivada",
        "run",
        "SAT",
        "run WitnessAlunoBaixaArquivada for 4",
    ),
    (
        "M12-WIT-045",
        "WitnessExAlunoNaoBaixa",
        "run",
        "SAT",
        "run WitnessExAlunoNaoBaixa for 5",
    ),
    (
        "M12-WIT-046",
        "WitnessPostRemovidoNaoBaixa",
        "run",
        "SAT",
        "run WitnessPostRemovidoNaoBaixa for 4",
    ),
    (
        "M12-WIT-047",
        "WitnessRevogacaoPreservaHistorico",
        "run",
        "SAT",
        "run WitnessRevogacaoPreservaHistorico for 4",
    ),
    (
        "M12-WIT-048",
        "WitnessDesvinculaSemAcesso",
        "run",
        "SAT",
        "run WitnessDesvinculaSemAcesso for 4",
    ),
    (
        "M12-WIT-049",
        "WitnessChefeComEscopoQ13",
        "run",
        "SAT",
        "run WitnessChefeComEscopoQ13 for 5",
    ),
    (
        "M12-WIT-050",
        "WitnessChefeSemEscopoNaoEmite",
        "run",
        "SAT",
        "run WitnessChefeSemEscopoNaoEmite for 4",
    ),
    (
        "M12-WIT-051",
        "WitnessChefeComVinculoLegado",
        "run",
        "SAT",
        "run WitnessChefeComVinculoLegado for 4",
    ),
    (
        "M12-WIT-052",
        "WitnessUrlAtivaAposRevogacao",
        "run",
        "SAT",
        "run WitnessUrlAtivaAposRevogacao for 4",
    ),
    (
        "M12-WIT-053",
        "WitnessTurmaArquivadaNegaEscrita",
        "run",
        "SAT",
        "run WitnessTurmaArquivadaNegaEscrita for 4",
    ),
    (
        "M12-WIT-054",
        "WitnessRetryComposto",
        "run",
        "SAT",
        "run WitnessRetryComposto for 4",
    ),
    (
        "M12-WIT-055",
        "WitnessReusoIncompativelComposto",
        "run",
        "SAT",
        "run WitnessReusoIncompativelComposto for 4",
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
pub struct ValidationM12 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub origens: Vec<Origin>,
    pub resultados: Vec<Resultado>,
}
impl ValidationM12 {
    pub fn check(&self, ir: &[u8], model: &[u8], origins: [&[u8]; 2]) -> bool {
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
            &std::fs::read(root.join("build/formal-validation-m12.json")).unwrap(),
        )
        .unwrap();
        let valid = |value: Value| {
            serde_json::from_value::<ValidationM12>(value)
                .is_ok_and(|v| v.check(&ir, &model, [&origins[0], &origins[1]]))
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
            ("/resultados/37/status", json!("UNSAT")),
            (
                "/resultados/0/scope",
                json!("check PublicacaoCompostaExigeDono for 1"),
            ),
            ("/resultados/0/id", json!("unexpected")),
            ("/resultados/0/assertion", json!("unexpected")),
            ("/resultados/0/tipo", json!("run")),
            ("/origens/0/model", json!("unexpected")),
            ("/origens/0/model_sha256", json!("0".repeat(64))),
            ("/origens/1/model_sha256", json!("0".repeat(64))),
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
        let v: ValidationM12 = serde_json::from_value(original).unwrap();
        assert!(!v.check(b"changed IR", &model, [&origins[0], &origins[1]]));
        assert!(!v.check(&ir, b"changed model", [&origins[0], &origins[1]]));
    }
}

use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

pub const MODEL: &str = "specification/alloy/reagents/loan_state.als";
// Contrato fechado: IDs, nomes, tipos, escopos e status exatos, na ordem da
// evidência. Não inferir nem aceitar subconjuntos.
const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "INV-M3-ATIVO-UNICIDADE-001",
        "UnicidadeAtivaPreservada",
        "check",
        "check UnicidadeAtivaPreservada for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M3-ATRASO-ORIGEM-001",
        "AtrasoSoDeEmUso",
        "check",
        "check AtrasoSoDeEmUso for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M3-ENCERRADO-TERMINAL-001",
        "EncerradoNaoReabre",
        "check",
        "check EncerradoNaoReabre for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M3-DEVOLUCAO-ENCERRA-001",
        "DevolucaoEncerra",
        "check",
        "check DevolucaoEncerra for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M3-ANOMALIA-ENCERRA-001",
        "AnomaliaNaoAtiva",
        "check",
        "check AnomaliaNaoAtiva for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M3-EXTRAORDINARIO-ENCERRA-001",
        "ExtraordinarioNaoAtivo",
        "check",
        "check ExtraordinarioNaoAtivo for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "FRAME-M3-STATUS-001",
        "TransicaoNaoInterfereOutros",
        "check",
        "check TransicaoNaoInterfereOutros for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "WIT-M3-EM-USO-001",
        "TestemunhaEmUso",
        "run",
        "run TestemunhaEmUso for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M3-ATRASADO-001",
        "TestemunhaAtrasado",
        "run",
        "run TestemunhaAtrasado for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M3-ATRASO-001",
        "TestemunhaAtraso",
        "run",
        "run TestemunhaAtraso for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M3-DEVOLUCAO-001",
        "TestemunhaDevolucaoNormal",
        "run",
        "run TestemunhaDevolucaoNormal for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M3-DEVOLUCAO-ATRASO-001",
        "TestemunhaDevolucaoComAtraso",
        "run",
        "run TestemunhaDevolucaoComAtraso for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M3-DEVOLUCAO-ANOMALIA-001",
        "TestemunhaDevolucaoComAnomalia",
        "run",
        "run TestemunhaDevolucaoComAnomalia for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M3-ENCERRAMENTO-001",
        "TestemunhaEncerramentoExtraordinario",
        "run",
        "run TestemunhaEncerramentoExtraordinario for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M3-DOIS-FRASCOS-001",
        "TestemunhaDoisFrascosAtivos",
        "run",
        "run TestemunhaDoisFrascosAtivos for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M3-TRANSICAO-COERENTE-001",
        "TestemunhaTransicaoCoerente",
        "run",
        "run TestemunhaTransicaoCoerente for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M3-ESTADO-ENCERRADO-001",
        "TestemunhaEstadoEncerrado",
        "run",
        "run TestemunhaEstadoEncerrado for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "INV-M3-ATIVO-UNICIDADE-006",
        "UnicidadeAtivaPreservadaAmpliado",
        "check",
        "check UnicidadeAtivaPreservadaAmpliado for 6 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M3-ATRASO-ORIGEM-006",
        "AtrasoSoDeEmUsoAmpliado",
        "check",
        "check AtrasoSoDeEmUsoAmpliado for 6 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M3-ENCERRADO-TERMINAL-006",
        "EncerradoNaoReabreAmpliado",
        "check",
        "check EncerradoNaoReabreAmpliado for 6 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "FRAME-M3-STATUS-006",
        "TransicaoNaoInterfereOutrosAmpliado",
        "check",
        "check TransicaoNaoInterfereOutrosAmpliado for 6 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "WIT-M3-DOIS-FRASCOS-006",
        "TestemunhaDoisFrascosAtivosAmpliado",
        "run",
        "run TestemunhaDoisFrascosAtivosAmpliado for 6 but exactly 2 Estado",
        "SAT",
    ),
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM3 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<Resultado>,
}
impl ValidationM3 {
    pub fn check(&self, ir: &[u8], model: &[u8]) -> bool {
        self.versao == 1
            && self.alloy == "6.2.0"
            && self.solver == "sat4j"
            && self.spec_ir_sha256 == hash(ir)
            && self.model == MODEL
            && self.model_sha256 == hash(model)
            && self.resultados.len() == EXPECTED.len()
            && self
                .resultados
                .iter()
                .zip(EXPECTED)
                .all(|(r, (id, name, kind, scope, status))| {
                    r.id == *id
                        && r.assertion == *name
                        && r.tipo == *kind
                        && r.scope == *scope
                        && r.status == *status
                })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json};
    #[test]
    fn rejects_every_tampering_case() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let ir = std::fs::read(root.join("build/spec-ir.json")).unwrap();
        let model = std::fs::read(root.join(MODEL)).unwrap();
        let original: Value = serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m3.json")).unwrap(),
        )
        .unwrap();
        let valid = |value: Value| {
            serde_json::from_value::<ValidationM3>(value).is_ok_and(|v| v.check(&ir, &model))
        };
        assert!(valid(original.clone()));
        for (pointer, replacement) in [
            ("/versao", json!(2)),
            ("/alloy", json!("other")),
            ("/solver", json!("other")),
            ("/spec_ir_sha256", json!("0".repeat(64))),
            ("/model_sha256", json!("0".repeat(64))),
            (
                "/model",
                json!("specification/alloy/reagents/withdrawal.als"),
            ),
            ("/resultados/0/status", json!("SAT")),
            ("/resultados/9/status", json!("UNSAT")),
            (
                "/resultados/0/scope",
                json!("check UnicidadeAtivaPreservada for 1"),
            ),
            ("/resultados/0/id", json!("unexpected")),
            ("/resultados/0/assertion", json!("unexpected")),
            ("/resultados/0/tipo", json!("run")),
        ] {
            let mut bad = original.clone();
            *bad.pointer_mut(pointer).unwrap() = replacement;
            assert!(!valid(bad), "tampering aceito: {pointer}");
        }
        for action in ["remove", "extra", "empty"] {
            let mut bad = original.clone();
            let values = bad["resultados"].as_array_mut().unwrap();
            match action {
                "remove" => {
                    values.pop();
                }
                "extra" => {
                    values.push(values[0].clone());
                }
                _ => values.clear(),
            }
            assert!(!valid(bad), "resultados: {action}");
        }
        let v: ValidationM3 = serde_json::from_value(original).unwrap();
        assert!(!v.check(b"changed IR", &model));
        assert!(!v.check(&ir, b"changed model"));
    }
}

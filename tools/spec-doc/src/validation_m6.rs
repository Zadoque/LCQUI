use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;
pub const MODEL: &str = "specification/alloy/reagents/metrology_resolution_m6.als";
const EXPECTED: &[(&str, &str, &str, &str)] = &[
    ("M6-INV-001", "PesoRetornoImutavel", "check", "UNSAT"),
    ("M6-INV-002", "ResolucaoEncerraPendencia", "check", "UNSAT"),
    (
        "M6-INV-003",
        "ResolucaoNaoLiberaQuarentena",
        "check",
        "UNSAT",
    ),
    ("M6-INV-004", "RotaFechada", "check", "UNSAT"),
    ("M6-INV-005", "SemCorrecaoAdministrativa", "check", "UNSAT"),
    (
        "M6-INV-006",
        "RecalibracaoExigeQuarentena",
        "check",
        "UNSAT",
    ),
    ("M6-WIT-007", "WitnessRepetirPesagem", "run", "SAT"),
    ("M6-WIT-008", "WitnessEsgotamento", "run", "SAT"),
    ("M6-WIT-009", "WitnessRecalibracao", "run", "SAT"),
];
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM6 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<Resultado>,
}
impl ValidationM6 {
    pub fn check(&self, ir: &[u8], model: &[u8]) -> bool {
        self.versao == 1
            && self.alloy == "6.2.0"
            && self.solver == "sat4j"
            && self.model == MODEL
            && self.spec_ir_sha256 == hash(ir)
            && self.model_sha256 == hash(model)
            && self.resultados.len() == EXPECTED.len()
            && self
                .resultados
                .iter()
                .zip(EXPECTED)
                .all(|(r, (id, n, k, s))| {
                    r.id == *id && r.assertion == *n && r.tipo == *k && r.status == *s
                })
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_tampering() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let ir = std::fs::read(root.join("build/spec-ir.json")).unwrap();
        let model = std::fs::read(root.join(MODEL)).unwrap();
        let mut v: ValidationM6 = serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m6.json")).unwrap(),
        )
        .unwrap();
        assert!(v.check(&ir, &model));
        v.model_sha256 = "0".repeat(64);
        assert!(!v.check(&ir, &model));
    }
}

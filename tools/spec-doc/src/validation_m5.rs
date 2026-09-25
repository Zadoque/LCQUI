use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

pub const MODEL: &str = "specification/alloy/reagents/loss_found_quarantine_m5.als";
const EXPECTED: &[(&str, &str, &str, &str)] = &[
    ("M5-INV-001", "ExtravioPreservaFisico", "check", "UNSAT"),
    ("M5-INV-002", "ExtravioMarcaLocalizacao", "check", "UNSAT"),
    ("M5-INV-003", "ExtravioRevogaAutorizacao", "check", "UNSAT"),
    ("M5-INV-004", "ExtravioEncerraEmprestimo", "check", "UNSAT"),
    ("M5-INV-005", "ReencontroImponeQuarentena", "check", "UNSAT"),
    ("M5-INV-006", "ReencontroPreservaFisico", "check", "UNSAT"),
    (
        "M5-INV-007",
        "ReencontroRevogaAutorizacao",
        "check",
        "UNSAT",
    ),
    ("M5-INV-008", "QuebradoNaoDisponivel", "check", "UNSAT"),
    ("M5-INV-009", "FisicosImpedemLiberacao", "check", "UNSAT"),
    ("M5-INV-010", "DescartadoTerminal", "check", "UNSAT"),
    (
        "M5-INV-011",
        "QuarentenaNaoDescartaDireto",
        "check",
        "UNSAT",
    ),
    ("M5-INV-012", "SaldoNaoFabricado", "check", "UNSAT"),
    ("M5-WIT-013", "WitnessAberto", "run", "SAT"),
    ("M5-WIT-014", "WitnessFechado", "run", "SAT"),
    ("M5-WIT-015", "WitnessQuebradoCiclo", "run", "SAT"),
    ("M5-WIT-016", "WitnessExtravioEmprestimo", "run", "SAT"),
];
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM5 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<Resultado>,
}
impl ValidationM5 {
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
    use serde_json::Value;
    #[test]
    fn rejects_tampering() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let ir = std::fs::read(root.join("build/spec-ir.json")).unwrap();
        let model = std::fs::read(root.join(MODEL)).unwrap();
        let mut v: ValidationM5 = serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m5.json")).unwrap(),
        )
        .unwrap();
        assert!(v.check(&ir, &model));
        v.resultados[0].status = "SAT".into();
        assert!(!v.check(&ir, &model));
        let _: Value = serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m5.json")).unwrap(),
        )
        .unwrap();
    }
}

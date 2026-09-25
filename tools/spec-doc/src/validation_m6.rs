use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;
pub const MODEL: &str = "specification/alloy/reagents/metrology_resolution_m6.als";

#[allow(dead_code)]
pub fn q06_tolerance(peso_saida: f64, higroscopico: bool) -> f64 {
    if higroscopico {
        (2.0_f64).max(0.02 * peso_saida)
    } else {
        (1.0_f64).max(0.005 * peso_saida)
    }
}

#[allow(dead_code)]
pub fn q06_anomalia(peso_saida: f64, peso_retorno: f64, higroscopico: bool) -> bool {
    peso_retorno > peso_saida + q06_tolerance(peso_saida, higroscopico)
}

#[allow(dead_code)]
pub fn evaporacao_valida(peso_saida: f64, peso_retorno_efetivo: f64, evaporacao: f64) -> bool {
    evaporacao >= 0.0 && evaporacao <= (peso_saida - peso_retorno_efetivo).max(0.0)
}

#[allow(dead_code)]
pub fn massa_consumida(peso_saida: f64, peso_retorno_efetivo: f64, evaporacao: f64) -> Option<f64> {
    evaporacao_valida(peso_saida, peso_retorno_efetivo, evaporacao)
        .then(|| (peso_saida - peso_retorno_efetivo - evaporacao).max(0.0))
}
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
    ("M6-INV-007", "Q06ClassificacaoCoerente", "check", "UNSAT"),
    ("M6-WIT-008", "WitnessRepetirPesagem", "run", "SAT"),
    ("M6-WIT-009", "WitnessEsgotamento", "run", "SAT"),
    ("M6-WIT-010", "WitnessRecalibracao", "run", "SAT"),
    ("M6-WIT-011", "WitnessGanhoQ06", "run", "SAT"),
    ("M6-WIT-012", "WitnessRetornoDentroQ06", "run", "SAT"),
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

    #[test]
    fn validates_q06_and_evaporation_numeric_contracts() {
        assert!((q06_tolerance(100.0, false) - 1.0).abs() < f64::EPSILON);
        assert!((q06_tolerance(500.0, false) - 2.5).abs() < f64::EPSILON);
        assert!((q06_tolerance(100.0, true) - 2.0).abs() < f64::EPSILON);
        assert!(q06_anomalia(100.0, 102.0, false));
        assert!(!q06_anomalia(100.0, 101.0, false));
        assert!(!q06_anomalia(100.0, 102.0, true));
        assert!(evaporacao_valida(100.0, 95.0, 5.0));
        assert!(!evaporacao_valida(100.0, 95.0, 5.001));
        assert!(!evaporacao_valida(100.0, 105.0, 0.001));
        assert_eq!(massa_consumida(100.0, 95.0, 2.0), Some(3.0));
        assert_eq!(massa_consumida(100.0, 95.0, 5.001), None);
    }
}

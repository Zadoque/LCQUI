use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;
#[cfg(test)]
use serde_json::Value;
#[cfg(test)]
use sha2::{Digest, Sha256};
pub const MODEL: &str = "specification/alloy/operations/idempotency_m7.als";

/// Canonical JSON for the M7 operation identity contract. Object keys are
/// sorted recursively; arrays retain their input order and null remains an
/// explicit value.
#[cfg(test)]
pub fn canonicalize(value: &Value) -> String {
    match value {
        Value::Null => "null".to_owned(),
        Value::Bool(v) => v.to_string(),
        Value::Number(v) => v.to_string(),
        Value::String(v) => serde_json::to_string(v).expect("JSON string serializes"),
        Value::Array(values) => format!(
            "[{}]",
            values
                .iter()
                .map(canonicalize)
                .collect::<Vec<_>>()
                .join(",")
        ),
        Value::Object(values) => {
            let mut keys = values.keys().collect::<Vec<_>>();
            keys.sort();
            let fields = keys
                .into_iter()
                .map(|key| {
                    format!(
                        "{}:{}",
                        serde_json::to_string(key).expect("JSON key serializes"),
                        canonicalize(&values[key])
                    )
                })
                .collect::<Vec<_>>();
            format!("{{{}}}", fields.join(","))
        }
    }
}

#[cfg(test)]
pub fn payload_hash(tipo_operacao: &str, payload: &Value) -> String {
    let mut input = String::with_capacity(tipo_operacao.len() + 1 + payload.to_string().len());
    input.push_str(tipo_operacao);
    input.push('\n');
    input.push_str(&canonicalize(payload));
    format!("{:x}", Sha256::digest(input.as_bytes()))
}
const EXPECTED: &[(&str, &str, &str, &str)] = &[
    (
        "M7-INV-001",
        "IdentidadeUnicaNaoDuplicaEfeito",
        "check",
        "UNSAT",
    ),
    ("M7-INV-002", "RetryNaoReexecuta", "check", "UNSAT"),
    ("M7-INV-003", "ReusoIncompativelRejeitado", "check", "UNSAT"),
    ("M7-INV-004", "EventoDeduplicado", "check", "UNSAT"),
    ("M7-INV-005", "MaterializacaoSubstitutiva", "check", "UNSAT"),
    (
        "M7-INV-006",
        "TransicoesPreservamCoerencia",
        "check",
        "UNSAT",
    ),
    ("M7-WIT-007", "WitnessPrimeiraExecucao", "run", "SAT"),
    ("M7-WIT-008", "WitnessRetry", "run", "SAT"),
    ("M7-WIT-009", "WitnessEventoDuplicado", "run", "SAT"),
    ("M7-WIT-010", "WitnessMaterializacao", "run", "SAT"),
];
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM7 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<Resultado>,
}
impl ValidationM7 {
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
        let mut v: ValidationM7 = serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m7.json")).unwrap(),
        )
        .unwrap();
        assert!(v.check(&ir, &model));
        v.resultados.pop();
        assert!(!v.check(&ir, &model));
    }

    #[test]
    fn canonicalization_matches_m7_contract() {
        let first: Value = serde_json::from_str(r#"{"b":{"z":2,"a":1},"a":1}"#).unwrap();
        let second: Value = serde_json::from_str(r#"{"a":1,"b":{"a":1,"z":2}}"#).unwrap();
        assert_eq!(canonicalize(&first), canonicalize(&second));
        assert_eq!(
            payload_hash("RETIRADA", &first),
            payload_hash("RETIRADA", &second)
        );

        let ordered: Value = serde_json::from_str(r#"{"items":[1,2]}"#).unwrap();
        let reversed: Value = serde_json::from_str(r#"{"items":[2,1]}"#).unwrap();
        assert_ne!(
            payload_hash("RETIRADA", &ordered),
            payload_hash("RETIRADA", &reversed)
        );

        let absent: Value = serde_json::from_str(r#"{}"#).unwrap();
        let null: Value = serde_json::from_str(r#"{"x":null}"#).unwrap();
        assert_ne!(
            payload_hash("RETIRADA", &absent),
            payload_hash("RETIRADA", &null)
        );
        assert_eq!(
            payload_hash("RETIRADA", &absent),
            payload_hash("RETIRADA", &absent)
        );
        assert_eq!(
            payload_hash("RETIRADA", &first),
            payload_hash("RETIRADA", &first)
        );
        assert_ne!(
            payload_hash("DEVOLUCAO", &first),
            payload_hash("RETIRADA", &first)
        );
    }
}

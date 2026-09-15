use serde::Deserialize;
use sha2::{Digest, Sha256};

pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Validation {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub model: String,
    pub model_sha256: String,
    pub spec_ir_sha256: String,
    pub resultados: Vec<Result>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Result {
    pub id: String,
    pub assertion: String,
    pub tipo: String,
    pub scope: String,
    pub status: String,
}
impl Validation {
    pub fn check(&self, ir: &[u8], model: &[u8]) -> bool {
        let expected = [
            ("INV-FRASCO-001", "BloqueioFisico", "check", "UNSAT"),
            ("INV-EMPRESTIMO-001", "Unicidade", "check", "UNSAT"),
            ("WIT-RETIRADA-001", "Testemunha", "run", "SAT"),
            ("WIT-DISPONIBILIDADE-001", "DisponivelNaoApto", "run", "SAT"),
        ];
        self.versao == 1
            && self.alloy == "6.2.0"
            && self.solver == "sat4j"
            && self.spec_ir_sha256 == hash(ir)
            && self.model_sha256 == hash(model)
            && self.resultados.len() == expected.len()
            && self
                .resultados
                .iter()
                .zip(expected)
                .all(|(r, (id, name, kind, status))| {
                    r.id == id
                        && r.assertion == name
                        && r.tipo == kind
                        && r.status == status
                        && r.scope == format!("{kind} {name} for 4 but exactly 2 Estado")
                })
    }
}

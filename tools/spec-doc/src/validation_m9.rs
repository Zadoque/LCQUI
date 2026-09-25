use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

pub const MODEL: &str = "specification/alloy/operations/authorization_m9.als";

const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "M9-INV-001",
        "UsuarioInativoNuncaAutorizado",
        "check",
        "UNSAT",
        "check UsuarioInativoNuncaAutorizado for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-002",
        "PapelNaoPermitidoNaoAutoriza",
        "check",
        "UNSAT",
        "check PapelNaoPermitidoNaoAutoriza for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-003",
        "SemVinculoNecessarioNega",
        "check",
        "UNSAT",
        "check SemVinculoNecessarioNega for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-004",
        "OwnershipErradoNega",
        "check",
        "UNSAT",
        "check OwnershipErradoNega for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-005",
        "ClaimObsoletaNaoRestauraAutorizacao",
        "check",
        "UNSAT",
        "check ClaimObsoletaNaoRestauraAutorizacao for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-006",
        "VinculoRevogadoRemoveAutorizacao",
        "check",
        "UNSAT",
        "check VinculoRevogadoRemoveAutorizacao for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-007",
        "PapelRevogadoRemoveAutorizacao",
        "check",
        "UNSAT",
        "check PapelRevogadoRemoveAutorizacao for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-008",
        "DesativacaoRemoveAutorizacao",
        "check",
        "UNSAT",
        "check DesativacaoRemoveAutorizacao for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-009",
        "RevogadoAntesDoCommitNaoPodeCommitar",
        "check",
        "UNSAT",
        "check RevogadoAntesDoCommitNaoPodeCommitar for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-010",
        "AutorizacaoNaoBypassaDominio",
        "check",
        "UNSAT",
        "check AutorizacaoNaoBypassaDominio for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-011",
        "ChefeNaoBypassaDominio",
        "check",
        "UNSAT",
        "check ChefeNaoBypassaDominio for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-012",
        "ServerOwnedNuncaEscritaCliente",
        "check",
        "UNSAT",
        "check ServerOwnedNuncaEscritaCliente for 8 but exactly 2 Escopo",
    ),
    (
        "M9-INV-013",
        "RevalidacaoNoCommitPermiteSomenteAtual",
        "check",
        "UNSAT",
        "check RevalidacaoNoCommitPermiteSomenteAtual for 8 but exactly 2 Escopo",
    ),
    (
        "M9-WIT-014",
        "WitnessChefeGerenciaUsuario",
        "run",
        "SAT",
        "run WitnessChefeGerenciaUsuario for 8 but exactly 2 Escopo",
    ),
    (
        "M9-WIT-015",
        "WitnessGestorNoEscopo",
        "run",
        "SAT",
        "run WitnessGestorNoEscopo for 8 but exactly 2 Escopo",
    ),
    (
        "M9-WIT-016",
        "WitnessProfessorProprio",
        "run",
        "SAT",
        "run WitnessProfessorProprio for 8 but exactly 2 Escopo",
    ),
    (
        "M9-WIT-017",
        "WitnessVersaoCorrente",
        "run",
        "SAT",
        "run WitnessVersaoCorrente for 8 but exactly 2 Escopo",
    ),
    (
        "M9-WIT-018",
        "WitnessClaimAntigaAposRevogacao",
        "run",
        "SAT",
        "run WitnessClaimAntigaAposRevogacao for 8 but exactly 2 Escopo, exactly 2 Estado",
    ),
    (
        "M9-WIT-019",
        "WitnessCommitPermitidoSemRevogacao",
        "run",
        "SAT",
        "run WitnessCommitPermitidoSemRevogacao for 8 but exactly 2 Escopo",
    ),
    (
        "M9-WIT-020",
        "WitnessNegacaoPorEscopo",
        "run",
        "SAT",
        "run WitnessNegacaoPorEscopo for 8 but exactly 2 Escopo",
    ),
    (
        "M9-WIT-021",
        "WitnessNegacaoPorOwnership",
        "run",
        "SAT",
        "run WitnessNegacaoPorOwnership for 8 but exactly 2 Escopo",
    ),
    (
        "M9-WIT-022",
        "WitnessChefeDominioInvalidoNaoComita",
        "run",
        "SAT",
        "run WitnessChefeDominioInvalidoNaoComita for 8 but exactly 2 Escopo",
    ),
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM9 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<Resultado>,
}

impl ValidationM9 {
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
                .all(|(r, (id, n, k, s, scope))| {
                    r.id == *id
                        && r.assertion == *n
                        && r.tipo == *k
                        && r.status == *s
                        && r.scope == *scope
                })
    }
}

/// Decisão determinística auxiliar: uma claim/versionamento só participa como
/// versão corrente; ela não substitui papel, escopo e ownership persistidos.
#[allow(dead_code)]
pub fn pode_executar_atual(
    ativo: bool,
    claim_versao: i64,
    versao_persistida: i64,
    papel_permitido: bool,
    escopo_ok: bool,
    ownership_ok: bool,
    server_owned: bool,
) -> bool {
    ativo
        && claim_versao >= 0
        && versao_persistida >= 0
        && claim_versao == versao_persistida
        && papel_permitido
        && escopo_ok
        && ownership_ok
        && !server_owned
}

#[allow(dead_code)]
pub fn pode_commit_atual(autorizado: bool, precondicao_dominio: bool) -> bool {
    autorizado && precondicao_dominio
}

#[cfg(test)]
mod tests {
    use super::*;

    fn receipt() -> ValidationM9 {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m9.json")).unwrap(),
        )
        .unwrap()
    }
    fn ir() -> Vec<u8> {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        std::fs::read(root.join("build/spec-ir.json")).unwrap()
    }
    fn model() -> Vec<u8> {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        std::fs::read(root.join(MODEL)).unwrap()
    }

    #[test]
    fn accepts_real_receipt_and_rejects_all_required_tampering() {
        let ir = ir();
        let model = model();
        assert!(receipt().check(&ir, &model));
        let mut t = receipt();
        t.spec_ir_sha256 = "0".repeat(64);
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.model_sha256 = "0".repeat(64);
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.model = "specification/alloy/operations/idempotency_m7.als".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados.pop();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados.push(Resultado {
            id: "M9-X".into(),
            assertion: "X".into(),
            tipo: "check".into(),
            scope: "check X for 8".into(),
            status: "UNSAT".into(),
        });
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        let first = t.resultados[0].id.clone();
        t.resultados[1].id = first;
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados[0].tipo = "run".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados[0].status = "SAT".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados[0].scope = "check UsuarioInativoNuncaAutorizado for 7".into();
        assert!(!t.check(&ir, &model));
    }

    #[test]
    fn authorization_fails_closed_and_domain_remains_separate() {
        assert!(pode_executar_atual(true, 3, 3, true, true, true, false));
        assert!(!pode_executar_atual(false, 3, 3, true, true, true, false));
        assert!(!pode_executar_atual(true, 2, 3, true, true, true, false));
        assert!(!pode_executar_atual(true, 3, 3, true, false, true, false));
        assert!(!pode_executar_atual(true, 3, 3, true, true, false, false));
        assert!(!pode_executar_atual(true, 3, 3, true, true, true, true));
        assert!(pode_commit_atual(true, true));
        assert!(!pode_commit_atual(true, false));
    }
}

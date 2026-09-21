use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

pub const MODEL: &str = "specification/alloy/reagents/bottle_composition.als";
pub const ORIGINS: [&str; 3] = [
    "specification/alloy/reagents/withdrawal.als",
    "specification/alloy/reagents/bottle_identity.als",
    "specification/alloy/reagents/bottle_state.als",
];
// Contrato fechado: não inferir IDs/tipos/scopes a partir da evidência recebida.
const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "COMP-M2-RETIRADA-COERENCIA-001",
        "RetiradaCoerente",
        "check",
        "check RetiradaCoerente for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-RETIRADA-QUARENTENA-001",
        "QuarentenaBloqueia",
        "check",
        "check QuarentenaBloqueia for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-RETIRADA-DESCARTE-001",
        "DescarteTecnicoBloqueia",
        "check",
        "check DescarteTecnicoBloqueia for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-RETIRADA-TERMINAL-001",
        "TerminaisBloqueiam",
        "check",
        "check TerminaisBloqueiam for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-QUEBRA-ATIVO-001",
        "QuebraSemAtivo",
        "check",
        "check QuebraSemAtivo for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-DESCARTE-ATIVO-001",
        "DescarteSemAtivo",
        "check",
        "check DescarteSemAtivo for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-QUARENTENA-ATIVO-001",
        "ResolucaoSemAtivo",
        "check",
        "check ResolucaoSemAtivo for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-EXTRAVIO-COERENCIA-001",
        "ExtravioCoerente",
        "check",
        "check ExtravioCoerente for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-ESGOTAMENTO-COERENCIA-001",
        "EsgotamentoCoerente",
        "check",
        "check EsgotamentoCoerente for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-TRANSICOES-COERENCIA-001",
        "TodasCoerentes",
        "check",
        "check TodasCoerentes for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-ENCERRAMENTO-ALVO-001",
        "EncerraSomenteAlvo",
        "check",
        "check EncerraSomenteAlvo for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-FRAME-OUTROS-001",
        "NaoInterfereOutros",
        "check",
        "check NaoInterfereOutros for 4 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-COERENCIA-001",
        "EstadoHabitavel",
        "run",
        "run EstadoHabitavel for 4 but exactly 2 EstadoIntegrado",
        "SAT",
    ),
    (
        "COMP-M2-RETIRADA-001",
        "RetiradaHabitavel",
        "run",
        "run RetiradaHabitavel for 4 but exactly 2 EstadoIntegrado",
        "SAT",
    ),
    (
        "COMP-M2-IDENTIDADE-ESTADO-001",
        "IdentidadeEstado",
        "run",
        "run IdentidadeEstado for 4 but exactly 2 EstadoIntegrado",
        "SAT",
    ),
    (
        "COMP-M2-EXTRAVIO-COM-ATIVO-001",
        "ExtravioComAtivo",
        "run",
        "run ExtravioComAtivo for 4 but exactly 2 EstadoIntegrado",
        "SAT",
    ),
    (
        "COMP-M2-EXTRAVIO-SEM-ATIVO-001",
        "ExtravioSemAtivo",
        "run",
        "run ExtravioSemAtivo for 4 but exactly 2 EstadoIntegrado",
        "SAT",
    ),
    (
        "COMP-M2-ESGOTAMENTO-COM-ATIVO-001",
        "EsgotamentoComAtivo",
        "run",
        "run EsgotamentoComAtivo for 4 but exactly 2 EstadoIntegrado",
        "SAT",
    ),
    (
        "COMP-M2-ESGOTAMENTO-SEM-ATIVO-001",
        "EsgotamentoSemAtivo",
        "run",
        "run EsgotamentoSemAtivo for 4 but exactly 2 EstadoIntegrado",
        "SAT",
    ),
    (
        "COMP-M2-QUEBRA-001",
        "QuebraHabitavel",
        "run",
        "run QuebraHabitavel for 4 but exactly 2 EstadoIntegrado",
        "SAT",
    ),
    (
        "COMP-M2-DESCARTE-001",
        "DescarteHabitavel",
        "run",
        "run DescarteHabitavel for 4 but exactly 2 EstadoIntegrado",
        "SAT",
    ),
    (
        "COMP-M2-QUARENTENA-001",
        "ResolucaoHabitavel",
        "run",
        "run ResolucaoHabitavel for 4 but exactly 2 EstadoIntegrado",
        "SAT",
    ),
    (
        "COMP-M2-RETIRADA-COERENCIA-006",
        "RetiradaCoerenteAmpliado",
        "check",
        "check RetiradaCoerenteAmpliado for 6 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-RETIRADA-QUARENTENA-006",
        "QuarentenaBloqueiaAmpliado",
        "check",
        "check QuarentenaBloqueiaAmpliado for 6 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-EXTRAVIO-COERENCIA-006",
        "ExtravioCoerenteAmpliado",
        "check",
        "check ExtravioCoerenteAmpliado for 6 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-ESGOTAMENTO-COERENCIA-006",
        "EsgotamentoCoerenteAmpliado",
        "check",
        "check EsgotamentoCoerenteAmpliado for 6 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-FRAME-OUTROS-006",
        "NaoInterfereOutrosAmpliado",
        "check",
        "check NaoInterfereOutrosAmpliado for 6 but exactly 2 EstadoIntegrado",
        "UNSAT",
    ),
    (
        "COMP-M2-IDENTIDADE-ESTADO-006",
        "IdentidadeEstadoAmpliado",
        "run",
        "run IdentidadeEstadoAmpliado for 6 but exactly 2 EstadoIntegrado",
        "SAT",
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
pub struct ValidationM24 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub origens: Vec<Origin>,
    pub resultados: Vec<Resultado>,
}
impl ValidationM24 {
    pub fn check(&self, ir: &[u8], model: &[u8], origins: [&[u8]; 3]) -> bool {
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
        let origins = ORIGINS.map(|p| std::fs::read(root.join(p)).unwrap());
        let original: Value = serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m24.json")).unwrap(),
        )
        .unwrap();
        let valid = |value: Value| {
            serde_json::from_value::<ValidationM24>(value)
                .is_ok_and(|v| v.check(&ir, &model, [&origins[0], &origins[1], &origins[2]]))
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
            ("/resultados/12/status", json!("UNSAT")),
            ("/resultados/0/scope", json!("check RetiradaCoerente for 1")),
            ("/resultados/0/id", json!("unexpected")),
            ("/resultados/0/assertion", json!("unexpected")),
            ("/resultados/0/tipo", json!("run")),
            ("/origens/0/model", json!("unexpected")),
            ("/origens/0/model_sha256", json!("0".repeat(64))),
            ("/origens/1/model_sha256", json!("0".repeat(64))),
            ("/origens/2/model_sha256", json!("0".repeat(64))),
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
        let v: ValidationM24 = serde_json::from_value(original).unwrap();
        assert!(!v.check(
            b"changed IR",
            &model,
            [&origins[0], &origins[1], &origins[2]]
        ));
        assert!(!v.check(
            &ir,
            b"changed model",
            [&origins[0], &origins[1], &origins[2]]
        ));
    }
}

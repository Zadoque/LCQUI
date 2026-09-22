use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

pub const MODEL: &str = "specification/alloy/reagents/withdrawal_return.als";
pub const ORIGINS: [&str; 2] = [
    "specification/alloy/reagents/bottle_composition.als",
    "specification/alloy/reagents/loan_state.als",
];
// Contrato fechado: IDs, nomes, tipos, escopos e status exatos, na ordem da
// evidência. Não inferir nem aceitar subconjuntos.
const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "INV-M4-RETIRADA-APTA-001",
        "RetiradaApta",
        "check",
        "check RetiradaApta for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-RETIRADA-ATIVO-001",
        "RetiradaCriaAtivo",
        "check",
        "check RetiradaCriaAtivo for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-RETIRADA-DISPONIBILIDADE-001",
        "RetiradaEmprestado",
        "check",
        "check RetiradaEmprestado for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-RETIRADA-QUARENTENA-001",
        "QuarentenaBloqueiaRetirada",
        "check",
        "check QuarentenaBloqueiaRetirada for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-RETIRADA-DESCARTE-001",
        "DescarteBloqueiaRetirada",
        "check",
        "check DescarteBloqueiaRetirada for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-RETIRADA-VENCIDO-001",
        "VencidoSemAutorizacaoBloqueia",
        "check",
        "check VencidoSemAutorizacaoBloqueia for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-RETIRADA-ABERTURA-001",
        "AberturaNaRetirada",
        "check",
        "check AberturaNaRetirada for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-RETIRADA-FRAME-001",
        "RetiradaNaoInterfere",
        "check",
        "check RetiradaNaoInterfere for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "FRAME-M4-RETIRADA-STATUS-001",
        "RetiradaNaoInterfereStatus",
        "check",
        "check RetiradaNaoInterfereStatus for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-DEVOLUCAO-ATIVO-001",
        "DevolucaoExigeAtivo",
        "check",
        "check DevolucaoExigeAtivo for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-DEVOLUCAO-CUSTODIA-001",
        "DevolucaoEncerraCustodia",
        "check",
        "check DevolucaoEncerraCustodia for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-DEVOLUCAO-NORMAL-001",
        "DevolucaoNormal",
        "check",
        "check DevolucaoNormal for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-DEVOLUCAO-ATRASO-001",
        "DevolucaoAtraso",
        "check",
        "check DevolucaoAtraso for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-DEVOLUCAO-ANOMALIA-001",
        "DevolucaoAnomalia",
        "check",
        "check DevolucaoAnomalia for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-ANOMALIA-PRECEDENCIA-001",
        "AnomaliaPrecedeAtraso",
        "check",
        "check AnomaliaPrecedeAtraso for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-ANOMALIA-RETENCAO-001",
        "AnomaliaRetem",
        "check",
        "check AnomaliaRetem for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-ESGOTAMENTO-001",
        "EsgotamentoVazio",
        "check",
        "check EsgotamentoVazio for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-DESTINO-QUARENTENA-001",
        "DestinoQuarentena",
        "check",
        "check DestinoQuarentena for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-DESTINO-DISPONIVEL-001",
        "DestinoDisponivel",
        "check",
        "check DestinoDisponivel for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-DESTINO-DESCARTE-001",
        "DestinoDescarte",
        "check",
        "check DestinoDescarte for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-DEVOLUCAO-FRAME-001",
        "DevolucaoNaoInterfere",
        "check",
        "check DevolucaoNaoInterfere for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "FRAME-M4-DEVOLUCAO-STATUS-001",
        "DevolucaoNaoInterfereStatus",
        "check",
        "check DevolucaoNaoInterfereStatus for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-COERENCIA-001",
        "OperacoesPreservamCoerencia",
        "check",
        "check OperacoesPreservamCoerencia for 4 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "WIT-M4-RETIRADA-ABERTO-001",
        "RetiradaAberto",
        "run",
        "run RetiradaAberto for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-RETIRADA-FECHADO-001",
        "RetiradaFechado",
        "run",
        "run RetiradaFechado for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-RETIRADA-ABERTURA-001",
        "RetiradaAbertura",
        "run",
        "run RetiradaAbertura for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-RETIRADA-EXCEPCIONAL-001",
        "RetiradaExcepcional",
        "run",
        "run RetiradaExcepcional for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-DEVOLUCAO-NORMAL-001",
        "DevolucaoNormalHabitavel",
        "run",
        "run DevolucaoNormalHabitavel for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-DEVOLUCAO-ATRASADA-001",
        "DevolucaoAtrasadaHabitavel",
        "run",
        "run DevolucaoAtrasadaHabitavel for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-DEVOLUCAO-ANOMALA-001",
        "DevolucaoAnomalaHabitavel",
        "run",
        "run DevolucaoAnomalaHabitavel for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-DEVOLUCAO-VAZIO-001",
        "DevolucaoVazioHabitavel",
        "run",
        "run DevolucaoVazioHabitavel for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-DEVOLUCAO-ANOMALIA-ATRASO-001",
        "DevolucaoAnomaliaAtraso",
        "run",
        "run DevolucaoAnomaliaAtraso for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-DEVOLUCAO-ANOMALIA-VAZIO-001",
        "DevolucaoAnomaliaVazio",
        "run",
        "run DevolucaoAnomaliaVazio for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-DEVOLUCAO-VENCIDO-QUARENTENA-001",
        "DevolucaoVencidoQuarentena",
        "run",
        "run DevolucaoVencidoQuarentena for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-DEVOLUCAO-VENCIDO-DISPONIVEL-001",
        "DevolucaoVencidoDisponivel",
        "run",
        "run DevolucaoVencidoDisponivel for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-DEVOLUCAO-VENCIDO-DESCARTE-001",
        "DevolucaoVencidoDescarte",
        "run",
        "run DevolucaoVencidoDescarte for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-DOIS-FRASCOS-001",
        "DoisFrascosAtivos",
        "run",
        "run DoisFrascosAtivos for 4 but exactly 2 Estado",
        "SAT",
    ),
    (
        "WIT-M4-CICLO-001",
        "CicloCompleto",
        "run",
        "run CicloCompleto for 5 but exactly 3 Estado",
        "SAT",
    ),
    (
        "INV-M4-RETIRADA-ATIVO-006",
        "RetiradaCriaAtivoAmpliado",
        "check",
        "check RetiradaCriaAtivoAmpliado for 6 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-RETIRADA-QUARENTENA-006",
        "QuarentenaBloqueiaRetiradaAmpliado",
        "check",
        "check QuarentenaBloqueiaRetiradaAmpliado for 6 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-DEVOLUCAO-FRAME-006",
        "DevolucaoNaoInterfereAmpliado",
        "check",
        "check DevolucaoNaoInterfereAmpliado for 6 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "INV-M4-COERENCIA-006",
        "OperacoesPreservamCoerenciaAmpliado",
        "check",
        "check OperacoesPreservamCoerenciaAmpliado for 6 but exactly 2 Estado",
        "UNSAT",
    ),
    (
        "WIT-M4-CICLO-006",
        "CicloCompletoAmpliado",
        "run",
        "run CicloCompletoAmpliado for 6 but exactly 3 Estado",
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
pub struct ValidationM4 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub origens: Vec<Origin>,
    pub resultados: Vec<Resultado>,
}
impl ValidationM4 {
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
            &std::fs::read(root.join("build/formal-validation-m4.json")).unwrap(),
        )
        .unwrap();
        let valid = |value: Value| {
            serde_json::from_value::<ValidationM4>(value)
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
            ("/resultados/23/status", json!("UNSAT")),
            ("/resultados/0/scope", json!("check RetiradaApta for 1")),
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
        let v: ValidationM4 = serde_json::from_value(original).unwrap();
        assert!(!v.check(b"changed IR", &model, [&origins[0], &origins[1]]));
        assert!(!v.check(&ir, b"changed model", [&origins[0], &origins[1]]));
    }
}

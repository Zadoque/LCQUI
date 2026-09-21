use crate::validation::hash;
use serde::Deserialize;

// Contrato exato da evidência Alloy M2.2. Independente do arquivo de evidência:
// alterar o JSON sem atualizar este contrato é rejeitado.
pub type M2Resultado = (&'static str, &'static str, &'static str, &'static str);
pub const M2_MODELOS: [(&str, &str, &[M2Resultado]); 2] = [
    (
        "specification/alloy/reagents/bottle_identity.als",
        "for 4",
        &[
            ("IDENTIDADE-001", "IdentidadeUnica", "check", "UNSAT"),
            ("IDENTIDADE-002", "ViaLoteResolveLote", "check", "UNSAT"),
            ("IDENTIDADE-003", "ViaDiretaResolveDireta", "check", "UNSAT"),
            ("IDENTIDADE-004", "RotasNaoCoexistem", "check", "UNSAT"),
            (
                "IDENTIDADE-005",
                "SemRotaSemEspecificacao",
                "check",
                "UNSAT",
            ),
            ("WIT-IDENTIDADE-LOTE-001", "ViaLoteValido", "run", "SAT"),
            ("WIT-IDENTIDADE-DIRETA-001", "ViaDiretaValida", "run", "SAT"),
            (
                "WIT-IDENTIDADE-ROTADUPLA-001",
                "RotaDuplaIncoerente",
                "run",
                "SAT",
            ),
            ("WIT-IDENTIDADE-SQL-001", "RotaDuplaSobSql", "run", "SAT"),
            (
                "WIT-IDENTIDADE-SEMROTA-001",
                "SemRotaIncoerente",
                "run",
                "SAT",
            ),
        ],
    ),
    (
        "specification/alloy/reagents/bottle_state.als",
        "for 4 but exactly 2 Estado",
        &[
            (
                "INV-M2-COERENCIA-001",
                "TransicoesPreservamCoerencia",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-DESCARTADO-TERMINAL-001",
                "DescartadoEhTerminal",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-DESCARTADO-EXTRAVIO-001",
                "DescartadoNaoExtravia",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-DESCARTADO-QUEBRA-001",
                "DescartadoNaoQuebra",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-DESCARTADO-REDESCARTE-001",
                "DescartadoNaoDescartaNovamente",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-DESCARTADO-ESGOTAMENTO-001",
                "DescartadoNaoEsgota",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-EXTRAVIO-001",
                "ExtravioIndisponivel",
                "check",
                "UNSAT",
            ),
            (
                "FRAME-M2-EXTRAVIO-SALDO-001",
                "ExtravioPreservaSaldo",
                "check",
                "UNSAT",
            ),
            (
                "FRAME-M2-EXTRAVIO-FLAG-001",
                "ExtravioPreservaFlag",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-EXTRAVIO-REP-001",
                "ExtravioNaoRepetido",
                "check",
                "UNSAT",
            ),
            (
                "FRAME-M2-EXTRAVIO-VALIDADE-001",
                "ExtravioPreservaValidade",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-TERMINAL-QUEBRA-IND-001",
                "QuebraIndisponivel",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-QUEBRA-EMPRESTIMO-001",
                "QuebraNaoEmprestado",
                "check",
                "UNSAT",
            ),
            (
                "FRAME-M2-QUEBRA-INTERF-001",
                "QuebraNaoInterfereValidade",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-TERMINAL-DESCARTE-IND-001",
                "DescarteIndisponivel",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-TERMINAL-DESCARTE-001",
                "DescarteSaldoConhecido",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-DESCARTE-FISICO-001",
                "DescarteFisicoDescartado",
                "check",
                "UNSAT",
            ),
            (
                "FRAME-M2-DESCARTE-VALIDADE-001",
                "DescartePreservaValidade",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-DESCARTE-EMPRESTIMO-001",
                "NaoDescarteEmprestado",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-DESCARTE-USOVENCIDO-001",
                "UsoVencidoNaoHabilitaDescarte",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-TERMINAL-ESGOTAMENTO-IND-001",
                "EsgotamentoIndisponivel",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-TERMINAL-QUEBRA-001",
                "QuebraSaldoConhecido",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-TERMINAL-ESGOTAMENTO-001",
                "EsgotamentoSaldoConhecido",
                "check",
                "UNSAT",
            ),
            (
                "FRAME-M2-ESGOTAMENTO-INTERF-001",
                "EsgotamentoNaoInterfereValidade",
                "check",
                "UNSAT",
            ),
            (
                "INV-M2-ABERTURA-001",
                "TransicoesPreservamFlag",
                "check",
                "UNSAT",
            ),
            ("WIT-M2-EXTRAVIO-001", "TestemunhaExtravio", "run", "SAT"),
            ("WIT-M2-QUEBRA-001", "TestemunhaQuebra", "run", "SAT"),
            ("WIT-M2-DESCARTE-001", "TestemunhaDescarte", "run", "SAT"),
            (
                "WIT-M2-DESCARTE-VAZIO-001",
                "TestemunhaDescarteVazio",
                "run",
                "SAT",
            ),
            (
                "WIT-M2-DESCARTE-QUEBRADO-001",
                "TestemunhaDescarteQuebrado",
                "run",
                "SAT",
            ),
            (
                "WIT-M2-DESCARTE-VENCIDO-ABERTO-001",
                "TestemunhaDescarteVencidoAberto",
                "run",
                "SAT",
            ),
            (
                "WIT-M2-DESCARTE-VENCIDO-FECHADO-001",
                "TestemunhaDescarteVencidoFechado",
                "run",
                "SAT",
            ),
            (
                "WIT-M2-ESGOTAMENTO-001",
                "TestemunhaEsgotamento",
                "run",
                "SAT",
            ),
            (
                "WIT-M2-USOVENCIDO-001",
                "TestemunhaVencidoComUsoAutorizado",
                "run",
                "SAT",
            ),
        ],
    ),
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM2 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub modelos: Vec<ModeloM2>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModeloM2 {
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<ResultadoM2>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ResultadoM2 {
    pub id: String,
    pub assertion: String,
    pub tipo: String,
    pub scope: String,
    pub status: String,
}
impl ValidationM2 {
    pub fn check(&self, ir_raw: &[u8], identity: &[u8], state: &[u8]) -> bool {
        if self.versao != 1
            || self.alloy != "6.2.0"
            || self.solver != "sat4j"
            || self.spec_ir_sha256 != hash(ir_raw)
            || self.modelos.len() != M2_MODELOS.len()
        {
            return false;
        }
        let bytes = [identity, state];
        for (i, (path, suffix, expected)) in M2_MODELOS.iter().enumerate() {
            let m = &self.modelos[i];
            if m.model != *path || m.model_sha256 != hash(bytes[i]) {
                return false;
            }
            if m.resultados.len() != expected.len() {
                return false;
            }
            for (r, (id, name, tipo, status)) in m.resultados.iter().zip(expected.iter()) {
                if r.id != *id
                    || r.assertion != *name
                    || r.tipo != *tipo
                    || r.status != *status
                    || r.scope != format!("{tipo} {name} {suffix}")
                {
                    return false;
                }
            }
        }
        true
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    fn load() -> (ValidationM2, Vec<u8>, Vec<u8>, Vec<u8>) {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let ir = std::fs::read(root.join("build/spec-ir.json")).unwrap();
        let raw = std::fs::read(root.join("build/formal-validation-m2.json")).unwrap();
        let v: ValidationM2 = serde_json::from_slice(&raw).unwrap();
        let identity =
            std::fs::read(root.join("specification/alloy/reagents/bottle_identity.als")).unwrap();
        let state =
            std::fs::read(root.join("specification/alloy/reagents/bottle_state.als")).unwrap();
        (v, ir, identity, state)
    }
    #[test]
    fn accepts_real_evidence_and_rejects_tampering() {
        let (v, ir, identity, state) = load();
        assert!(v.check(&ir, &identity, &state));

        assert!(!v.check(b"{}", &identity, &state));

        let (mut v, _, _, _) = load();
        v.modelos[0].model_sha256 = "0".repeat(64);
        assert!(!v.check(&ir, &identity, &state));
        let (mut v, _, _, _) = load();
        v.modelos[1].model_sha256 = "0".repeat(64);
        assert!(!v.check(&ir, &identity, &state));

        let (mut v, _, _, _) = load();
        v.modelos[0].resultados[0].status = "SAT".into();
        assert!(!v.check(&ir, &identity, &state));

        let (mut v, _, _, _) = load();
        v.modelos[1].resultados[0].scope = "check X for 4".into();
        assert!(!v.check(&ir, &identity, &state));

        let (mut v, _, _, _) = load();
        v.modelos[1].resultados.pop();
        assert!(!v.check(&ir, &identity, &state));

        let (mut v, _, _, _) = load();
        let extra = v.modelos[1].resultados[0].assertion.clone();
        v.modelos[1].resultados.push(ResultadoM2 {
            id: "X".into(),
            assertion: extra,
            tipo: "check".into(),
            scope: "check X for 4 but exactly 2 Estado".into(),
            status: "UNSAT".into(),
        });
        assert!(!v.check(&ir, &identity, &state));

        let (mut v, _, _, _) = load();
        v.modelos.pop();
        assert!(!v.check(&ir, &identity, &state));

        let (mut v, _, _, _) = load();
        v.modelos[1].model = "specification/alloy/reagents/withdrawal.als".into();
        assert!(!v.check(&ir, &identity, &state));

        let (mut v, _, _, _) = load();
        v.solver = "other".into();
        assert!(!v.check(&ir, &identity, &state));

        let (mut v, _, _, _) = load();
        v.spec_ir_sha256 = "0".repeat(64);
        assert!(!v.check(&ir, &identity, &state));

        let (mut v, _, _, _) = load();
        v.modelos.clear();
        assert!(!v.check(&ir, &identity, &state));

        let (mut v, _, _, _) = load();
        v.modelos[1].resultados.clear();
        assert!(!v.check(&ir, &identity, &state));
    }
}

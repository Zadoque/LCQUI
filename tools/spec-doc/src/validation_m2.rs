use crate::validation::hash;
use serde::Deserialize;

// Contrato exato da evidência Alloy M2.2 (ids, tipos, status e escopos).
// Independente do arquivo de evidência: alterar o JSON sem atualizar este
// contrato é rejeitado.
pub type M2Resultado = (
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    &'static str,
);
pub const M2_MODELOS: [(&str, &[M2Resultado]); 2] = [
    (
        "specification/alloy/reagents/bottle_identity.als",
        &[
            (
                "IDENTIDADE-001",
                "IdentidadeUnica",
                "check",
                "UNSAT",
                "check IdentidadeUnica for 4",
            ),
            (
                "IDENTIDADE-002",
                "ViaLoteResolveLote",
                "check",
                "UNSAT",
                "check ViaLoteResolveLote for 4",
            ),
            (
                "IDENTIDADE-003",
                "ViaDiretaResolveDireta",
                "check",
                "UNSAT",
                "check ViaDiretaResolveDireta for 4",
            ),
            (
                "IDENTIDADE-004",
                "RotasNaoCoexistem",
                "check",
                "UNSAT",
                "check RotasNaoCoexistem for 4",
            ),
            (
                "IDENTIDADE-005",
                "SemRotaSemEspecificacao",
                "check",
                "UNSAT",
                "check SemRotaSemEspecificacao for 4",
            ),
            (
                "WIT-IDENTIDADE-LOTE-001",
                "ViaLoteValido",
                "run",
                "SAT",
                "run ViaLoteValido for 4",
            ),
            (
                "WIT-IDENTIDADE-DIRETA-001",
                "ViaDiretaValida",
                "run",
                "SAT",
                "run ViaDiretaValida for 4",
            ),
            (
                "WIT-IDENTIDADE-ROTADUPLA-001",
                "RotaDuplaIncoerente",
                "run",
                "SAT",
                "run RotaDuplaIncoerente for 4",
            ),
            (
                "WIT-IDENTIDADE-SQL-001",
                "RotaDuplaSobSql",
                "run",
                "SAT",
                "run RotaDuplaSobSql for 4",
            ),
            (
                "WIT-IDENTIDADE-SEMROTA-001",
                "SemRotaIncoerente",
                "run",
                "SAT",
                "run SemRotaIncoerente for 4",
            ),
        ],
    ),
    (
        "specification/alloy/reagents/bottle_state.als",
        &[
            (
                "INV-M2-COERENCIA-001",
                "TransicoesPreservamCoerencia",
                "check",
                "UNSAT",
                "check TransicoesPreservamCoerencia for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-DESCARTADO-TERMINAL-001",
                "DescartadoEhTerminal",
                "check",
                "UNSAT",
                "check DescartadoEhTerminal for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-DESCARTADO-EXTRAVIO-001",
                "DescartadoNaoExtravia",
                "check",
                "UNSAT",
                "check DescartadoNaoExtravia for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-DESCARTADO-QUEBRA-001",
                "DescartadoNaoQuebra",
                "check",
                "UNSAT",
                "check DescartadoNaoQuebra for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-DESCARTADO-REDESCARTE-001",
                "DescartadoNaoDescartaNovamente",
                "check",
                "UNSAT",
                "check DescartadoNaoDescartaNovamente for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-DESCARTADO-ESGOTAMENTO-001",
                "DescartadoNaoEsgota",
                "check",
                "UNSAT",
                "check DescartadoNaoEsgota for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-DESCARTADO-QUARENTENA-001",
                "DescartadoNaoResolveQuarentena",
                "check",
                "UNSAT",
                "check DescartadoNaoResolveQuarentena for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-QUARENTENA-DESCARTE-001",
                "QuarentenaNaoDescartaDireto",
                "check",
                "UNSAT",
                "check QuarentenaNaoDescartaDireto for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-EXTRAVIO-001",
                "ExtravioIndisponivel",
                "check",
                "UNSAT",
                "check ExtravioIndisponivel for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-EXTRAVIO-SALDO-001",
                "ExtravioPreservaSaldo",
                "check",
                "UNSAT",
                "check ExtravioPreservaSaldo for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-EXTRAVIO-FLAG-001",
                "ExtravioPreservaFlag",
                "check",
                "UNSAT",
                "check ExtravioPreservaFlag for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-EXTRAVIO-REP-001",
                "ExtravioNaoRepetido",
                "check",
                "UNSAT",
                "check ExtravioNaoRepetido for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-EXTRAVIO-VALIDADE-001",
                "ExtravioPreservaValidade",
                "check",
                "UNSAT",
                "check ExtravioPreservaValidade for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-TERMINAL-QUEBRA-IND-001",
                "QuebraIndisponivel",
                "check",
                "UNSAT",
                "check QuebraIndisponivel for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-QUEBRA-EMPRESTIMO-001",
                "QuebraNaoEmprestado",
                "check",
                "UNSAT",
                "check QuebraNaoEmprestado for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-QUEBRA-INTERF-001",
                "QuebraNaoInterfereValidade",
                "check",
                "UNSAT",
                "check QuebraNaoInterfereValidade for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-TERMINAL-DESCARTE-IND-001",
                "DescarteIndisponivel",
                "check",
                "UNSAT",
                "check DescarteIndisponivel for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-DESCARTE-CONHECIMENTO-001",
                "DescartePreservaConhecimentoMetrologico",
                "check",
                "UNSAT",
                "check DescartePreservaConhecimentoMetrologico for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-DESCARTE-FISICO-001",
                "DescarteFisicoDescartado",
                "check",
                "UNSAT",
                "check DescarteFisicoDescartado for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-DESCARTE-VALIDADE-001",
                "DescartePreservaValidade",
                "check",
                "UNSAT",
                "check DescartePreservaValidade for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-DESCARTE-AUTORIZACAO-001",
                "DescarteConsomeAutorizacao",
                "check",
                "UNSAT",
                "check DescarteConsomeAutorizacao for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-DESCARTE-EMPRESTIMO-001",
                "NaoDescarteEmprestado",
                "check",
                "UNSAT",
                "check NaoDescarteEmprestado for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-DESCARTE-USOVENCIDO-001",
                "UsoVencidoNaoHabilitaDescarte",
                "check",
                "UNSAT",
                "check UsoVencidoNaoHabilitaDescarte for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-TERMINAL-ESGOTAMENTO-IND-001",
                "EsgotamentoIndisponivel",
                "check",
                "UNSAT",
                "check EsgotamentoIndisponivel for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-QUEBRA-CONHECIMENTO-001",
                "QuebraPreservaConhecimentoMetrologico",
                "check",
                "UNSAT",
                "check QuebraPreservaConhecimentoMetrologico for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-TERMINAL-ESGOTAMENTO-001",
                "EsgotamentoSaldoConhecido",
                "check",
                "UNSAT",
                "check EsgotamentoSaldoConhecido for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-ESGOTAMENTO-INTERF-001",
                "EsgotamentoNaoInterfereValidade",
                "check",
                "UNSAT",
                "check EsgotamentoNaoInterfereValidade for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-QUARENTENA-ORTOGONAL-001",
                "PreservacaoQuarentenaOrtogonais",
                "check",
                "UNSAT",
                "check PreservacaoQuarentenaOrtogonais for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-RESOLUCAO-QUARENTENA-001",
                "ResolucaoQuarentenaNaoInterfereOutros",
                "check",
                "UNSAT",
                "check ResolucaoQuarentenaNaoInterfereOutros for 4 but exactly 2 Estado",
            ),
            (
                "INV-M2-ABERTURA-001",
                "TransicoesPreservamFlag",
                "check",
                "UNSAT",
                "check TransicoesPreservamFlag for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-QUEBRA-DESCONHECIDO-001",
                "QuebraSaldoDesconhecidoHabitavel",
                "run",
                "SAT",
                "run QuebraSaldoDesconhecidoHabitavel for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-QUEBRA-CONHECIDO-001",
                "QuebraSaldoConhecidoHabitavel",
                "run",
                "SAT",
                "run QuebraSaldoConhecidoHabitavel for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-QUEBRA-CONHECIMENTO-006",
                "QuebraPreservaConhecimentoMetrologicoAmpliado",
                "check",
                "UNSAT",
                "check QuebraPreservaConhecimentoMetrologicoAmpliado for 6 but exactly 2 Estado",
            ),
            (
                "WIT-M2-DESCARTE-DESCONHECIDO-001",
                "DescarteSaldoDesconhecidoHabitavel",
                "run",
                "SAT",
                "run DescarteSaldoDesconhecidoHabitavel for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-DESCARTE-CONHECIDO-001",
                "DescarteSaldoConhecidoHabitavel",
                "run",
                "SAT",
                "run DescarteSaldoConhecidoHabitavel for 4 but exactly 2 Estado",
            ),
            (
                "FRAME-M2-DESCARTE-CONHECIMENTO-006",
                "DescartePreservaConhecimentoMetrologicoAmpliado",
                "check",
                "UNSAT",
                "check DescartePreservaConhecimentoMetrologicoAmpliado for 6 but exactly 2 Estado",
            ),
            (
                "WIT-M2-EXTRAVIO-001",
                "TestemunhaExtravio",
                "run",
                "SAT",
                "run TestemunhaExtravio for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-QUEBRA-001",
                "TestemunhaQuebra",
                "run",
                "SAT",
                "run TestemunhaQuebra for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-DESCARTE-001",
                "TestemunhaDescarte",
                "run",
                "SAT",
                "run TestemunhaDescarte for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-DESCARTE-VAZIO-001",
                "TestemunhaDescarteVazio",
                "run",
                "SAT",
                "run TestemunhaDescarteVazio for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-DESCARTE-QUEBRADO-001",
                "TestemunhaDescarteQuebrado",
                "run",
                "SAT",
                "run TestemunhaDescarteQuebrado for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-DESCARTE-VENCIDO-ABERTO-001",
                "TestemunhaDescarteVencidoAberto",
                "run",
                "SAT",
                "run TestemunhaDescarteVencidoAberto for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-DESCARTE-VENCIDO-FECHADO-001",
                "TestemunhaDescarteVencidoFechado",
                "run",
                "SAT",
                "run TestemunhaDescarteVencidoFechado for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-ESGOTAMENTO-001",
                "TestemunhaEsgotamento",
                "run",
                "SAT",
                "run TestemunhaEsgotamento for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-USOVENCIDO-001",
                "TestemunhaVencidoComUsoAutorizado",
                "run",
                "SAT",
                "run TestemunhaVencidoComUsoAutorizado for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-RESOLVER-QUARENTENA-001",
                "TestemunhaResolverQuarentena",
                "run",
                "SAT",
                "run TestemunhaResolverQuarentena for 4 but exactly 2 Estado",
            ),
            (
                "WIT-M2-QUARENTENA-DESCARTE-001",
                "TestemunhaQuarentenaAteDescarte",
                "run",
                "SAT",
                "run TestemunhaQuarentenaAteDescarte for 5 but exactly 3 Estado",
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
        for (i, (path, expected)) in M2_MODELOS.iter().enumerate() {
            let m = &self.modelos[i];
            if m.model != *path || m.model_sha256 != hash(bytes[i]) {
                return false;
            }
            if m.resultados.len() != expected.len() {
                return false;
            }
            for (r, (id, name, tipo, status, scope)) in m.resultados.iter().zip(expected.iter()) {
                if r.id != *id
                    || r.assertion != *name
                    || r.tipo != *tipo
                    || r.status != *status
                    || r.scope != *scope
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

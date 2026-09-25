use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

pub const MODEL: &str = "specification/alloy/operations/patrimony_m10.als";

const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "M10-INV-001",
        "PlaquetaUnicaPorBem",
        "check",
        "UNSAT",
        "check PlaquetaUnicaPorBem for 6",
    ),
    (
        "M10-INV-002",
        "ChaveUnicaImpedeNovoBem",
        "check",
        "UNSAT",
        "check ChaveUnicaImpedeNovoBem for 6",
    ),
    (
        "M10-INV-003",
        "BaixaNaoLiberaChave",
        "check",
        "UNSAT",
        "check BaixaNaoLiberaChave for 6",
    ),
    (
        "M10-INV-004",
        "PlaquetaNaoReutilizadaAposBaixa",
        "check",
        "UNSAT",
        "check PlaquetaNaoReutilizadaAposBaixa for 8",
    ),
    (
        "M10-INV-005",
        "ReclassificacaoNaoRenomeiaResumoCompartilhado",
        "check",
        "UNSAT",
        "check ReclassificacaoNaoRenomeiaResumoCompartilhado for 8",
    ),
    (
        "M10-INV-006",
        "CadastroComecaAtivoVersao1",
        "check",
        "UNSAT",
        "check CadastroComecaAtivoVersao1 for 8",
    ),
    (
        "M10-INV-007",
        "SemSaltoAtivoParaBaixa",
        "check",
        "UNSAT",
        "check SemSaltoAtivoParaBaixa for 6",
    ),
    (
        "M10-INV-008",
        "BaixaExigeComprovante",
        "check",
        "UNSAT",
        "check BaixaExigeComprovante for 6",
    ),
    (
        "M10-INV-009",
        "BaixaTerminal",
        "check",
        "UNSAT",
        "check BaixaTerminal for 6",
    ),
    (
        "M10-INV-010",
        "BaixaPreservaBem",
        "check",
        "UNSAT",
        "check BaixaPreservaBem for 6",
    ),
    (
        "M10-INV-011",
        "MutacaoCanonicaIncrementaUmaVez",
        "check",
        "UNSAT",
        "check MutacaoCanonicaIncrementaUmaVez for 6",
    ),
    (
        "M10-INV-012",
        "FanOutNaoIncrementaVersao",
        "check",
        "UNSAT",
        "check FanOutNaoIncrementaVersao for 6",
    ),
    (
        "M10-INV-013",
        "FanOutLocalNaoIncrementaVersao",
        "check",
        "UNSAT",
        "check FanOutLocalNaoIncrementaVersao for 6",
    ),
    (
        "M10-INV-014",
        "FanOutNaoCriaEvento",
        "check",
        "UNSAT",
        "check FanOutNaoCriaEvento for 6",
    ),
    (
        "M10-INV-015",
        "ConflitoVersaoNaoAlteraBem",
        "check",
        "UNSAT",
        "check ConflitoVersaoNaoAlteraBem for 6",
    ),
    (
        "M10-INV-016",
        "RetryNaoDuplicaFato",
        "check",
        "UNSAT",
        "check RetryNaoDuplicaFato for 6",
    ),
    (
        "M10-INV-017",
        "UmaEdicaoPendentePorBem",
        "check",
        "UNSAT",
        "check UmaEdicaoPendentePorBem for 6",
    ),
    (
        "M10-INV-018",
        "UmaAdicaoPendentePorPlaqueta",
        "check",
        "UNSAT",
        "check UmaAdicaoPendentePorPlaqueta for 6",
    ),
    (
        "M10-INV-019",
        "LockTemRequerente",
        "check",
        "UNSAT",
        "check LockTemRequerente for 6",
    ),
    (
        "M10-INV-020",
        "LockAlheioNaoRemovido",
        "check",
        "UNSAT",
        "check LockAlheioNaoRemovido for 6",
    ),
    (
        "M10-INV-021",
        "LockAusenteImpedeResposta",
        "check",
        "UNSAT",
        "check LockAusenteImpedeResposta for 6",
    ),
    (
        "M10-INV-022",
        "CadastroGeraUmEvento",
        "check",
        "UNSAT",
        "check CadastroGeraUmEvento for 8",
    ),
    (
        "M10-INV-023",
        "EdicaoGeraUmEvento",
        "check",
        "UNSAT",
        "check EdicaoGeraUmEvento for 6",
    ),
    (
        "M10-INV-024",
        "BaixaGeraUmEvento",
        "check",
        "UNSAT",
        "check BaixaGeraUmEvento for 6",
    ),
    (
        "M10-INV-025",
        "M9InvalidoImpedeCommit",
        "check",
        "UNSAT",
        "check M9InvalidoImpedeCommit for 8",
    ),
    (
        "M10-INV-026",
        "ProfessorNaoAprova",
        "check",
        "UNSAT",
        "check ProfessorNaoAprova for 8",
    ),
    (
        "M10-INV-027",
        "ProfessorNaoBaixa",
        "check",
        "UNSAT",
        "check ProfessorNaoBaixa for 6",
    ),
    (
        "M10-INV-028",
        "AutorizacaoNaoDispensaDominio",
        "check",
        "UNSAT",
        "check AutorizacaoNaoDispensaDominio for 6",
    ),
    (
        "M10-INV-029",
        "TransicoesPreservamCoerencia",
        "check",
        "UNSAT",
        "check TransicoesPreservamCoerencia for 6",
    ),
    (
        "M10-WIT-030",
        "WitnessDoisBensMesmoResumo",
        "run",
        "SAT",
        "run WitnessDoisBensMesmoResumo for 6",
    ),
    (
        "M10-WIT-031",
        "WitnessReclassificacaoIndividual",
        "run",
        "SAT",
        "run WitnessReclassificacaoIndividual for 8",
    ),
    (
        "M10-WIT-032",
        "WitnessBemAtivo",
        "run",
        "SAT",
        "run WitnessBemAtivo for 4",
    ),
    (
        "M10-WIT-033",
        "WitnessTransicaoInservivel",
        "run",
        "SAT",
        "run WitnessTransicaoInservivel for 6",
    ),
    (
        "M10-WIT-034",
        "WitnessTransicaoBaixa",
        "run",
        "SAT",
        "run WitnessTransicaoBaixa for 6",
    ),
    (
        "M10-WIT-035",
        "WitnessCadastroAprovado",
        "run",
        "SAT",
        "run WitnessCadastroAprovado for 6",
    ),
    (
        "M10-WIT-036",
        "WitnessEdicaoAprovada",
        "run",
        "SAT",
        "run WitnessEdicaoAprovada for 6",
    ),
    (
        "M10-WIT-037",
        "WitnessEdicaoRejeitada",
        "run",
        "SAT",
        "run WitnessEdicaoRejeitada for 6",
    ),
    (
        "M10-WIT-038",
        "WitnessConflitoVersao",
        "run",
        "SAT",
        "run WitnessConflitoVersao for 6",
    ),
    (
        "M10-WIT-039",
        "WitnessConflitoUnicidade",
        "run",
        "SAT",
        "run WitnessConflitoUnicidade for 6",
    ),
    (
        "M10-WIT-040",
        "WitnessDuasPlaquetasDistintas",
        "run",
        "SAT",
        "run WitnessDuasPlaquetasDistintas for 6",
    ),
    (
        "M10-WIT-041",
        "WitnessLockIntegro",
        "run",
        "SAT",
        "run WitnessLockIntegro for 6",
    ),
    (
        "M10-WIT-042",
        "WitnessFanOutSemVersao",
        "run",
        "SAT",
        "run WitnessFanOutSemVersao for 6",
    ),
    (
        "M10-WIT-043",
        "WitnessRetrySemDuplicacao",
        "run",
        "SAT",
        "run WitnessRetrySemDuplicacao for 6",
    ),
    (
        "M10-WIT-044",
        "WitnessBaixaComHistorico",
        "run",
        "SAT",
        "run WitnessBaixaComHistorico for 6",
    ),
    (
        "M10-WIT-045",
        "WitnessBemBaixadoExiste",
        "run",
        "SAT",
        "run WitnessBemBaixadoExiste for 6",
    ),
    (
        "M10-WIT-046",
        "WitnessConservacaoOrtogonal",
        "run",
        "SAT",
        "run WitnessConservacaoOrtogonal for 4",
    ),
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM10 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<Resultado>,
}

impl ValidationM10 {
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

/// Canonicalização normativa da plaqueta: `N(s) = trim().toUpperCase()`.
///
/// Preserva zeros iniciais, espaços internos e pontuação; apenas remove
/// espaços nas extremidades e aplica caixa alta. Retorna `None` quando o valor
/// normalizado é vazio ou excede 30 caracteres (runes). Não há remoção de
/// espaços internos, pontuação ou zeros, nem charset arbitrário.
pub fn normalizar_numero_patrimonio(entrada: &str) -> Option<String> {
    let normalizado = entrada.trim().to_uppercase();
    if normalizado.is_empty() || normalizado.chars().count() > 30 {
        None
    } else {
        Some(normalizado)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn receipt() -> ValidationM10 {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m10.json")).unwrap(),
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
        t.model = "specification/alloy/operations/authorization_m9.als".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados.pop();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados.push(Resultado {
            id: "M10-X".into(),
            assertion: "X".into(),
            tipo: "check".into(),
            scope: "check X for 6".into(),
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
        t.resultados[0].scope = "check PlaquetaUnicaPorBem for 7".into();
        assert!(!t.check(&ir, &model));
        // check <-> run trocado
        let mut t = receipt();
        t.resultados[0].tipo = "run".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        let first_run = t.resultados.iter().position(|r| r.tipo == "run").unwrap();
        t.resultados[first_run].tipo = "check".into();
        assert!(!t.check(&ir, &model));
    }

    #[test]
    fn canonicalizacao_preserva_zeros_e_espacos_internos() {
        assert_eq!(
            normalizar_numero_patrimonio("abc-123").as_deref(),
            Some("ABC-123")
        );
        assert_eq!(
            normalizar_numero_patrimonio(" ABC-123 ").as_deref(),
            Some("ABC-123")
        );
        assert_eq!(
            normalizar_numero_patrimonio("abc-123 ").as_deref(),
            Some("ABC-123")
        );
        assert_eq!(
            normalizar_numero_patrimonio(" 00123 ").as_deref(),
            Some("00123")
        );
        // não remove espaços internos, pontuação nem zeros
        assert_eq!(
            normalizar_numero_patrimonio(" a b-01 ").as_deref(),
            Some("A B-01")
        );
    }

    #[test]
    fn canonicalizacao_rejeita_vazio_e_excesso() {
        assert_eq!(normalizar_numero_patrimonio(""), None);
        assert_eq!(normalizar_numero_patrimonio("   "), None);
        let trinta = "a".repeat(30);
        assert_eq!(
            normalizar_numero_patrimonio(&trinta).as_deref(),
            Some("A".repeat(30).as_str())
        );
        let trinta_um = "a".repeat(31);
        assert_eq!(normalizar_numero_patrimonio(&trinta_um), None);
        // espaços nas extremidades não contam para o limite
        let com_espacos = format!("  {}  ", "a".repeat(30));
        assert_eq!(
            normalizar_numero_patrimonio(&com_espacos).as_deref(),
            Some("A".repeat(30).as_str())
        );
    }
}

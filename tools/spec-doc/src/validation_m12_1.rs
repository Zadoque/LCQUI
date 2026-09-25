use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

pub const MODEL: &str = "specification/alloy/operations/posts_m12_1.als";

const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "M12_1-INV-001",
        "CriarPostSoEmAtivo",
        "check",
        "UNSAT",
        "check CriarPostSoEmAtivo for 6",
    ),
    (
        "M12_1-INV-002",
        "EditarPostSoEmAtivo",
        "check",
        "UNSAT",
        "check EditarPostSoEmAtivo for 6",
    ),
    (
        "M12_1-INV-003",
        "RemoverPostSoEmAtivo",
        "check",
        "UNSAT",
        "check RemoverPostSoEmAtivo for 6",
    ),
    (
        "M12_1-INV-004",
        "CriarComentSoEmAtivo",
        "check",
        "UNSAT",
        "check CriarComentSoEmAtivo for 6",
    ),
    (
        "M12_1-INV-005",
        "EditarComentSoEmAtivo",
        "check",
        "UNSAT",
        "check EditarComentSoEmAtivo for 6",
    ),
    (
        "M12_1-INV-006",
        "ModerarComentSoEmAtivo",
        "check",
        "UNSAT",
        "check ModerarComentSoEmAtivo for 6",
    ),
    (
        "M12_1-INV-007",
        "TurmaArquivadaNegaEscrita",
        "check",
        "UNSAT",
        "check TurmaArquivadaNegaEscrita for 6",
    ),
    (
        "M12_1-INV-008",
        "ChefeNaoCriaPost",
        "check",
        "UNSAT",
        "check ChefeNaoCriaPost for 6",
    ),
    (
        "M12_1-INV-009",
        "ChefeNaoEditaConteudo",
        "check",
        "UNSAT",
        "check ChefeNaoEditaConteudo for 6",
    ),
    (
        "M12_1-INV-010",
        "AutorImutavelPost",
        "check",
        "UNSAT",
        "check AutorImutavelPost for 6",
    ),
    (
        "M12_1-INV-011",
        "AutorImutavelComent",
        "check",
        "UNSAT",
        "check AutorImutavelComent for 6",
    ),
    (
        "M12_1-INV-012",
        "TerceiroNaoEditaPost",
        "check",
        "UNSAT",
        "check TerceiroNaoEditaPost for 6",
    ),
    (
        "M12_1-INV-013",
        "TerceiroNaoEditaComent",
        "check",
        "UNSAT",
        "check TerceiroNaoEditaComent for 6",
    ),
    (
        "M12_1-INV-014",
        "ComentarExigeParticipacaoAtual",
        "check",
        "UNSAT",
        "check ComentarExigeParticipacaoAtual for 6",
    ),
    (
        "M12_1-INV-015",
        "EditarComentExigeParticipacaoAtual",
        "check",
        "UNSAT",
        "check EditarComentExigeParticipacaoAtual for 6",
    ),
    (
        "M12_1-INV-016",
        "RemovidoNaoEditaComent",
        "check",
        "UNSAT",
        "check RemovidoNaoEditaComent for 6",
    ),
    (
        "M12_1-INV-017",
        "RemovidoNaoLe",
        "check",
        "UNSAT",
        "check RemovidoNaoLe for 6",
    ),
    (
        "M12_1-INV-018",
        "LerExigeParticipacaoOuPapel",
        "check",
        "UNSAT",
        "check LerExigeParticipacaoOuPapel for 6",
    ),
    (
        "M12_1-INV-019",
        "InativoNaoLe",
        "check",
        "UNSAT",
        "check InativoNaoLe for 6",
    ),
    (
        "M12_1-INV-020",
        "EdicaoPostCriaHistorico",
        "check",
        "UNSAT",
        "check EdicaoPostCriaHistorico for 6",
    ),
    (
        "M12_1-INV-021",
        "RemocaoPostCriaHistorico",
        "check",
        "UNSAT",
        "check RemocaoPostCriaHistorico for 6",
    ),
    (
        "M12_1-INV-022",
        "RemocaoPreservaDocumento",
        "check",
        "UNSAT",
        "check RemocaoPreservaDocumento for 6",
    ),
    (
        "M12_1-INV-023",
        "HistoricoNuncaRemovido",
        "check",
        "UNSAT",
        "check HistoricoNuncaRemovido for 6",
    ),
    (
        "M12_1-INV-024",
        "EdicaoComentCriaHistorico",
        "check",
        "UNSAT",
        "check EdicaoComentCriaHistorico for 6",
    ),
    (
        "M12_1-INV-025",
        "ModeracaoComentCriaHistorico",
        "check",
        "UNSAT",
        "check ModeracaoComentCriaHistorico for 6",
    ),
    (
        "M12_1-INV-026",
        "EdicaoNaoDesfazModeracao",
        "check",
        "UNSAT",
        "check EdicaoNaoDesfazModeracao for 6",
    ),
    (
        "M12_1-INV-027",
        "ComentModeradoPreservado",
        "check",
        "UNSAT",
        "check ComentModeradoPreservado for 6",
    ),
    (
        "M12_1-INV-028",
        "ColegaNaoVeOriginalModerado",
        "check",
        "UNSAT",
        "check ColegaNaoVeOriginalModerado for 6",
    ),
    (
        "M12_1-INV-029",
        "AutorVeOriginalMarcado",
        "check",
        "UNSAT",
        "check AutorVeOriginalMarcado for 6",
    ),
    (
        "M12_1-INV-030",
        "AuditorVeOriginal",
        "check",
        "UNSAT",
        "check AuditorVeOriginal for 6",
    ),
    (
        "M12_1-INV-031",
        "NotificacaoSoDoAlvo",
        "check",
        "UNSAT",
        "check NotificacaoSoDoAlvo for 6",
    ),
    (
        "M12_1-INV-032",
        "SemAcessoNaoPublicaComRoteiro",
        "check",
        "UNSAT",
        "check SemAcessoNaoPublicaComRoteiro for 6",
    ),
    (
        "M12_1-INV-033",
        "PublicacaoComRoteiroExigeAcesso",
        "check",
        "UNSAT",
        "check PublicacaoComRoteiroExigeAcesso for 6",
    ),
    (
        "M12_1-INV-034",
        "PrimeiraExecucaoProduzReceipt",
        "check",
        "UNSAT",
        "check PrimeiraExecucaoProduzReceipt for 6",
    ),
    (
        "M12_1-INV-035",
        "IdentidadeComandoUnica",
        "check",
        "UNSAT",
        "check IdentidadeComandoUnica for 6",
    ),
    (
        "M12_1-INV-036",
        "ReusoIncompativelRejeitado",
        "check",
        "UNSAT",
        "check ReusoIncompativelRejeitado for 6",
    ),
    (
        "M12_1-INV-037",
        "RetryNaoReexecuta",
        "check",
        "UNSAT",
        "check RetryNaoReexecuta for 6",
    ),
    (
        "M12_1-INV-038",
        "RetryNaoDuplicaFato",
        "check",
        "UNSAT",
        "check RetryNaoDuplicaFato for 6",
    ),
    (
        "M12_1-INV-039",
        "RevogacaoImpedeCommit",
        "check",
        "UNSAT",
        "check RevogacaoImpedeCommit for 6",
    ),
    (
        "M12_1-INV-040",
        "TransicoesPreservamCoerencia",
        "check",
        "UNSAT",
        "check TransicoesPreservamCoerencia for 6",
    ),
    (
        "M12_1-WIT-041",
        "WitnessTurmaAtiva",
        "run",
        "SAT",
        "run WitnessTurmaAtiva for 4",
    ),
    (
        "M12_1-WIT-042",
        "WitnessCriarPost",
        "run",
        "SAT",
        "run WitnessCriarPost for 6",
    ),
    (
        "M12_1-WIT-043",
        "WitnessPublicaComRoteiro",
        "run",
        "SAT",
        "run WitnessPublicaComRoteiro for 6",
    ),
    (
        "M12_1-WIT-044",
        "WitnessEditarPost",
        "run",
        "SAT",
        "run WitnessEditarPost for 6",
    ),
    (
        "M12_1-WIT-045",
        "WitnessRemoverPost",
        "run",
        "SAT",
        "run WitnessRemoverPost for 6",
    ),
    (
        "M12_1-WIT-046",
        "WitnessCriarComent",
        "run",
        "SAT",
        "run WitnessCriarComent for 6",
    ),
    (
        "M12_1-WIT-047",
        "WitnessEditarComent",
        "run",
        "SAT",
        "run WitnessEditarComent for 6",
    ),
    (
        "M12_1-WIT-048",
        "WitnessModerarComent",
        "run",
        "SAT",
        "run WitnessModerarComent for 6",
    ),
    (
        "M12_1-WIT-049",
        "WitnessEdicaoNaoDesfazModeracao",
        "run",
        "SAT",
        "run WitnessEdicaoNaoDesfazModeracao for 6",
    ),
    (
        "M12_1-WIT-050",
        "WitnessLeituraMascarada",
        "run",
        "SAT",
        "run WitnessLeituraMascarada for 6",
    ),
    (
        "M12_1-WIT-051",
        "WitnessChefeModera",
        "run",
        "SAT",
        "run WitnessChefeModera for 6",
    ),
    (
        "M12_1-WIT-052",
        "WitnessRemocaoAlunoBloqueia",
        "run",
        "SAT",
        "run WitnessRemocaoAlunoBloqueia for 6",
    ),
    (
        "M12_1-WIT-053",
        "WitnessRetryAposExecucao",
        "run",
        "SAT",
        "run WitnessRetryAposExecucao for 6",
    ),
    (
        "M12_1-WIT-054",
        "WitnessClaimAtualSemVinculo",
        "run",
        "SAT",
        "run WitnessClaimAtualSemVinculo for 6",
    ),
    (
        "M12_1-WIT-055",
        "WitnessReusoIncompativel",
        "run",
        "SAT",
        "run WitnessReusoIncompativel for 6",
    ),
    (
        "M12_1-WIT-056",
        "WitnessRoteiroAceito",
        "run",
        "SAT",
        "run WitnessRoteiroAceito for 6",
    ),
    (
        "M12_1-WIT-057",
        "WitnessRetry",
        "run",
        "SAT",
        "run WitnessRetry for 4",
    ),
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM12_1 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<Resultado>,
}

impl ValidationM12_1 {
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

/// Limites de texto de Q10 (contagem de caracteres, não bytes).
#[cfg(test)]
pub fn titulo_valido(qtd: usize) -> bool {
    (1..=150).contains(&qtd)
}
#[cfg(test)]
pub fn descricao_valida(qtd: usize) -> bool {
    (1..=10_000).contains(&qtd)
}
#[cfg(test)]
pub fn texto_valido(qtd: usize) -> bool {
    (1..=2_000).contains(&qtd)
}

/// Edição é exclusiva do autor: o operador deve ser a mesma identidade do autor.
#[cfg(test)]
pub fn edicao_permitida(autor: &str, operador: &str) -> bool {
    autor == operador
}

/// Máscara de leitura: colega nunca vê o original de comentário moderado;
/// autor e auditor (professor dono/Chefe) veem o original.
#[cfg(test)]
pub fn deve_mascarar(visao: &str, moderado: bool) -> bool {
    moderado && visao == "COLEGA"
}

#[cfg(test)]
mod tests {
    use super::*;

    fn receipt() -> ValidationM12_1 {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m12-1.json")).unwrap(),
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
        t.model = "specification/alloy/operations/turmas_m11.als".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados.pop();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados.push(Resultado {
            id: "M12_1-X".into(),
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
        t.resultados[0].status = "SAT".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados[0].scope = "check CriarPostSoEmAtivo for 7".into();
        assert!(!t.check(&ir, &model));
        // check <-> run trocado (ambas as direções)
        let mut t = receipt();
        t.resultados[0].tipo = "run".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        let first_run = t.resultados.iter().position(|r| r.tipo == "run").unwrap();
        t.resultados[first_run].tipo = "check".into();
        assert!(!t.check(&ir, &model));
    }

    #[test]
    fn limites_e_mascara_respeitam_o_contrato() {
        assert!(titulo_valido(1) && titulo_valido(150));
        assert!(!titulo_valido(0) && !titulo_valido(151));
        assert!(descricao_valida(1) && descricao_valida(10_000));
        assert!(!descricao_valida(0) && !descricao_valida(10_001));
        assert!(texto_valido(1) && texto_valido(2_000));
        assert!(!texto_valido(0) && !texto_valido(2_001));
        assert!(edicao_permitida("uid-a", "uid-a"));
        assert!(!edicao_permitida("uid-a", "uid-b"));
        assert!(deve_mascarar("COLEGA", true));
        assert!(!deve_mascarar("COLEGA", false));
        assert!(!deve_mascarar("AUTOR", true));
        assert!(!deve_mascarar("AUDITOR", true));
    }
}

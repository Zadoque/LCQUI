use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

pub const MODEL: &str = "specification/alloy/operations/turmas_m11.als";

const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "M11-INV-001",
        "CodigoUnicoPorTurma",
        "check",
        "UNSAT",
        "check CodigoUnicoPorTurma for 6",
    ),
    (
        "M11-INV-002",
        "CriarTurmaReservaCodigo",
        "check",
        "UNSAT",
        "check CriarTurmaReservaCodigo for 6",
    ),
    (
        "M11-INV-003",
        "ArquivarPreservaMembros",
        "check",
        "UNSAT",
        "check ArquivarPreservaMembros for 6",
    ),
    (
        "M11-INV-004",
        "ArquivarNaoLiberaCodigo",
        "check",
        "UNSAT",
        "check ArquivarNaoLiberaCodigo for 6",
    ),
    (
        "M11-INV-005",
        "ArquivadaBloqueiaIngresso",
        "check",
        "UNSAT",
        "check ArquivadaBloqueiaIngresso for 6",
    ),
    (
        "M11-INV-006",
        "ArquivadaBloqueiaAceite",
        "check",
        "UNSAT",
        "check ArquivadaBloqueiaAceite for 6",
    ),
    (
        "M11-INV-007",
        "DesarquivarRestauraAtivo",
        "check",
        "UNSAT",
        "check DesarquivarRestauraAtivo for 6",
    ),
    (
        "M11-INV-008",
        "IngressoOrdinarioExigeVaga",
        "check",
        "UNSAT",
        "check IngressoOrdinarioExigeVaga for 6",
    ),
    (
        "M11-INV-009",
        "SemVagaNaoHaIngressoOrdinario",
        "check",
        "UNSAT",
        "check SemVagaNaoHaIngressoOrdinario for 6",
    ),
    (
        "M11-INV-010",
        "ExcecaoExigeConviteJustificado",
        "check",
        "UNSAT",
        "check ExcecaoExigeConviteJustificado for 6",
    ),
    (
        "M11-INV-011",
        "ExcecaoNaoEhBypassGenerico",
        "check",
        "UNSAT",
        "check ExcecaoNaoEhBypassGenerico for 6",
    ),
    (
        "M11-INV-012",
        "EdicaoCapacidadeNaoAbaixoOcupacao",
        "check",
        "UNSAT",
        "check EdicaoCapacidadeNaoAbaixoOcupacao for 6",
    ),
    (
        "M11-INV-013",
        "TransicoesPreservamContador",
        "check",
        "UNSAT",
        "check TransicoesPreservamContador for 6",
    ),
    (
        "M11-INV-014",
        "RemocaoPreservaHistorico",
        "check",
        "UNSAT",
        "check RemocaoPreservaHistorico for 6",
    ),
    (
        "M11-INV-015",
        "RemocaoBloqueiaCodigo",
        "check",
        "UNSAT",
        "check RemocaoBloqueiaCodigo for 6",
    ),
    (
        "M11-INV-016",
        "RemocaoAtualizaEspelho",
        "check",
        "UNSAT",
        "check RemocaoAtualizaEspelho for 6",
    ),
    (
        "M11-INV-017",
        "EspelhoNaoSobreviveRemocao",
        "check",
        "UNSAT",
        "check EspelhoNaoSobreviveRemocao for 6",
    ),
    (
        "M11-INV-018",
        "EspelhoEhProjecao",
        "check",
        "UNSAT",
        "check EspelhoEhProjecao for 6",
    ),
    (
        "M11-INV-019",
        "PendenciaUnicaPorEmailContexto",
        "check",
        "UNSAT",
        "check PendenciaUnicaPorEmailContexto for 6",
    ),
    (
        "M11-INV-020",
        "AceitarTurmaCriaVinculo",
        "check",
        "UNSAT",
        "check AceitarTurmaCriaVinculo for 6",
    ),
    (
        "M11-INV-021",
        "AceitarGlobalNaoMatricula",
        "check",
        "UNSAT",
        "check AceitarGlobalNaoMatricula for 6",
    ),
    (
        "M11-INV-022",
        "AceitarConsomeUmaVez",
        "check",
        "UNSAT",
        "check AceitarConsomeUmaVez for 6",
    ),
    (
        "M11-INV-023",
        "ExpiradoNaoOcupaPendencia",
        "check",
        "UNSAT",
        "check ExpiradoNaoOcupaPendencia for 6",
    ),
    (
        "M11-INV-024",
        "NovoConvitePreservaHistorico",
        "check",
        "UNSAT",
        "check NovoConvitePreservaHistorico for 6",
    ),
    (
        "M11-INV-025",
        "ReenvioMantemDocumento",
        "check",
        "UNSAT",
        "check ReenvioMantemDocumento for 6",
    ),
    (
        "M11-INV-026",
        "PendenciaGlobalDistinta",
        "check",
        "UNSAT",
        "check PendenciaGlobalDistinta for 6",
    ),
    (
        "M11-INV-027",
        "RevogacaoImpedeCommit",
        "check",
        "UNSAT",
        "check RevogacaoImpedeCommit for 6",
    ),
    (
        "M11-INV-028",
        "OwnershipErradoNaoGerencia",
        "check",
        "UNSAT",
        "check OwnershipErradoNaoGerencia for 6",
    ),
    (
        "M11-INV-029",
        "InativoNaoGerencia",
        "check",
        "UNSAT",
        "check InativoNaoGerencia for 6",
    ),
    (
        "M11-INV-030",
        "UsuarioInativoNaoLeTurma",
        "check",
        "UNSAT",
        "check UsuarioInativoNaoLeTurma for 6",
    ),
    (
        "M11-INV-031",
        "RetryNaoDuplicaFato",
        "check",
        "UNSAT",
        "check RetryNaoDuplicaFato for 6",
    ),
    (
        "M11-INV-032",
        "ReusoIncompativelNaoHerda",
        "check",
        "UNSAT",
        "check ReusoIncompativelNaoHerda for 6",
    ),
    (
        "M11-INV-033",
        "TransicoesPreservamCoerencia",
        "check",
        "UNSAT",
        "check TransicoesPreservamCoerencia for 6",
    ),
    (
        "M11-WIT-034",
        "WitnessTurmaAtiva",
        "run",
        "SAT",
        "run WitnessTurmaAtiva for 4",
    ),
    (
        "M11-WIT-035",
        "WitnessCriarTurma",
        "run",
        "SAT",
        "run WitnessCriarTurma for 4",
    ),
    (
        "M11-WIT-036",
        "WitnessArquivarComMembros",
        "run",
        "SAT",
        "run WitnessArquivarComMembros for 6",
    ),
    (
        "M11-WIT-037",
        "WitnessDesarquivar",
        "run",
        "SAT",
        "run WitnessDesarquivar for 6",
    ),
    (
        "M11-WIT-038",
        "WitnessIngressoOrdinario",
        "run",
        "SAT",
        "run WitnessIngressoOrdinario for 6",
    ),
    (
        "M11-WIT-039",
        "WitnessExcecaoAcimaCapacidade",
        "run",
        "SAT",
        "run WitnessExcecaoAcimaCapacidade for 6",
    ),
    (
        "M11-WIT-040",
        "WitnessCorridaUltimaVaga",
        "run",
        "SAT",
        "run WitnessCorridaUltimaVaga for 8",
    ),
    (
        "M11-WIT-041",
        "WitnessRemocao",
        "run",
        "SAT",
        "run WitnessRemocao for 6",
    ),
    (
        "M11-WIT-042",
        "WitnessReingressoPorConvite",
        "run",
        "SAT",
        "run WitnessReingressoPorConvite for 8",
    ),
    (
        "M11-WIT-043",
        "WitnessConviteGlobal",
        "run",
        "SAT",
        "run WitnessConviteGlobal for 4",
    ),
    (
        "M11-WIT-044",
        "WitnessAceitarConviteTurma",
        "run",
        "SAT",
        "run WitnessAceitarConviteTurma for 6",
    ),
    (
        "M11-WIT-045",
        "WitnessReenvioPendente",
        "run",
        "SAT",
        "run WitnessReenvioPendente for 4",
    ),
    (
        "M11-WIT-046",
        "WitnessNovoConviteAposTerminalidade",
        "run",
        "SAT",
        "run WitnessNovoConviteAposTerminalidade for 6",
    ),
    (
        "M11-WIT-047",
        "WitnessExpiracao",
        "run",
        "SAT",
        "run WitnessExpiracao for 4",
    ),
    (
        "M11-WIT-048",
        "WitnessEspelhoProjecao",
        "run",
        "SAT",
        "run WitnessEspelhoProjecao for 6",
    ),
    (
        "M11-WIT-049",
        "WitnessRevogacaoImpedeCommit",
        "run",
        "SAT",
        "run WitnessRevogacaoImpedeCommit for 6",
    ),
    (
        "M11-WIT-050",
        "WitnessEdicaoCapacidadeValida",
        "run",
        "SAT",
        "run WitnessEdicaoCapacidadeValida for 6",
    ),
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM11 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<Resultado>,
}

impl ValidationM11 {
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

/// Canonicalização determinística do e-mail usado no contexto da chave de
/// pendência: `trim().to_lowercase()`. Preserva o restante do endereço; retorna
/// `None` quando o valor normalizado é vazio ou excede 150 caracteres (runes).
/// O HMAC com segredo do servidor permanece fora do modelo; isto fixa apenas a
/// forma canônica determinística do e-mail. Funções de referência determinística
/// exercidas pela suíte de testes (mesmo contrato de RUST-SAFETY-01).
#[cfg(test)]
pub fn normalizar_email(entrada: &str) -> Option<String> {
    let normalizado = entrada.trim().to_lowercase();
    if normalizado.is_empty() || normalizado.chars().count() > 150 {
        None
    } else {
        Some(normalizado)
    }
}

/// Ingresso ordinário exige vaga estrita; a exceção nominal válida permite
/// exceder. Um ingresso excepcional pode deixar qtd > capacidade.
#[cfg(test)]
pub fn ingresso_permitido(qtd_atual: i64, capacidade: i64, excede: bool) -> bool {
    capacidade >= 1 && qtd_atual >= 0 && (qtd_atual < capacidade || excede)
}

/// HQ-M11-001 = A: editar/reduzir a capacidade é proibido abaixo da ocupação já
/// existente; a capacidade nova deve ser positiva.
#[cfg(test)]
pub fn edicao_capacidade_permitida(qtd_atual: i64, nova_capacidade: i64) -> bool {
    nova_capacidade >= 1 && nova_capacidade >= qtd_atual
}

/// Exceção nominal exige o indicador e a justificativa persistida.
#[cfg(test)]
pub fn excecao_valida(excede: bool, tem_justificativa: bool) -> bool {
    excede == tem_justificativa
}

#[cfg(test)]
mod tests {
    use super::*;

    fn receipt() -> ValidationM11 {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m11.json")).unwrap(),
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
        t.model = "specification/alloy/operations/patrimony_m10.als".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados.pop();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados.push(Resultado {
            id: "M11-X".into(),
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
        t.resultados[0].scope = "check CodigoUnicoPorTurma for 7".into();
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
    fn email_canonicalization_is_deterministic() {
        assert_eq!(
            normalizar_email(" Aluno@UENF.br ").as_deref(),
            Some("aluno@uenf.br")
        );
        assert_eq!(
            normalizar_email("A.B+C@d.com").as_deref(),
            Some("a.b+c@d.com")
        );
        assert_eq!(normalizar_email(""), None);
        assert_eq!(normalizar_email("   "), None);
        let longo = format!("{}@x.br", "a".repeat(150));
        assert_eq!(normalizar_email(&longo), None);
    }

    #[test]
    fn capacidade_e_excecao_respeitam_a_decisao() {
        // ordinário exige vaga estrita
        assert!(ingresso_permitido(4, 5, false));
        assert!(!ingresso_permitido(5, 5, false));
        // exceção válida pode exceder
        assert!(ingresso_permitido(5, 5, true));
        assert!(ingresso_permitido(8, 5, true));
        // HQ-M11-001 = A: não reduzir capacidade abaixo da ocupação
        assert!(edicao_capacidade_permitida(5, 5));
        assert!(edicao_capacidade_permitida(5, 7));
        assert!(!edicao_capacidade_permitida(5, 4));
        assert!(!edicao_capacidade_permitida(0, 0));
        // exceção exige justificativa sse indicada
        assert!(excecao_valida(true, true));
        assert!(excecao_valida(false, false));
        assert!(!excecao_valida(true, false));
        assert!(!excecao_valida(false, true));
    }
}

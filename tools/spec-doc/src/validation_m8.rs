use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

pub const MODEL: &str = "specification/alloy/reagents/stock_cache_scarcity_m8.als";

// (id, assertion, tipo, status, scope)
const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "M8-INV-001",
        "ExtraviadoNuncaApto",
        "check",
        "UNSAT",
        "check ExtraviadoNuncaApto for 6",
    ),
    (
        "M8-INV-002",
        "QuarentenaNuncaApta",
        "check",
        "UNSAT",
        "check QuarentenaNuncaApta for 6",
    ),
    (
        "M8-INV-003",
        "FisicoImpedidoNuncaApto",
        "check",
        "UNSAT",
        "check FisicoImpedidoNuncaApto for 6",
    ),
    (
        "M8-INV-004",
        "EmprestadoNaoApto",
        "check",
        "UNSAT",
        "check EmprestadoNaoApto for 6",
    ),
    (
        "M8-INV-005",
        "PendenciaNuncaApta",
        "check",
        "UNSAT",
        "check PendenciaNuncaApta for 6",
    ),
    (
        "M8-INV-006",
        "VencidoSemAutorizacaoNaoApto",
        "check",
        "UNSAT",
        "check VencidoSemAutorizacaoNaoApto for 6",
    ),
    (
        "M8-INV-007",
        "AptoNuncaDescartado",
        "check",
        "UNSAT",
        "check AptoNuncaDescartado for 6",
    ),
    (
        "M8-INV-008",
        "AbaixoDoLimiarEhEscassez",
        "check",
        "UNSAT",
        "check AbaixoDoLimiarEhEscassez for 6",
    ),
    (
        "M8-INV-009",
        "IgualAoLimiarNaoEhEscassez",
        "check",
        "UNSAT",
        "check IgualAoLimiarNaoEhEscassez for 6",
    ),
    (
        "M8-INV-010",
        "AcimaDoLimiarNaoEhEscassez",
        "check",
        "UNSAT",
        "check AcimaDoLimiarNaoEhEscassez for 6",
    ),
    (
        "M8-INV-011",
        "AlmoxInativoNaoAvalia",
        "check",
        "UNSAT",
        "check AlmoxInativoNaoAvalia for 6",
    ),
    (
        "M8-INV-012",
        "ConfigInativaNaoAvalia",
        "check",
        "UNSAT",
        "check ConfigInativaNaoAvalia for 6",
    ),
    (
        "M8-INV-013",
        "InvalidacaoMudaGeracaoEInvalida",
        "check",
        "UNSAT",
        "check InvalidacaoMudaGeracaoEInvalida for 4",
    ),
    (
        "M8-INV-014",
        "InvalidacaoNaoRecalcula",
        "check",
        "UNSAT",
        "check InvalidacaoNaoRecalcula for 4",
    ),
    (
        "M8-INV-015",
        "InvalidacaoImpedeHitValido",
        "check",
        "UNSAT",
        "check InvalidacaoImpedeHitValido for 4",
    ),
    (
        "M8-INV-016",
        "PublicacaoExigeMesmaGeracao",
        "check",
        "UNSAT",
        "check PublicacaoExigeMesmaGeracao for 4",
    ),
    (
        "M8-INV-017",
        "CacheMudouGeracaoNaoPublica",
        "check",
        "UNSAT",
        "check CacheMudouGeracaoNaoPublica for 4",
    ),
    (
        "M8-INV-018",
        "PublicacaoNaoAlteraFatos",
        "check",
        "UNSAT",
        "check PublicacaoNaoAlteraFatos for 4",
    ),
    (
        "M8-INV-019",
        "SemEscassezNaoNotifica",
        "check",
        "UNSAT",
        "check SemEscassezNaoNotifica for 6",
    ),
    (
        "M8-INV-020",
        "ConfigInativaNaoEmite",
        "check",
        "UNSAT",
        "check ConfigInativaNaoEmite for 6",
    ),
    (
        "M8-INV-021",
        "NotificacaoDesativadaNaoEmite",
        "check",
        "UNSAT",
        "check NotificacaoDesativadaNaoEmite for 6",
    ),
    (
        "M8-INV-022",
        "GestorNaoVinculadoNaoRecebe",
        "check",
        "UNSAT",
        "check GestorNaoVinculadoNaoRecebe for 6",
    ),
    (
        "M8-INV-023",
        "AlmoxInativoNaoEmite",
        "check",
        "UNSAT",
        "check AlmoxInativoNaoEmite for 6",
    ),
    (
        "M8-INV-024",
        "RetryNaoDuplicaNotificacao",
        "check",
        "UNSAT",
        "check RetryNaoDuplicaNotificacao for 6",
    ),
    (
        "M8-INV-025",
        "NotificacaoUnicaPorDia",
        "check",
        "UNSAT",
        "check NotificacaoUnicaPorDia for 6",
    ),
    (
        "M8-WIT-026",
        "WitnessFechadoApto",
        "run",
        "SAT",
        "run WitnessFechadoApto for 4",
    ),
    (
        "M8-WIT-027",
        "WitnessAbertoApto",
        "run",
        "SAT",
        "run WitnessAbertoApto for 4",
    ),
    (
        "M8-WIT-028",
        "WitnessVencidoAutorizadoApto",
        "run",
        "SAT",
        "run WitnessVencidoAutorizadoApto for 4",
    ),
    (
        "M8-WIT-029",
        "WitnessSaldoDesconhecidoApto",
        "run",
        "SAT",
        "run WitnessSaldoDesconhecidoApto for 4",
    ),
    (
        "M8-WIT-030",
        "WitnessEscassezAbaixo",
        "run",
        "SAT",
        "run WitnessEscassezAbaixo for 4",
    ),
    (
        "M8-WIT-031",
        "WitnessLimiteExato",
        "run",
        "SAT",
        "run WitnessLimiteExato for 4",
    ),
    (
        "M8-WIT-032",
        "WitnessAcimaDoLimite",
        "run",
        "SAT",
        "run WitnessAcimaDoLimite for 4",
    ),
    (
        "M8-WIT-033",
        "WitnessCacheMissCalculaEPublica",
        "run",
        "SAT",
        "run WitnessCacheMissCalculaEPublica for 4",
    ),
    (
        "M8-WIT-034",
        "WitnessCacheHit",
        "run",
        "SAT",
        "run WitnessCacheHit for 4",
    ),
    (
        "M8-WIT-035",
        "WitnessInvalidacao",
        "run",
        "SAT",
        "run WitnessInvalidacao for 4",
    ),
    (
        "M8-WIT-036",
        "WitnessGeracaoMudou",
        "run",
        "SAT",
        "run WitnessGeracaoMudou for 4",
    ),
    (
        "M8-WIT-037",
        "WitnessNovoCalculoAposInvalidacao",
        "run",
        "SAT",
        "run WitnessNovoCalculoAposInvalidacao for 4",
    ),
    (
        "M8-WIT-038",
        "WitnessEscassezComNotificacao",
        "run",
        "SAT",
        "run WitnessEscassezComNotificacao for 6",
    ),
    (
        "M8-WIT-039",
        "WitnessEscassezSilenciada",
        "run",
        "SAT",
        "run WitnessEscassezSilenciada for 6",
    ),
    (
        "M8-WIT-040",
        "WitnessNovaNotificacaoOutroDia",
        "run",
        "SAT",
        "run WitnessNovaNotificacaoOutroDia for 6 but exactly 3 Store",
    ),
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM8 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<Resultado>,
}

impl ValidationM8 {
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

// ---- Semântica determinística (não expressável de forma útil em Alloy) -------

/// Escassez é estritamente menor que o limiar. Nunca `<=`.
#[cfg(test)]
pub fn escassez(qtd_aptos: i64, qtd_limiar: i64) -> bool {
    qtd_aptos < qtd_limiar
}

/// Validade semântica do cache: idade estritamente menor que 30 s.
#[cfg(test)]
pub fn cache_fresco(idade_segundos: f64) -> bool {
    idade_segundos < 30.0
}

/// Rate limit por UID: a janela admite no máximo 5 requisições. Dado o número
/// de requisições já consumidas na janela, a próxima é permitida se < 5.
#[cfg(test)]
pub fn rate_limit_permitido(consumidas_na_janela: u32) -> bool {
    consumidas_na_janela < 5
}

/// Chave determinística do cache: mesmos componentes produzem a mesma chave e
/// componente diferente produz chave diferente. `id_resumo` é `None` no escopo
/// de almoxarifado.
#[cfg(test)]
pub fn chave_cache(escopo: &str, id_almox: u32, id_resumo: Option<u32>) -> String {
    match id_resumo {
        Some(id) => format!("{escopo}__{id_almox}__{id}"),
        None => format!("{escopo}__{id_almox}"),
    }
}

/// Soma apenas saldos conhecidos; `None` nunca é contado como zero. Sem nenhum
/// valor conhecido, o total é `None` (desconhecido), não zero.
#[cfg(test)]
pub fn somar_conhecidos(valores: &[Option<f64>]) -> Option<f64> {
    let mut soma = 0.0;
    let mut algum = false;
    for valor in valores.iter().flatten() {
        soma += valor;
        algum = true;
    }
    if algum { Some(soma) } else { None }
}

/// Conta quantos saldos são desconhecidos (segregados, nunca somados).
#[cfg(test)]
pub fn contar_desconhecidos(valores: &[Option<f64>]) -> usize {
    valores.iter().filter(|v| v.is_none()).count()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn receipt() -> ValidationM8 {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m8.json")).unwrap(),
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
    fn accepts_real_receipt_and_rejects_tampering() {
        let ir = ir();
        let model = model();
        let mut v = receipt();
        assert!(v.check(&ir, &model), "receipt real deve validar");
        // hash do IR errado
        let mut t = receipt();
        t.spec_ir_sha256 = "0".repeat(64);
        assert!(!t.check(&ir, &model));
        // hash do modelo errado
        let mut t = receipt();
        t.model_sha256 = "0".repeat(64);
        assert!(!t.check(&ir, &model));
        // modelo trocado
        let mut t = receipt();
        t.model = "specification/alloy/operations/idempotency_m7.als".into();
        assert!(!t.check(&ir, &model));
        // resultado invertido
        let mut t = receipt();
        t.resultados[0].status = "SAT".into();
        assert!(!t.check(&ir, &model));
        // scope alterado
        let mut t = receipt();
        t.resultados[0].scope = "check ExtraviadoNuncaApto for 7".into();
        assert!(!t.check(&ir, &model));
        // ID duplicado
        let mut t = receipt();
        let first = t.resultados[0].id.clone();
        t.resultados[1].id = first;
        assert!(!t.check(&ir, &model));
        // resultado removido
        let mut t = receipt();
        t.resultados.pop();
        assert!(!t.check(&ir, &model));
        // resultado extra
        let mut t = receipt();
        let clone = Resultado {
            id: "M8-X".into(),
            assertion: "X".into(),
            tipo: "check".into(),
            scope: "check X for 4".into(),
            status: "UNSAT".into(),
        };
        t.resultados.push(clone);
        assert!(!t.check(&ir, &model));
        assert!(v.check(&ir, &model));
        // sanity: receipt não nulo
        assert!(!v.resultados.is_empty());
        v.resultados.clear();
        assert!(!v.check(&ir, &model));
    }

    #[test]
    fn scarcity_is_strictly_less_than_threshold() {
        assert!(escassez(4, 5));
        assert!(!escassez(5, 5));
        assert!(!escassez(6, 5));
        assert!(!escassez(0, 0));
        assert!(escassez(0, 1));
        assert!(!escassez(1, 0));
    }

    #[test]
    fn cache_validity_is_strictly_less_than_30_seconds() {
        assert!(cache_fresco(0.0));
        assert!(cache_fresco(29.999));
        assert!(!cache_fresco(30.0));
        assert!(!cache_fresco(30.001));
        assert!(!cache_fresco(60.0));
    }

    #[test]
    fn rate_limit_allows_five_and_rejects_sixth() {
        for consumed in 0..5 {
            assert!(rate_limit_permitido(consumed), "consumidas={consumed}");
        }
        assert!(!rate_limit_permitido(5));
        assert!(!rate_limit_permitido(6));
    }

    #[test]
    fn cache_key_is_deterministic() {
        let a = chave_cache("ESTOQUE__ALMOX", 1, None);
        let b = chave_cache("ESTOQUE__ALMOX", 1, None);
        assert_eq!(a, b);
        let c = chave_cache("ESTOQUE__ALMOX__RESUMO", 1, Some(10));
        let d = chave_cache("ESTOQUE__ALMOX__RESUMO", 1, Some(11));
        assert_ne!(c, d);
        assert_ne!(a, chave_cache("ESTOQUE__ALMOX", 2, None));
        assert!(c.ends_with("__10"));
    }

    #[test]
    fn aggregation_segregates_unknown_and_never_mixes_mass_volume() {
        let massa = [Some(1.0), None, Some(2.0)];
        let volume = [None, Some(250.0)];
        assert_eq!(somar_conhecidos(&massa), Some(3.0));
        assert_eq!(contar_desconhecidos(&massa), 1);
        assert_eq!(somar_conhecidos(&volume), Some(250.0));
        assert_eq!(contar_desconhecidos(&volume), 1);
        // Desconhecido nunca vira zero.
        assert_eq!(somar_conhecidos(&[None]), None);
        assert_eq!(somar_conhecidos(&[]), None);
        // Massa e volume são somados separadamente, nunca entre si.
        assert_ne!(somar_conhecidos(&massa), somar_conhecidos(&volume));
    }
}

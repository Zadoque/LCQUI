use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

// M13 — Notificação unificada: caixa única, leitura/marcação/Limpar tudo,
// expiração, alvo/deep link com revalidação corrente, privacidade e
// emissão/deduplicação. Modelo composto que reproduz a autorização de M12
// (composition_m12.als, que reproduz M12.1/M12.2/M9/M11), com rotas explícitas
// (acadêmica com papel + vínculo, professor, compartilhamento, Chefe Q13 por
// recurso) e guard de drift tools/formal/m13_composition.mjs.
pub const MODEL: &str = "specification/alloy/operations/notificacoes_m13.als";
pub const ORIGINS: [&str; 6] = [
    "specification/alloy/operations/composition_m12.als",
    "specification/alloy/operations/posts_m12_1.als",
    "specification/alloy/operations/roteiros_m12_2.als",
    "specification/alloy/operations/authorization_m9.als",
    "specification/alloy/operations/idempotency_m7.als",
    "specification/alloy/reagents/stock_cache_scarcity_m8.als",
];
// Contrato fechado: não inferir IDs/tipos/scopes a partir da evidência recebida.
const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "M13-INV-001",
        "TransicoesPreservamCoerencia",
        "check",
        "UNSAT",
        "check TransicoesPreservamCoerencia for 4",
    ),
    (
        "M13-INV-002",
        "NaoLeCaixaAlheia",
        "check",
        "UNSAT",
        "check NaoLeCaixaAlheia for 4",
    ),
    (
        "M13-INV-003",
        "PapelVisualNaoFiltraCaixa",
        "check",
        "UNSAT",
        "check PapelVisualNaoFiltraCaixa for 4",
    ),
    (
        "M13-INV-004",
        "BolsistaVeCaixa",
        "check",
        "UNSAT",
        "check BolsistaVeCaixa for 4",
    ),
    (
        "M13-INV-005",
        "MarcarSoProprias",
        "check",
        "UNSAT",
        "check MarcarSoProprias for 4",
    ),
    (
        "M13-INV-006",
        "MarcaIdempotente",
        "check",
        "UNSAT",
        "check MarcaIdempotente for 4",
    ),
    (
        "M13-INV-007",
        "MarcaNaoReverte",
        "check",
        "UNSAT",
        "check MarcaNaoReverte for 4",
    ),
    (
        "M13-INV-008",
        "LoteSoProprias",
        "check",
        "UNSAT",
        "check LoteSoProprias for 4",
    ),
    (
        "M13-INV-009",
        "SemDelete",
        "check",
        "UNSAT",
        "check SemDelete for 4",
    ),
    (
        "M13-INV-010",
        "LimparTudoCorteEstavel",
        "check",
        "UNSAT",
        "check LimparTudoCorteEstavel for 5",
    ),
    (
        "M13-INV-011",
        "ExpiracaoDistingueNull",
        "check",
        "UNSAT",
        "check ExpiracaoDistingueNull for 4",
    ),
    (
        "M13-INV-012",
        "ExpiradoForaDoAtivo",
        "check",
        "UNSAT",
        "check ExpiradoForaDoAtivo for 4",
    ),
    (
        "M13-INV-013",
        "AlvoInvalidoNaoNavega",
        "check",
        "UNSAT",
        "check AlvoInvalidoNaoNavega for 4",
    ),
    (
        "M13-INV-014",
        "AlertaNaoContornaAcl",
        "check",
        "UNSAT",
        "check AlertaNaoContornaAcl for 4",
    ),
    (
        "M13-INV-015",
        "RotaAcademicaExigePapel",
        "check",
        "UNSAT",
        "check RotaAcademicaExigePapel for 4",
    ),
    (
        "M13-INV-016",
        "ChefeLegadoNaoUsaAcademico",
        "check",
        "UNSAT",
        "check ChefeLegadoNaoUsaAcademico for 4",
    ),
    (
        "M13-INV-017",
        "SemVinculoNaoRestaura",
        "check",
        "UNSAT",
        "check SemVinculoNaoRestaura for 4",
    ),
    (
        "M13-INV-018",
        "ProfessorDonoMantemAcesso",
        "check",
        "UNSAT",
        "check ProfessorDonoMantemAcesso for 4",
    ),
    (
        "M13-INV-019",
        "CompartilhamentoSoProfessor",
        "check",
        "UNSAT",
        "check CompartilhamentoSoProfessor for 4",
    ),
    (
        "M13-INV-020",
        "ChefeAdminNaoHerdaAcademico",
        "check",
        "UNSAT",
        "check ChefeAdminNaoHerdaAcademico for 4",
    ),
    (
        "M13-INV-021",
        "ChefeSemEscopoNaoEmiteUrl",
        "check",
        "UNSAT",
        "check ChefeSemEscopoNaoEmiteUrl for 4",
    ),
    (
        "M13-INV-022",
        "EscopoEncerradoImpedeNovaEmissao",
        "check",
        "UNSAT",
        "check EscopoEncerradoImpedeNovaEmissao for 4",
    ),
    (
        "M13-INV-023",
        "EncerramentoEscopoPreservaRoteiro",
        "check",
        "UNSAT",
        "check EncerramentoEscopoPreservaRoteiro for 4",
    ),
    (
        "M13-INV-024",
        "RoteiroAlunoExigePostEAnexo",
        "check",
        "UNSAT",
        "check RoteiroAlunoExigePostEAnexo for 4",
    ),
    (
        "M13-INV-025",
        "PonteRotaChefeRoteiroRefinaUrl",
        "check",
        "UNSAT",
        "check PonteRotaChefeRoteiroRefinaUrl for 4",
    ),
    (
        "M13-INV-026",
        "NotificacaoNaoExpoeOriginal",
        "check",
        "UNSAT",
        "check NotificacaoNaoExpoeOriginal for 4",
    ),
    (
        "M13-INV-027",
        "ColegaVeAviso",
        "check",
        "UNSAT",
        "check ColegaVeAviso for 4",
    ),
    (
        "M13-INV-028",
        "AutorVeOriginal",
        "check",
        "UNSAT",
        "check AutorVeOriginal for 4",
    ),
    (
        "M13-INV-029",
        "AuditorVeOriginal",
        "check",
        "UNSAT",
        "check AuditorVeOriginal for 4",
    ),
    (
        "M13-INV-030",
        "EmissaoMesmaIdentidadeNaoDuplica",
        "check",
        "UNSAT",
        "check EmissaoMesmaIdentidadeNaoDuplica for 4",
    ),
    (
        "M13-INV-031",
        "FanOutNaoDuplicaDestinatario",
        "check",
        "UNSAT",
        "check FanOutNaoDuplicaDestinatario for 4",
    ),
    (
        "M13-INV-032",
        "ErroEmissaoNaoViraSucesso",
        "check",
        "UNSAT",
        "check ErroEmissaoNaoViraSucesso for 4",
    ),
    (
        "M13-INV-033",
        "ComposicaoM7RetryNaoDuplica",
        "check",
        "UNSAT",
        "check ComposicaoM7RetryNaoDuplica for 4",
    ),
    (
        "M13-INV-034",
        "IdTurmaAcademicoObrigatorio",
        "check",
        "UNSAT",
        "check IdTurmaAcademicoObrigatorio for 4",
    ),
    (
        "M13-INV-035",
        "IdTurmaOperacionalNulo",
        "check",
        "UNSAT",
        "check IdTurmaOperacionalNulo for 4",
    ),
    (
        "M13-WIT-035",
        "WitnessCaixaMultiRole",
        "run",
        "SAT",
        "run WitnessCaixaMultiRole for 4",
    ),
    (
        "M13-WIT-036",
        "WitnessBolsistaVeAlerta",
        "run",
        "SAT",
        "run WitnessBolsistaVeAlerta for 4",
    ),
    (
        "M13-WIT-037",
        "WitnessMarcarLidaPropria",
        "run",
        "SAT",
        "run WitnessMarcarLidaPropria for 4",
    ),
    (
        "M13-WIT-038",
        "WitnessMarcacaoIdempotente",
        "run",
        "SAT",
        "run WitnessMarcacaoIdempotente for 4",
    ),
    (
        "M13-WIT-039",
        "WitnessLimparTudoProprias",
        "run",
        "SAT",
        "run WitnessLimparTudoProprias for 4",
    ),
    (
        "M13-WIT-040",
        "WitnessLimparTudoRetry",
        "run",
        "SAT",
        "run WitnessLimparTudoRetry for 5",
    ),
    (
        "M13-WIT-041",
        "WitnessLimparTudoCorteComNovaEmissao",
        "run",
        "SAT",
        "run WitnessLimparTudoCorteComNovaEmissao for 5",
    ),
    (
        "M13-WIT-042",
        "WitnessExpiraAtivo",
        "run",
        "SAT",
        "run WitnessExpiraAtivo for 4",
    ),
    (
        "M13-WIT-043",
        "WitnessNullNaoExpira",
        "run",
        "SAT",
        "run WitnessNullNaoExpira for 4",
    ),
    (
        "M13-WIT-044",
        "WitnessAlvoInvalidoNaoNavega",
        "run",
        "SAT",
        "run WitnessAlvoInvalidoNaoNavega for 4",
    ),
    (
        "M13-WIT-045",
        "WitnessRotaAcademicaValida",
        "run",
        "SAT",
        "run WitnessRotaAcademicaValida for 4",
    ),
    (
        "M13-WIT-046",
        "WitnessArquivamentoTurma",
        "run",
        "SAT",
        "run WitnessArquivamentoTurma for 4",
    ),
    (
        "M13-WIT-047",
        "WitnessDesarquivamentoTurma",
        "run",
        "SAT",
        "run WitnessDesarquivamentoTurma for 4",
    ),
    (
        "M13-WIT-048",
        "WitnessChefeLegadoNaoUsaAcademico",
        "run",
        "SAT",
        "run WitnessChefeLegadoNaoUsaAcademico for 4",
    ),
    (
        "M13-WIT-049",
        "WitnessSemVinculoClaimAtual",
        "run",
        "SAT",
        "run WitnessSemVinculoClaimAtual for 4",
    ),
    (
        "M13-WIT-050",
        "WitnessProfessorDonoPost",
        "run",
        "SAT",
        "run WitnessProfessorDonoPost for 4",
    ),
    (
        "M13-WIT-051",
        "WitnessCompartilhamentoRoteiro",
        "run",
        "SAT",
        "run WitnessCompartilhamentoRoteiro for 4",
    ),
    (
        "M13-WIT-052",
        "WitnessChefeComEscopo",
        "run",
        "SAT",
        "run WitnessChefeComEscopo for 4",
    ),
    (
        "M13-WIT-053",
        "WitnessEscopoEncerrado",
        "run",
        "SAT",
        "run WitnessEscopoEncerrado for 4",
    ),
    (
        "M13-WIT-054",
        "WitnessEmissaoUnica",
        "run",
        "SAT",
        "run WitnessEmissaoUnica for 4",
    ),
    (
        "M13-WIT-055",
        "EmissaoChaveDistintaEmite",
        "run",
        "SAT",
        "run EmissaoChaveDistintaEmite for 4",
    ),
    (
        "M13-WIT-056",
        "WitnessFanOutMesmaOperacao",
        "run",
        "SAT",
        "run WitnessFanOutMesmaOperacao for 4",
    ),
    (
        "M13-WIT-057",
        "WitnessErroNaoEmite",
        "run",
        "SAT",
        "run WitnessErroNaoEmite for 4",
    ),
    (
        "M13-WIT-058",
        "WitnessColegaVeAviso",
        "run",
        "SAT",
        "run WitnessColegaVeAviso for 4",
    ),
    (
        "M13-WIT-059",
        "WitnessAutorVeOriginal",
        "run",
        "SAT",
        "run WitnessAutorVeOriginal for 4",
    ),
    (
        "M13-WIT-060",
        "WitnessAuditorVeOriginal",
        "run",
        "SAT",
        "run WitnessAuditorVeOriginal for 4",
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
pub struct ValidationM13 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub origens: Vec<Origin>,
    pub resultados: Vec<Resultado>,
}
impl ValidationM13 {
    pub fn check(&self, ir: &[u8], model: &[u8], origins: [&[u8]; 6]) -> bool {
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
                .all(|(r, (id, name, kind, status, scope))| {
                    r.id == *id
                        && r.assertion == *name
                        && r.tipo == *kind
                        && r.status == *status
                        && r.scope == *scope
                })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json};
    fn origins_bytes(root: &std::path::Path) -> [Vec<u8>; 6] {
        ORIGINS.map(|p| std::fs::read(root.join(p)).unwrap())
    }
    #[test]
    fn accepts_real_receipt_and_rejects_all_required_tampering() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let ir = std::fs::read(root.join("build/spec-ir.json")).unwrap();
        let model = std::fs::read(root.join(MODEL)).unwrap();
        let origins = origins_bytes(&root);
        let refs: [&[u8]; 6] = [
            &origins[0],
            &origins[1],
            &origins[2],
            &origins[3],
            &origins[4],
            &origins[5],
        ];
        let original: Value = serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m13.json")).unwrap(),
        )
        .unwrap();
        let valid = |value: Value| {
            serde_json::from_value::<ValidationM13>(value).is_ok_and(|v| v.check(&ir, &model, refs))
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
            ("/resultados/35/status", json!("UNSAT")),
            (
                "/resultados/0/scope",
                json!("check TransicoesPreservamCoerencia for 1"),
            ),
            ("/resultados/0/id", json!("unexpected")),
            ("/resultados/0/assertion", json!("unexpected")),
            ("/resultados/0/tipo", json!("run")),
            ("/origens/0/model", json!("unexpected")),
            ("/origens/0/model_sha256", json!("0".repeat(64))),
            ("/origens/5/model_sha256", json!("0".repeat(64))),
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
        let v: ValidationM13 = serde_json::from_value(original).unwrap();
        assert!(!v.check(b"changed IR", &model, refs));
        assert!(!v.check(&ir, b"changed model", refs));
    }
}

use crate::validation::{Result as Resultado, hash};
use serde::Deserialize;

pub const MODEL: &str = "specification/alloy/operations/roteiros_m12_2.als";

const EXPECTED: &[(&str, &str, &str, &str, &str)] = &[
    (
        "M12_2-INV-001",
        "CadastroComecaProvisorio",
        "check",
        "UNSAT",
        "check CadastroComecaProvisorio for 6",
    ),
    (
        "M12_2-INV-002",
        "PublicavelSoDeValidado",
        "check",
        "UNSAT",
        "check PublicavelSoDeValidado for 6",
    ),
    (
        "M12_2-INV-003",
        "ValidarFixaGeracao",
        "check",
        "UNSAT",
        "check ValidarFixaGeracao for 6",
    ),
    (
        "M12_2-INV-004",
        "RoteiroValidadoTemGeracao",
        "check",
        "UNSAT",
        "check RoteiroValidadoTemGeracao for 6",
    ),
    (
        "M12_2-INV-005",
        "DonoImutavel",
        "check",
        "UNSAT",
        "check DonoImutavel for 6",
    ),
    (
        "M12_2-INV-006",
        "ObjetoNuncaSobrescrito",
        "check",
        "UNSAT",
        "check ObjetoNuncaSobrescrito for 6",
    ),
    (
        "M12_2-INV-007",
        "GeracaoNaoMudaSemValidar",
        "check",
        "UNSAT",
        "check GeracaoNaoMudaSemValidar for 6",
    ),
    (
        "M12_2-INV-008",
        "SemObjetoNaoEmite",
        "check",
        "UNSAT",
        "check SemObjetoNaoEmite for 6",
    ),
    (
        "M12_2-INV-009",
        "AnexoUsaGeracaoCanonica",
        "check",
        "UNSAT",
        "check AnexoUsaGeracaoCanonica for 6",
    ),
    (
        "M12_2-INV-010",
        "AnexoUnicoPorPost",
        "check",
        "UNSAT",
        "check AnexoUnicoPorPost for 6",
    ),
    (
        "M12_2-INV-011",
        "CompartilharSoProprietario",
        "check",
        "UNSAT",
        "check CompartilharSoProprietario for 6",
    ),
    (
        "M12_2-INV-012",
        "CompartilharExigeDestinatarioAtivo",
        "check",
        "UNSAT",
        "check CompartilharExigeDestinatarioAtivo for 6",
    ),
    (
        "M12_2-INV-013",
        "CompartilhamentoUnico",
        "check",
        "UNSAT",
        "check CompartilhamentoUnico for 6",
    ),
    (
        "M12_2-INV-014",
        "RevogarSoProprietario",
        "check",
        "UNSAT",
        "check RevogarSoProprietario for 6",
    ),
    (
        "M12_2-INV-015",
        "NaoProprietarioNaoRevoga",
        "check",
        "UNSAT",
        "check NaoProprietarioNaoRevoga for 6",
    ),
    (
        "M12_2-INV-016",
        "EmissaoExigeAcesso",
        "check",
        "UNSAT",
        "check EmissaoExigeAcesso for 6",
    ),
    (
        "M12_2-INV-017",
        "ExAlunoNaoEmite",
        "check",
        "UNSAT",
        "check ExAlunoNaoEmite for 6",
    ),
    (
        "M12_2-INV-018",
        "InativoNaoEmite",
        "check",
        "UNSAT",
        "check InativoNaoEmite for 6",
    ),
    (
        "M12_2-INV-019",
        "AlunoDependeDeVinculo",
        "check",
        "UNSAT",
        "check AlunoDependeDeVinculo for 6",
    ),
    (
        "M12_2-INV-020",
        "PostRemovidoNegaAluno",
        "check",
        "UNSAT",
        "check PostRemovidoNegaAluno for 6",
    ),
    (
        "M12_2-INV-021",
        "TurmaArquivadaNegaEscritaRoteiro",
        "check",
        "UNSAT",
        "check TurmaArquivadaNegaEscritaRoteiro for 6",
    ),
    (
        "M12_2-INV-022",
        "UrlEmitidaSobreviveARevogacao",
        "check",
        "UNSAT",
        "check UrlEmitidaSobreviveARevogacao for 6",
    ),
    (
        "M12_2-INV-023",
        "UrlExpiradaNaoUsavel",
        "check",
        "UNSAT",
        "check UrlExpiradaNaoUsavel for 6",
    ),
    (
        "M12_2-INV-024",
        "UrlAtivaUsavel",
        "check",
        "UNSAT",
        "check UrlAtivaUsavel for 6",
    ),
    (
        "M12_2-INV-025",
        "AnexarSoDonoDaTurma",
        "check",
        "UNSAT",
        "check AnexarSoDonoDaTurma for 6",
    ),
    (
        "M12_2-INV-026",
        "AnexarExigeAcessoAtual",
        "check",
        "UNSAT",
        "check AnexarExigeAcessoAtual for 6",
    ),
    (
        "M12_2-INV-027",
        "ManterExigeAcessoAtual",
        "check",
        "UNSAT",
        "check ManterExigeAcessoAtual for 6",
    ),
    (
        "M12_2-INV-028",
        "TrocarExigeAcessoAtual",
        "check",
        "UNSAT",
        "check TrocarExigeAcessoAtual for 6",
    ),
    (
        "M12_2-INV-029",
        "RemocaoPostPreservaSnapshot",
        "check",
        "UNSAT",
        "check RemocaoPostPreservaSnapshot for 6",
    ),
    (
        "M12_2-INV-030",
        "HistoricoAnexoNuncaRemovido",
        "check",
        "UNSAT",
        "check HistoricoAnexoNuncaRemovido for 6",
    ),
    (
        "M12_2-INV-031",
        "HistoricoAnexoPreservaObjeto",
        "check",
        "UNSAT",
        "check HistoricoAnexoPreservaObjeto for 6",
    ),
    (
        "M12_2-INV-032",
        "AnexoEhGeracaoValidada",
        "check",
        "UNSAT",
        "check AnexoEhGeracaoValidada for 6",
    ),
    (
        "M12_2-INV-033",
        "ChefeNaoAnexa",
        "check",
        "UNSAT",
        "check ChefeNaoAnexa for 6",
    ),
    (
        "M12_2-INV-034",
        "ChefeNaoCompartilha",
        "check",
        "UNSAT",
        "check ChefeNaoCompartilha for 6",
    ),
    (
        "M12_2-INV-035",
        "RevogacaoVinculoImpedeCommit",
        "check",
        "UNSAT",
        "check RevogacaoVinculoImpedeCommit for 6",
    ),
    (
        "M12_2-INV-036",
        "PrimeiraExecucaoProduzReceipt",
        "check",
        "UNSAT",
        "check PrimeiraExecucaoProduzReceipt for 6",
    ),
    (
        "M12_2-INV-037",
        "IdentidadeComandoUnica",
        "check",
        "UNSAT",
        "check IdentidadeComandoUnica for 6",
    ),
    (
        "M12_2-INV-038",
        "ReusoIncompativelRejeitado",
        "check",
        "UNSAT",
        "check ReusoIncompativelRejeitado for 6",
    ),
    (
        "M12_2-INV-039",
        "RetryNaoReexecuta",
        "check",
        "UNSAT",
        "check RetryNaoReexecuta for 6",
    ),
    (
        "M12_2-INV-040",
        "RetryNaoDuplicaFato",
        "check",
        "UNSAT",
        "check RetryNaoDuplicaFato for 6",
    ),
    (
        "M12_2-INV-041",
        "TransicoesPreservamCoerencia",
        "check",
        "UNSAT",
        "check TransicoesPreservamCoerencia for 6",
    ),
    (
        "M12_2-WIT-042",
        "WitnessTurmaAtiva",
        "run",
        "SAT",
        "run WitnessTurmaAtiva for 4",
    ),
    (
        "M12_2-WIT-043",
        "WitnessCadastraProvisorio",
        "run",
        "SAT",
        "run WitnessCadastraProvisorio for 6",
    ),
    (
        "M12_2-WIT-044",
        "WitnessValidaObjeto",
        "run",
        "SAT",
        "run WitnessValidaObjeto for 6",
    ),
    (
        "M12_2-WIT-045",
        "WitnessPublica",
        "run",
        "SAT",
        "run WitnessPublica for 6",
    ),
    (
        "M12_2-WIT-046",
        "WitnessProprietarioEmite",
        "run",
        "SAT",
        "run WitnessProprietarioEmite for 6",
    ),
    (
        "M12_2-WIT-047",
        "WitnessCompartilhadoEmite",
        "run",
        "SAT",
        "run WitnessCompartilhadoEmite for 6",
    ),
    (
        "M12_2-WIT-048",
        "WitnessAlunoEmitePostAtivo",
        "run",
        "SAT",
        "run WitnessAlunoEmitePostAtivo for 6",
    ),
    (
        "M12_2-WIT-049",
        "WitnessAlunoEmiteTurmaArquivada",
        "run",
        "SAT",
        "run WitnessAlunoEmiteTurmaArquivada for 6",
    ),
    (
        "M12_2-WIT-050",
        "WitnessExAlunoNaoEmite",
        "run",
        "SAT",
        "run WitnessExAlunoNaoEmite for 6",
    ),
    (
        "M12_2-WIT-051",
        "WitnessRevogadoNaoEmite",
        "run",
        "SAT",
        "run WitnessRevogadoNaoEmite for 6",
    ),
    (
        "M12_2-WIT-052",
        "WitnessUrlAtivaAposRevogacao",
        "run",
        "SAT",
        "run WitnessUrlAtivaAposRevogacao for 6",
    ),
    (
        "M12_2-WIT-053",
        "WitnessChefeEmite",
        "run",
        "SAT",
        "run WitnessChefeEmite for 6",
    ),
    (
        "M12_2-WIT-054",
        "WitnessPostRemovidoNaoEmiteAluno",
        "run",
        "SAT",
        "run WitnessPostRemovidoNaoEmiteAluno for 6",
    ),
    (
        "M12_2-WIT-055",
        "WitnessAnexaComAcesso",
        "run",
        "SAT",
        "run WitnessAnexaComAcesso for 6",
    ),
    (
        "M12_2-WIT-056",
        "WitnessMantemComAcesso",
        "run",
        "SAT",
        "run WitnessMantemComAcesso for 6",
    ),
    (
        "M12_2-WIT-057",
        "WitnessDesvinculaSemAcesso",
        "run",
        "SAT",
        "run WitnessDesvinculaSemAcesso for 6",
    ),
    (
        "M12_2-WIT-058",
        "WitnessTrocaPreservaHistorico",
        "run",
        "SAT",
        "run WitnessTrocaPreservaHistorico for 6",
    ),
    (
        "M12_2-WIT-059",
        "WitnessRetryAposExecucao",
        "run",
        "SAT",
        "run WitnessRetryAposExecucao for 6",
    ),
    (
        "M12_2-WIT-060",
        "WitnessReusoIncompativel",
        "run",
        "SAT",
        "run WitnessReusoIncompativel for 6",
    ),
    (
        "M12_2-WIT-061",
        "WitnessObjetoAusenteNaoEmite",
        "run",
        "SAT",
        "run WitnessObjetoAusenteNaoEmite for 6",
    ),
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ValidationM12_2 {
    pub versao: u32,
    pub alloy: String,
    pub solver: String,
    pub spec_ir_sha256: String,
    pub model: String,
    pub model_sha256: String,
    pub resultados: Vec<Resultado>,
}

impl ValidationM12_2 {
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

/// 15 MiB em bytes; a regra exige PDF estritamente menor.
pub const LIMITE_BYTES: u64 = 15 * 1024 * 1024;

/// PDF não vazio e estritamente menor que 15 MiB. Usada pelo invariante de
/// produção do IR, portanto permanece em produção.
pub fn tamanho_valido(bytes: u64) -> bool {
    bytes > 0 && bytes < LIMITE_BYTES
}

/// Formato validado da V1: PDF. Usada pelo invariante de produção do IR.
pub fn content_type_pdf(t: &str) -> bool {
    t == "application/pdf"
}

/// Titularidade do objeto: owner_uid coincide com id_professor_upload. Usada
/// pelo invariante de produção do IR.
pub fn titularidade_ok(id_professor_upload: &str, owner_uid: &str) -> bool {
    id_professor_upload == owner_uid
}

/// Somente Roteiro publicável é elegível a compartilhamento/anexo/download.
#[cfg(test)]
pub fn status_publicavel(status: &str) -> bool {
    status == "PUBLICAVEL"
}

/// Ligação do anexo à referência canônica: (id, tamanho, caminho, geração).
#[cfg(test)]
pub fn anexo_vinculado_ok(
    anexo: (&str, u64, &str, &str),
    referencia: (&str, u64, &str, &str),
) -> bool {
    anexo.0 == referencia.0
        && anexo.1 == referencia.1
        && anexo.2 == referencia.2
        && anexo.3 == referencia.3
}

/// Nova emissão de URL exige acesso atual; o uso da URL já emitida não o exige.
#[cfg(test)]
pub fn emissao_exige_acesso(acesso_atual: bool) -> bool {
    acesso_atual
}

/// URL já emitida é utilizável apenas enquanto ativa (prazo abstrato).
#[cfg(test)]
pub fn url_emitida_utilizavel(validade: &str) -> bool {
    validade == "ATIVA"
}

/// Aluno baixa somente com vínculo canônico atual e Post acessível; ex-aluno
/// (papel diferente de ALUNO) nunca baixa por esse caminho, mesmo com claim.
#[cfg(test)]
pub fn aluno_baixa(papel: &str, tem_vinculo_atual: bool, post_acessivel: bool) -> bool {
    papel == "ALUNO" && tem_vinculo_atual && post_acessivel
}

/// ACL de UID único: a lista de professores compartilhados não repete UID.
#[cfg(test)]
pub fn uids_unicos(uids: &[&str]) -> bool {
    let mut vistos = std::collections::BTreeSet::new();
    uids.iter().all(|u| !u.is_empty() && vistos.insert(*u))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn receipt() -> ValidationM12_2 {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        serde_json::from_slice(
            &std::fs::read(root.join("build/formal-validation-m12-2.json")).unwrap(),
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
        t.model = "specification/alloy/operations/posts_m12_1.als".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados.pop();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados.push(Resultado {
            id: "M12_2-X".into(),
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
        t.resultados[0].scope = "check CadastroComecaProvisorio for 7".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        t.resultados[0].tipo = "run".into();
        assert!(!t.check(&ir, &model));
        let mut t = receipt();
        let first_run = t.resultados.iter().position(|r| r.tipo == "run").unwrap();
        t.resultados[first_run].tipo = "check".into();
        assert!(!t.check(&ir, &model));
    }

    #[test]
    fn limites_e_vinculos_respeitam_o_contrato() {
        assert!(!tamanho_valido(0));
        assert!(tamanho_valido(1));
        assert!(tamanho_valido(LIMITE_BYTES - 1));
        assert!(!tamanho_valido(LIMITE_BYTES));
        assert!(content_type_pdf("application/pdf"));
        assert!(!content_type_pdf("image/png"));
        assert!(titularidade_ok("prof-1", "prof-1"));
        assert!(!titularidade_ok("prof-1", "prof-9"));
        assert!(status_publicavel("PUBLICAVEL"));
        assert!(!status_publicavel("PROVISORIO"));
        assert!(!status_publicavel("VALIDADO"));
        assert!(anexo_vinculado_ok(
            ("rot-1", 1024, "gs://b/r.pdf", "g1"),
            ("rot-1", 1024, "gs://b/r.pdf", "g1")
        ));
        assert!(!anexo_vinculado_ok(
            ("rot-1", 1024, "gs://b/r.pdf", "g2"),
            ("rot-1", 1024, "gs://b/r.pdf", "g1")
        ));
        assert!(emissao_exige_acesso(true));
        assert!(!emissao_exige_acesso(false));
        assert!(url_emitida_utilizavel("ATIVA"));
        assert!(!url_emitida_utilizavel("EXPIRADA"));
        assert!(aluno_baixa("ALUNO", true, true));
        assert!(!aluno_baixa("ALUNO", false, true));
        assert!(!aluno_baixa("ALUNO", true, false));
        assert!(!aluno_baixa("EX_ALUNO", true, true));
        assert!(uids_unicos(&["prof-2", "prof-3"]));
        assert!(!uids_unicos(&["prof-2", "prof-2"]));
        assert!(!uids_unicos(&["prof-2", ""]));
    }
}

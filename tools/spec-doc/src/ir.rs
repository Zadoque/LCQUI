use serde::Deserialize;
use std::collections::BTreeSet;

// Proveniência esperada. M0/M1 foram validados historicamente contra o baseline
// 3B; a documentação normativa de entrada de M2 é distinta. Não reduzir a um
// único SHA.
pub const BASELINE_HISTORICO_M0_M1: &str = "db29ea2f17dc785fb0b44ffb3aec16db29c45e94";
pub const BASELINE_DOCUMENTAL_M2: &str = "9df335bc977bfcf16668bca4baf5f9ed50c2da1a";

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Ir {
    pub versao: u32,
    pub proveniencia: Proveniencia,
    pub entidades: Vec<Entidade>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Proveniencia {
    pub baseline_historico_m0_m1: String,
    #[serde(default)]
    pub baseline_documental_m2: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Entidade {
    pub arquivo: String,
    pub entidade: String,
    pub etapa: String,
    pub escopo: String,
    pub campos: Vec<Campo>,
    pub exemplo: serde_json::Value,
    pub mapeamento: Option<Mapeamento>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Mapeamento {
    pub caminho: String,
    pub notas: Vec<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Campo {
    pub nome: String,
    pub tipo: String,
    pub obrigatorio: bool,
    pub nulo: bool,
    pub valores: Vec<String>,
    #[serde(default)]
    pub observacao: String,
    pub max_caracteres: Option<u32>,
    pub padrao: Option<String>,
    pub minimo: Option<i64>,
    pub minimo_exclusivo: Option<f64>,
    pub maximo_exclusivo: Option<f64>,
    pub multiplo: Option<f64>,
    // M2.3: metadados do descritor CUE M2.1d.
    pub sql: Option<String>,
    pub minimo_numero: Option<f64>,
    pub maximo_numero: Option<f64>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct V2Ir {
    versao: u32,
    baseline: String,
    entidades: Vec<Entidade>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LegacyIr {
    versao: u32,
    baseline: String,
    entidade: String,
    escopo: String,
    campos: Vec<Campo>,
    exemplo: serde_json::Value,
}

pub fn parse(raw: &[u8]) -> Result<Ir, Box<dyn std::error::Error>> {
    let value: serde_json::Value = serde_json::from_slice(raw)?;
    match value["versao"].as_u64() {
        Some(3) => Ok(serde_json::from_value(value)?),
        Some(2) => {
            let old: V2Ir = serde_json::from_value(value)?;
            Ok(old.into_ir())
        }
        Some(1) => {
            let old: LegacyIr = serde_json::from_value(value)?;
            if old.versao != 1 || old.entidade != "Frasco_Reagente" {
                return Err("IR v1 só suporta a fatia Frasco_Reagente".into());
            }
            Ok(V2Ir {
                versao: 2,
                baseline: old.baseline,
                entidades: vec![Entidade {
                    arquivo: "frasco_reagente".into(),
                    entidade: old.entidade,
                    etapa: "fatia M0".into(),
                    escopo: old.escopo,
                    campos: old.campos,
                    exemplo: old.exemplo,
                    mapeamento: None,
                }],
            }
            .into_ir())
        }
        _ => Err("Versão IR não suportada".into()),
    }
}
impl V2Ir {
    fn into_ir(self) -> Ir {
        let _ = self.versao; // v2 legado: normalizado para v3
        Ir {
            versao: 3,
            proveniencia: Proveniencia {
                baseline_historico_m0_m1: self.baseline,
                baseline_documental_m2: None,
            },
            entidades: self.entidades,
        }
    }
}
impl Ir {
    pub fn valid(&self) -> bool {
        let mut files = BTreeSet::new();
        self.versao == 3
            && !self.proveniencia.baseline_historico_m0_m1.is_empty()
            && !self.entidades.is_empty()
            && self.entidades.iter().all(|e| {
                let mut fields = BTreeSet::new();
                !e.arquivo.is_empty()
                    && e.arquivo
                        .bytes()
                        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
                    && files.insert(&e.arquivo)
                    && !e.entidade.is_empty()
                    && !e.campos.is_empty()
                    && e.exemplo.is_object()
                    && e.campos
                        .iter()
                        .all(|c| !c.nome.is_empty() && fields.insert(&c.nome))
            })
    }
    /// Confere a proveniência declarada contra os baselines versionados.
    pub fn provenance_ok(&self) -> bool {
        self.proveniencia.baseline_historico_m0_m1 == BASELINE_HISTORICO_M0_M1
            && self.proveniencia.baseline_documental_m2.as_deref() == Some(BASELINE_DOCUMENTAL_M2)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn legacy_and_current_ir_are_readable() {
        let old = parse(include_bytes!("../tests/fixtures/ir-v1.json")).unwrap();
        assert!(old.valid());
        assert_eq!(old.entidades[0].arquivo, "frasco_reagente");
        assert_eq!(
            old.proveniencia.baseline_historico_m0_m1,
            BASELINE_HISTORICO_M0_M1
        );
        assert!(!old.provenance_ok());
        let root =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../build/spec-ir.json");
        let current = parse(&std::fs::read(root).unwrap()).unwrap();
        assert!(current.valid());
        assert!(current.provenance_ok());
        assert!(parse(br#"{"versao":99}"#).is_err());
    }
    #[test]
    fn rejects_unsafe_or_duplicate_output_names() {
        let mut old = parse(include_bytes!("../tests/fixtures/ir-v1.json")).unwrap();
        old.entidades[0].arquivo = "../main".into();
        assert!(!old.valid());
        old.entidades[0].arquivo = "frasco_reagente".into();
        old.entidades.push(
            parse(include_bytes!("../tests/fixtures/ir-v1.json"))
                .unwrap()
                .entidades
                .remove(0),
        );
        assert!(!old.valid());
    }
    #[test]
    fn rejects_wrong_provenance() {
        let mut old = parse(include_bytes!("../tests/fixtures/ir-v1.json")).unwrap();
        assert!(!old.provenance_ok());
        old.proveniencia.baseline_historico_m0_m1 = "0".repeat(40);
        old.proveniencia.baseline_documental_m2 = Some(BASELINE_DOCUMENTAL_M2.into());
        assert!(!old.provenance_ok());
        old.proveniencia.baseline_historico_m0_m1 = BASELINE_HISTORICO_M0_M1.into();
        old.proveniencia.baseline_documental_m2 = Some("1".repeat(40));
        assert!(!old.provenance_ok());
        old.proveniencia.baseline_documental_m2 = Some(BASELINE_DOCUMENTAL_M2.into());
        assert!(old.provenance_ok());
    }
}

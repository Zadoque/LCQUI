use serde::Deserialize;
use std::collections::BTreeSet;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Ir {
    pub versao: u32,
    pub baseline: String,
    pub entidades: Vec<Entidade>,
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
        Some(2) => Ok(serde_json::from_value(value)?),
        Some(1) => {
            let old: LegacyIr = serde_json::from_value(value)?;
            if old.versao != 1 || old.entidade != "Frasco_Reagente" {
                return Err("IR v1 só suporta a fatia Frasco_Reagente".into());
            }
            Ok(Ir {
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
            })
        }
        _ => Err("Versão IR não suportada".into()),
    }
}
impl Ir {
    pub fn valid(&self) -> bool {
        let mut files = BTreeSet::new();
        self.versao == 2
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
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn legacy_and_current_ir_are_readable() {
        let old = parse(include_bytes!("../tests/fixtures/ir-v1.json")).unwrap();
        assert!(old.valid());
        assert_eq!(old.entidades[0].arquivo, "frasco_reagente");
        let root =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../build/spec-ir.json");
        assert!(parse(&std::fs::read(root).unwrap()).unwrap().valid());
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
}

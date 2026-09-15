use serde::Deserialize;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Ir {
    pub versao: u32,
    pub baseline: String,
    pub entidade: String,
    pub escopo: String,
    pub campos: Vec<Campo>,
    pub exemplo: serde_json::Value,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Campo {
    pub nome: String,
    pub tipo: String,
    pub obrigatorio: bool,
    pub nulo: bool,
    pub valores: Vec<String>,
}

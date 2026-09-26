// Ferramentas de especificação formal: sem código não seguro e sem
// supressões de lint. `dead_code` e `unsafe_code` são proibidos no crate.
#![forbid(dead_code)]
#![forbid(unsafe_code)]
#![deny(warnings)]

mod ir;
mod latex;
mod render;
mod validation;
mod validation_m10;
mod validation_m11;
mod validation_m12;
mod validation_m12_1;
mod validation_m12_2;
mod validation_m13;
mod validation_m2;
mod validation_m24;
mod validation_m3;
mod validation_m4;
mod validation_m5;
mod validation_m6;
mod validation_m7;
mod validation_m8;
mod validation_m9;

use std::{collections::BTreeMap, error::Error, fs, path::Path};
use validation::hash;
type Fallible<T> = Result<T, Box<dyn Error>>;

/// Invariante concreto de M10: a plaqueta do exemplo do IR deve estar na forma
/// canônica `N(s) = trim().toUpperCase()` e preservar zeros iniciais. Liga a
/// transformação determinística à proveniência gerada.
fn m10_plaqueta_canonica(ir: &ir::Ir) -> bool {
    match ir
        .entidades
        .iter()
        .find(|e| e.arquivo == "formal_m10_patrimonio")
    {
        Some(entity) => match entity
            .exemplo
            .get("numero_patrimonio")
            .and_then(|v| v.as_str())
        {
            Some(bruta) => {
                validation_m10::normalizar_numero_patrimonio(bruta).as_deref() == Some(bruta)
            }
            None => false,
        },
        None => false,
    }
}

/// Invariante concreto de M11: o exemplo do IR deve satisfazer as regras
/// estruturais da turma — `capacidade >= 1`, `semestre` em {1, 2},
/// `qtd_alunos >= 0`, `versao >= 1` e `status` em {Ativo, Arquivada}. Liga os
/// campos do shape CUE à proveniência gerada sem depender do backend.
fn m11_exemplo_valido(ir: &ir::Ir) -> bool {
    match ir
        .entidades
        .iter()
        .find(|e| e.arquivo == "formal_m11_turmas")
    {
        Some(entity) => {
            let inteiro = |k: &str| entity.exemplo.get(k).and_then(|v| v.as_i64());
            match (
                inteiro("capacidade"),
                inteiro("semestre"),
                inteiro("qtd_alunos"),
                inteiro("versao"),
            ) {
                (Some(cap), Some(sem), Some(qtd), Some(vers)) => {
                    let status = entity.exemplo.get("status").and_then(|v| v.as_str());
                    cap >= 1
                        && matches!(sem, 1 | 2)
                        && qtd >= 0
                        && vers >= 1
                        && matches!(status, Some("Ativo" | "Arquivada"))
                }
                _ => false,
            }
        }
        None => false,
    }
}

/// Invariante concreto de M12.1: o exemplo do IR deve respeitar os limites de
/// Q10 (título 1..150, descrição 1..10000, texto 1..2000 caracteres), a visão
/// de leitura fechada e a ausência de conteúdo protegido no efeito de
/// notificação. Liga os shapes CUE à proveniência gerada sem backend.
fn m12_1_exemplo_valido(ir: &ir::Ir) -> bool {
    let Some(entity) = ir
        .entidades
        .iter()
        .find(|e| e.arquivo == "formal_m12_1_posts")
    else {
        return false;
    };
    let tam = |k: &str| {
        entity
            .exemplo
            .get(k)
            .and_then(|v| v.as_str())
            .map(|s| s.chars().count())
    };
    let visao = entity.exemplo.get("visao").and_then(|v| v.as_str());
    let sem_conteudo = entity
        .exemplo
        .get("contem_conteudo_protegido")
        .and_then(|v| v.as_bool());
    match (
        tam("titulo"),
        tam("descricao"),
        tam("texto"),
        visao,
        sem_conteudo,
    ) {
        (Some(t), Some(d), Some(x), Some(v), Some(false)) => {
            (1..=150).contains(&t)
                && (1..=10_000).contains(&d)
                && (1..=2_000).contains(&x)
                && matches!(v, "AUTOR" | "COLEGA" | "AUDITOR")
        }
        _ => false,
    }
}

/// Invariante concreto de M12.2: o exemplo do IR deve respeitar o limite
/// estrito de 15 MiB, o tipo PDF, a titularidade (owner_uid ==
/// id_professor_upload), o status fechado e o limite de geração/nome. Liga os
/// shapes CUE à proveniência gerada sem backend.
fn m12_2_exemplo_valido(ir: &ir::Ir) -> bool {
    let Some(entity) = ir
        .entidades
        .iter()
        .find(|e| e.arquivo == "formal_m12_2_roteiros")
    else {
        return false;
    };
    let texto = |k: &str| entity.exemplo.get(k).and_then(|v| v.as_str());
    let tamanho = entity.exemplo.get("tamanho_bytes").and_then(|v| v.as_u64());
    let geracao = texto("geracao").map(|s| s.chars().count());
    let nome = texto("nome").map(|s| s.chars().count());
    match (
        tamanho,
        texto("content_type"),
        texto("owner_uid"),
        texto("id_professor_upload"),
        texto("status_roteiro"),
        geracao,
        nome,
    ) {
        (Some(bytes), Some(ct), Some(owner), Some(upload), Some(status), Some(g), Some(n)) => {
            validation_m12_2::tamanho_valido(bytes)
                && validation_m12_2::content_type_pdf(ct)
                && validation_m12_2::titularidade_ok(upload, owner)
                && matches!(status, "PROVISORIO" | "VALIDADO" | "PUBLICAVEL")
                && (1..=120).contains(&g)
                && (1..=150).contains(&n)
        }
        _ => false,
    }
}

/// Invariante concreto de M13: o exemplo do IR deve respeitar a coerência
/// `lida=false => lida_em=null`, `id_destinatario == uid`, `id_turma` em tipo
/// acadêmico e payload sem conteúdo protegido. Liga os shapes CUE à
/// proveniência gerada sem backend.
fn m13_exemplo_valido(ir: &ir::Ir) -> bool {
    let Some(entity) = ir
        .entidades
        .iter()
        .find(|e| e.arquivo == "formal_m13_notificacoes")
    else {
        return false;
    };
    let texto = |k: &str| entity.exemplo.get(k).and_then(|v| v.as_str());
    let lida = entity.exemplo.get("lida").and_then(|v| v.as_bool());
    let lida_em = entity.exemplo.get("lida_em");
    let sem_conteudo = entity
        .exemplo
        .get("contem_conteudo_protegido")
        .and_then(|v| v.as_bool());
    match (
        texto("uid"),
        texto("id_destinatario"),
        texto("tipo"),
        texto("id_turma"),
        texto("entidade_alvo"),
        lida,
        lida_em,
        sem_conteudo,
    ) {
        (
            Some(uid),
            Some(dest),
            Some(tipo),
            Some(turma),
            Some(alvo),
            Some(false),
            Some(serde_json::Value::Null),
            Some(false),
        ) => {
            uid == dest
                && !turma.is_empty()
                && matches!(
                    tipo,
                    "COMENTARIO"
                        | "POST"
                        | "ADICIONADO"
                        | "REMOVIDO"
                        | "TURMA_ARQUIVADA"
                        | "TURMA_DESARQUIVADA"
                )
                && matches!(
                    alvo,
                    "Turma"
                        | "Post"
                        | "Comentario"
                        | "Roteiro"
                        | "Almoxarifado"
                        | "Emprestimo"
                        | "Usuario"
                        | "Requisicao_Bem"
                        | "Bem_Patrimonial"
                )
        }
        _ => false,
    }
}

fn generated(root: &Path) -> Fallible<BTreeMap<String, String>> {
    let raw = fs::read(root.join("build/spec-ir.json"))?;
    let results = fs::read(root.join("build/formal-validation.json"))?;
    let results_m2 = fs::read(root.join("build/formal-validation-m2.json"))?;
    let results_m24 = fs::read(root.join("build/formal-validation-m24.json"))?;
    let results_m3 = fs::read(root.join("build/formal-validation-m3.json"))?;
    let results_m4 = fs::read(root.join("build/formal-validation-m4.json"))?;
    let results_m5 = fs::read(root.join("build/formal-validation-m5.json"))?;
    let results_m6 = fs::read(root.join("build/formal-validation-m6.json"))?;
    let results_m7 = fs::read(root.join("build/formal-validation-m7.json"))?;
    let results_m8 = fs::read(root.join("build/formal-validation-m8.json"))?;
    let results_m9 = fs::read(root.join("build/formal-validation-m9.json"))?;
    let results_m10 = fs::read(root.join("build/formal-validation-m10.json"))?;
    let results_m11 = fs::read(root.join("build/formal-validation-m11.json"))?;
    let results_m12_1 = fs::read(root.join("build/formal-validation-m12-1.json"))?;
    let results_m12_2 = fs::read(root.join("build/formal-validation-m12-2.json"))?;
    let results_m12 = fs::read(root.join("build/formal-validation-m12.json"))?;
    let results_m13 = fs::read(root.join("build/formal-validation-m13.json"))?;
    let ir = ir::parse(&raw)?;
    let v: validation::Validation = serde_json::from_slice(&results)?;
    let v2: validation_m2::ValidationM2 = serde_json::from_slice(&results_m2)?;
    let v24: validation_m24::ValidationM24 = serde_json::from_slice(&results_m24)?;
    let v3: validation_m3::ValidationM3 = serde_json::from_slice(&results_m3)?;
    let v4: validation_m4::ValidationM4 = serde_json::from_slice(&results_m4)?;
    let v5: validation_m5::ValidationM5 = serde_json::from_slice(&results_m5)?;
    let v6: validation_m6::ValidationM6 = serde_json::from_slice(&results_m6)?;
    let v7: validation_m7::ValidationM7 = serde_json::from_slice(&results_m7)?;
    let v8: validation_m8::ValidationM8 = serde_json::from_slice(&results_m8)?;
    let v9: validation_m9::ValidationM9 = serde_json::from_slice(&results_m9)?;
    let v10: validation_m10::ValidationM10 = serde_json::from_slice(&results_m10)?;
    let v11: validation_m11::ValidationM11 = serde_json::from_slice(&results_m11)?;
    let v12_1: validation_m12_1::ValidationM12_1 = serde_json::from_slice(&results_m12_1)?;
    let v12_2: validation_m12_2::ValidationM12_2 = serde_json::from_slice(&results_m12_2)?;
    let v12: validation_m12::ValidationM12 = serde_json::from_slice(&results_m12)?;
    let v13: validation_m13::ValidationM13 = serde_json::from_slice(&results_m13)?;
    let identity = fs::read(root.join("specification/alloy/reagents/bottle_identity.als"))?;
    let state = fs::read(root.join("specification/alloy/reagents/bottle_state.als"))?;
    let withdrawal = fs::read(root.join(validation_m24::ORIGINS[0]))?;
    let composed = fs::read(root.join(validation_m24::MODEL))?;
    let loan = fs::read(root.join(validation_m3::MODEL))?;
    let m4_model = fs::read(root.join(validation_m4::MODEL))?;
    let m5_model = fs::read(root.join(validation_m5::MODEL))?;
    let m6_model = fs::read(root.join(validation_m6::MODEL))?;
    let m7_model = fs::read(root.join(validation_m7::MODEL))?;
    let m8_model = fs::read(root.join(validation_m8::MODEL))?;
    let m9_model = fs::read(root.join(validation_m9::MODEL))?;
    let m10_model = fs::read(root.join(validation_m10::MODEL))?;
    let m11_model = fs::read(root.join(validation_m11::MODEL))?;
    let m12_1_model = fs::read(root.join(validation_m12_1::MODEL))?;
    let m12_2_model = fs::read(root.join(validation_m12_2::MODEL))?;
    let m12_model = fs::read(root.join(validation_m12::MODEL))?;
    let m13_model = fs::read(root.join(validation_m13::MODEL))?;
    let m4_origins = validation_m4::ORIGINS.map(|p| fs::read(root.join(p)).unwrap());
    if !ir.valid()
        || !ir.provenance_ok()
        || v.model != "specification/alloy/reagents/withdrawal.als"
        || !v.check(&raw, &fs::read(root.join(&v.model))?)
        || !v2.check(&raw, &identity, &state)
        || !v24.check(&raw, &composed, [&withdrawal, &identity, &state])
        || !v3.check(&raw, &loan)
        || !v4.check(&raw, &m4_model, [&m4_origins[0], &m4_origins[1]])
        || !v5.check(&raw, &m5_model)
        || !v6.check(&raw, &m6_model)
        || !v7.check(&raw, &m7_model)
        || !v8.check(&raw, &m8_model)
        || !v9.check(&raw, &m9_model)
        || !v10.check(&raw, &m10_model)
        || !v11.check(&raw, &m11_model)
        || !v12_1.check(&raw, &m12_1_model)
        || !v12_2.check(&raw, &m12_2_model)
        || !v12.check(&raw, &m12_model, [&m12_1_model, &m12_2_model])
        || !v13.check(
            &raw,
            &m13_model,
            [
                &fs::read(root.join(validation_m13::ORIGINS[0]))?,
                &fs::read(root.join(validation_m13::ORIGINS[1]))?,
                &fs::read(root.join(validation_m13::ORIGINS[2]))?,
                &fs::read(root.join(validation_m13::ORIGINS[3]))?,
                &fs::read(root.join(validation_m13::ORIGINS[4]))?,
            ],
        )
        || !m10_plaqueta_canonica(&ir)
        || !m11_exemplo_valido(&ir)
        || !m12_1_exemplo_valido(&ir)
        || !m12_2_exemplo_valido(&ir)
        || !m13_exemplo_valido(&ir)
    {
        return Err("IR ou validação inválida/stale; execute alloy-check".into());
    }
    let mut files = render::render(&ir, &v, &v2);
    files.insert(
        "invariants/frasco_reagente_m2_composed.tex".into(),
        render::render_composed(&v24),
    );
    files.insert(
        "invariants/emprestimo_reagente.tex".into(),
        render::render_loan(&v3),
    );
    files.insert(
        "invariants/retirada_devolucao_m4.tex".into(),
        render::render_withdrawal_return(&v4),
    );
    files.insert("invariants/formal_m5.tex".into(), render::render_m5(&v5));
    files.insert("invariants/formal_m6.tex".into(), render::render_m6(&v6));
    files.insert("invariants/formal_m7.tex".into(), render::render_m7(&v7));
    files.insert("invariants/formal_m8.tex".into(), render::render_m8(&v8));
    files.insert("invariants/formal_m9.tex".into(), render::render_m9(&v9));
    files.insert("invariants/formal_m10.tex".into(), render::render_m10(&v10));
    files.insert("invariants/formal_m11.tex".into(), render::render_m11(&v11));
    files.insert(
        "invariants/formal_m12_1.tex".into(),
        render::render_m12_1(&v12_1),
    );
    files.insert(
        "invariants/formal_m12_2.tex".into(),
        render::render_m12_2(&v12_2),
    );
    files.insert("invariants/formal_m12.tex".into(), render::render_m12(&v12));
    files.insert("invariants/formal_m13.tex".into(), render::render_m13(&v13));
    let entries: BTreeMap<_, _> = files
        .iter()
        .map(|(name, text)| (name.clone(), hash(text.as_bytes())))
        .collect();
    let manifest = serde_json::json!({
        "generator_version": env!("CARGO_PKG_VERSION"),
        "spec_ir_sha256": hash(&raw),
        "formal_validation_sha256": hash(&results),
        "formal_validation_m2_sha256": hash(&results_m2),
        "formal_validation_m24_sha256": hash(&results_m24),
        "formal_validation_m3_sha256": hash(&results_m3),
        "formal_validation_m4_sha256": hash(&results_m4),
        "formal_validation_m5_sha256": hash(&results_m5),
        "formal_validation_m6_sha256": hash(&results_m6),
        "formal_validation_m7_sha256": hash(&results_m7),
        "formal_validation_m8_sha256": hash(&results_m8),
        "formal_validation_m9_sha256": hash(&results_m9),
        "formal_validation_m10_sha256": hash(&results_m10),
        "formal_validation_m11_sha256": hash(&results_m11),
        "formal_validation_m12_1_sha256": hash(&results_m12_1),
        "formal_validation_m12_2_sha256": hash(&results_m12_2),
        "formal_validation_m12_sha256": hash(&results_m12),
        "formal_validation_m13_sha256": hash(&results_m13),
        "files": entries,
    });
    files.insert(
        "MANIFEST.json".into(),
        serde_json::to_string_pretty(&manifest)? + "\n",
    );
    Ok(files)
}
#[cfg(not(test))]
fn list(dir: &Path, base: &Path, result: &mut Vec<String>) -> Fallible<()> {
    if !dir.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(dir)? {
        let p = entry?.path();
        if p.is_dir() {
            list(&p, base, result)?;
        } else {
            result.push(p.strip_prefix(base)?.to_string_lossy().into_owned());
        }
    }
    Ok(())
}
#[cfg(not(test))]
fn main() -> Fallible<()> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    let check = args.first().is_some_and(|a| a == "--check");
    let root = match args.as_slice() {
        [arg, root] if arg == "--check" => Path::new(root),
        [root] if root != "--check" => Path::new(root),
        _ => return Err("Uso: lcqui-spec-doc [--check] RAIZ_REPOSITORIO".into()),
    };
    let files = generated(root)?;
    let output = root.join("documentation/generated");
    let mut existing = vec![];
    list(&output, &output, &mut existing)?;
    for file in &existing {
        if !files.contains_key(file) {
            return Err(format!("Arquivo gerado inesperado: {file}").into());
        }
    }
    for (name, content) in files {
        let path = output.join(&name);
        if check {
            if fs::read_to_string(&path).ok().as_deref() != Some(&content) {
                return Err(format!("Generated stale: {name}; execute docs-generate").into());
            }
        } else {
            fs::create_dir_all(path.parent().ok_or("Saída sem diretório")?)?;
            fs::write(path, content)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validation_rejects_tampered_inputs_and_failed_checks() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let raw = fs::read(root.join("build/spec-ir.json")).unwrap();
        let mut v: validation::Validation =
            serde_json::from_slice(&fs::read(root.join("build/formal-validation.json")).unwrap())
                .unwrap();
        let model = fs::read(root.join(&v.model)).unwrap();
        assert!(v.check(&raw, &model));
        assert!(!v.check(b"{}", &model));
        assert!(!v.check(&raw, b"changed model"));
        v.resultados[0].status = "SAT".into();
        assert!(!v.check(&raw, &model));
        v.resultados.clear();
        assert!(!v.check(&raw, &model));
    }
    #[test]
    fn manifest_links_ir_all_validations_and_outputs_deterministically() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let files = generated(&root).unwrap();
        let again = generated(&root).unwrap();
        assert_eq!(files, again);
        let manifest: serde_json::Value =
            serde_json::from_str(files.get("MANIFEST.json").unwrap()).unwrap();
        for (key, path) in [
            ("spec_ir_sha256", "build/spec-ir.json"),
            ("formal_validation_sha256", "build/formal-validation.json"),
            (
                "formal_validation_m2_sha256",
                "build/formal-validation-m2.json",
            ),
            (
                "formal_validation_m24_sha256",
                "build/formal-validation-m24.json",
            ),
            (
                "formal_validation_m3_sha256",
                "build/formal-validation-m3.json",
            ),
            (
                "formal_validation_m4_sha256",
                "build/formal-validation-m4.json",
            ),
            (
                "formal_validation_m5_sha256",
                "build/formal-validation-m5.json",
            ),
            (
                "formal_validation_m6_sha256",
                "build/formal-validation-m6.json",
            ),
            (
                "formal_validation_m7_sha256",
                "build/formal-validation-m7.json",
            ),
            (
                "formal_validation_m8_sha256",
                "build/formal-validation-m8.json",
            ),
            (
                "formal_validation_m9_sha256",
                "build/formal-validation-m9.json",
            ),
            (
                "formal_validation_m10_sha256",
                "build/formal-validation-m10.json",
            ),
            (
                "formal_validation_m11_sha256",
                "build/formal-validation-m11.json",
            ),
            (
                "formal_validation_m12_1_sha256",
                "build/formal-validation-m12-1.json",
            ),
            (
                "formal_validation_m12_2_sha256",
                "build/formal-validation-m12-2.json",
            ),
            (
                "formal_validation_m12_sha256",
                "build/formal-validation-m12.json",
            ),
            (
                "formal_validation_m13_sha256",
                "build/formal-validation-m13.json",
            ),
        ] {
            assert_eq!(manifest[key], hash(&fs::read(root.join(path)).unwrap()));
        }
        let outputs = manifest["files"].as_object().unwrap();
        for (name, digest) in outputs {
            assert_eq!(*digest, hash(files[name].as_bytes()));
        }
        for name in [
            "entities/frasco_reagente.tex",
            "entities/frasco_reagente_m2.tex",
            "invariants/retirar_frasco.tex",
            "invariants/frasco_reagente_m2.tex",
            "invariants/frasco_reagente_m2_composed.tex",
            "entities/emprestimo_reagente.tex",
            "invariants/emprestimo_reagente.tex",
            "invariants/retirada_devolucao_m4.tex",
            "invariants/formal_m5.tex",
            "invariants/formal_m6.tex",
            "invariants/formal_m7.tex",
            "invariants/formal_m8.tex",
            "invariants/formal_m9.tex",
            "invariants/formal_m10.tex",
            "invariants/formal_m11.tex",
            "invariants/formal_m12_1.tex",
            "invariants/formal_m12_2.tex",
            "invariants/formal_m12.tex",
            "invariants/formal_m13.tex",
        ] {
            assert!(outputs.contains_key(name), "saída ausente: {name}");
        }
    }
}

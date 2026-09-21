mod ir;
mod latex;
mod render;
mod validation;
mod validation_m2;
mod validation_m24;

use std::{collections::BTreeMap, error::Error, fs, path::Path};
use validation::hash;
type Fallible<T> = Result<T, Box<dyn Error>>;

fn generated(root: &Path) -> Fallible<BTreeMap<String, String>> {
    let raw = fs::read(root.join("build/spec-ir.json"))?;
    let results = fs::read(root.join("build/formal-validation.json"))?;
    let results_m2 = fs::read(root.join("build/formal-validation-m2.json"))?;
    let results_m24 = fs::read(root.join("build/formal-validation-m24.json"))?;
    let ir = ir::parse(&raw)?;
    let v: validation::Validation = serde_json::from_slice(&results)?;
    let v2: validation_m2::ValidationM2 = serde_json::from_slice(&results_m2)?;
    let v24: validation_m24::ValidationM24 = serde_json::from_slice(&results_m24)?;
    let identity = fs::read(root.join("specification/alloy/reagents/bottle_identity.als"))?;
    let state = fs::read(root.join("specification/alloy/reagents/bottle_state.als"))?;
    let withdrawal = fs::read(root.join(validation_m24::ORIGINS[0]))?;
    let composed = fs::read(root.join(validation_m24::MODEL))?;
    if !ir.valid()
        || !ir.provenance_ok()
        || v.model != "specification/alloy/reagents/withdrawal.als"
        || !v.check(&raw, &fs::read(root.join(&v.model))?)
        || !v2.check(&raw, &identity, &state)
        || !v24.check(&raw, &composed, [&withdrawal, &identity, &state])
    {
        return Err("IR ou validação inválida/stale; execute alloy-check".into());
    }
    let mut files = render::render(&ir, &v, &v2);
    files.insert(
        "invariants/frasco_reagente_m2_composed.tex".into(),
        render::render_composed(&v24),
    );
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
        "files": entries,
    });
    files.insert(
        "MANIFEST.json".into(),
        serde_json::to_string_pretty(&manifest)? + "\n",
    );
    Ok(files)
}
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
        ] {
            assert!(outputs.contains_key(name), "saída ausente: {name}");
        }
    }
}

/// Único ponto de escaping. Entrada sempre texto, nunca comandos LaTeX.
pub fn escape(text: &str) -> String {
    text.chars()
        .map(|c| match c {
            '_' => "\\_".into(),
            '%' => "\\%".into(),
            '&' => "\\&".into(),
            '#' => "\\#".into(),
            '$' => "\\$".into(),
            '{' => "\\{".into(),
            '}' => "\\}".into(),
            '~' => "\\textasciitilde{}".into(),
            '^' => "\\textasciicircum{}".into(),
            '\\' => "\\textbackslash{}".into(),
            _ => c.to_string(),
        })
        .collect()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn escapes_all_special_characters_without_reescaping() {
        assert_eq!(
            escape("_%&#${}~^\\"),
            "\\_\\%\\&\\#\\$\\{\\}\\textasciitilde{}\\textasciicircum{}\\textbackslash{}"
        );
        assert_eq!(escape("ação 0 desconhecido"), "ação 0 desconhecido");
    }
}

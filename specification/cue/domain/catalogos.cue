package domain

// Catálogos são projeções independentes. A compatibilidade é declarada pelo
// manifesto; nenhum catálogo pode ser interpretado como fonte canônica.
#CatalogoNome: "resumos" | "especificacoes" | "substancias" | "materias"

#CatalogoDescriptor: {
	versao_fonte:     int & >=0
	versao_publicada: int & >=0
	storage_path:     string | null
	sha256:           =~"^[a-f0-9]{64}$" | null
	if versao_publicada == 0 {
		storage_path: null
		sha256:       null
	}
	if versao_publicada > 0 {
		storage_path: string & =~"^catalogo-[a-z-]+/v[0-9]+-[a-f0-9]{64}\\.json$"
		sha256:       string & =~"^[a-f0-9]{64}$"
	}
}

#ManifestoCatalogos: {
	schema_version:    2
	manifesto_version: int & >=1
	compatibilidade: {
		resumos:        int & >=1
		especificacoes: int & >=1
		substancias:    int & >=1
		materias:       int & >=1
	}
	catalogos: {
		resumos:        #CatalogoDescriptor
		especificacoes: #CatalogoDescriptor
		substancias:    #CatalogoDescriptor
		materias:       #CatalogoDescriptor
	}
	// O manifesto somente anuncia versões efetivamente publicadas e
	// compatíveis entre si.
	compatibilidade: {
		resumos:        catalogos.resumos.versao_publicada
		especificacoes: catalogos.especificacoes.versao_publicada
		substancias:    catalogos.substancias.versao_publicada
		materias:       catalogos.materias.versao_publicada
	}
}

#CatalogosContrato: {
	manifesto: #ManifestoCatalogos
	// Uma atualização de fonte pode deixar a publicação pendente, mas não pode
	// alterar versões publicadas de catálogos não afetados.
	fontes: {
		resumos:        int & >=1
		especificacoes: int & >=1
		substancias:    int & >=1
		materias:       int & >=1
	}
}

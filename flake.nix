{
  description = "Ambiente de desenvolvimento de aplicações com Google Antigravity";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: 
    let
      system = "x86_64-linux"; # Altere se estiver usando macOS (aarch64-darwin) ou ARM Linux (aarch64-linux)
      pkgs = import nixpkgs {
        inherit system;
        config = {
          allowUnfree = true;
        };
      };
    in {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          # Pacote padrão do Antigravity
          antigravity
          
          # Versão FHS do Antigravity para maior compatibilidade com binários externos
          # (Útil quando o agente precisa baixar dependências dinâmicas não geridas pelo Nix)
          antigravity-fhs 
          
          # Google Cloud CLI e ferramentas essenciais
          google-cloud-sdk
          
          # Outras ferramentas comuns para desenvolvimento
          git
          nodejs
          python3
        ];

        shellHook = ''
          echo "🚀 Ambiente de desenvolvimento carregado!"
          echo "Execute 'antigravity' ou 'antigravity-fhs' para iniciar a IDE."
          echo "Google Cloud CLI disponível via comando: 'gcloud'"
        '';
      };
    };
}

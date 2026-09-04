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
          # Versão FHS (fornece o comando 'antigravity-ide')
          antigravity-ide-fhs

          # Google Cloud CLI e ferramentas essenciais
          google-cloud-sdk

          # Outras ferramentas comuns para desenvolvimento
          git
          nodejs
          python3
        ];

        shellHook = ''
          echo "🚀 Ambiente de desenvolvimento carregado!"
          echo "Execute 'antigravity-ide' para iniciar a IDE (rodando em modo FHS)."
          echo "Google Cloud CLI disponível via comando: 'gcloud'"
        '';
     };
    };
}


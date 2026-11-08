{
  description = "Dev environment for gym-app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bash-completion
            git
            nodejs_24 # includes npm
          ];

          shellHook = ''
            source ${pkgs.bash-completion}/etc/profile.d/bash_completion.sh

            # use the repo's git hooks (conventional commits)
            git config core.hooksPath .githooks

            export DEVENV="gym-app"
            echo "Development environment is ready 󱓟 "
          '';
        };
      });
}

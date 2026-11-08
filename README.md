# Gym App

## Setup

`direnv allow` loads the dev shell from `nix/flake.nix`. Add project tools to
`buildInputs` there.

## Layout

- `.envrc`: loads the flake dev shell via direnv
- `nix/flake.nix`: dev shell definition (nixpkgs unstable + flake-utils)
- `.githooks/`: git hooks, enabled automatically by the dev shell
- `.sops.yaml`: sops encryption rules (age)
- `renovate.json`: dependency update config

## Commits

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/),
e.g. `feat(login): add user authentication`. Enforced by `.githooks/commit-msg`.

# Gym App

Personal gym log for one iPhone, installed as a PWA (Safari → Share → Add to
Home Screen). Works fully offline; all data stays on the phone.

- **Train**: start a program day, log weight × reps per set (saved instantly),
  "Last time" shown and prefilled, rest timer that survives backgrounding
- **Programs**: edit programs, days, exercises and targets; exercise library
- **History**: browse, edit and delete past workouts
- **Progress**: per-exercise charts of top set, estimated 1RM and volume
- **Settings** (gear on Train): kg/lb, default rest, rest-over sound,
  JSON backup & restore with a 14-day backup reminder

See `acceptance-test.md` for the on-phone test checklist.

## Setup

`direnv allow` loads the dev shell from `nix/flake.nix`. Add project tools to
`buildInputs` there.

## Layout

- `.envrc`: loads the flake dev shell via direnv
- `nix/flake.nix`: dev shell definition (nixpkgs unstable + flake-utils)
- `.githooks/`: git hooks, enabled automatically by the dev shell

## Commits

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/),
e.g. `feat(login): add user authentication`. Enforced by `.githooks/commit-msg`.

## Development

- `npm run dev`: dev server
- `npm test` / `npm run lint` / `npm run build`
- `npm run icons`: regenerate the app icons in `public/`

`src/db/seed.ts` is generated from `programs.md` by a Vite plugin on every
dev/build run. Commit it whenever `programs.md` changes; CI fails if they drift.
The seed is only applied when the on-device database is first created.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml` (lint, test, build) and
publishes `dist/` to GitHub Pages at https://willy-kind.github.io/gym-app/.
One-time setup: repo Settings → Pages → Source: **GitHub Actions**.

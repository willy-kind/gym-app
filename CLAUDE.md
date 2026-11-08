# CLAUDE.md — Gym App

## What this is
A personal gym app for one user on an iPhone. It holds my training programs and is used in the gym to log sessions (weight × reps per set), with a rest timer, my previous numbers visible while logging, and progress charts.

It is a **Progressive Web App (PWA)** installed on the iPhone via Safari → Share → "Add to Home Screen". There is no Mac, so no native/Xcode build. It must look and feel like a native iOS app.

## Hard requirements
- **Offline-first.** Works with no signal in the gym. All data stored on the device.
- **No backend, no accounts, no analytics.** Data never leaves the phone except via manual export.
- **Mobile only.** Design for iPhone portrait (375–430 px wide). Desktop just needs to not break.
- **One-handed, sweaty-hands friendly.** Big tap targets (min 44×44 pt), primary actions in the bottom third of the screen.
- **Never lose a logged set.** Save every set immediately on entry, not at the end of the session. An unfinished session must survive the app being closed or killed.

## Tech stack
- Vite + React + TypeScript (strict mode)
- Tailwind CSS
- Dexie.js (IndexedDB) for storage
- vite-plugin-pwa (manifest + service worker, precache everything)
- Recharts for charts
- React Router (hash router, so static hosting works without rewrites)
- Vitest for unit tests
- Hosted as static files on GitHub Pages (HTTPS is required for PWA install)

Do not add other dependencies without asking first.

## Data model (Dexie)
- `exercises`: id, name, muscleGroup?, notes?
- `programs`: id, name, notes?, archived (bool)
- `programDays`: id, programId, name (e.g. "Push A"), order
- `programDayExercises`: id, programDayId, exerciseId, order, targetSets, targetReps (string, e.g. "8-10"), targetWeight?, restSeconds
- `sessions`: id, programDayId?, startedAt, finishedAt?, notes?
- `sets`: id, sessionId, exerciseId, order, weight (kg, number), reps, isWarmup (bool), completedAt

Use Dexie versioned schema migrations — never change a schema without bumping the version and writing a migration.

## Features (build in this order)
1. **App shell + PWA**: bottom tab bar (Train / Programs / History / Progress), manifest, icons, installable, works offline.
2. **Exercises & programs**: create/edit/reorder programs, days, and exercises within a day.
3. **Logging a session**: pick a program day → list of exercises → log sets (weight × reps) with steppers and number inputs. Prefill each set with the previous session's values for that exercise. Show "Last time: 80 kg × 8, 8, 7" under each exercise. Allow adding an exercise ad-hoc. "Finish session" button.
4. **Rest timer**: auto-starts after a set is logged, using the exercise's restSeconds. Timer must be timestamp-based (store the end time) so it stays correct if the app is backgrounded. Show a sticky bar with time left, +15s / −15s / skip.
5. **History**: list of past sessions, tap to view/edit/delete.
6. **Progress**: per-exercise charts — top set weight, estimated 1RM (Epley: w × (1 + reps/30)), and total volume over time.
7. **Import / export**:
   - Export all data as a JSON file (via share sheet / download).
   - Import that JSON back (full restore, with a confirmation step).
   - Import a CSV export from my previous app (sample file in `/import-samples/`). Map it to sessions/sets/exercises; show a preview before saving.
8. **Settings**: rest timer default, kg/lb display, "Last backup" date with a reminder if older than 14 days.

## iOS PWA gotchas (important)
- Call `navigator.storage.persist()` on first launch.
- Set `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, apple-touch-icon (180×180), and handle safe areas with `env(safe-area-inset-*)`.
- `viewport-fit=cover`; prevent zoom on input focus by using font-size ≥ 16px on inputs.
- Use `inputmode="decimal"` for weight and `inputmode="numeric"` for reps.
- The Vibration API does not work on iOS — don't rely on it. Timer-done feedback is visual (and a short sound if the user enabled it).
- Background timers are paused by iOS; always compute remaining time from stored timestamps.
- Supports dark mode via `prefers-color-scheme`; dark is the default look.

## Project structure
```
src/
  db/          Dexie schema, migrations, data access functions
  features/    programs/, session/, history/, progress/, settings/, import-export/
  components/  shared UI (buttons, steppers, sheets, tab bar)
  lib/         pure helpers (1RM, volume, date formatting, CSV parsing)
  test/
public/        icons, manifest assets
import-samples/
```
Keep business logic in `lib/` and `db/` as pure, tested functions. Components stay thin.

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run preview` — preview the build
- `npm test` — run tests
- `npm run lint` — ESLint + TypeScript check

## Working rules for Claude
- Work feature by feature in the order above. After each feature: run lint, tests and build, then stop and summarize what to test on the phone.
- Write tests for everything in `lib/` and for the CSV/JSON import logic.
- Commit after each working feature with a clear message.
- Ask before changing the data model, adding dependencies, or changing the feature order.
- Keep the UI simple and fast. No splash animations, no onboarding screens.
- Units: store weight in kg internally; convert only for display.

## Deployment
GitHub Pages via a GitHub Actions workflow on push to `main`. Set Vite `base` to the repo name. After deploy, open the URL in Safari on the iPhone → Share → Add to Home Screen.

import type { SeedProgram } from './parsePrograms.ts'

/** Renders the generated src/db/seed.ts module. Deterministic so the file only changes when programs.md does. */
export function renderSeedModule(programs: SeedProgram[]): string {
  return `// GENERATED FROM programs.md at build time — do not edit by hand.
// Edit programs.md and run \`npm run build\` (or \`npm run dev\`) to regenerate.
import type { SeedProgram } from '../lib/parsePrograms'

export const seedPrograms: SeedProgram[] = ${JSON.stringify(programs, null, 2)}
`
}

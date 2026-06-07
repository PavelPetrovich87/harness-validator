# Plan: Review, fix, and restructure the `harness-validator` skill

## Goal

1. Review the skill in `output/harness-validator/` (done — findings below).
2. Fix the issues found (focus: **all `SKILL.md` command bugs**, per user).
3. Restructure the repo so the **root = the runnable skill** and a single
   `docs/` folder holds everything that is not skill code.

## Decisions (confirmed with user)

- **Target layout:** Root = skill (`SKILL.md` + code); `docs/` = everything else.
- **Duplicates:** Root is canonical. Keep root `tests/`. Add the corrected
  `SKILL.md` to root, then delete the redundant `output/` folder.
- **"проапдейти":** Fix all `SKILL.md` command bugs.

---

## Review summary (findings)

### Structure / duplication
- `output/harness-validator/{src,templates,schemas,scripts,package.json,README.md}`
  are **byte-identical** to the repo-root copies (verified via `diff -rq`).
- `output/` adds `SKILL.md`, omits `tests/`.
- A **third, divergent** `SKILL.md` lives in `.kilo/skills/harness-validator/`.
- Net: the skill exists in 2 places + 2 divergent `SKILL.md` files.

### Bugs in `output/harness-validator/SKILL.md` (the reviewed file)
1. **Broken setup command:** documents `npx tsx src/setup.ts --project ...`,
   but `src/setup.ts` only *exports* `runSetup()` — it has **no CLI `main()`**.
   Real entrypoint is `setup-harness.ts` (`npm run setup` / `npm run setup:ci`).
2. **Wrong non-interactive invocation:** `--non-interactive` belongs to
   `setup-harness.ts`, not `src/setup.ts`.
3. **Missing flags:** does not mention `--answers-json <path>` (setup) or
   `--template <name>` (dogfood).

### Bug in `.kilo/skills/harness-validator/SKILL.md` (otherwise the most accurate)
4. Documents `setup-harness.ts --answers answers.json`, but the actual flag is
   **`--answers-json`** (see `setup-harness.ts:14,33`).

### Cross-file inconsistencies
5. **Phase count:** code runs **5 phases** (`src/validator.ts:24` "Run all 5
   validation phases"; 5 `src/phases/*` imports). `README.md` says
   "Validator: 4 фазы". The `.kilo` SKILL.md correctly says 5.
6. **README inaccuracies** (Russian spec): claims `biome.json` is a generated
   artifact (the pipeline generator in `src/generators/quality-pipeline.ts`
   never writes it); references `docs/knowledge/.schema.json` (real path is
   `schemas/knowledge_frontmatter.schema.json`); links `TICKETS.md` which is not
   bundled in `output/`.

### Accurate parts (no change needed)
- Stack-detection table, architecture-patterns table, quality-pipeline command
  table, safety rules, circuit-breaker section all match the code
  (`src/generate-agents.ts`, `src/detect-architecture.ts`,
  `src/generators/quality-pipeline.ts`).
- `generate-agents.ts` / `setup-harness.ts` / `validate-harness.ts` at root are
  thin CLI wrappers over `src/` libraries — correct, not duplicates.

---

## Verified ground-truth commands (from code)

- Interactive setup: `npm run setup` → `tsx setup-harness.ts`
- Non-interactive: `npm run setup:ci` → `tsx setup-harness.ts --non-interactive`
- Setup flags (`setup-harness.ts`): `--project <path>`, `--answers-json <path>`,
  `--non-interactive`, `--help`
- Validate: `npm run validate` → `tsx validate-harness.ts`; flags
  `--project <path>`, `--github`, `--help`
- Dogfood: `npm run dogfood` → `tsx scripts/dogfood.ts`; flags
  `--template <react-vite|nextjs|nuxt|python>` or `--all`; env
  `HARNESS_DOGFOOD_SYNTHETIC=1`
- Validator phases = **5**: ast-structure → instruction-modules → architecture →
  data-contracts → integration.

---

## Implementation steps

### Step 1 — Produce the corrected canonical `SKILL.md` at repo root
Create `/Users/user/work/harness_project/SKILL.md` using the well-structured
`.kilo` version, with all bugs fixed and the useful reference tables from the
`output` version folded in. Concretely:

- Keep frontmatter `name: harness-validator` and the `.kilo` `description`
  (the "Set up AI Harness validation artifacts... Trigger phrases:" text — this
  is the one currently loaded).
- **Commands section** (correct, npm-script based):
  - Interactive: `npm run setup`
  - Non-interactive (CI): `npm run setup:ci`
  - With answers file: `npx tsx setup-harness.ts --answers-json answers.json`
    *(fix: was `--answers`)*
  - Validate only: `npx tsx validate-harness.ts --project <path>`
  - Dogfood single: `HARNESS_DOGFOOD_SYNTHETIC=1 npm run dogfood -- --template react-vite`
  - Dogfood all: `HARNESS_DOGFOOD_SYNTHETIC=1 npm run dogfood -- --all`
  - Supported templates: `react-vite`, `nextjs`, `nuxt`, `python`
- **Workflow section:** state the setup flow ends with the **5-phase** validator
  (not "src/setup.ts"). Keep the dogfood flow steps.
- Fold in accurate reference tables from `output/SKILL.md`: Detected Stacks,
  Architecture Patterns, Quality Pipeline Commands by Stack.
- Keep: Generated Artifacts table, Important Flags
  (`--non-interactive`, `--answers-json`, `HARNESS_DOGFOOD_SYNTHETIC=1`),
  Common Issues, Safety Rules, Feedback Loop, Circuit Breaker.
- Remove every reference to `npx tsx src/setup.ts`.

### Step 2 — Move non-skill documentation into `docs/`
`docs/` already exists (contains `knowledge/`). Move into it:
- `README.md` (the AI Harness v1.1 Russian spec) → `docs/README.md`
- `DEVELOPER_FLOWS.md` → `docs/DEVELOPER_FLOWS.md`
- `TICKETS.md` → `docs/TICKETS.md`
- `harness-hybrid-spec-v1.1.pdf` → `docs/harness-hybrid-spec-v1.1.pdf`
- `harness-roadmap-1.1.pdf` → `docs/harness-roadmap-1.1.pdf`

(Use `git mv` to preserve history.)

### Step 3 — Remove the redundant `output/` folder
After Step 1 copies the corrected `SKILL.md` to root (root code is already
identical to `output/`), delete `output/` entirely (`git rm -r output`).
Also remove stray `.DS_Store` files (`output/.DS_Store`, root `.DS_Store`) and
add `.DS_Store` to `.gitignore` if not present.

### Step 4 — Keep at root (skill code — do NOT move)
`SKILL.md`, `src/`, `templates/`, `schemas/`, `scripts/`, `tests/`,
`generate-agents.ts`, `setup-harness.ts`, `validate-harness.ts`,
`package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`,
`lefthook.yml`, `.dependency-cruiser.js`, `feature_list.json`,
`feature_list.schema.json`, `AGENTS.md`, `.github/`, `.harness/`, `.claude/`,
`.kilo/`, `.gitignore`, `.git/`.

### Step 5 — Validation
- `npm run validate` (root) → expect 5 phases run, exit 0.
- `HARNESS_DOGFOOD_SYNTHETIC=1 npm run dogfood -- --template react-vite`
  → expect PASS, confirms the documented commands actually work.
- Re-read root `SKILL.md` to confirm no `src/setup.ts` references remain and
  all flags match `setup-harness.ts` / `dogfood.ts`.

---

## Optional (out of confirmed scope — flag to user, do not do unless approved)
- Sync `.kilo/skills/harness-validator/SKILL.md` to the new canonical root
  `SKILL.md` (fixes its `--answers` bug so the *loaded* skill matches).
- Fix README spec inaccuracies (phase count 4→5, drop `biome.json` artifact
  claim, correct knowledge-schema path) now that it lives in `docs/`.

## Final root layout (after plan)
```
harness_project/
├── SKILL.md                 # corrected, canonical
├── src/ templates/ schemas/ scripts/ tests/
├── generate-agents.ts  setup-harness.ts  validate-harness.ts
├── package.json  package-lock.json  tsconfig.json  vitest.config.ts
├── lefthook.yml  .dependency-cruiser.js
├── feature_list.json  feature_list.schema.json  AGENTS.md
├── docs/                    # README spec, DEVELOPER_FLOWS, TICKETS, PDFs, knowledge/
├── .github/ .harness/ .claude/ .kilo/
└── (output/ removed)
```

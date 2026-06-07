---
name: harness-validator
description: >-
  Set up AI Harness validation artifacts for any software project. Use this skill
  when the user wants to initialize AGENTS.md, set up quality pipelines
  (lefthook, CI workflows), generate architecture rules, or validate an existing
  project against the Harness standard. Also use when running dogfooding tests
  to verify the Harness setup flow works on real or synthetic projects.

  Trigger phrases: "set up harness", "generate AGENTS.md", "run dogfood",
  "validate project", "init harness", "run setup flow", "bootstrap project".
---

# Harness Validator

Set up and validate AI Harness artifacts for software projects. This is a hybrid
skill: a TypeScript toolchain (`src/`, `scripts/`) plus reference docs and
focused sub-skills.

## When to Use

- Project is missing `AGENTS.md` or `.harness/manifest.json`
- User wants to add lefthook pre-commit hooks or a CI workflow
- User wants to validate an existing project against Harness standards
- User wants to run dogfooding tests against the harness itself
- Setting up a new project with Harness compliance from day one

## Project Requirements

Operates on the current working directory (or a `--project` path). The target
must have a recognizable stack: `package.json` (JS/TS), `pyproject.toml` /
`requirements.txt` (Python), or `go.mod` (Go).

## Skill Layout

| Path | Role |
|------|------|
| `scripts/` | Executable CLI entrypoints (`setup-harness.ts`, `validate-harness.ts`, `generate-agents.ts`, `dogfood.ts`) |
| `src/` | Library implementation (generators, validator phases, dogfood, utils) |
| `templates/` | Output **assets** copied into target projects (see [references/artifacts.md](references/artifacts.md)) |
| `schemas/` | JSON Schemas for data contracts |
| `references/` | Detailed docs, loaded on demand |
| `tests/` | unit / integration / e2e suites |

## Commands

Run from the skill root. All entrypoints live under `scripts/`.

```bash
# Interactive setup
npm run setup

# Non-interactive setup (CI / defaults)
npm run setup:ci

# Setup with a pre-written answers file
npx tsx scripts/setup-harness.ts --answers-json answers.json

# Validate only (no generation)
npx tsx scripts/validate-harness.ts --project <path>

# Dogfood — single template (synthetic, fast)
HARNESS_DOGFOOD_SYNTHETIC=1 npm run dogfood -- --template react-vite

# Dogfood — all stacks (synthetic)
HARNESS_DOGFOOD_SYNTHETIC=1 npm run dogfood -- --all
```

Supported dogfood templates: `react-vite`, `nextjs`, `nuxt`, `python`.

## Sub-Skills (workflow pack)

For step-by-step procedures, use the focused sub-skill that matches the task:

- **`harness-setup`** — full setup flow (detect → generate → validate → circuit breaker)
- **`harness-validate`** — 5-phase AST validation of an existing project
- **`harness-dogfood`** — test the harness on disposable real/synthetic projects

## Reference Material

Load only what the task needs:

- Stack detection, architecture patterns, pipeline commands → [references/stacks-and-patterns.md](references/stacks-and-patterns.md)
- Generated artifacts catalog & assets layer → [references/artifacts.md](references/artifacts.md)
- Flags, common issues, safety rules, feedback loop, circuit breaker → [references/troubleshooting.md](references/troubleshooting.md)

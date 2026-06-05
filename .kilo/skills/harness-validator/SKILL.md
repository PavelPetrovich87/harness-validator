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

Set up and validate AI Harness artifacts for software projects.

## When to Use

- Project is missing `AGENTS.md` or `.harness/manifest.json`
- User wants to add lefthook pre-commit hooks or CI workflow
- User wants to validate an existing project against Harness standards
- User wants to run dogfooding tests against the harness itself
- Setting up a new project with Harness compliance from day one

## Project Requirements

This skill operates on the **current working directory** (or a specified project root).
The project must have a recognizable stack:

- **JS/TS**: `package.json` with dependencies
- **Python**: `pyproject.toml` or `requirements.txt`
- **Go**: `go.mod`

## Commands

### 1. Interactive Setup

Run the full interactive setup flow (asks questions about architecture pattern,
git subtree, etc.):

```bash
npm run setup
```

### 2. Non-Interactive Setup (CI)

Run setup with defaults, no prompts:

```bash
npm run setup:ci
```

Or with a pre-written answers file:

```bash
npx tsx setup-harness.ts --answers answers.json
```

### 3. Dogfooding (Test Harness on Real Projects)

Test the harness against a specific project template:

```bash
# Single template (synthetic, fast)
HARNESS_DOGFOOD_SYNTHETIC=1 npm run dogfood -- --template react-vite

# All 4 stacks (synthetic)
HARNESS_DOGFOOD_SYNTHETIC=1 npm run dogfood -- --all

# Real CLI scaffolders (network required, 30-120s per project)
npm run dogfood -- --all
```

Supported templates: `react-vite`, `nextjs`, `nuxt`, `python`.

### 4. Validation Only

Validate an existing project without generating artifacts:

```bash
npx tsx validate-harness.ts --project <path>
```

## Workflow

### Setup Flow (Full)

1. **Detect stack** — Scan `package.json`, `pyproject.toml`, `go.mod`
2. **Generate AGENTS.md** — Stack, commands, safety rules, architecture rules
3. **Generate quality pipeline** — `lefthook.yml` + `.github/workflows/ci.yml`
4. **Generate instruction modules** — `.claude/instructions/local/` + `shared/`
5. **Generate knowledge base** — `docs/knowledge/.template-*.md`
6. **Copy architecture rules** — `.dependency-cruiser.js` (if pattern != skip)
7. **Copy validator** — `.harness/validator/` for CI-only mode
8. **Run validator** — 5-phase AST-based validation
9. **Circuit breaker** — Auto-retry up to 3 times if validation fails

### Dogfood Flow

1. **Bootstrap** — Create disposable project (real CLI or synthetic)
2. **Inject** — Copy harness `templates/` and `schemas/` into temp project
3. **Setup** — Run `runSetup(tempDir, { harnessRoot: repoRoot })`
4. **Verify** — 4 phases: artifacts, content, execution, manifest
5. **Report** — Write `dogfood-report.json` with summary
6. **Cleanup** — Remove temp directory

## Generated Artifacts

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent instructions (stack, commands, safety, rules) |
| `lefthook.yml` | Pre-commit hooks (lint, typecheck, test, architecture) |
| `.github/workflows/ci.yml` | GitHub Actions workflow |
| `.dependency-cruiser.js` | Architecture layer rules |
| `.claude/instructions/local/` | Project-specific instructions |
| `.claude/instructions/shared/` | Shared instruction templates |
| `docs/knowledge/` | Lesson/pattern/decision templates |
| `feature_list.json` | Feature tracking |
| `.harness/manifest.json` | Validation manifest |
| `.harness/validator/` | Standalone validator for CI |

## Important Flags

- `HARNESS_DOGFOOD_SYNTHETIC=1` — Use minimal synthetic projects instead of real CLI scaffolders
- `--non-interactive` — Skip all prompts, use auto-detected defaults
- `--answers <path>` — Load setup answers from JSON file

## Common Issues

- **No recognizable stack found** — Ensure `package.json`, `pyproject.toml`, or `go.mod` exists
- **Validator fails on `.dependency-cruiser.js`** — Provide `pattern: layered` in answers JSON for synthetic projects
- **Templates not found** — When calling `runSetup()` programmatically, pass `harnessRoot` pointing to this repo

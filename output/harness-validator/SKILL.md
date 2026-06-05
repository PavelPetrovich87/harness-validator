---
name: harness-validator
description: >-
  Set up AI Harness validation for any software project. Use when initializing
  a new project, when AGENTS.md is missing or outdated, when setting up
  lefthook pre-commit hooks, CI workflows, architecture rules, or instruction
  modules for AI agents. Covers React/Vite, Next.js, Nuxt, Python, and Go
  stacks. Always use this skill before starting work on a codebase that lacks
  harness artifacts.
---

# Harness Validator Skill

## Purpose

Generate all 8 harness artifacts that validate an AI agent's context and enforce
project standards:

1. **AGENTS.md** — Stack, commands, safety rules, session protocol
2. **lefthook.yml** — Pre-commit quality pipeline
3. **.github/workflows/ci.yml** — CI workflow
4. **.dependency-cruiser.js** — Architecture layer rules
5. **feature_list.json** — Feature tracking
6. **docs/knowledge/** — Lesson templates for feedback loop
7. **.claude/instructions/** — Local and shared instruction modules
8. **.harness/manifest.json** + validator — AST-based validation

## When to Use

- Project has no `AGENTS.md`
- Onboarding a new repository for AI agent work
- Setting up pre-commit hooks or CI for the first time
- Adding architecture enforcement (layered, hexagonal, monorepo)
- After changing tech stack (adding TypeScript, React, Python, etc.)

## Detected Stacks

| Manifest File | Detected Labels |
|---------------|-----------------|
| `package.json` | TypeScript, React, Next.js, Nuxt, Vite, Node.js |
| `pyproject.toml` / `requirements.txt` | Python, Django, Flask, FastAPI |
| `go.mod` | Go |

## Workflow

### Step 1: Detect stack

```bash
npx tsx src/setup.ts --project /path/to/target-project
```

Or non-interactive (CI mode):

```bash
npx tsx src/setup.ts --project /path/to/target-project --non-interactive
```

### Step 2: Generate artifacts

The setup flow automatically generates all 8 artifacts based on detected stack
and architecture pattern.

### Step 3: Validate

```bash
npx tsx validate-harness.ts --project /path/to/target-project
```

### Step 4: Dogfooding (validate the harness itself)

```bash
# Synthetic mode (fast, no network)
HARNESS_DOGFOOD_SYNTHETIC=1 npx tsx scripts/dogfood.ts --all

# Real CLI scaffolders (slow, downloads from npm)
npx tsx scripts/dogfood.ts --all
```

## Architecture Patterns

| Pattern | Heuristic | File |
|---------|-----------|------|
| Monorepo | `packages/` or `apps/` with 2+ `package.json` | `monorepo.js` |
| Hexagonal | `src/domain/` + `src/application/` | `hexagonal.js` |
| Layered | `src/ui/` + `src/services/` | `layered-app.js` |

## Quality Pipeline Commands by Stack

| Stack | Lint | Typecheck | Test |
|-------|------|-----------|------|
| JS/TS | `biome check` | `npx tsc --noEmit` | `npm test` |
| Python | `ruff check` | `mypy` | `pytest` |
| Go | `golangci-lint run` | `go vet` | `go test ./...` |

## Safety Rules (Always Enforced)

- Do NOT run `rm -rf` on project directories
- Do NOT use `git push --force`
- Do NOT run `curl | sh` without verification
- Do NOT edit `.env` files directly
- Do NOT modify CSP headers without review
- Do NOT install packages with postinstall scripts unchecked

## Feedback Loop

When pipeline catches an error, record a lesson in `docs/knowledge/`.
Lessons follow `.template-lesson.md` format with type, tags, date, severity.

## Circuit Breaker

- ATTEMPTS_LIMIT=3
- After 3 failed pipeline fixes — STOP and create triage_report.md
- Circuit breaker resets when a fix succeeds
- Circuit breaker state is per-feature

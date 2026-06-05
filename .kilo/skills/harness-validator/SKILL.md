---
name: harness-validator
description: >-
  Set up AI Harness validation for any software project. Use when initializing
  a new project, when AGENTS.md is missing or outdated, when setting up
  lefthook pre-commit hooks, CI workflows, architecture rules, or instruction
  modules for AI agents. Covers React/Vite, Next.js, Nuxt, Python, and Go
  stacks. Always use this skill before starting work on a codebase that lacks
  harness artifacts.
version: "0.1.0"
author: "Pavel Petrovich"
compatibility: ["claude-code", "codex", "openclaw"]
allowed-tools: ["Bash", "Read", "Write", "Edit"]
---

# Harness Validator

Generate and validate AI Harness artifacts for software projects.

## When to Use

- Project has no `AGENTS.md`
- Onboarding a new repository for AI agent work
- Setting up pre-commit hooks or CI for the first time
- Adding architecture enforcement (layered, hexagonal, monorepo)
- After changing tech stack (adding TypeScript, React, Python, etc.)
- Running dogfooding tests to verify the harness itself

## Workflow

### Step 1: Detect stack

```bash
npx tsx src/setup.ts --project /path/to/target-project
```

CI mode (non-interactive, no prompts):

```bash
npx tsx src/setup.ts --project /path/to/target-project --non-interactive
```

### Step 2: Generate artifacts

The setup flow generates all 8 harness artifacts based on detected stack and
architecture pattern. See `references/` for full details on architecture
patterns and quality pipeline commands.

### Step 3: Validate

```bash
npx tsx validate-harness.ts --project /path/to/target-project
```

### Step 4: Dogfooding

```bash
# Synthetic mode (fast, no network)
HARNESS_DOGFOOD_SYNTHETIC=1 npx tsx scripts/dogfood.ts --all

# Real CLI scaffolders (slow, downloads from npm)
npx tsx scripts/dogfood.ts --all
```

## Error Handling

| Condition | Behavior | User Action |
|---|---|---|
| No recognizable stack | Exit code 1, prints supported stacks | Add `package.json`, `pyproject.toml`, or `go.mod` |
| Validation fails | `manifest.json` lists errors, circuit breaker counts attempt | Fix errors, retry. After 3 failures, create triage report. |
| Missing templates | Error with `harnessRoot` hint | Pass `--harness-root` or run from repo root |
| Architecture pattern mismatch | dependency-cruiser warnings | Adjust pattern in answers or skip with `pattern: skip` |

## Safety Rules (Always Enforced)

- Do NOT run `rm -rf` on project directories
- Do NOT use `git push --force`
- Do NOT run `curl \| sh` without verification
- Do NOT edit `.env` files directly
- Do NOT modify CSP headers without review
- Do NOT install packages with postinstall scripts unchecked

## Circuit Breaker

- ATTEMPTS_LIMIT = 3 per feature
- After 3 failed fixes: STOP, create `triage_report.md`, hand off to human
- Circuit breaker resets on successful fix
- State is per-feature (F02 failure does not affect F03)

## Feedback Loop

When pipeline catches an error, record a lesson in `docs/knowledge/`.
Lessons follow `.template-lesson.md` format with type, tags, date, severity.
Update instructions based on lessons learned. Review output before applying.
Report deviations to AGENTS.md.

---
name: harness-setup
description: >-
  Run the AI Harness setup flow for a project: detect the stack, generate
  AGENTS.md, the quality pipeline (lefthook + CI), instruction modules,
  knowledge base, architecture rules, and the CI-only validator, then run the
  validator with an automatic circuit breaker. Use when the user wants to
  initialize or bootstrap Harness compliance in a project.

  Trigger phrases: "set up harness", "init harness", "bootstrap project",
  "generate AGENTS.md", "run setup flow".
---

# Harness Setup

Generates and validates AI Harness artifacts in a target project. Part of the
`harness-validator` skill pack.

## Commands

Run from the harness skill root.

```bash
# Interactive (asks about architecture pattern, git subtree, etc.)
npm run setup

# Non-interactive (defaults)
npm run setup:ci

# With a pre-written answers file
npx tsx scripts/setup-harness.ts --answers-json answers.json

# Target a specific project root
npx tsx scripts/setup-harness.ts --project <path>
```

## Setup Flow

1. **Detect stack** — scan `package.json`, `pyproject.toml`, `go.mod`
2. **Generate AGENTS.md** — stack, commands, safety rules, architecture rules
3. **Generate quality pipeline** — `lefthook.yml` + `.github/workflows/ci.yml`
4. **Generate instruction modules** — `.claude/instructions/local/` + `shared/`
5. **Generate knowledge base** — `docs/knowledge/.template-*.md`
6. **Copy architecture rules** — `.dependency-cruiser.js` (skipped if pattern = skip)
7. **Copy validator** — `.harness/validator/` for CI-only mode
8. **Run validator** — 5-phase AST-based validation
9. **Circuit breaker** — auto-retry up to 3 times if validation fails

## Programmatic use

`scripts/setup-harness.ts` is a thin CLI over `runSetup()` in `src/setup.ts`.
When calling `runSetup()` directly, pass `harnessRoot` so `templates/` and
`schemas/` resolve.

## Reference

- Detected stacks, architecture patterns, pipeline commands → `references/stacks-and-patterns.md`
- Generated artifacts → `references/artifacts.md`
- Flags, common issues, safety, circuit breaker → `references/troubleshooting.md`

---
name: harness-validate
description: >-
  Validate an existing project against the AI Harness standard using the 5-phase
  AST-based validator (no LLM, deterministic). Use when the user wants to check
  whether a project meets Harness requirements, run the validation gate, or
  produce a manifest — without generating or modifying artifacts.

  Trigger phrases: "validate project", "run the validator", "check harness
  compliance", "run validation gate".
---

# Harness Validate

Deterministic, AST-based validation of an existing project. Part of the
`harness-validator` skill pack. Does not generate or modify artifacts.

## Commands

```bash
# Validate the current project
npm run validate

# Validate a specific project
npx tsx scripts/validate-harness.ts --project <path>

# Emit GitHub Actions annotations (CI)
npx tsx scripts/validate-harness.ts --github --project <path>
```

Results are written to `.harness/manifest.json`. Exit code is non-zero on
failure, making it a CI gate.

## The 5 Validation Phases

Run in order by `src/validator.ts`:

1. **ast-structure** — Markdown AST structure of `AGENTS.md` and friends
2. **instruction-modules** — `.claude/instructions/` modules present & well-formed
3. **architecture** — `.dependency-cruiser.js` rules hold (`depcruise`)
4. **data-contracts** — JSON Schema validation of manifest / feature_list / knowledge frontmatter
5. **integration** — `lefthook.yml` + `.github/workflows/ci.yml` wiring

## CI-only mode

Setup copies a standalone validator into the target project at
`.harness/validator/` (entrypoint: `.harness/validator/scripts/validate-harness.ts`)
with an isolated `package.json`. The generated CI workflow runs:

```bash
cd .harness/validator && npx tsx scripts/validate-harness.ts --github --project ../..
```

## Reference

- Flags & common issues → `references/troubleshooting.md`
- Data contracts → `schemas/`

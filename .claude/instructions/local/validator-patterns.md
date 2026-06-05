---
name: Validator Patterns
type: instruction
trigger: harness-project
tags: [validator, patterns]
description: Common patterns for adding new validator phases
---

# Validator Patterns

- Each phase lives in `src/phases/<phase-name>.ts`.
- Export an async function returning `Promise<ValidationResult[]>`.
- Import `ValidationPhase` and `ValidationResult` from `../types.js`.
- Use `src/utils/ast-utils.js` for markdown AST operations.
- Add unit tests in `tests/unit/` and integration tests in `tests/integration/`.

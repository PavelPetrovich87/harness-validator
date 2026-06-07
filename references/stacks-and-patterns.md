# Stack Detection & Architecture Patterns

## Table of Contents
- [Detected Stacks](#detected-stacks)
- [Architecture Patterns](#architecture-patterns)
- [Quality Pipeline Commands by Stack](#quality-pipeline-commands-by-stack)

## Detected Stacks

Stack detection scans manifest files in the target project root.

| Manifest File | Detected Labels |
|---------------|-----------------|
| `package.json` | TypeScript, React, Next.js, Nuxt, Vite, Node.js |
| `pyproject.toml` / `requirements.txt` | Python, Django, Flask, FastAPI |
| `go.mod` | Go |

Source: `src/generate-agents.ts`, `src/detect-architecture.ts`.

## Architecture Patterns

The setup flow infers an architecture pattern from the project layout and copies
the matching `.dependency-cruiser.js` rules from `templates/architecture-patterns/`.

| Pattern | Heuristic | Template File |
|---------|-----------|---------------|
| Monorepo | `packages/` or `apps/` with 2+ `package.json` | `monorepo.js` |
| Hexagonal | `src/domain/` + `src/application/` | `hexagonal.js` |
| Layered | `src/ui/` + `src/services/` | `layered-app.js` |

If no pattern matches (or the user selects `skip`), no `.dependency-cruiser.js`
is written.

## Quality Pipeline Commands by Stack

`src/generators/quality-pipeline.ts` selects lint/typecheck/test commands per stack
when generating `lefthook.yml` and `.github/workflows/ci.yml`.

| Stack | Lint | Typecheck | Test |
|-------|------|-----------|------|
| JS/TS | `biome check` | `npx tsc --noEmit` | `npm test` |
| Python | `ruff check` | `mypy` | `pytest` |
| Go | `golangci-lint run` | `go vet` | `go test ./...` |

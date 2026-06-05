# Quality Pipeline Commands by Stack

| Stack | Lint | Typecheck | Test | Architecture |
|-------|------|-----------|------|--------------|
| **JS/TS** | `biome check` | `npx tsc --noEmit` | `npm test` | `dependency-cruiser` |
| **Python** | `ruff check` | `mypy` | `pytest` | — |
| **Go** | `golangci-lint run` | `go vet` | `go test ./...` | — |

## Stack Detection

| Manifest File | Detected Labels |
|---------------|-----------------|
| `package.json` | TypeScript, React, Next.js, Nuxt, Vite, Node.js |
| `pyproject.toml` / `requirements.txt` | Python, Django, Flask, FastAPI |
| `go.mod` | Go |

## Git Hooks (lefthook)

Pre-commit runs in parallel:
1. `lint` — stack-specific linter
2. `typecheck` — type checker
3. `test` — test runner
4. `architecture` — dependency-cruiser (if applicable)

## CI Pipeline

GitHub Actions workflow runs the same 4 checks on push and pull request.

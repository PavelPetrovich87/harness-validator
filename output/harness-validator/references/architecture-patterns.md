# Architecture Patterns

| Pattern | Heuristic | File |
|---------|-----------|------|
| Monorepo | `packages/` or `apps/` with 2+ `package.json` | `monorepo.js` |
| Hexagonal | `src/domain/` + `src/application/` | `hexagonal.js` |
| Layered | `src/ui/` + `src/services/` | `layered-app.js` |

Pattern files are copied as `.dependency-cruiser.js` based on detected structure.
Use `pattern: skip` in answers JSON to bypass architecture rules.

## Pattern Descriptions

### Monorepo
- Enforces no cross-package imports outside declared dependencies
- Validates `internal` field in package.json
- Checks for internal packages leaking into public API

### Hexagonal (Ports and Adapters)
- Domain layer must not import infrastructure
- Application layer orchestrates domain and infrastructure
- Infrastructure adapters implement ports defined in domain

### Layered (UI / Services / Data-Access)
- UI layer must not import data-access directly
- Services layer must not import UI components
- Each layer only imports from the layer below

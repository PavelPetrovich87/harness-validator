# Architecture Patterns

This directory contains ready-to-use dependency-cruiser configurations for common project structures. The agent selects a pattern during setup based on detected folder structure.

## Available Patterns

| Pattern | File | Detection Heuristic |
|---------|------|---------------------|
| **Layered App** | `layered-app.js` | Has `src/ui`, `src/services`, `src/data-access` (or similar layers) |
| **Monorepo** | `monorepo.js` | Has `packages/` or `apps/` with multiple `package.json` files |
| **Hexagonal** | `hexagonal.js` | Has `src/domain`, `src/application`, `src/adapters` (or ports/adapters) |

## Detection Logic

The agent scans the project root and applies the first matching heuristic:

1. **Monorepo**: If `packages/` or `apps/` directory exists with 2+ subdirectories containing `package.json` → use `monorepo.js`.
2. **Hexagonal**: If `src/domain/` and `src/application/` exist → use `hexagonal.js`.
3. **Layered App**: If `src/ui/` and `src/services/` exist → use `layered-app.js`.

## Fallback Behavior

If none of the heuristics match the detected project structure, the agent **must not** silently copy the default template. Instead, it must:

1. Inform the user that no matching architecture pattern was found.
2. Describe the detected structure (list of top-level directories).
3. Ask the user to either:
   - Select one of the existing patterns manually,
   - Provide a custom `.dependency-cruiser.js`, or
   - Create a new pattern and contribute it to `templates/architecture-patterns/`.

This prevents incorrect architecture rules from being applied to unfamiliar project structures.

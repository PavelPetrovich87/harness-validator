# Phase 3: Distribution Model & Packaging

## Goal
Make `ai-harness-validator` installable and runnable in consumer projects via both NPM and GitHub, with a compiled build step for clean distribution.

## Decision: Option C — Hybrid

**Chosen approach:** Support both NPM registry publishing and direct GitHub installation.

- **NPM** (`npm install ai-harness-validator`): Consumers get compiled JavaScript from `dist/`. No runtime `tsx` dependency.
- **GitHub** (`npm install github:PavelPetrovich87/harness-validator`): Same compiled output. Source available for inspection.
- **Internal development**: Continue using `tsx` for running TypeScript directly.

## Current State
- `package.json`: no `bin`, `files`, `main`, or `exports`
- `tsconfig.json`: already configured with `outDir: "./dist"`, `declaration: true`
- Scripts live in `scripts/` and import from `../src/` using `.js` ESM extensions
- All scripts currently run via `tsx` (devDependency)
- Assets to ship: `templates/`, `schemas/`, `references/`, `src/`
- 7 CLI entrypoints: setup, validate, diagnose, dogfood, generate-agents, research:prompt, research:apply

## Planned Changes

### 3.1 Build Configuration
- **Verify** `tsconfig.json` output structure — `rootDir: "."` with `outDir: "./dist"` should preserve `scripts/` and `src/` layout under `dist/`
- **Add** `npm run build` script: `tsc`
- **Add** `npm run build:clean` script: `rm -rf dist && tsc`
- **Add** a post-build step to copy static assets (`templates/`, `schemas/`, `references/`) into `dist/`
- **Verify** compiled scripts can still resolve `../src/` paths correctly from `dist/scripts/` to `dist/src/`

### 3.2 package.json Updates
- **Add** `bin` for primary commands:
  ```json
  "bin": {
    "harness-setup": "./dist/scripts/setup-harness.js",
    "harness-validate": "./dist/scripts/validate-harness.js",
    "harness-diagnose": "./dist/scripts/diagnose-harness.js",
    "harness-dogfood": "./dist/scripts/dogfood.js"
  }
  ```
- **Add** `files` array to control published payload:
  ```json
  "files": [
    "dist/",
    "templates/",
    "schemas/",
    "references/",
    "README.md",
    "SKILL.md",
    "AGENTS.md"
  ]
  ```
- **Add** `main` entry: `"./dist/src/index.js"` (expose programmatic API)
- **Add** `types` entry: `"./dist/src/index.d.ts"`
- **Add** `exports` map for ESM consumers
- **Add** `prepublishOnly` script: `npm run build`
- **Keep** `tsx` in `devDependencies` — consumers never need it

### 3.3 Asset Path Resolution
- Current scripts reference assets (templates, schemas) via relative paths
- After compilation, paths like `../templates/` from `dist/scripts/` must resolve correctly
- **Action**: Audit all asset paths in `src/` and `scripts/` to confirm they work from `dist/`
- **Fallback**: If paths break, add a path resolution helper using `import.meta.url` or `__dirname`

### 3.4 CI Updates
- **Add** `build` job to `.github/workflows/ci.yml`:
  - Run `npm run build`
  - Verify `dist/` exists and is not empty
  - Optionally run `npm pack --dry-run` to validate package contents
- **Add** `.gitignore` entry for `dist/` (source only, not committed)

### 3.5 Documentation Update
- Update `README.md` "Quick Start" with:
  ```bash
  # Install from NPM
  npm install --save-dev ai-harness-validator
  npx harness-setup

  # Install from GitHub (latest main)
  npm install --save-dev github:PavelPetrovich87/harness-validator
  ```
- Add "Programmatic API" section if `main`/`exports` are exposed
- Document which files are included in the published package

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| `../src/` imports break after `tsc` | `rootDir: "."` preserves directory structure; verify with test run |
| Asset paths (templates/schemas) wrong in `dist/` | Audit paths; add resolution helper if needed |
| Package bundles unnecessary files | `files` array explicitly includes only what's needed |
| `dist/` accidentally committed | Add `dist/` to `.gitignore` |

## Success Criteria
- [ ] `npm run build` produces a working `dist/` directory
- [ ] `node ./dist/scripts/validate-harness.js --project <path>` works on a test project
- [ ] `node ./dist/scripts/setup-harness.js --non-interactive` works on a test project
- [ ] `npm pack --dry-run` shows only intended files (no tests, no docs, no `.kilo/`)
- [ ] CI passes with new `build` job
- [ ] `README.md` updated with install instructions

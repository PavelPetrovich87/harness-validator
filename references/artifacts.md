# Generated Artifacts

Files produced by the setup flow in the target project.

## Table of Contents
- [Artifact Catalog](#artifact-catalog)
- [Assets (templates source)](#assets-templates-source)
- [Diagnostics & Scoring](#diagnostics--scoring)

## Artifact Catalog

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent instructions (stack, commands, safety, rules) |
| `lefthook.yml` | Pre-commit hooks (lint, typecheck, test, architecture) |
| `.github/workflows/ci.yml` | GitHub Actions workflow |
| `.dependency-cruiser.js` | Architecture layer rules (omitted if pattern = skip) |
| `.claude/instructions/local/` | Project-specific instructions |
| `.claude/instructions/shared/` | Shared instruction templates |
| `docs/knowledge/` | Lesson/pattern/decision/triage templates |
| `feature_list.json` | Feature tracking |
| `.harness/manifest.json` | Validation manifest (includes scores and criteria_version) |
| `.harness/validator/` | Standalone validator for CI-only mode |

## Assets (templates source)

The skill's static output assets live in `templates/` at the skill root. These
are copied verbatim into target projects during setup and injected into
disposable projects during dogfooding.

> **Note on naming:** Per Agent Skills conventions this directory is the skill's
> *assets* layer. It is named `templates/` (not `assets/`) because the name is a
> **runtime contract**: the directory is copied into target projects under
> `templates/` and is read back by generators (`src/generators/*`) and the
> dogfood injector (`src/dogfood/inject.ts`) via `join(projectRoot, 'templates', …)`.
> Renaming it would break every generated project, so the conventional role
> (assets) is documented here rather than enforced by directory name.

Contents of `templates/`:

| Path | Role |
|------|------|
| `AGENTS.md` | AGENTS.md scaffold |
| `lefthook.yml` | Pre-commit hook template |
| `.github/workflows/ci.yml` | CI workflow template (`{{LINT_CMD}}` etc. placeholders) |
| `.dependency-cruiser.js` | Default architecture rules |
| `architecture-patterns/*.js` | Per-pattern dependency-cruiser rules |
| `instructions/*.md` | Instruction module templates |
| `knowledge/.template-*.md` | Knowledge base templates |
| `feature_list.json` | Feature tracking scaffold |

## Diagnostics & Scoring

### Diagnostics (`src/diagnostics.ts`)
Checks which Harness artifacts are present before setup runs. Outputs a report
showing existing and missing artifacts. If all artifacts exist, setup suggests
running validation instead.

### Scoring (`src/scoring.ts`)
Each validation phase produces a score from 0–100 based on passed criteria.
The manifest stores per-phase scores and an overall health score. CLI flags:
- `--recommendations` — list actionable fixes for failed criteria
- `--compare` — show score delta since the previous manifest

### Diff (`src/diff.ts`)
Reads the previous `.harness/manifest.json` and compares scores by phase,
showing improvement or regression with ↑/↓ arrows.

### Research Workflow
Self-update mechanism for validation criteria:
1. `npm run research:prompt` → generates a prompt from current phases/criteria
2. Feed prompt to Deep Research → get JSON results
3. `npm run research:apply -- --input results.json` → preview diff
4. Re-run with `--yes` to bump criteria version and log manual steps

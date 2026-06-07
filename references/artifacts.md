# Generated Artifacts

Files produced by the setup flow in the target project.

## Table of Contents
- [Artifact Catalog](#artifact-catalog)
- [Assets (templates source)](#assets-templates-source)

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
| `.harness/manifest.json` | Validation manifest |
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

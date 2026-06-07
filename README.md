# AI Harness Validator

> Validate and bootstrap [AI Harness](docs/README.md) compliance in any software project.

[![CI](https://github.com/PavelPetrovich87/harness-validator/actions/workflows/ci.yml/badge.svg)](https://github.com/PavelPetrovich87/harness-validator/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)

The AI Harness Validator is a deterministic, AST-based toolchain that checks whether a project follows the AI Harness standard. It validates `AGENTS.md` structure, instruction modules, architecture rules, data contracts, and CI integration — all without invoking an LLM.

## What it does

| Problem | Solution |
|---------|----------|
| `AGENTS.md` is malformed or missing sections | **AST validation** via `remark-parse` checks heading nodes, not raw text |
| Architecture rules exist only as comments | **dependency-cruiser** integration enforces layer boundaries as code |
| Frontmatter/metadata is unchecked | **JSON Schema** via `ajv` validates `feature_list.json` and knowledge base entries |
| CI pipelines drift from local setup | **Integration phase** checks `lefthook.yml`, GitHub Actions syntax, and linter configs |
| No visibility into harness health over time | **Scoring + diff** tracks per-module scores across validation runs |

## Quick Start

### 1. Install from NPM (recommended)

```bash
npm install --save-dev ai-harness-validator
npx harness-setup        # interactive setup
npx harness-validate     # validate only
npx harness-diagnose     # check what is missing
```

### 2. Install from GitHub (latest main)

```bash
npm install --save-dev github:PavelPetrovich87/harness-validator
npx harness-setup
```

### 3. Run in your project (no install)

```bash
npx tsx https://raw.githubusercontent.com/PavelPetrovich87/harness-validator/main/scripts/validate-harness.ts --project ./my-project
```

> **Note:** For production use, pin to a tag: `...@v0.2.0` instead of `.../main`.

### 4. Use in CI

```yaml
# .github/workflows/harness.yml
name: Harness Validate
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx harness-validate --github
```

## Commands

All entrypoints live under `scripts/` and are runnable via `npx tsx` or `npm run`.

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run setup` | `setup-harness.ts` | Interactive harness bootstrap (detect → diagnose → generate → validate) |
| `npm run setup:ci` | `setup-harness.ts --non-interactive` | Non-interactive setup for CI |
| `npm run validate` | `validate-harness.ts` | Run 5-phase validation on current project |
| `npm run diagnose` | `diagnose-harness.ts` | Show what harness artifacts are present or missing |
| `npm run dogfood` | `dogfood.ts` | Test the harness on synthetic/real projects |
| `npm run research:prompt` | `generate-research-prompt.ts` | Generate a prompt for Deep Research |
| `npm run research:apply` | `apply-research.ts` | Preview or apply research results |

### Validation flags

```bash
npx tsx scripts/validate-harness.ts \
  --project ./my-project    # target directory (default: cwd)
  --github                  # emit GitHub Actions workflow commands
  --recommendations         # show fix recommendations for failures
  --compare                 # diff scores against previous manifest
```

## Validation Phases

The validator runs **5 deterministic phases** in under 5 seconds:

```
Phase 1: AST Structure
  - AGENTS.md exists and has required H2 sections
  - Instruction modules have valid frontmatter

Phase 2: Instruction Modules
  - Local instructions are parseable
  - Shared instructions (if present) are valid

Phase 3: Architecture
  - .dependency-cruiser.js exists and has >= 2 forbidden rules
  - depcruise passes with zero violations

Phase 4: Data Contracts
  - feature_list.json matches JSON Schema
  - Knowledge base frontmatter matches schema
  - manifest.json is valid

Phase 5: Integration
  - lefthook.yml is valid
  - CI workflow YAML syntax is valid (actionlint)
  - Linter configs are parseable
```

Output: `.harness/manifest.json` — an audit lock-file with scores, errors, and warnings.

## Programmatic API

You can also use the validator as a library:

```typescript
import { HarnessValidator, runSetup, runDiagnostics } from 'ai-harness-validator';

// Validate a project
const validator = new HarnessValidator({
  projectRoot: './my-project',
  manifestPath: './my-project/.harness/manifest.json',
});
const { results, exitCode, scores } = await validator.run();

// Run setup flow
const result = await runSetup('./my-project', {
  interactive: false,
});

// Diagnostics
const report = runDiagnostics('./my-project');
console.log(report.allExist); // true if fully installed
```

## Sub-Skills (Agent Workflow Pack)

This repo is a **hybrid skill**: it contains both the TypeScript toolchain and focused sub-skills for AI agents.

| Sub-Skill | Location | Use When |
|-----------|----------|----------|
| `harness-setup` | `.kilo/skills/harness-setup/` | Full bootstrap flow with circuit breaker |
| `harness-validate` | `.kilo/skills/harness-validate/` | Validate-only with scoring and recommendations |
| `harness-dogfood` | `.kilo/skills/harness-dogfood/` | Testing the harness on disposable projects |

Load a sub-skill into your agent's skill directory:

```bash
# Example for Kilo
mkdir -p .kilo/skills/harness-validate
cp .kilo/skills/harness-validate/SKILL.md .kilo/skills/harness-validate/
```

## Project Structure

```
├── scripts/               # CLI entrypoints
│   ├── setup-harness.ts
│   ├── validate-harness.ts
│   ├── diagnose-harness.ts
│   ├── dogfood.ts
│   ├── generate-research-prompt.ts
│   └── apply-research.ts
├── src/                   # Library implementation
│   ├── validator.ts       # 5-phase orchestrator
│   ├── scoring.ts         # Per-module score calculation
│   ├── diff.ts            # Manifest score diffing
│   ├── diagnostics.ts     # Project health checker
│   └── phases/            # AST, architecture, data-contracts, integration
├── templates/             # Assets copied into target projects
├── schemas/               # JSON Schemas for data contracts
├── references/            # Detailed docs (loaded on demand)
├── tests/                 # Unit, integration, and e2e suites
├── docs/                  # Architecture docs and knowledge base
└── SKILL.md               # Agent skill manifest
```

## Supported Stacks

The setup flow auto-detects the project stack and generates appropriate configs:

| Stack | Detected By | Pipeline Tools |
|-------|-------------|----------------|
| TypeScript / Node.js | `package.json` | Biome / ESLint, `tsc`, Vitest, dependency-cruiser |
| Python | `pyproject.toml`, `requirements.txt` | ruff, mypy, pytest |
| Go | `go.mod` | golangci-lint, `go test` |

## Development

```bash
# Install dependencies
npm ci

# Build for distribution (outputs to dist/)
npm run build

# Clean build
npm run build:clean

# Run all tests
npm test

# Run only unit tests
npx vitest run tests/unit/

# Check architecture rules
npm run architecture

# Validate this repo against itself
npm run validate

# Typecheck
npx tsc --noEmit
```

### Published Package Contents

The following files are included when the package is published to NPM:

| Path | Contents |
|------|----------|
| `dist/` | Compiled JavaScript, type declarations, and copied assets |
| `templates/` | Instruction modules, architecture patterns, and pipeline templates |
| `schemas/` | JSON Schemas for data contracts and frontmatter validation |
| `references/` | Detailed documentation and troubleshooting guides |
| `README.md`, `SKILL.md`, `AGENTS.md` | Project documentation |

Tests, docs, and internal configuration files are excluded.

### Adding a new validation phase

1. Add phase logic in `src/phases/<name>.ts`
2. Export a function returning `ValidationResult[]`
3. Wire it into `src/validator.ts` in `HarnessValidator.run()`
4. Update `src/types.ts` if new fields are needed
5. Add tests in `tests/unit/` and `tests/integration/`
6. Update `schemas/manifest.schema.json` if manifest shape changes

## Requirements

- **Node.js** >= 20

For development only:
- **TypeScript** >= 5.4
- **tsx** >= 4.7 (for running `.ts` scripts directly)

Consumers installing from NPM do not need TypeScript or tsx — the package ships compiled JavaScript.

## Related Documentation

- [Architecture Deep Dive (RU)](docs/README.md) — Full specification of AI Harness v1.1
- [Artifacts Catalog](references/artifacts.md) — Generated vs. template vs. embedded artifacts
- [Stacks & Patterns](references/stacks-and-patterns.md) — Stack detection and pipeline commands
- [Troubleshooting](references/troubleshooting.md) — Flags, common issues, circuit breaker behavior

## License

MIT

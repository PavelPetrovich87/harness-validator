# Harness Validator

Set up and validate AI Harness artifacts for software projects.

## Install

```bash
npm install ai-harness-validator
```

## Quick Start

```bash
# Interactive setup
npx tsx src/setup.ts --project /path/to/your-project

# Validate
npx tsx validate-harness.ts --project /path/to/your-project
```

## Documentation

- `SKILL.md` — Runtime instructions for AI agents
- `references/architecture-patterns.md` — Architecture pattern details
- `references/quality-pipeline.md` — Quality pipeline commands by stack
- `references/quick-start.md` — Quick start examples

## Generated Artifacts

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent instructions (stack, commands, safety, rules) |
| `lefthook.yml` | Pre-commit quality pipeline |
| `.github/workflows/ci.yml` | GitHub Actions workflow |
| `.dependency-cruiser.js` | Architecture layer rules |
| `feature_list.json` | Feature tracking |
| `docs/knowledge/` | Lesson templates for feedback loop |
| `.claude/instructions/` | Local and shared instruction modules |
| `.harness/manifest.json` + validator | AST-based validation |

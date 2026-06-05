# Quick Start

## Install in a new project

```bash
# 1. Install harness-validator
npm install ai-harness-validator

# 2. Run interactive setup
npx tsx src/setup.ts --project /path/to/your-project

# 3. Validate
npx tsx validate-harness.ts --project /path/to/your-project
```

## CI-only mode (no LLM, deterministic)

```bash
npx tsx src/setup.ts --project /path/to/your-project --non-interactive
```

## Validate existing project

```bash
npx tsx validate-harness.ts --project /path/to/your-project
```

## Dogfood the harness itself

```bash
# Fast synthetic mode (no network)
HARNESS_DOGFOOD_SYNTHETIC=1 npx tsx scripts/dogfood.ts --all

# Real project scaffolds (downloads from npm, 30-120s each)
npx tsx scripts/dogfood.ts --all
```

## Manual JSON Schema validation

```bash
npx ajv-cli validate \
  -s schemas/feature_list.schema.json \
  -d feature_list.json \
  --errors=text
```

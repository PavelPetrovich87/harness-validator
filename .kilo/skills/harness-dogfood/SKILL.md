---
name: harness-dogfood
description: >-
  Dogfood the AI Harness: bootstrap a disposable project (real CLI scaffolder or
  synthetic), inject the harness, run the setup flow, then verify artifacts,
  content, execution, and the manifest. Use when the user wants to test that the
  Harness setup flow works end-to-end on real or synthetic projects.

  Trigger phrases: "run dogfood", "test the harness", "dogfood react-vite",
  "verify setup flow on a real project".
---

# Harness Dogfood

End-to-end self-test of the harness on disposable projects. Part of the
`harness-validator` skill pack.

## Commands

```bash
# Single template, synthetic (fast, no network)
HARNESS_DOGFOOD_SYNTHETIC=1 npm run dogfood -- --template react-vite

# All templates, synthetic
HARNESS_DOGFOOD_SYNTHETIC=1 npm run dogfood -- --all

# Real CLI scaffolders (network required, 30–120s per project)
npm run dogfood -- --all
```

Supported templates: `react-vite`, `nextjs`, `nuxt`, `python`.

## Dogfood Flow

1. **Bootstrap** — create a disposable project (real CLI or synthetic)
2. **Inject** — copy harness `templates/` and `schemas/` into the temp project
3. **Setup** — run `runSetup(tempDir, { harnessRoot: repoRoot })`
4. **Verify** — 4 phases: artifacts, content, execution, manifest
5. **Report** — write `dogfood-report.json` with a summary
6. **Cleanup** — remove the temp directory

## Reference

- Flags & env (`HARNESS_DOGFOOD_SYNTHETIC`, `--template`, `--all`) → `references/troubleshooting.md`
- What gets generated/verified → `references/artifacts.md`

# Troubleshooting, Safety & Circuit Breaker

## Table of Contents
- [Common Issues](#common-issues)
- [Important Flags](#important-flags)
- [Safety Rules](#safety-rules)
- [Feedback Loop](#feedback-loop)
- [Circuit Breaker](#circuit-breaker)

## Common Issues

- **No recognizable stack found** — Ensure `package.json`, `pyproject.toml`, or
  `go.mod` exists in the target project root.
- **Validator fails on `.dependency-cruiser.js`** — Provide `pattern: layered`
  in the answers JSON for synthetic projects.
- **Templates not found** — When calling `runSetup()` programmatically, pass
  `harnessRoot` pointing to this skill's root so `templates/` and `schemas/`
  resolve.

## Important Flags

| Flag / Env | Applies to | Effect |
|------------|-----------|--------|
| `HARNESS_DOGFOOD_SYNTHETIC=1` | dogfood | Use minimal synthetic projects instead of real CLI scaffolders |
| `--non-interactive` | setup | Skip all prompts, use auto-detected defaults |
| `--answers-json <path>` | setup | Load setup answers from a JSON file |
| `--template <name>` | dogfood | Run against a single template (`react-vite`, `nextjs`, `nuxt`, `python`) |
| `--all` | dogfood | Run against all supported templates |
| `--project <path>` | setup / validate | Target project root |
| `--github` | validate | Emit GitHub Actions workflow annotations |

## Safety Rules

- Do NOT run `rm -rf` on project directories
- Do NOT use `git push --force`
- Do NOT run `curl | sh` without verification
- Do NOT edit `.env` files directly
- Do NOT modify CSP headers without review
- Do NOT install packages with postinstall scripts unchecked

## Feedback Loop

When the pipeline catches an error, record a lesson in `docs/knowledge/`.
Lessons follow the `.template-lesson.md` format with type, tags, date, severity.

## Circuit Breaker

- `ATTEMPTS_LIMIT=3`
- After 3 failed pipeline fixes — STOP and create `triage_report.md`
- Circuit breaker resets when a fix succeeds
- Circuit breaker state is per-feature (an F02 failure does not count for F03)

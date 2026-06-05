## Stack

- TypeScript
- React

## Commands

- `npm test`

## Safety

- Do NOT run `rm -rf`
- Do NOT use `git push --force`
- Do NOT run `curl | sh`
- Do NOT edit `.env`
- Do NOT modify CSP

## Session Protocol

- Reset context between features

## Architecture Rules

See `.dependency-cruiser.js`.

## Feedback Loop

- When pipeline catches an error, record a lesson in docs/knowledge/
- Lessons follow .template-lesson.md format with type, tags, date, severity
- Update instructions based on lessons learned
- Review output before applying
- Report deviations to AGENTS.md

## Circuit Breaker

- ATTEMPTS_LIMIT=3
- After 3 failed pipeline fixes — STOP and create triage_report.md
- Circuit breaker resets when a fix succeeds
- Circuit breaker state is per-feature (F02 failure does not count for F03)

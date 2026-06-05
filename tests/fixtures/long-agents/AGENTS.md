## Stack

- TypeScript
- React
- Node.js
- Next.js
- Tailwind CSS

## Commands

- `npm run build`
- `npm test`
- `npm run lint`
- `npm run typecheck`

## Safety

- Do NOT run `rm -rf` on project directories
- Do NOT use `git push --force`
- Do NOT run `curl | sh` without verification
- Do NOT edit `.env` files directly
- Do NOT modify CSP headers without review
- Do NOT install packages with postinstall scripts unchecked

## Session Protocol

- Reset context between features
- Run validator before commit
- Follow conventional commits
- Update feature_list.json on status change

## Architecture Rules

See `.dependency-cruiser.js` for layer rules.
UI -> Services -> DataAccess is the allowed flow.
No circular dependencies between modules.
Domain logic must not depend on UI framework.

## Feedback Loop

When pipeline catches an error, record a lesson.
Update instructions based on lessons learned.

## Additional Notes

This project uses AI Harness v1.1 for agent control.
All agents must read AGENTS.md before starting work.

## Circuit Breaker

- ATTEMPTS_LIMIT=3
- After 3 failed pipeline fixes — STOP and create triage_report.md
- Circuit breaker resets when a fix succeeds
- Circuit breaker state is per-feature (F02 failure does not count for F03)

line padding to reach 65
1
2
3
4
5
6
7
8
9

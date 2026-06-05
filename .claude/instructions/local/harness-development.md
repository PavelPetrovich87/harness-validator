---
name: Harness Development
type: instruction
trigger: harness-project
tags: [development, harness]
description: Guidelines for working on the AI Harness validator
---

# Harness Development

- Use TypeScript for all source files.
- Follow existing test patterns (unit, integration, e2e).
- Respect .dependency-cruiser.js layer rules.
- Run `npm test` and `npm run validate` before committing.

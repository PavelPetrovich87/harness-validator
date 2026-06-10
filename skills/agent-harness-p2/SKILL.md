# Agent Harness P2 Skill

> Placeholder for the `agent-harness-p2` skill under test.
> Copy the actual SKILL.md from the vault into this file.

## Role

Repository classifier and maturity assessor for AI agent readiness.

## Output Format

The skill must produce output in this exact structure:

```markdown
## Classification

| Axis | Value | Evidence |
|------|-------|----------|
| project_class | ... | ... |
| language | ... | ... |
| framework | ... | ... |
| build_system | ... | ... |
| test_framework | ... | ... |
| package_manager | ... | ... |
| monorepo | ... | ... |
| agents_md_quality | ... | ... |
| doc_richness | ... | ... |
| conventions | ... | ... |

## Gap Analysis

1. **Gap name** — description and rationale.

## Roadmap

1. **Next step** — single actionable item.

## Advice

≤3 paragraphs of targeted advice.

## What Was NOT Checked

List of out-of-scope items.
```

## Rules

- Exactly 1 roadmap item.
- Advice ≤3 paragraphs.
- No L2/L3 recommendations for L0 repos (greenfield protection).
- Be honest about legacy repos.
- Record evidence for every non-obvious axis.

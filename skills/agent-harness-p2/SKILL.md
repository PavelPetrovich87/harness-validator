---
name: agent-harness-p2
description: >-
  Evaluate a repository's agent-readiness and generate a minimal improvement roadmap.
  Use this skill when the user wants to assess how well an AI agent can work with
  a codebase, check if AGENTS.md exists, or get a focused recommendation for
  preparing a repo for AI-agent collaboration. Triggers on: "check repo readiness",
  "agent harness", "AGENTS.md missing", "prepare repo for AI", "agent readiness",
  "how agent-friendly is this code", or any discussion of AI-agent context,
  documentation gaps, or repo setup for automated coding agents.
---

# Agent Harness — P2 Walking Skeleton

Assess a repository's readiness for AI-agent collaboration and produce a minimal,
focused recommendation. This is a walking-skeleton validation of the agent-readiness
ladder — it tests whether the core hypothesis (classify → detect gap → advise)
produces signal or noise.

**Scope:** One gap only — missing root `AGENTS.md`. Read-only. No file writes.
**Out of scope:** Tests, linting, CI/CD, monorepos, nested context, drift detection.

---

## Input

Path to repository root (e.g., `./my-project/`).

---

## Output Format

Produce exactly this structure:

```markdown
## Classification

| Axis | Value | Evidence |
|------|-------|----------|
| project_class | {value} | {signal} |
| language | {value} | {signal} |
| framework | {value} | {signal} |
| has_root_agents_md | yes/no | {signal} |
| detected_level | L0/L1 | {rationale} |

## Gap Analysis

**Primary gap:** {description}

**Why this matters:** {rationale linking to ladder}

## Roadmap (1 item)

1. **{title}** — {description}
   - Priority: P0
   - Effort: {small/medium/large}
   - Why: {rationale}

## Advice

{2-3 paragraphs of actionable advice}

## What Was NOT Checked (P2 Limitations)

- Tests, linting, type checking
- CI/CD configuration
- Monorepo structure
- Nested context
- Drift detection
```

---

## Step 1: Orient

Read the repository root. Record explicit signals for:

- `package.json` → framework, language, project type
- `README.md` → exists? length? agent-oriented or generic?
- `AGENTS.md` → exists at root?
- Top-level folders → project structure signals

**Signal recording format:**
> Signal: `package.json` contains `"next": "^14.0.0"` → framework = nextjs

---

## Step 2: Classify (4 axes only)

Classify these axes. Every non-obvious value needs a recorded signal.

1. **project_class**: `web-frontend` | `api-backend` | `fullstack` | `library` | `unknown`
   - Signals: framework in package.json, folder structure (app/, src/routes/, lib/)

2. **language**: `typescript` | `javascript` | `python` | `other`
   - Signals: file extensions, tsconfig.json, pyproject.toml

3. **framework**: `nextjs` | `react` | `express` | `fastapi` | `none` | `unknown`
   - Signals: dependencies in package.json, requirements.txt

4. **has_root_agents_md**: `yes` | `no`
   - Signal: file exists at repo root

---

## Step 3: Detect Level

```
IF has_root_agents_md == yes:
  detected_level = L1 (Oriented)
  primary_gap = "AGENTS.md exists — verify quality (out of scope for P2)"
  
ELSE:
  detected_level = L0 (Blind)
  primary_gap = "Missing root AGENTS.md — agent has no project context"
```

---

## Step 4: Generate Roadmap (1 item only)

If L0:
```
1. **Create root AGENTS.md** — Write a minimal project context file at repo root
   - Priority: P0
   - Effort: small (15-30 minutes)
   - Why: Without context, the agent operates blindly. AGENTS.md is the
          single highest-impact affordance for agent productivity.
```

If L1:
```
1. **Verify AGENTS.md quality** — Review existing AGENTS.md for completeness
   - Priority: P1
   - Effort: small
   - Why: File exists but may be stale or incomplete (detailed check out of scope for P2)
```

---

## Step 5: Write Advice

For L0 (no AGENTS.md):

Write 2-3 paragraphs covering:
1. What the agent currently sees (or doesn't see) — be specific about the repo
2. What `AGENTS.md` should contain (minimal template): project identity, build/test commands, key conventions, architecture summary
3. Why this is the ONLY recommendation at this stage — context before tooling

**Constraint:** Advice must NOT mention tests, linting, CI/CD, drift detection, nested context, or complex boundaries. If you catch yourself writing "also consider adding tests" — delete it. P2 is ruthlessly minimal.

---

## Anti-Patterns (Forbidden)

| Anti-Pattern | Why Forbidden |
|--------------|---------------|
| Recommending tests | Out of scope for P2; tests without context are low-value |
| Recommending linting | Out of scope for P2 |
| Recommending CI/CD | Out of scope (future sibling skill) |
| Recommending L2/L3 items | Greenfield protection — empty project gets L1 only |
| Writing files | P2 is read-only (advise mode) |
| Nested AGENTS.md | Monorepo handling is P4+ |
| Interview questions | P2 detects the one gap from files alone |

---

## Quality Checklist (Self-Verify Before Output)

- [ ] Classification has evidence for every non-obvious axis
- [ ] `has_root_agents_md` is correct (actually checked the file system)
- [ ] Detected level matches the yes/no of AGENTS.md
- [ ] Roadmap has exactly 1 item
- [ ] Advice is 2-3 paragraphs max
- [ ] No mention of tests, lint, CI, drift, or L2/L3
- [ ] Output follows the exact format specified above

---

## Why This Matters

This skill validates the core hypothesis of the agent-readiness ladder: that a
minimal classification can produce actionable, non-noisy advice. If this walking
skeleton produces signal on an empty project, the full classifier (P1) and maturity
engine (P3) are worth building. If it produces noise, the ladder is wrong and needs
rethinking before any further investment.

The ruthlessly minimal scope is intentional. Every item beyond "create AGENTS.md"
is a distraction at L0. Context first — everything else follows.

---

## Related

- [[Test Corpus Specification]] — ground truth for test repos
- [[Test Corpus Workflow]] — validation process
- [[P0 — Foundations Decisions]] — full Investigation Playbook
- [[Agent Harness Skill — RFC]] — architecture spec
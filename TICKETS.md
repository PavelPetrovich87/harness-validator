# AI Harness — Implementation Tickets

> Roadmap v1.1 | 22 tickets | 47 person-days | 10 weeks (5 sprints) | 83 tests
> Based on: [Technical Specification v1.1](harness-hybrid-spec-v1.1.pdf)

---

## Quick Overview

| Phase | Weeks | Focus | Tickets |
|-------|-------|-------|---------|
| **Phase 0: Foundation** | W1–W2 | Validator, Schema, Templates, CI | 6 |
| **Phase 1: L1 Context System** | W3 | AGENTS.md, Instruction Modules, Skills Registry | 3 |
| **Phase 2: L2 + L3** | W4–W5 | Quality Pipeline, Safety, Knowledge Base, Session Protocol | 5 |
| **Phase 3: Cross-cutting** | W6–W7 | Feedback Loop, Circuit Breaker, Triage Report | 3 |
| **Phase 4: Integration & Polish** | W8–W10 | Setup flow, CI mode, Dogfooding, Docs | 5 |

**Critical Path:** `HARNESS-001` → `HARNESS-003` → `HARNESS-006` → `HARNESS-009` → `HARNESS-017` → `HARNESS-020`

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| **P0** | Blocker — next phase cannot start without it |
| **P1** | Critical — core functionality |
| **P2** | Important — can be deferred |

---

## Phase 0: Foundation (W1–W2)

Infrastructure: validator, schemas, templates, CI. Everything needed before module generation.

---

### HARNESS-001 — Create AST-based Validator (`validate-harness.ts`)

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Estimate** | 5 days |
| **Phase** | W1 |
| **Status** | Done |
| **Blocks** | HARNESS-005, HARNESS-017, HARNESS-018, HARNESS-019 |
| **Dependencies** | None (foundation ticket) |

**Description:**
Rewrite validator from bash/grep to TypeScript + remark-parse AST. 4 phases: AST Structure, Architecture (dep-cruiser), Data Contracts (ajv), Integration.

**Acceptance Criteria:**
- AC1: Given `AGENTS.md` with heading `## Stack` — When validator runs Phase 1 — Then PASS (AST node detected, not grep)
- AC2: Given `AGENTS.md` with `## Стек` (localized) — When validator runs — Then PASS (AST value matching is flexible)
- AC3: Given `AGENTS.md` with 65 lines — When validator runs — Then FAIL with message "65 lines (max 60)"
- AC4: Given `.dependency-cruiser.js` with forbidden rules — When validator runs Phase 2 — Then PASS
- AC5: Given `feature_list.json` matching schema — When validator runs Phase 3 — Then PASS
- AC6: Given missing `lefthook.yml` — When validator runs Phase 4 — Then FAIL
- AC7: Given all checks pass — When validator completes — Then generates `.harness/manifest.json` with results array

**Tests:**
- **Unit:** Parse `AGENTS.md` with remark-parse, extract H2 headings, verify array contains expected values
- **Unit:** Count list items under "Safety" heading in AST (should be 5+)
- **Integration:** Run validator against fixture project (valid harness) — expect exit 0 + manifest.json
- **Integration:** Run validator against fixture with missing `AGENTS.md` — expect exit 1 + error in results
- **Integration:** Run validator against fixture with 65-line `AGENTS.md` — expect FAIL on line count check
- **E2E:** `npx tsx validate-harness.ts` in real project — completes in < 5 seconds

---

### HARNESS-002 — Create JSON Schema Contracts

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Estimate** | 3 days |
| **Phase** | W1 |
| **Status** | Done |
| **Blocks** | HARNESS-003, HARNESS-013 |
| **Dependencies** | None (foundation) |

**Description:**
Create 3 JSON Schemas: `feature_list.schema.json`, `knowledge_frontmatter.schema.json`, `manifest.schema.json`. Integration with ajv-cli for validation.

**Acceptance Criteria:**
- AC1: Given valid `feature_list.json` — When ajv-cli validates against `feature_list.schema.json` — Then exit 0
- AC2: Given `feature_list.json` with status `"invalid_status"` — When validated — Then exit 1 with enum error
- AC3: Given `decision.md` with type `"decision"` but no status — When validated against knowledge schema — Then exit 1 (status required for decisions)
- AC4: Given `lesson.md` with type `"lesson"` and severity `"high"` — When validated — Then exit 0
- AC5: All schemas published to `schemas/` directory with `$id` URLs

**Tests:**
- **Unit:** Compile each schema with Ajv, verify no compilation errors
- **Unit:** Validate 10 positive fixtures (valid data) — all pass
- **Unit:** Validate 10 negative fixtures (invalid data) — all fail with expected errors
- **Integration:** `npx ajv-cli validate --schema=X --data=Y` in CI pipeline

---

### HARNESS-003 — Create `templates/` Directory ✅

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Estimate** | 3 days |
| **Phase** | W1 |
| **Status** | Done |
| **Blocks** | HARNESS-006, HARNESS-009 |
| **Dependencies** | HARNESS-002 (schema needed to validate templates) |

**Description:**
Verified templates for all security-critical and structural artifacts: `AGENTS.md`, `lefthook.yml`, `ci.yml`, `.dependency-cruiser.js`, Knowledge Base templates, `feature_list.json`.

**Acceptance Criteria:**
- AC1: `templates/AGENTS.md` exists with all required `##` sections as placeholders
- AC2: `templates/lefthook.yml` exists with `{{LINT_CMD}}`, `{{TYPECHECK_CMD}}`, `{{TEST_CMD}}` variables
- AC3: `templates/.github/workflows/ci.yml` exists with 4+ jobs including architecture
- AC4: `templates/.dependency-cruiser.js` exists with at least 2 forbidden rules
- AC5: `templates/knowledge/` contains `.template-decision.md`, `.template-lesson.md`, `.template-pattern.md`
- AC6: `templates/feature_list.json` exists as valid JSON matching `feature_list.schema.json`

**Tests:**
- **Unit:** Each template file exists and is non-empty
- **Unit:** `lefthook.yml` template contains exactly 3 `{{VARIABLE}}` placeholders
- **Unit:** `ci.yml` template has 4 jobs (lint, typecheck, test, architecture, build)
- **Integration:** Copy all templates to temp dir, run validator — all structural checks pass
- **Integration:** `feature_list.json` template validates against `feature_list.schema.json`

---

### HARNESS-004 — Configure dependency-cruiser

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 2 days |
| **Phase** | W2 |
| **Status** | Done |
| **Blocks** | HARNESS-010 |
| **Dependencies** | HARNESS-003 (template) |

**Description:**
Create `.dependency-cruiser.js` with rules for layered architecture. Integration into lefthook and CI.

**Acceptance Criteria:**
- AC1: Given import from `src/ui` to `src/data-access` — When depcruise runs — Then exits with error
- AC2: Given import from `src/services` to `src/data-access` — When depcruise runs — Then passes
- AC3: Given import from `src/ui` to `src/services/index.ts` — When depcruise runs — Then passes (allowed public API)
- AC4: depcruise integrated as "architecture" command in `lefthook.yml`

**Tests:**
- **Unit:** Config file exports object with `forbidden[]` array of length >= 2
- **Integration:** Create fixture project with violating import — depcruise fails
- **Integration:** Create fixture project with valid imports only — depcruise passes
- **E2E:** `lefthook run architecture` — executes depcruise with correct config

---

### HARNESS-004b — Create Architecture Pattern Library

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 1 day |
| **Phase** | W2 |
| **Status** | Done |
| **Blocks** | HARNESS-010 |
| **Dependencies** | HARNESS-004 |

**Description:**
Create `templates/architecture-patterns/` directory with ready-to-use depcruiser configs for common project structures. The agent uses this library during setup to generate the correct `.dependency-cruiser.js` based on detected project structure.

**Acceptance Criteria:**
- AC1: `templates/architecture-patterns/` exists with at least 3 patterns: `layered-app.js`, `monorepo.js`, `hexagonal.js`
- AC2: Each pattern file is a valid dependency-cruiser config with `forbidden[]` array >= 2 rules
- AC3: `templates/architecture-patterns/README.md` contains detection heuristics (which folder structure → which pattern)
- AC4: If agent detects structure with no matching pattern — it informs user and asks for guidance instead of copying default
- AC5: HARNESS-021 (SKILL.md) references the pattern library and describes the fallback behavior

**Tests:**
- **Unit:** Each pattern file loads without syntax errors
- **Integration:** Run depcruise with `monorepo.js` pattern in a monorepo fixture — passes
- **Integration:** Run depcruise with `hexagonal.js` pattern in a hexagonal fixture — passes

---

### HARNESS-005 — Configure CI Pipeline for Validator

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 2 days |
| **Phase** | W2 |
| **Status** | Done |
| **Blocks** | None (last Phase 0 ticket) |
| **Dependencies** | HARNESS-001 (validator) |

**Description:**
GitHub Action that runs `validate-harness.ts` on every push/PR. Deterministic check without LLM.

**Acceptance Criteria:**
- AC1: Given push to main — When GHA triggers — Then `validate-harness.ts` runs and passes
- AC2: Given PR that breaks `AGENTS.md` structure — When GHA runs — Then PR blocked (check fails)
- AC3: CI completes in < 2 minutes
- AC4: Results posted as PR annotations (pass/fail per phase)

**Tests:**
- **Integration:** actionlint on workflow YAML — syntax valid
- **E2E:** Push to test branch — GHA triggers, validator runs, result posted
- **E2E:** Create PR with deleted `AGENTS.md` — GHA fails, PR blocked

---

## Phase 1: L1 Context System (W3)

AGENTS.md, Instruction Modules, Skills Registry. Generation via skill, validation via validator.

---

### HARNESS-006 — Implement AGENTS.md Generation

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Estimate** | 3 days |
| **Phase** | W3 |
| **Status** | Done |
| **Blocks** | HARNESS-011 |
| **Dependencies** | HARNESS-001, HARNESS-003 |

**Description:**
Agent reads `SKILL.md`, scans project (`package.json`), generates `AGENTS.md` < 50 lines. Includes Architecture Rules section referencing `.dependency-cruiser.js`.

**Acceptance Criteria:**
- AC1: Given Next.js project with `package.json` — When agent runs skill — Then `AGENTS.md` generated with correct Stack section
- AC2: Given `AGENTS.md` generated — When validator runs — Then Phase 1 (AST) passes
- AC3: Given `AGENTS.md` — Then it contains `## Architecture Rules` section referencing `.dependency-cruiser.js`
- AC4: Given `AGENTS.md` — Then it contains `## Safety` section with 5+ forbidden operations
- AC5: Given `AGENTS.md` — Then line count < 50

**Tests:**
- **Integration:** Generate `AGENTS.md` for React project — validator AST phase passes
- **Integration:** Generate `AGENTS.md` for Python project — Stack section mentions Python tools
- **Integration:** Generate `AGENTS.md` for Go project — Commands section uses go commands
- **E2E:** Full flow: skill → generation → validation → manifest created

---

### HARNESS-007 — Implement Instruction Modules

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 3 days |
| **Phase** | W3 |
| **Status** | Done |
| **Blocks** | HARNESS-008 |
| **Dependencies** | HARNESS-001, HARNESS-003 |

**Description:**
Agent generates `local/` instructions for project stack. `shared/` connected via git subtree.

**Acceptance Criteria:**
- AC1: Given React project — When agent runs — Then `.claude/instructions/local/react-components.md` created
- AC2: Given project with API routes — Then `.claude/instructions/local/api-endpoints.md` created
- AC3: Each `.md` has valid frontmatter (`---` block with name, type, trigger, tags)
- AC4: Validator passes on Instruction Modules checks (2+ local, 1+ shared)
- AC5: `shared/` contains `SKILL.md` files from registry

**Tests:**
- **Unit:** Frontmatter parser extracts name, type, trigger from fixture `.md`
- **Integration:** Generate for React project — react-components.md exists with frontmatter
- **Integration:** Generate for Vue project — vue-components.md exists (not react)
- **E2E:** `git subtree add` shared registry — files appear in `.claude/instructions/shared/`

---

### HARNESS-008 — Create Skills Registry (Git Repo)

| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Estimate** | 2 days |
| **Phase** | W3 |
| **Blocks** | None |
| **Dependencies** | HARNESS-007 |

**Description:**
Git repository with shared instructions. Semver tags. Structure: `skills/<name>/SKILL.md`.

**Acceptance Criteria:**
- AC1: Git repo exists with at least 3 shared skills (react-component, api-endpoint, e2e-test)
- AC2: Repo has semver tag `v1.0.0`
- AC3: `git subtree add` pulls skills into `.claude/instructions/shared/`
- AC4: Each `SKILL.md` has valid structure (`## Name`, `## Setup`, `## Execution`)

**Tests:**
- **Unit:** Each `SKILL.md` in registry has required sections
- **Integration:** `git subtree add --prefix=... registry v1.0.0` — succeeds, files present
- **Integration:** `git subtree pull` updates to v1.1.0 — new files appear

---

## Phase 2: L2 Quality & Safety + L3 Memory & Protocol (W4–W5)

Quality Pipeline with dep-cruiser, Safety Config, Knowledge Base, Session Protocol. 5 tickets.

---

### HARNESS-009 — Implement Quality Pipeline (lefthook + CI)

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Estimate** | 3 days |
| **Phase** | W4 |
| **Status** | Done |
| **Blocks** | HARNESS-010 |
| **Dependencies** | HARNESS-003, HARNESS-004 |

**Description:**
Agent generates `lefthook.yml` and `.github/workflows/ci.yml` from templates. Replaces `{{VARIABLES}}` with commands for the stack.

**Acceptance Criteria:**
- AC1: Given TypeScript project — When generated — Then `lefthook.yml` uses `"biome check"` for lint
- AC2: Given Python project — When generated — Then `lefthook.yml` uses `"ruff check"` for lint
- AC3: CI workflow has 4+ parallel jobs: lint, typecheck, test, architecture
- AC4: Validator Phase 4 passes (3+ lefthook commands, 4+ CI jobs)
- AC5: `lefthook run pre-commit` executes all commands in parallel

**Tests:**
- **Unit:** Template variable replacement — `{{LINT_CMD}}` → correct command per stack
- **Integration:** `lefthook validate` — config syntax is valid
- **Integration:** actionlint on `ci.yml` — workflow syntax valid
- **E2E:** Push to branch — GHA runs all jobs, completes in < 3 min

---

### HARNESS-010 — Integrate Architecture Checks into Pipeline

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 2 days |
| **Phase** | W4 |
| **Status** | Done |
| **Blocks** | None |
| **Dependencies** | HARNESS-004, HARNESS-009 |

**Description:**
dependency-cruiser as "architecture" job in lefthook and CI. Forbidden rules for layered architecture.

**Acceptance Criteria:**
- AC1: Given code with cross-layer import violation — When lefthook runs — Then architecture check fails
- AC2: Given code with no violations — When CI runs — Then architecture job passes
- AC3: Validator Phase 2 passes (`.dependency-cruiser.js` exists, forbidden rules defined)
- AC4: `AGENTS.md` "Architecture Rules" section references working dep-cruiser config

**Tests:**
- **Integration:** Fixture with `src/ui` importing `src/data-access` — depcruise fails
- **Integration:** Fixture with valid layered imports — depcruise passes
- **E2E:** Commit with violating import — lefthook blocks commit

---

### HARNESS-011 — Implement Safety Config (embedded)

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 1 day |
| **Phase** | W4 |
| **Status** | Done |
| **Blocks** | None |
| **Dependencies** | HARNESS-006 |

**Description:**
`## Safety` section in `AGENTS.md` with fixed list of prohibitions. 5+ items. Checked via AST (list items under heading).

**Acceptance Criteria:**
- AC1: Given `AGENTS.md` generated by skill — Then `## Safety` section has 5+ list items
- AC2: Safety items include: `rm -rf`, `git push --force`, `.env` edit, CSP change
- AC3: Validator counts list items under Safety heading (AST, not grep)

**Tests:**
- **Unit:** AST visitor counts list items under specific H2 heading
- **Integration:** `AGENTS.md` with 4 safety items — validator FAILS
- **Integration:** `AGENTS.md` with 6 safety items — validator PASSES

---

### HARNESS-012 — Implement Knowledge Base

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 2 days |
| **Phase** | W5 |
| **Blocks** | HARNESS-014 |
| **Dependencies** | HARNESS-002, HARNESS-003 |

**Description:**
`docs/knowledge/` with templates (`.template-*.md`) and JSON Schema for frontmatter validation. Agent creates records during work.

**Acceptance Criteria:**
- AC1: Given setup complete — Then `docs/knowledge/` exists with 3 templates
- AC2: `.template-decision.md` has frontmatter with type, tags, date, status fields
- AC3: `knowledge_frontmatter.schema.json` validates frontmatter correctly
- AC4: Given `decision.md` without status — When validated — Then fails (status required for type=decision)

**Tests:**
- **Unit:** Frontmatter extraction from fixture `.md` files
- **Unit:** Schema validation: valid decision passes, invalid decision fails
- **Integration:** Setup creates `docs/knowledge/` with all 3 templates
- **Integration:** Create `NNN-lesson.md` with valid frontmatter — ajv validates

---

### HARNESS-013 — Implement Session Protocol

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 2 days |
| **Phase** | W5 |
| **Status** | Done |
| **Blocks** | None |
| **Dependencies** | HARNESS-002, HARNESS-006 |

**Description:**
Section in `AGENTS.md` + `feature_list.json` with JSON Schema validation. Agent session protocol.

**Acceptance Criteria:**
- AC1: `AGENTS.md` contains `## Session Protocol` section
- AC2: `feature_list.json` is valid per `feature_list.schema.json`
- AC3: `feature_list.json` has `features[]` array with items having id (`FXX`), title, status enum
- AC4: Given invalid `feature_list.json` (status="invalid") — When ajv validates — Then fails with enum error

**Tests:**
- **Unit:** `feature_list.schema.json` compiles with Ajv without errors
- **Unit:** Validate 5 positive fixtures — all pass
- **Unit:** Validate 5 negative fixtures — all fail with expected errors
- **Integration:** Generated `feature_list.json` validates against schema

---

## Phase 3: Cross-cutting Feedback (W6–W7)

Feedback Loop, Circuit Breaker, Triage Report. Preventing deadlocks.

---

### HARNESS-014 — Implement Feedback Loop ✅

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 2 days |
| **Phase** | W6 |
| **Status** | Done |
| **Blocks** | HARNESS-015 |
| **Dependencies** | HARNESS-012 |

**Description:**
Section in `AGENTS.md`. Cycle: error → lesson → instruction update. Agent records to `docs/knowledge/` on every pipeline catch.

**Acceptance Criteria:**
- AC1: `AGENTS.md` contains `## Feedback Loop` section describing the cycle
- AC2: Given lint catches `any` usage — When agent fixes — Then lesson recorded in `docs/knowledge/`
- AC3: Lesson follows `.template-lesson.md` format with type, tags, date, severity
- AC4: Recorded lesson validates against `knowledge_frontmatter.schema.json`

**Tests:**
- **Unit:** Lesson generator creates `.md` from template with correct frontmatter
- **Integration:** Simulate pipeline failure → agent records lesson → file exists and validates
- **E2E:** Agent session with lint error → lesson created → next session agent reads lesson

---

### HARNESS-015 — Implement Circuit Breaker

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Estimate** | 3 days |
| **Phase** | W6 |
| **Status** | Done |
| **Blocks** | HARNESS-016 |
| **Dependencies** | HARNESS-014 |

**Description:**
`ATTEMPTS_LIMIT=3`. After 3 failed attempts to fix pipeline — STOP, create `triage_report.md`, handoff to human.

**Acceptance Criteria:**
- AC1: `AGENTS.md` contains "CIRCUIT BREAKER" block with `ATTEMPTS_LIMIT=3`
- AC2: Given pipeline fails 3 times in a row — When agent tries 3rd fix — Then creates `triage_report.md` and stops
- AC3: Given pipeline fails 2 times then passes on 3rd — When 3rd attempt succeeds — Then no triage report, normal flow continues
- AC4: Circuit breaker state resets between independent features (F02 failure doesn't count for F03)

**Tests:**
- **Unit:** Circuit breaker counter increments on failure, resets on success
- **Unit:** After 3 failures — `isOpen()` returns true, further attempts blocked
- **Integration:** Simulate 3 pipeline failures → `triage_report.md` created with correct structure
- **Integration:** 2 failures + 1 success → no triage report, counter resets
- **E2E:** Full agent session with unfixable error → stops after 3 attempts, human gets report

---

### HARNESS-016 — Create Triage Report Template

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 1 day |
| **Phase** | W7 |
| **Status** | Done |
| **Blocks** | None |
| **Dependencies** | HARNESS-015 |

**Description:**
Template `triage_report.md` with frontmatter (type: triage, date, attempts, feature) and sections Failure, Attempts, Analysis, Recommendation.

**Acceptance Criteria:**
- AC1: `template/triage_report.md` exists with all required sections
- AC2: Generated `triage_report.md` has frontmatter: type, date, attempts, feature
- AC3: Report contains: Failure description, list of attempts, analysis, human recommendation
- AC4: Report validates against knowledge schema (type=triage)

**Tests:**
- **Unit:** Template has all 4 sections (Failure, Attempts, Analysis, Recommendation)
- **Integration:** Generate triage report from fixture data — all sections populated
- **Integration:** Report frontmatter validates against schema

---

## Phase 4: Integration & Polish (W8–W10)

Interactive Setup flow, CI-only mode, dogfooding, documentation. 5 tickets.

---

### HARNESS-017 — Implement Interactive Setup Flow

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Estimate** | 4 days |
| **Phase** | W8 |
| **Status** | Done |
| **Blocks** | HARNESS-018, HARNESS-020 |
| **Dependencies** | All previous tickets (HARNESS-001..016) |

**Description:**
Full flow: agent reads `SKILL.md` → scans project → asks questions → generates all modules → copies templates → runs validator → generates manifest.

**Acceptance Criteria:**
- AC1: Given empty project with `package.json` — When agent runs skill — Then all 8 modules generated/created
- AC2: Agent asks 3-5 clarifying questions before generation
- AC3: After generation, validator runs automatically
- AC4: Given validator passes — Then `.harness/manifest.json` created and committed
- AC5: Given validator fails — Then agent shows errors and offers to fix (within Circuit Breaker limit)
- AC6: Setup completes in < 10 minutes for standard project

**Tests:**
- **Integration:** Setup on React project — all 8 modules created, validator passes
- **Integration:** Setup on Python project — correct tools selected (ruff, mypy)
- **Integration:** Setup on Go project — correct tools selected (golangci-lint)
- **E2E:** Full setup → validator pass → manifest created → git commit
- **E2E:** Setup with invalid project (no `package.json`) → graceful error handling

---

### HARNESS-018 — Implement CI-only Validation Mode

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 2 days |
| **Phase** | W9 |
| **Blocks** | None |
| **Dependencies** | HARNESS-017 |

**Description:**
GitHub Action that runs `validate-harness.ts` without LLM. Deterministic gate for PR.

**Acceptance Criteria:**
- AC1: Given push to main — When GHA triggers — Then validator runs without LLM
- AC2: Given PR that breaks harness structure — When GHA runs — Then PR blocked
- AC3: CI completes in < 2 minutes
- AC4: Results visible as PR annotations (pass/fail per phase)

**Tests:**
- **Integration:** actionlint on workflow YAML — syntax valid
- **E2E:** Push to test branch — GHA triggers, completes, result posted
- **E2E:** PR deleting `AGENTS.md` — GHA fails, merge blocked

---

### HARNESS-019 — Implement Manifest Generation

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 1 day |
| **Phase** | W8 |
| **Status** | Done |
| **Blocks** | None |
| **Dependencies** | HARNESS-001 |

**Description:**
`.harness/manifest.json` generated by validator after successful check. Lock-file for audit.

**Acceptance Criteria:**
- AC1: Given validator passes — Then `.harness/manifest.json` created with results array
- AC2: Manifest contains: validated_at, version, errors, warnings, modules summary
- AC3: Manifest validates against `manifest.schema.json`
- AC4: Manifest committed with harness setup

**Tests:**
- **Unit:** Manifest structure matches schema
- **Integration:** Validator run → manifest created → validates against schema

---

### HARNESS-020 — Dogfooding: Automated Harness Validation on Real Projects

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Estimate** | 5 days |
| **Phase** | W9 |
| **Blocks** | HARNESS-021 |
| **Dependencies** | HARNESS-017 |

**Description:**
Automated dogfooding via disposable real projects. A test runner bootstraps actual projects (React, Next.js, Nuxt, Vue, Python, Go) using their official CLIs, runs the Harness setup flow against them, and verifies that all artifacts are correct and functional. Identifies friction points in stack detection, tool selection, and pipeline execution before real teams encounter them.

**Why not self-dogfooding:** Applying Harness to its own directory is synthetic. Real value comes from testing on projects Harness has never seen — where stack detection, architecture pattern matching, and tool selection must work without prior assumptions.

**Acceptance Criteria:**
- AC1: `scripts/dogfood.ts` CLI exists with `--template` and `--all` flags
- AC2: Given `npm create vite@latest react-ts` project — When harness setup runs — Then `AGENTS.md` lists "React", "TypeScript", "Vite"; `lefthook.yml` uses `npm` commands; validator passes
- AC3: Given `npx create-next-app@latest` project — When harness setup runs — Then stack detects "Next.js"; `.dependency-cruiser.js` generated; `depcruise src` passes
- AC4: Given `npx nuxi@latest init` project — When harness setup runs — Then stack detects "Nuxt"; `lefthook.yml` contains `npm run` commands; pre-commit executes
- AC5: Given Python project with `pyproject.toml` — When harness setup runs — Then `lefthook.yml` uses `ruff check` and `pytest`; validator passes
- AC6: E2E test suite runs dogfood against at least 4 distinct stacks in CI
- AC7: At least 3 lessons recorded in `docs/knowledge/` from dogfooding findings
- AC8: Dogfooding report (`dogfood-report.json`) generated with per-project pass/fail summary

**Test Runner Flow:**
1. **Bootstrap**: Create temp dir → run official project scaffold CLI (vite, next, nuxi, etc.)
2. **Inject Harness**: Copy harness source/templates into temp project context → run `runSetup()`
3. **Verify Phase 1 (Artifacts)**: Check all 8 modules exist and are non-empty
4. **Verify Phase 2 (Content)**: Assert `AGENTS.md` stack matches actual dependencies; `lefthook.yml` commands match stack
5. **Verify Phase 3 (Execution)**: Run `depcruise src`, `lefthook validate`, `lefthook run pre-commit` — all must pass
6. **Verify Phase 4 (Manifest)**: `.harness/manifest.json` exists and validates against schema
7. **Cleanup**: Remove temp project regardless of outcome

**Tests:**
- **E2E:** Dogfood React+Vite project → bootstrap → setup → verify → all phases pass → report generated
- **E2E:** Dogfood Next.js project → bootstrap → setup → verify → all phases pass
- **E2E:** Dogfood Nuxt project → bootstrap → setup → verify → all phases pass
- **E2E:** Dogfood Python project → bootstrap → setup → verify → all phases pass
- **E2E:** Full CI run: `npm run dogfood:all` → 4+ projects tested → JSON report created

---

### HARNESS-021 — Write Documentation and Migration Guide

| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Estimate** | 3 days |
| **Phase** | W10 |
| **Blocks** | None (last ticket) |
| **Dependencies** | HARNESS-020 |

**Description:**
README, Setup Guide, Troubleshooting, Migration from other setups. SKILL.md with architecture pattern discovery.

**Acceptance Criteria:**
- AC1: `README.md` with quick start (3 commands to setup)
- AC2: `SETUP.md` with full flow and screenshots
- AC3: `TROUBLESHOOTING.md` with common errors and fixes
- AC4: `MIGRATION.md` for projects with existing lint/setup configs
- AC5: `SKILL.md` contains explicit instructions for agent: (a) scan project structure, (b) match against `templates/architecture-patterns/`, (c) copy matching pattern, (d) if no match — inform user and ask for guidance

**Tests:**
- **E2E:** New team member follows README → setup complete in < 15 min

---

## Test Coverage Matrix

| Ticket | Unit | Integration | E2E | Total |
|--------|------|-------------|-----|-------|
| HARNESS-001 (Validator) | 3 | 3 | 1 | 7 |
| HARNESS-002 (Schema) | 4 | 1 | 0 | 5 |
| HARNESS-003 (Templates) | 3 | 2 | 0 | 5 |
| HARNESS-004 (Dep-cruiser) | 1 | 2 | 1 | 4 |
| HARNESS-004b (Arch Patterns) | 1 | 2 | 0 | 3 |
| HARNESS-005 (CI) | 0 | 1 | 2 | 3 |
| HARNESS-006 (AGENTS.md) | 0 | 3 | 1 | 4 |
| HARNESS-007 (Instructions) | 1 | 3 | 1 | 5 |
| HARNESS-008 (Registry) | 1 | 2 | 0 | 3 |
| HARNESS-009 (Quality) | 1 | 2 | 1 | 4 |
| HARNESS-010 (Arch checks) | 0 | 2 | 1 | 3 |
| HARNESS-011 (Safety) | 1 | 2 | 0 | 3 |
| HARNESS-012 (Knowledge) | 2 | 2 | 0 | 4 |
| HARNESS-013 (Session) | 3 | 1 | 0 | 4 |
| HARNESS-014 (Feedback) | 1 | 1 | 1 | 3 |
| HARNESS-015 (Circuit Breaker) | 3 | 2 | 1 | 6 |
| HARNESS-016 (Triage) | 1 | 2 | 0 | 3 |
| HARNESS-017 (Setup flow) | 0 | 3 | 2 | 5 |
| HARNESS-018 (CI-only) | 0 | 1 | 2 | 3 |
| HARNESS-019 (Manifest) | 1 | 1 | 0 | 2 |
| HARNESS-020 (Dogfooding) | 0 | 0 | 5 | 5 |
| HARNESS-021 (Docs) | 0 | 0 | 1 | 1 |
| **TOTAL** | **24** | **40** | **21** | **85** |

---

## Summary Table

| ID | Ticket | Priority | Est | Phase | Blocks |
|----|--------|----------|-----|-------|--------|
| 001 | AST Validator | P0 | 5d | W1 | 005, 017, 018, 019 |
| 002 | JSON Schema | P0 | 3d | W1 | 003, 013 |
| 003 | Templates | P0 | 3d | W1 | 006, 009 |
| 004 | Dep-cruiser config | P1 | 2d | W2 | 010 |
| 004b | Arch Pattern Library | P1 | 1d | W2 | 010 |
| 005 | Validator CI | P1 | 2d | W2 | — |
| 006 | AGENTS.md gen | P0 | 3d | W3 | 011 |
| 007 | Instruction Modules | P1 | 3d | W3 | 008 |
| 008 | Skills Registry | P2 | 2d | W3 | — |
| 009 | Quality Pipeline | P0 | 3d | W4 | 010 |
| 010 | Architecture Checks | P1 | 2d | W4 | — |
| 011 | Safety Config | P1 | 1d | W4 | — |
| 012 | Knowledge Base | P1 | 2d | W5 | 014 |
| 013 | Session Protocol | P1 | 2d | W5 | — |
| 014 | Feedback Loop | P1 | 2d | W6 | 015 |
| 015 | Circuit Breaker | P0 | 3d | W6 | 016 |
| 016 | Triage Report | P1 | 1d | W7 | — |
| 017 | Interactive Setup | P0 | 4d | W8 | 018, 020 |
| 018 | CI-only mode | P1 | 2d | W9 | — |
| 019 | Manifest gen | P1 | 1d | W8 | — |
| 020 | Dogfooding | P1 | 5d | W9 | 021 |
| 021 | Documentation | P2 | 3d | W10 | — |

**Totals:** 22 tickets, 47 person-days, 10 weeks (5 sprints), 83 tests (24 unit + 40 integration + 19 e2e).

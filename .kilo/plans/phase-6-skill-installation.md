# Phase 6: Document Skill Installation Path

## Goal
Document how AI agents discover and load the `harness-validator` skill and its sub-skills in consumer projects.

## Background: How AI Agent Skills Work

### What is a "skill"?
An AI agent skill is a Markdown file (usually `SKILL.md`) containing:
- **Frontmatter**: name, description, version, triggers
- **Procedural instructions**: what the agent should do when invoked
- **Reference links**: deeper docs the agent can load on demand

Agents scan specific directories at startup to discover available skills. Different agents use different directories.

### What is Git subtree?
`git subtree` is a git feature that embeds one repository inside another as a subdirectory, while preserving the full history of the embedded repo.

```bash
# Add harness-validator as a subdirectory .kilo/skills/harness-validator
git subtree add --prefix=.kilo/skills/harness-validator \
  https://github.com/PavelPetrovich87/harness-validator.git v0.2.0
```

**Pros:**
- Skill files are actually committed into the consumer repo (works offline, no clone needed)
- Easy to update later: `git subtree pull ...`
- CI and other team members get the skill automatically

**Cons:**
- Adds the validator's full git history to the consumer repo
- Slightly larger repo size

**Alternative:** `git submodule` keeps the skill as a separate repo reference, but requires `git submodule update` and is more fragile.

### What is manual copy install?
Simply copy the skill file(s) into the agent's skill directory:

```bash
# For Kilo
mkdir -p .kilo/skills/harness-validator
cp /path/to/harness-validator/.kilo/skills/harness-validator/SKILL.md .kilo/skills/harness-validator/

# For sub-skills
cp /path/to/harness-validator/.kilo/skills/harness-setup/SKILL.md .kilo/skills/harness-setup/
cp /path/to/harness-validator/.kilo/skills/harness-validate/SKILL.md .kilo/skills/harness-validate/
cp /path/to/harness-validator/.kilo/skills/harness-dogfood/SKILL.md .kilo/skills/harness-dogfood/
```

**Pros:**
- No git history added
- Minimal footprint (just the skill files)
- Fine-grained control over which sub-skills to install

**Cons:**
- Manual update process
- Risk of drift between consumer copy and upstream skill

### Why install in `.kilo/skills/`?
Kilo (the agent running here) discovers skills in `.kilo/skills/<name>/SKILL.md`. When a user says:

> "Set up harness for this project"

Kilo scans `.kilo/skills/`, finds `harness-validator/SKILL.md`, reads its trigger phrases ("set up harness", "generate AGENTS.md", etc.), and invokes the skill.

Without the skill installed in `.kilo/skills/`, the agent either:
- Doesn't know how to respond to harness-related requests
- Falls back to generic behavior

### What are `.claude/instructions/shared/`?
Claude Code (another AI agent) uses a different skill directory structure:

```
.claude/instructions/
├── local/           # Project-specific instructions
│   ├── react-components.md
│   └── api-endpoints.md
└── shared/          # Cross-project reusable instructions
    └── harness-validator/
        └── SKILL.md
```

`shared/` is for instructions that are reused across multiple projects. This is the Claude equivalent of Kilo's `.kilo/skills/`.

The same skill can be installed in either location depending on which agent the project uses.

## Current State

This repo already contains a skill pack at `.kilo/skills/`:

```
.kilo/skills/
├── harness-validator/      # Meta-skill (handles all harness requests)
│   └── SKILL.md
├── harness-setup/          # Focused: full setup flow
│   └── SKILL.md
├── harness-validate/       # Focused: validation only
│   └── SKILL.md
└── harness-dogfood/        # Focused: dogfooding tests
    └── SKILL.md
```

A consumer project that wants Kilo to use these skills must have these files in its own `.kilo/skills/` directory.

## Planned Changes

### 6.1 Add "Skill Installation" Section to README.md

Create a dedicated section in the root README:

```markdown
## Install as Agent Skill

### For Kilo

#### Option A: Git subtree (recommended)
```bash
git subtree add --prefix=.kilo/skills/harness-validator \
  https://github.com/PavelPetrovich87/harness-validator.git v0.2.0
```

To update later:
```bash
git subtree pull --prefix=.kilo/skills/harness-validator \
  https://github.com/PavelPetrovich87/harness-validator.git v0.2.0
```

#### Option B: Manual copy
```bash
mkdir -p .kilo/skills/harness-validator
curl -L https://raw.githubusercontent.com/PavelPetrovich87/harness-validator/v0.2.0/.kilo/skills/harness-validator/SKILL.md \
  > .kilo/skills/harness-validator/SKILL.md
```

### For Claude Code
```bash
mkdir -p .claude/instructions/shared/harness-validator
curl -L https://raw.githubusercontent.com/PavelPetrovich87/harness-validator/v0.2.0/.kilo/skills/harness-validator/SKILL.md \
  > .claude/instructions/shared/harness-validator/SKILL.md
```
```

### 6.2 Document Sub-Skill Installation

Explain when to install the full pack vs individual sub-skills:

| Install | Use When |
|---------|----------|
| `harness-validator` only | General harness requests, agent picks the right sub-skill |
| `harness-setup` | Only need the setup/bootstrap flow |
| `harness-validate` | Only need validation in CI/agent workflows |
| `harness-dogfood` | Only testing the harness itself |
| Full pack | Active harness development |

### 6.3 Add `scripts/install-skill.ts` Helper (Optional)

Automate skill installation for consumer projects:

```bash
# Install all skills into .kilo/skills/
npx tsx scripts/install-skill.ts --target .kilo/skills --all

# Install only harness-validator
npx tsx scripts/install-skill.ts --target .kilo/skills --skill harness-validator
```

This script would:
1. Download `SKILL.md` files from GitHub raw URLs
2. Create the target directory structure
3. Optionally pin to a specific tag/version

**Decision needed**: Is this helper worth adding, or is documenting `git subtree` + manual copy sufficient?

### 6.4 Add Skill Discovery Note

Add a short note explaining how agents match trigger phrases:

> Once installed, the skill activates when Kilo sees phrases like "set up harness", "validate project", or "run dogfood" in user requests.

## Open Decisions

1. **Should we create `scripts/install-skill.ts`?**
   - **Yes**: Easier for users, version-pinnable, scriptable
   - **No**: Manual copy and `git subtree` are enough for now
   - **Recommendation**: Document manual/subtree first; add helper script if users ask for it

2. **Should we support both Kilo and Claude Code paths?**
   - **Yes**: Broader adoption, the skill is agent-agnostic
   - **No**: Focus on Kilo only
   - **Recommendation**: Document both; primary focus on Kilo since this project uses `.kilo/skills/`

3. **Should the skill pack be installable separately from the CLI package?**
   - Currently the skill files live in this repo alongside the TypeScript toolchain
   - Option: Publish only `SKILL.md` files to a separate lightweight repo
   - **Recommendation**: Keep everything in one repo for now; the `files` array in `package.json` already controls what's published

## Success Criteria
- [ ] README.md has a "Skill Installation" section with both Kilo and Claude Code paths
- [ ] `git subtree` command documented with update command
- [ ] Manual copy instructions documented with `curl` examples
- [ ] Sub-skill selection guidance documented
- [ ] (Optional) `scripts/install-skill.ts` helper created and tested

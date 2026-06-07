# Phase 4: Versioning & Releases

## Goal
Establish a clear versioning scheme, create a changelog, and tag the first distributable release of `ai-harness-validator`.

## Current State
- `package.json`: `"version": "0.1.0"`
- `src/criteria-version.ts`: `CRITERIA_VERSION = '0.1.0'`
- No git tags exist
- No `CHANGELOG.md` exists
- Recent major additions: diagnostics, scoring, diff, research workflow, packaging (Phase 3)

## Open Decision: Version Number

The project has evolved significantly since `0.1.0`:
- Phase 1: Repository hygiene, merge conflict resolution
- Phase 2: Root README.md for GitHub
- Phase 3: Build step, `bin` entries, `files` array, `dist/` compilation
- Plus pre-existing features: 5-phase validator, dogfooding, sub-skills

**Options:**
- `0.2.0` — minor bump, reflects significant new features (recommended by roadmap)
- `0.1.1` — patch bump, if treating packaging as a fix
- `1.0.0` — major bump, if declaring stable API

**Recommendation:** `0.2.0` — packaging and distribution are meaningful new capabilities.

## Planned Changes

### 4.1 Update Version References
- Update `package.json`: `"version": "0.2.0"`
- Decide whether to bump `CRITERIA_VERSION` in `src/criteria-version.ts`
  - **Bump** if validation rules changed in Phase 1–3 (e.g., new manifest fields)
  - **Keep** if criteria are unchanged and only tooling/distribution improved

### 4.2 Create CHANGELOG.md
- Use [Keep a Changelog](https://keepachangelog.com/) format
- Sections: `## [Unreleased]`, `## [0.2.0] - YYYY-MM-DD`
- Categories: `Added`, `Changed`, `Fixed`, `Removed`
- Content for 0.2.0:
  - **Added**: Build step (`npm run build`), CLI binaries, `files` array, compiled `dist/` output
  - **Added**: Root README.md with badges and install instructions
  - **Added**: Diagnostics, scoring, diff, and research workflow commands
  - **Changed**: Restructured skill layout (moved from `output/` to clean root)
  - **Fixed**: Merge conflict resolution with remote branch

### 4.3 Tag the Release
```bash
git tag -a v0.2.0 -m "Release v0.2.0 — Distribution packaging and documentation"
git push origin v0.2.0
```

### 4.4 (Optional) Create GitHub Release
- Go to https://github.com/PavelPetrovich87/harness-validator/releases
- Click "Draft a new release"
- Choose tag `v0.2.0`
- Title: `v0.2.0 — Distribution packaging`
- Body: copy from CHANGELOG.md `[0.2.0]` section

## Success Criteria
- [ ] `package.json` version updated to `0.2.0`
- [ ] `CHANGELOG.md` created at repo root
- [ ] Git tag `v0.2.0` exists locally and on remote
- [ ] `npm pack --dry-run` reports version `0.2.0`
- [ ] (Optional) GitHub Release published

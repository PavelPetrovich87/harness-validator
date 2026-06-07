# Phase 5: Reusable CI Workflow

## Goal
Provide a GitHub Actions reusable workflow that consumer repositories can invoke to validate their harness compliance without maintaining their own CI configuration.

## Current State
- Single workflow: `.github/workflows/ci.yml` (internal CI for this repo)
- The validator script supports `--github` flag for workflow annotations
- Internal CI runs validator from `.harness/validator/` subdirectory using `npx tsx`
- After Phase 3, the validator is now packaged with compiled `dist/` output and `bin` entries
- No reusable workflows or composite actions exist

## Design Decision: Workflow Type

### Option A: `workflow_call` Reusable Workflow (chosen)
Consumer repos reference the workflow definition from this repo:
```yaml
jobs:
  harness:
    uses: PavelPetrovich87/harness-validator/.github/workflows/harness-validate.yml@v0.2.0
```
- **Pros**: Full job definition, easy to drop into consumer CI, version-pinned via tag
- **Cons**: Less flexible for custom job matrices

### Option B: Composite Action
Consumer repos add a step to their existing job:
```yaml
steps:
  - uses: PavelPetrovich87/harness-validator/harness-validate@v0.2.0
```
- **Pros**: Fits into existing jobs, more flexible
- **Cons**: More complex to set up, requires action.yml metadata

**Recommendation**: Option A for initial release. Add Option B later if requested.

## Planned Changes

### 5.1 Create Reusable Workflow

**New file**: `.github/workflows/harness-validate.yml`

```yaml
name: Harness Validate
on:
  workflow_call:
    inputs:
      node-version:
        description: 'Node.js version'
        default: '20'
        type: string
      project-path:
        description: 'Path to project root relative to workspace'
        default: '.'
        type: string
      install-source:
        description: 'Install from npm or github'
        default: 'github'
        type: string
      version:
        description: 'Version tag or branch'
        default: 'v0.2.0'
        type: string
      recommendations:
        description: 'Show recommendations for failures'
        default: false
        type: boolean
      upload-manifest:
        description: 'Upload manifest.json as artifact'
        default: true
        type: boolean

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - name: Install harness-validator
        run: |
          if [ "${{ inputs.install-source }}" = "npm" ]; then
            npm install -g ai-harness-validator@${{ inputs.version }}
          else
            npm install -g github:PavelPetrovich87/harness-validator#${{ inputs.version }}
          fi
      - name: Validate harness
        run: |
          harness-validate --github --project ${{ inputs.project-path }} \
            ${{ inputs.recommendations && '--recommendations' || '' }}
      - name: Upload manifest
        if: inputs.upload-manifest
        uses: actions/upload-artifact@v4
        with:
          name: harness-manifest
          path: ${{ inputs.project-path }}/.harness/manifest.json
```

### 5.2 Update Internal CI

**Modify**: `.github/workflows/ci.yml`

The internal `validate` job currently runs from `.harness/validator/`. Update it to:
1. Test the new `npm run build` output (from Phase 3)
2. Optionally test the reusable workflow by calling it locally

Or keep the internal validate job as-is but update paths to use compiled `dist/` instead of `npx tsx`.

### 5.3 Test the Reusable Workflow

Create a test in this repo or a disposable repo to verify:
```yaml
# .github/workflows/test-reusable.yml
name: Test Reusable Workflow
on: [push]
jobs:
  harness:
    uses: ./.github/workflows/harness-validate.yml
    with:
      project-path: .
      install-source: github
      version: main
```

### 5.4 Documentation Update

Update `README.md` "Quick Start" → "CI Integration" section:

```markdown
## CI Integration

Add harness validation to your project with one line:

```yaml
jobs:
  harness:
    uses: PavelPetrovich87/harness-validator/.github/workflows/harness-validate.yml@v0.2.0
```

With options:

```yaml
jobs:
  harness:
    uses: PavelPetrovich87/harness-validator/.github/workflows/harness-validate.yml@v0.2.0
    with:
      project-path: ./apps/web
      recommendations: true
      upload-manifest: true
```
```

## Open Decisions

1. **Install source default**: Should the reusable workflow default to `github` or `npm`?
   - `github` works immediately without NPM publishing
   - `npm` is cleaner but requires the package to be published first
   - **Recommendation**: Default to `github` until NPM publish is complete

2. **Node version**: Should we support a matrix (18, 20, 22) or pin to 20?
   - **Recommendation**: Single version (20) to match `engines` field. Matrix adds noise for a validator.

3. **Manifest artifact retention**: How long to keep manifest artifacts?
   - Default GitHub retention (90 days) is fine
   - Optionally add `retention-days: 30` input

## Success Criteria
- [ ] `.github/workflows/harness-validate.yml` exists with `workflow_call` trigger
- [ ] Internal CI still passes
- [ ] Test workflow in this repo successfully calls the reusable workflow
- [ ] README.md documents CI integration with examples
- [ ] Workflow inputs are documented with defaults

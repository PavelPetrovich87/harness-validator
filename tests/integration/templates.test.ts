import { describe, it, expect } from 'vitest';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { HarnessValidator } from '../../src/validator.js';
import { ValidationPhase } from '../../src/types.js';
import { extractFrontmatter } from '../../src/utils/frontmatter.js';

const TEMPLATES_DIR = new URL('../../templates', import.meta.url).pathname;
const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

describe('Integration: Templates against HarnessValidator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'templates-test-'));

    // Copy all templates to temp dir (including dotfiles and dot-directories)
    cpSync(TEMPLATES_DIR, tempDir, { recursive: true, force: true });

    // Copy schema so data-contracts phase can fully validate
    cpSync(
      join(SCHEMAS_DIR, 'feature_list.schema.json'),
      join(tempDir, 'feature_list.schema.json')
    );

    // Replace template placeholders with real commands so YAML parsing succeeds
    const lefthookPath = join(tempDir, 'lefthook.yml');
    const lefthookContent = readFileSync(lefthookPath, 'utf-8')
      .replace(/\{\{LINT_CMD\}\}/g, 'biome check')
      .replace(/\{\{TYPECHECK_CMD\}\}/g, 'npx tsc --noEmit')
      .replace(/\{\{TEST_CMD\}\}/g, 'npm test');
    writeFileSync(lefthookPath, lefthookContent);

    const ciPath = join(tempDir, '.github', 'workflows', 'ci.yml');
    const ciContent = readFileSync(ciPath, 'utf-8')
      .replace(/\{\{LINT_CMD\}\}/g, 'biome check')
      .replace(/\{\{TYPECHECK_CMD\}\}/g, 'npx tsc --noEmit')
      .replace(/\{\{TEST_CMD\}\}/g, 'npm test');
    writeFileSync(ciPath, ciContent);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('all template files copied to temp dir (including dotfiles)', () => {
    expect(existsSync(join(tempDir, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'lefthook.yml'))).toBe(true);
    expect(existsSync(join(tempDir, '.dependency-cruiser.js'))).toBe(true);
    expect(existsSync(join(tempDir, '.github', 'workflows', 'ci.yml'))).toBe(true);
    expect(existsSync(join(tempDir, 'feature_list.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'feature_list.schema.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'knowledge', '.template-decision.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'knowledge', '.template-lesson.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'knowledge', '.template-pattern.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'instructions', 'react-components.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'instructions', 'vue-components.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'instructions', 'api-endpoints.md'))).toBe(true);
  });

  it('HarnessValidator passes all structural checks on templates', async () => {
    const manifestPath = join(tempDir, '.harness', 'manifest.json');
    const validator = new HarnessValidator({ projectRoot: tempDir, manifestPath });
    const { results, exitCode } = await validator.run();

    expect(exitCode).toBe(0);

    // All phases should have at least one PASS result and no FAIL
    for (const phase of Object.values(ValidationPhase)) {
      const phaseResults = results.filter((r) => r.phase === phase);
      expect(phaseResults.length).toBeGreaterThan(0);
      expect(phaseResults.some((r) => r.status === 'FAIL')).toBe(false);
    }
  });

  it('feature_list.json template validates against schema via ajv', () => {
    const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'feature_list.schema.json'), 'utf-8'));
    const data = JSON.parse(readFileSync(join(TEMPLATES_DIR, 'feature_list.json'), 'utf-8'));

    const ajv = createAjv();
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }
    expect(valid).toBe(true);
  });

  it('instruction templates have valid frontmatter', () => {
    const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'instruction_frontmatter.schema.json'), 'utf-8'));
    const ajv = createAjv();
    const validate = ajv.compile(schema);

    for (const name of ['react-components.md', 'vue-components.md', 'api-endpoints.md']) {
      const content = readFileSync(join(TEMPLATES_DIR, 'instructions', name), 'utf-8');
      const frontmatter = extractFrontmatter(content);
      expect(frontmatter).not.toBeNull();
      const valid = validate(frontmatter);
      if (!valid) {
        console.error(`Validation errors for ${name}:`, validate.errors);
      }
      expect(valid).toBe(true);
    }
  });

  it('knowledge templates have valid frontmatter when validated against schema', () => {
    const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json'), 'utf-8'));
    const ajv = createAjv();
    const validate = ajv.compile(schema);

    for (const name of ['.template-decision.md', '.template-lesson.md', '.template-pattern.md']) {
      const content = readFileSync(join(TEMPLATES_DIR, 'knowledge', name), 'utf-8');
      const frontmatter = extractFrontmatter(content);
      expect(frontmatter).not.toBeNull();
      const valid = validate(frontmatter);
      if (!valid) {
        console.error(`Validation errors for ${name}:`, validate.errors);
      }
      expect(valid).toBe(true);
    }
  });

  it('.template-decision.md frontmatter contains status field', () => {
    const content = readFileSync(join(TEMPLATES_DIR, 'knowledge', '.template-decision.md'), 'utf-8');
    const frontmatter = extractFrontmatter(content);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.status).toBe('proposed');
  });
});

describe('Integration: Templates fixture directory', () => {
  const FIXTURE_DIR = new URL('../fixtures/templates-harness', import.meta.url).pathname;

  it('fixture exists and has all required files', () => {
    expect(existsSync(join(FIXTURE_DIR, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(FIXTURE_DIR, 'lefthook.yml'))).toBe(true);
    expect(existsSync(join(FIXTURE_DIR, '.dependency-cruiser.js'))).toBe(true);
    expect(existsSync(join(FIXTURE_DIR, '.github', 'workflows', 'ci.yml'))).toBe(true);
    expect(existsSync(join(FIXTURE_DIR, 'feature_list.json'))).toBe(true);
    expect(existsSync(join(FIXTURE_DIR, 'feature_list.schema.json'))).toBe(true);
    expect(existsSync(join(FIXTURE_DIR, 'docs', 'knowledge', '.template-decision.md'))).toBe(true);
    expect(existsSync(join(FIXTURE_DIR, 'docs', 'knowledge', '.template-lesson.md'))).toBe(true);
    expect(existsSync(join(FIXTURE_DIR, 'docs', 'knowledge', '.template-pattern.md'))).toBe(true);
  });

  it('fixture passes HarnessValidator', async () => {
    const manifestPath = join(FIXTURE_DIR, '.harness', 'manifest.json');
    const validator = new HarnessValidator({ projectRoot: FIXTURE_DIR, manifestPath });
    const { exitCode } = await validator.run();
    expect(exitCode).toBe(0);
  });
});

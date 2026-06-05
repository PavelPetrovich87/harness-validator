import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const PROJECT_ROOT = new URL('../..', import.meta.url).pathname;
const SCHEMAS_DIR = join(PROJECT_ROOT, 'schemas');
const FIXTURES_POSITIVE = join(PROJECT_ROOT, 'tests/fixtures/schemas/positive');
const FIXTURES_NEGATIVE = join(PROJECT_ROOT, 'tests/fixtures/schemas/negative');

describe('Integration: ajv-cli validation', () => {
  it('validates feature_list.json against schema (exit 0)', () => {
    const schema = join(SCHEMAS_DIR, 'feature_list.schema.json');
    const data = join(FIXTURES_POSITIVE, 'feature_list_1.json');

    const output = execSync(
      `npx ajv validate -s "${schema}" -d "${data}"`,
      { cwd: PROJECT_ROOT, encoding: 'utf-8' }
    );

    expect(output).toContain('valid');
  });

  it('fails on invalid status enum (exit != 0)', () => {
    const schema = join(SCHEMAS_DIR, 'feature_list.schema.json');
    const data = join(FIXTURES_NEGATIVE, 'feature_list_invalid_status.json');

    expect(() => {
      execSync(
        `npx ajv validate -s "${schema}" -d "${data}"`,
        { cwd: PROJECT_ROOT, encoding: 'utf-8' }
      );
    }).toThrow();
  });

  it('validates knowledge frontmatter (decision) against schema (exit 0)', () => {
    const schema = join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json');
    const data = join(FIXTURES_POSITIVE, 'knowledge_decision.json');

    const output = execSync(
      `npx ajv validate -s "${schema}" -d "${data}"`,
      { cwd: PROJECT_ROOT, encoding: 'utf-8' }
    );

    expect(output).toContain('valid');
  });

  it('fails on decision without status (exit != 0)', () => {
    const schema = join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json');
    const data = join(FIXTURES_NEGATIVE, 'knowledge_decision_no_status.json');

    expect(() => {
      execSync(
        `npx ajv validate -s "${schema}" -d "${data}"`,
        { cwd: PROJECT_ROOT, encoding: 'utf-8' }
      );
    }).toThrow();
  });

  it('validates manifest.json against schema (exit 0)', () => {
    const schema = join(SCHEMAS_DIR, 'manifest.schema.json');
    const data = join(FIXTURES_POSITIVE, 'manifest_1.json');

    const output = execSync(
      `npx ajv validate -s "${schema}" -d "${data}"`,
      { cwd: PROJECT_ROOT, encoding: 'utf-8' }
    );

    expect(output).toContain('valid');
  });

  it('fails on manifest with invalid version format (exit != 0)', () => {
    const schema = join(SCHEMAS_DIR, 'manifest.schema.json');
    const data = join(FIXTURES_NEGATIVE, 'manifest_invalid_version.json');

    expect(() => {
      execSync(
        `npx ajv validate -s "${schema}" -d "${data}"`,
        { cwd: PROJECT_ROOT, encoding: 'utf-8' }
      );
    }).toThrow();
  });
});

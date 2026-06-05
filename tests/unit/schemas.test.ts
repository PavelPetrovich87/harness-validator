import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;
const FIXTURES_POSITIVE = new URL('../../tests/fixtures/schemas/positive', import.meta.url).pathname;
const FIXTURES_NEGATIVE = new URL('../../tests/fixtures/schemas/negative', import.meta.url).pathname;

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function getFixtureFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f));
}

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

describe('Schema Compilation', () => {
  it('compiles feature_list.schema.json without errors', () => {
    const ajv = createAjv();
    const schema = loadJson(join(SCHEMAS_DIR, 'feature_list.schema.json'));
    const validate = ajv.compile(schema);
    expect(validate).toBeTypeOf('function');
  });

  it('compiles knowledge_frontmatter.schema.json without errors', () => {
    const ajv = createAjv();
    const schema = loadJson(join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json'));
    const validate = ajv.compile(schema);
    expect(validate).toBeTypeOf('function');
  });

  it('compiles manifest.schema.json without errors', () => {
    const ajv = createAjv();
    const schema = loadJson(join(SCHEMAS_DIR, 'manifest.schema.json'));
    const validate = ajv.compile(schema);
    expect(validate).toBeTypeOf('function');
  });
});

describe('Positive Fixtures (all should pass)', () => {
  const positiveFiles = getFixtureFiles(FIXTURES_POSITIVE);

  it(`has at least 10 positive fixtures (found ${positiveFiles.length})`, () => {
    expect(positiveFiles.length).toBeGreaterThanOrEqual(10);
  });

  for (const filePath of positiveFiles) {
    const fileName = filePath.split('/').pop()!;
    it(`passes: ${fileName}`, () => {
      const data = loadJson(filePath);

      // Determine which schema to use based on filename prefix
      let schemaName: string;
      if (fileName.startsWith('feature_list')) {
        schemaName = 'feature_list.schema.json';
      } else if (fileName.startsWith('knowledge')) {
        schemaName = 'knowledge_frontmatter.schema.json';
      } else if (fileName.startsWith('manifest')) {
        schemaName = 'manifest.schema.json';
      } else {
        throw new Error(`Cannot determine schema for fixture: ${fileName}`);
      }

      const ajv = createAjv();
      const schema = loadJson(join(SCHEMAS_DIR, schemaName));
      const validate = ajv.compile(schema);
      const valid = validate(data);

      if (!valid) {
        console.error(`Validation errors for ${fileName}:`, validate.errors);
      }
      expect(valid).toBe(true);
    });
  }
});

describe('Negative Fixtures (all should fail)', () => {
  const negativeFiles = getFixtureFiles(FIXTURES_NEGATIVE);

  it(`has at least 10 negative fixtures (found ${negativeFiles.length})`, () => {
    expect(negativeFiles.length).toBeGreaterThanOrEqual(10);
  });

  for (const filePath of negativeFiles) {
    const fileName = filePath.split('/').pop()!;
    it(`fails: ${fileName}`, () => {
      const data = loadJson(filePath);

      let schemaName: string;
      if (fileName.startsWith('feature_list')) {
        schemaName = 'feature_list.schema.json';
      } else if (fileName.startsWith('knowledge')) {
        schemaName = 'knowledge_frontmatter.schema.json';
      } else if (fileName.startsWith('manifest')) {
        schemaName = 'manifest.schema.json';
      } else {
        throw new Error(`Cannot determine schema for fixture: ${fileName}`);
      }

      const ajv = createAjv();
      const schema = loadJson(join(SCHEMAS_DIR, schemaName));
      const validate = ajv.compile(schema);
      const valid = validate(data);

      expect(valid).toBe(false);
      expect(validate.errors).toBeInstanceOf(Array);
      expect(validate.errors!.length).toBeGreaterThan(0);
    });
  }
});

describe('Specific AC Validation', () => {
  it('AC2: feature_list with invalid_status fails with enum error', () => {
    const ajv = createAjv();
    const schema = loadJson(join(SCHEMAS_DIR, 'feature_list.schema.json'));
    const data = loadJson(join(FIXTURES_NEGATIVE, 'feature_list_invalid_status.json'));
    const validate = ajv.compile(schema);

    const valid = validate(data);
    expect(valid).toBe(false);
    expect(validate.errors).toBeInstanceOf(Array);
    const messages = validate.errors!.map((e) => e.message || '');
    expect(messages.some((m) => m.includes('must be equal to one of the allowed values'))).toBe(true);
  });

  it('AC3: decision without status fails (status required for decisions)', () => {
    const ajv = createAjv();
    const schema = loadJson(join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json'));
    const data = loadJson(join(FIXTURES_NEGATIVE, 'knowledge_decision_no_status.json'));
    const validate = ajv.compile(schema);

    const valid = validate(data);
    expect(valid).toBe(false);
    expect(validate.errors).toBeInstanceOf(Array);
    const messages = validate.errors!.map((e) => e.message || '');
    expect(messages.some((m) => m.includes("must have required property 'status'"))).toBe(true);
  });

  it('AC4: lesson with severity high passes', () => {
    const ajv = createAjv();
    const schema = loadJson(join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json'));
    const data = loadJson(join(FIXTURES_POSITIVE, 'knowledge_lesson.json'));
    const validate = ajv.compile(schema);

    const valid = validate(data);
    expect(valid).toBe(true);
    expect(data).toMatchObject({ type: 'lesson', severity: 'high' });
  });
});

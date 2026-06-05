import { describe, it, expect } from 'vitest';
import { extractFrontmatter, extractFrontmatterFromFile } from '../../src/utils/frontmatter.js';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;
const TEMPLATES_DIR = new URL('../../templates', import.meta.url).pathname;

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

describe('frontmatter', () => {
  it('extracts frontmatter from markdown with YAML block', () => {
    const markdown = `---
name: Test Instruction
type: instruction
trigger: test
tags: [a, b]
---

# Body

Some content.
`;
    const result = extractFrontmatter(markdown);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Test Instruction');
    expect(result!.type).toBe('instruction');
    expect(result!.trigger).toBe('test');
    expect(result!.tags).toEqual(['a', 'b']);
  });

  it('returns null for markdown without frontmatter', () => {
    const markdown = `# Title\n\nSome content.`;
    const result = extractFrontmatter(markdown);
    expect(result).toBeNull();
  });

  it('returns null for invalid YAML in frontmatter', () => {
    const markdown = `---\nname: [unclosed\n---\n\nBody.`;
    const result = extractFrontmatter(markdown);
    expect(result).toBeNull();
  });

  it('extracts frontmatter from file', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'frontmatter-test-'));
    const filePath = join(tempDir, 'test.md');
    writeFileSync(
      filePath,
      `---\nname: File Test\ntype: instruction\ntrigger: file-test\ntags: [file]\n---\n\nBody.`,
      'utf-8'
    );

    const result = extractFrontmatterFromFile(filePath);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('File Test');

    rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('frontmatter knowledge templates', () => {
  const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json'), 'utf-8'));
  const ajv = createAjv();
  const validate = ajv.compile(schema);

  it('extracts and validates .template-decision.md frontmatter', () => {
    const content = readFileSync(join(TEMPLATES_DIR, 'knowledge', '.template-decision.md'), 'utf-8');
    const frontmatter = extractFrontmatter(content);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.type).toBe('decision');
    expect(frontmatter!.tags).toEqual([]);
    expect(frontmatter!.date).toBe('2024-01-01');
    expect(frontmatter!.status).toBe('proposed');

    const valid = validate(frontmatter);
    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }
    expect(valid).toBe(true);
  });

  it('extracts and validates .template-lesson.md frontmatter', () => {
    const content = readFileSync(join(TEMPLATES_DIR, 'knowledge', '.template-lesson.md'), 'utf-8');
    const frontmatter = extractFrontmatter(content);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.type).toBe('lesson');
    expect(frontmatter!.tags).toEqual([]);
    expect(frontmatter!.date).toBe('2024-01-01');
    expect(frontmatter!.severity).toBe('medium');

    const valid = validate(frontmatter);
    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }
    expect(valid).toBe(true);
  });

  it('extracts and validates .template-pattern.md frontmatter', () => {
    const content = readFileSync(join(TEMPLATES_DIR, 'knowledge', '.template-pattern.md'), 'utf-8');
    const frontmatter = extractFrontmatter(content);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.type).toBe('pattern');
    expect(frontmatter!.tags).toEqual([]);
    expect(frontmatter!.date).toBe('2024-01-01');

    const valid = validate(frontmatter);
    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }
    expect(valid).toBe(true);
  });

  it('extracts and validates .template-triage.md frontmatter', () => {
    const content = readFileSync(join(TEMPLATES_DIR, 'knowledge', '.template-triage.md'), 'utf-8');
    const frontmatter = extractFrontmatter(content);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.type).toBe('triage');
    expect(frontmatter!.tags).toEqual(['circuit-breaker']);
    expect(frontmatter!.date).toBe('2024-01-01');
    expect(frontmatter!.attempts).toBe(1);
    expect(frontmatter!.feature).toBe('FXX');

    const valid = validate(frontmatter);
    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }
    expect(valid).toBe(true);
  });
});

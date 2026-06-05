import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { generateKnowledgeBase } from '../../src/generators/knowledge-base.js';
import { extractFrontmatter } from '../../src/utils/frontmatter.js';

const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;
const TEMPLATES_DIR = new URL('../../templates', import.meta.url).pathname;

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

describe('Integration: generateKnowledgeBase', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'knowledge-base-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates docs/knowledge/ with all 4 templates', () => {
    const generated = generateKnowledgeBase(tempDir);
    expect(generated.length).toBe(4);

    const knowledgeDir = join(tempDir, 'docs', 'knowledge');
    expect(existsSync(knowledgeDir)).toBe(true);
    expect(existsSync(join(knowledgeDir, '.template-decision.md'))).toBe(true);
    expect(existsSync(join(knowledgeDir, '.template-lesson.md'))).toBe(true);
    expect(existsSync(join(knowledgeDir, '.template-pattern.md'))).toBe(true);
    expect(existsSync(join(knowledgeDir, '.template-triage.md'))).toBe(true);
  });

  it('each generated template has valid frontmatter per schema', () => {
    generateKnowledgeBase(tempDir);

    const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json'), 'utf-8'));
    const ajv = createAjv();
    const validate = ajv.compile(schema);

    const knowledgeDir = join(tempDir, 'docs', 'knowledge');
    for (const name of ['.template-decision.md', '.template-lesson.md', '.template-pattern.md', '.template-triage.md']) {
      const content = readFileSync(join(knowledgeDir, name), 'utf-8');
      const frontmatter = extractFrontmatter(content);
      expect(frontmatter).not.toBeNull();
      const valid = validate(frontmatter);
      if (!valid) {
        console.error(`Validation errors for ${name}:`, validate.errors);
      }
      expect(valid).toBe(true);
    }
  });

  it('validates a created lesson file against schema', () => {
    const knowledgeDir = join(tempDir, 'docs', 'knowledge');
    mkdirSync(knowledgeDir, { recursive: true });

    const lessonContent = `---
type: lesson
title: "Test Lesson"
date: 2024-06-04
severity: medium
tags: [test]
---

# Test Lesson

Content here.
`;

    writeFileSync(join(knowledgeDir, '001-lesson.md'), lessonContent, 'utf-8');

    const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json'), 'utf-8'));
    const ajv = createAjv();
    const validate = ajv.compile(schema);

    const frontmatter = extractFrontmatter(lessonContent);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.type).toBe('lesson');
    expect(frontmatter!.severity).toBe('medium');

    const valid = validate(frontmatter);
    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }
    expect(valid).toBe(true);
  });
});

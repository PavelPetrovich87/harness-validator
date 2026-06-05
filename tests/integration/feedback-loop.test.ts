import { describe, it, expect } from 'vitest';
import { mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { HarnessValidator } from '../../src/validator.js';
import { ValidationPhase } from '../../src/types.js';
import { recordLesson, type LessonData } from '../../src/generators/lesson.js';

const FIXTURES_DIR = new URL('../fixtures', import.meta.url).pathname;
const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

describe('Integration: Feedback Loop validation', () => {
  it('AST phase produces PASS for Feedback Loop heading when present', async () => {
    const projectRoot = join(FIXTURES_DIR, 'valid-harness');
    const manifestPath = join(projectRoot, '.harness', 'manifest.json');

    const validator = new HarnessValidator({ projectRoot, manifestPath });
    const { results, exitCode } = await validator.run();

    expect(exitCode).toBe(0);

    const astResults = results.filter((r) => r.phase === ValidationPhase.AST_STRUCTURE);
    expect(astResults.some((r) => r.status === 'PASS' && r.message.includes('Feedback Loop'))).toBe(true);
  });

  it('AST phase produces FAIL when Feedback Loop heading is missing', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'feedback-loop-test-'));

    try {
      const fixturePath = join(FIXTURES_DIR, 'valid-harness');
      cpSync(fixturePath, tempDir, { recursive: true, force: true });

      // Remove Feedback Loop section from AGENTS.md
      const agentsPath = join(tempDir, 'AGENTS.md');
      const originalContent = readFileSync(agentsPath, 'utf-8');
      const lines = originalContent.split('\n');
      const feedbackLoopIndex = lines.findIndex((line) => line.trim() === '## Feedback Loop');
      expect(feedbackLoopIndex).toBeGreaterThan(-1);

      const modifiedLines = lines.slice(0, feedbackLoopIndex);
      writeFileSync(agentsPath, modifiedLines.join('\n'));

      const manifestPath = join(tempDir, '.harness', 'manifest.json');
      const validator = new HarnessValidator({ projectRoot: tempDir, manifestPath });
      const { results, exitCode } = await validator.run();

      expect(exitCode).toBe(1);

      const astResults = results.filter((r) => r.phase === ValidationPhase.AST_STRUCTURE);
      expect(astResults.some((r) => r.status === 'FAIL' && r.message.includes('Feedback Loop'))).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('AST phase produces FAIL when Feedback Loop has < 3 items', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'feedback-loop-items-test-'));

    try {
      const fixturePath = join(FIXTURES_DIR, 'valid-harness');
      cpSync(fixturePath, tempDir, { recursive: true, force: true });

      // Replace Feedback Loop section with only 2 items
      const agentsPath = join(tempDir, 'AGENTS.md');
      const originalContent = readFileSync(agentsPath, 'utf-8');
      const lines = originalContent.split('\n');
      const feedbackLoopIndex = lines.findIndex((line) => line.trim() === '## Feedback Loop');
      expect(feedbackLoopIndex).toBeGreaterThan(-1);

      const modifiedLines = [
        ...lines.slice(0, feedbackLoopIndex),
        '## Feedback Loop',
        '',
        '- Review output before applying',
        '- Report deviations to AGENTS.md',
      ];
      writeFileSync(agentsPath, modifiedLines.join('\n'));

      const manifestPath = join(tempDir, '.harness', 'manifest.json');
      const validator = new HarnessValidator({ projectRoot: tempDir, manifestPath });
      const { results, exitCode } = await validator.run();

      expect(exitCode).toBe(1);

      const astResults = results.filter((r) => r.phase === ValidationPhase.AST_STRUCTURE);
      expect(astResults.some((r) => r.status === 'FAIL' && r.message.includes('Feedback Loop section has 2 items'))).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('recordLesson output validates against knowledge_frontmatter.schema.json', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'lesson-schema-test-'));

    try {
      mkdirSync(join(tempDir, 'templates', 'knowledge'), { recursive: true });
      writeFileSync(
        join(tempDir, 'templates', 'knowledge', '.template-lesson.md'),
        `---\ntype: lesson\ntitle: \"Placeholder\"\ndate: 2024-01-01\nseverity: medium\ntags: []\n---\n\n# Lesson\n\n## What happened\n\n## Root cause\n\n## Mitigation\n`,
        'utf-8'
      );

      const data: LessonData = {
        title: 'Lint error on any usage',
        severity: 'medium',
        tags: ['lint', 'typescript'],
        whatHappened: 'CI failed due to eslint no-explicit-any rule.',
        rootCause: 'Agent used `any` type in new utility function.',
        mitigation: 'Add strict type and update AGENTS.md safety rules.',
      };

      const filePath = recordLesson(tempDir, data);
      const content = readFileSync(filePath, 'utf-8');

      const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json'), 'utf-8'));

      const ajv = createAjv();
      const validate = ajv.compile(schema);

      // Extract frontmatter manually for schema validation
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).not.toBeNull();

      const yaml = await import('yaml');
      const frontmatter = yaml.parse(frontmatterMatch![1]);

      const valid = validate(frontmatter);
      if (!valid) {
        console.error('Schema validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

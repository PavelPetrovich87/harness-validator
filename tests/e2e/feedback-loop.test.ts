import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { recordLesson, type LessonData } from '../../src/generators/lesson.js';
import { extractFrontmatterFromFile } from '../../src/utils/frontmatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');
const TEMPLATES_DIR = join(PROJECT_ROOT, 'templates');

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

function setupTempProject(): string {
  const tempDir = join(PROJECT_ROOT, '.tmp-feedback-loop-test');

  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true });
  }
  mkdirSync(tempDir, { recursive: true });

  // Copy templates into tempDir/templates/
  mkdirSync(join(tempDir, 'templates'), { recursive: true });
  cpSync(TEMPLATES_DIR, join(tempDir, 'templates'), { recursive: true, force: true });

  return tempDir;
}

describe('E2E: Feedback Loop — Agent session with lint error → lesson created → next session agent reads lesson', () => {
  const tempDir = join(PROJECT_ROOT, '.tmp-feedback-loop-test');

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('full cycle: lint error → record lesson → validate schema → next session reads it', () => {
    const projectDir = setupTempProject();

    // Step 1: Simulate a lint error by creating a TypeScript file with `any` usage
    const srcDir = join(projectDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(
      join(srcDir, 'utils.ts'),
      `export function parse(data: any): any {\n  return data;\n}\n`,
      'utf-8'
    );

    // Step 2: Call recordLesson with data about the lint error
    const lessonData: LessonData = {
      title: 'CI lint failure on explicit any',
      severity: 'medium',
      tags: ['lint', 'typescript', 'ci'],
      whatHappened: 'CI pipeline failed during the lint step because src/utils.ts used explicit `any` types.',
      rootCause: 'Agent generated code without strict typing, bypassing the project eslint rules.',
      mitigation: 'Enforce no-explicit-any in eslint config and add a pre-commit typecheck hook.',
    };

    const lessonPath = recordLesson(projectDir, lessonData);

    // Step 3: Verify the lesson file exists
    expect(existsSync(lessonPath)).toBe(true);
    expect(lessonPath).toMatch(/001-lesson\.md$/);

    // Step 4: Extract frontmatter and validate against schema
    const frontmatter = extractFrontmatterFromFile(lessonPath);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.type).toBe('lesson');
    expect(frontmatter!.title).toBe('CI lint failure on explicit any');
    expect(frontmatter!.severity).toBe('medium');
    expect(frontmatter!.tags).toEqual(['lint', 'typescript', 'ci']);

    const schema = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'schemas', 'knowledge_frontmatter.schema.json'), 'utf-8')
    );
    const ajv = createAjv();
    const validate = ajv.compile(schema);
    const valid = validate(frontmatter);
    if (!valid) {
      console.error('Schema validation errors:', validate.errors);
    }
    expect(valid).toBe(true);

    // Step 5: "Next session" — read file content and verify agent can see all sections
    const content = readFileSync(lessonPath, 'utf-8');
    expect(content).toContain('## What happened');
    expect(content).toContain('CI pipeline failed during the lint step');
    expect(content).toContain('## Root cause');
    expect(content).toContain('Agent generated code without strict typing');
    expect(content).toContain('## Mitigation');
    expect(content).toContain('Enforce no-explicit-any in eslint config');
  });
});

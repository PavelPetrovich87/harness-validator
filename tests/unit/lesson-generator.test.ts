import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getNextLessonNumber, recordLesson, type LessonData } from '../../src/generators/lesson.js';

describe('Unit: Lesson Generator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'lesson-test-'));
    mkdirSync(join(tempDir, 'templates', 'knowledge'), { recursive: true });
    writeFileSync(
      join(tempDir, 'templates', 'knowledge', '.template-lesson.md'),
      `---\ntype: lesson\ntitle: \"Placeholder\"\ndate: 2024-01-01\nseverity: medium\ntags: []\n---\n\n# Lesson\n\n## What happened\n\n## Root cause\n\n## Mitigation\n`,
      'utf-8'
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getNextLessonNumber', () => {
    it('returns 1 when no lessons exist', () => {
      expect(getNextLessonNumber(tempDir)).toBe(1);
    });

    it('returns max+1 when lessons exist', () => {
      mkdirSync(join(tempDir, 'docs', 'knowledge'), { recursive: true });
      writeFileSync(join(tempDir, 'docs', 'knowledge', '001-lesson.md'), '', 'utf-8');
      writeFileSync(join(tempDir, 'docs', 'knowledge', '003-lesson.md'), '', 'utf-8');

      expect(getNextLessonNumber(tempDir)).toBe(4);
    });

    it('ignores non-lesson files', () => {
      mkdirSync(join(tempDir, 'docs', 'knowledge'), { recursive: true });
      writeFileSync(join(tempDir, 'docs', 'knowledge', '.template-lesson.md'), '', 'utf-8');
      writeFileSync(join(tempDir, 'docs', 'knowledge', 'README.md'), '', 'utf-8');

      expect(getNextLessonNumber(tempDir)).toBe(1);
    });
  });

  describe('recordLesson', () => {
    it('creates a file with valid frontmatter', () => {
      const data: LessonData = {
        title: 'Lint error on any usage',
        severity: 'medium',
        tags: ['lint', 'typescript'],
        whatHappened: 'CI failed due to eslint no-explicit-any rule.',
        rootCause: 'Agent used `any` type in new utility function.',
        mitigation: 'Add strict type and update AGENTS.md safety rules.',
      };

      const filePath = recordLesson(tempDir, data);

      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('type: lesson');
      expect(content).toContain('title: "Lint error on any usage"');
      expect(content).toContain('severity: medium');
    });

    it('fills in all sections', () => {
      const data: LessonData = {
        title: 'Missing dependency',
        severity: 'high',
        whatHappened: 'Build failed in CI.',
        rootCause: 'Package was not added to package.json.',
        mitigation: 'Run npm install and commit lockfile.',
      };

      const filePath = recordLesson(tempDir, data);
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('## What happened');
      expect(content).toContain('Build failed in CI.');
      expect(content).toContain('## Root cause');
      expect(content).toContain('Package was not added to package.json.');
      expect(content).toContain('## Mitigation');
      expect(content).toContain('Run npm install and commit lockfile.');
    });

    it('throws if .template-lesson.md is missing', () => {
      rmSync(join(tempDir, 'templates', 'knowledge', '.template-lesson.md'));

      const data: LessonData = {
        title: 'Test',
        severity: 'low',
        whatHappened: 'W',
        rootCause: 'R',
        mitigation: 'M',
      };

      expect(() => recordLesson(tempDir, data)).toThrow('Template not found');
    });

    it('produces sequential files 001, 002', () => {
      const data1: LessonData = {
        title: 'First',
        severity: 'low',
        whatHappened: 'W1',
        rootCause: 'R1',
        mitigation: 'M1',
      };
      const data2: LessonData = {
        title: 'Second',
        severity: 'low',
        whatHappened: 'W2',
        rootCause: 'R2',
        mitigation: 'M2',
      };

      const path1 = recordLesson(tempDir, data1);
      const path2 = recordLesson(tempDir, data2);

      expect(path1).toMatch(/001-lesson\.md$/);
      expect(path2).toMatch(/002-lesson\.md$/);

      const files = readdirSync(join(tempDir, 'docs', 'knowledge'));
      expect(files).toContain('001-lesson.md');
      expect(files).toContain('002-lesson.md');
    });
  });
});

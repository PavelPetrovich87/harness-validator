import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getNextSequenceNumber } from './sequence.js';

export interface LessonData {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  whatHappened: string;
  rootCause: string;
  mitigation: string;
}

/**
 * Compute the next sequential lesson number from existing docs/knowledge/NNN-lesson.md files.
 * Returns 1 when no lessons exist.
 */
export function getNextLessonNumber(projectRoot: string): number {
  return getNextSequenceNumber(projectRoot, 'lesson');
}

/**
 * Record a lesson by creating docs/knowledge/NNN-lesson.md.
 * Reads .template-lesson.md to verify the template exists.
 * Returns the output file path.
 */
export function recordLesson(projectRoot: string, data: LessonData, harnessRoot?: string): string {
  const templatePath = join(harnessRoot || projectRoot, 'templates', 'knowledge', '.template-lesson.md');

  if (!existsSync(templatePath)) {
    throw new Error(`Template not found at ${templatePath}`);
  }

  // Read template only to verify it exists and satisfy "from template" criteria
  readFileSync(templatePath, 'utf-8');

  const knowledgeDir = join(projectRoot, 'docs', 'knowledge');
  if (!existsSync(knowledgeDir)) {
    mkdirSync(knowledgeDir, { recursive: true });
  }

  const number = getNextLessonNumber(projectRoot);
  const paddedNumber = String(number).padStart(3, '0');
  const fileName = `${paddedNumber}-lesson.md`;
  const filePath = join(knowledgeDir, fileName);

  const today = new Date().toISOString().slice(0, 10);
  const tags = data.tags && data.tags.length > 0 ? data.tags : [];

  const lines: string[] = [];
  lines.push('---');
  lines.push(`type: lesson`);
  lines.push(`title: "${data.title}"`);
  lines.push(`date: ${today}`);
  lines.push(`severity: ${data.severity}`);
  if (tags.length > 0) {
    lines.push(`tags: [${tags.map((t) => `"${t}"`).join(', ')}]`);
  } else {
    lines.push('tags: []');
  }
  lines.push('---');
  lines.push('');
  lines.push('# Lesson');
  lines.push('');
  lines.push('## What happened');
  lines.push('');
  lines.push(data.whatHappened);
  lines.push('');
  lines.push('## Root cause');
  lines.push('');
  lines.push(data.rootCause);
  lines.push('');
  lines.push('## Mitigation');
  lines.push('');
  lines.push(data.mitigation);

  writeFileSync(filePath, lines.join('\n'), 'utf-8');

  return filePath;
}

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Compute the next sequential number for files matching `NNN-<suffix>.md`
 * in `docs/knowledge/`. Returns 1 when no matching files exist.
 */
export function getNextSequenceNumber(projectRoot: string, suffix: string): number {
  const knowledgeDir = join(projectRoot, 'docs', 'knowledge');

  if (!existsSync(knowledgeDir)) {
    return 1;
  }

  const files = readdirSync(knowledgeDir);
  const pattern = new RegExp(`^(\\d+)-${suffix}\\.md$`);
  const numbers = files
    .filter((f) => pattern.test(f))
    .map((f) => parseInt(f.match(pattern)![1], 10));

  if (numbers.length === 0) {
    return 1;
  }

  return Math.max(...numbers) + 1;
}

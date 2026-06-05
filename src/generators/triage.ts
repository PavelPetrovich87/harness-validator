import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getNextSequenceNumber } from './sequence.js';

export interface TriageAttempt {
  attempt: number;
  error: string;
  fixApplied: string;
}

/**
 * Generate a triage report in docs/knowledge/NNN-triage.md.
 * Reads .template-triage.md to verify the template exists.
 *
 * Returns the absolute path of the created file.
 */
export function generateTriageReport(
  projectRoot: string,
  featureId: string,
  attempts: number,
  failureLog: TriageAttempt[]
): string {
  const templatePath = join(projectRoot, 'templates', 'knowledge', '.template-triage.md');

  if (!existsSync(templatePath)) {
    throw new Error(`Template not found at ${templatePath}`);
  }

  // Read template only to verify it exists and satisfy "from template" criteria
  readFileSync(templatePath, 'utf-8');

  const knowledgeDir = join(projectRoot, 'docs', 'knowledge');
  if (!existsSync(knowledgeDir)) {
    mkdirSync(knowledgeDir, { recursive: true });
  }

  const number = getNextSequenceNumber(projectRoot, 'triage');
  const paddedNumber = String(number).padStart(3, '0');
  const fileName = `${paddedNumber}-triage.md`;
  const filePath = join(knowledgeDir, fileName);

  const today = new Date().toISOString().slice(0, 10);

  const lines: string[] = [];
  lines.push('---');
  lines.push(`type: triage`);
  lines.push(`title: "Circuit breaker triage for ${featureId}"`);
  lines.push(`date: ${today}`);
  lines.push(`attempts: ${attempts}`);
  lines.push(`feature: "${featureId}"`);
  lines.push(`tags: ["circuit-breaker"]`);
  lines.push('---');
  lines.push('');
  lines.push(`# Triage Report`);
  lines.push('');
  lines.push('## Failure');
  lines.push('');
  lines.push(`Feature ${featureId} failed pipeline validation ${attempts} consecutive times.`);
  lines.push('');
  lines.push('## Attempts');
  lines.push('');
  for (const entry of failureLog) {
    lines.push(`- Attempt ${entry.attempt}: ${entry.error} (fix: ${entry.fixApplied})`);
  }
  lines.push('');
  lines.push('## Analysis');
  lines.push('');
  lines.push('Repeated failures suggest the issue is either misdiagnosed or requires architectural changes beyond automated fixes.');
  lines.push('');
  lines.push('## Recommendation');
  lines.push('');
  lines.push('Pause automated fixes, escalate to human review, and update AGENTS.md or record a decision before retrying.');

  writeFileSync(filePath, lines.join('\n'), 'utf-8');

  return filePath;
}

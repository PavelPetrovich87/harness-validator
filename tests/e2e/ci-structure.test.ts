import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');
const WORKFLOW_PATH = join(PROJECT_ROOT, '.github/workflows/ci.yml');

describe('E2E: CI workflow structure', () => {
  it('has at least 4 jobs', () => {
    const content = readFileSync(WORKFLOW_PATH, 'utf-8');
    const jobMatches = content.match(/^\s{2}[a-z][a-z0-9_-]*:/gm);
    expect(jobMatches).not.toBeNull();
    expect(jobMatches!.length).toBeGreaterThanOrEqual(4);
  });

  it('validate job references npm run validate or npx tsx scripts/validate-harness.ts', () => {
    const content = readFileSync(WORKFLOW_PATH, 'utf-8');
    const validateJobMatch = content.match(/validate:\s*\n([\s\S]*?)(?=\n\n|\n  [a-z]|$)/);
    expect(validateJobMatch).not.toBeNull();
    const validateJob = validateJobMatch![0];
    const hasValidateCommand =
      validateJob.includes('npm run validate') ||
      validateJob.includes('npx tsx scripts/validate-harness.ts') ||
      validateJob.includes('npx harness-validate');
    expect(hasValidateCommand).toBe(true);
  });

  it('triggers on pull_request', () => {
    const content = readFileSync(WORKFLOW_PATH, 'utf-8');
    expect(content).toContain('pull_request');
  });
});

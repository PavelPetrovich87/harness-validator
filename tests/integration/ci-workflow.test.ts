import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');
const WORKFLOW_PATH = join(PROJECT_ROOT, '.github/workflows/ci.yml');

describe('Integration: CI workflow validation', () => {
  it('passes actionlint with exit code 0', () => {
    const output = execSync(
      `npx github-actionlint "${WORKFLOW_PATH}"`,
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 30000,
      }
    );
    expect(output).toBe('');
  });

  it('contains validate job, pull_request trigger, and actions/checkout@v4', () => {
    const content = readFileSync(WORKFLOW_PATH, 'utf-8');

    expect(content).toContain('validate:');
    expect(content).toContain('pull_request');
    expect(content).toContain('actions/checkout@v4');
  });
});

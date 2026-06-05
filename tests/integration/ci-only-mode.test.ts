import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');
const TEMPLATE_WORKFLOW_PATH = join(PROJECT_ROOT, 'templates/.github/workflows/ci.yml');

describe('Integration: CI-only mode (template workflow)', () => {
  it('template ci.yml contains validate job', () => {
    const content = readFileSync(TEMPLATE_WORKFLOW_PATH, 'utf-8');
    expect(content).toContain('validate:');
  });

  it('validate job runs validator from .harness/validator with --github and --project', () => {
    const content = readFileSync(TEMPLATE_WORKFLOW_PATH, 'utf-8');
    const validateJobMatch = content.match(/validate:\s*\n([\s\S]*?)(?=\n\n|\n  [a-z]|$)/);
    expect(validateJobMatch).not.toBeNull();
    const validateJob = validateJobMatch![0];

    expect(validateJob).toContain('actions/checkout@v4');
    expect(validateJob).toContain('actions/setup-node@v4');
    expect(validateJob).toContain('.harness/validator');
    expect(validateJob).toContain('--github');
    expect(validateJob).toContain('--project');
  });

  it('validate job installs deps in .harness/validator before running', () => {
    const content = readFileSync(TEMPLATE_WORKFLOW_PATH, 'utf-8');
    const validateJobMatch = content.match(/validate:\s*\n([\s\S]*?)(?=\n\n|\n  [a-z]|$)/);
    expect(validateJobMatch).not.toBeNull();
    const validateJob = validateJobMatch![0];

    expect(validateJob).toContain('npm ci');
    expect(validateJob).toContain('cd .harness/validator');
  });
});

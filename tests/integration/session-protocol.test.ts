import { describe, it, expect } from 'vitest';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { HarnessValidator } from '../../src/validator.js';
import { ValidationPhase } from '../../src/types.js';

const FIXTURES_DIR = new URL('../fixtures', import.meta.url).pathname;
const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;
const TEMPLATES_DIR = new URL('../../templates', import.meta.url).pathname;

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

describe('Integration: Session Protocol validation', () => {
  it('AST phase produces PASS for Session Protocol when present', async () => {
    const projectRoot = join(FIXTURES_DIR, 'valid-harness');
    const manifestPath = join(projectRoot, '.harness', 'manifest.json');

    const validator = new HarnessValidator({ projectRoot, manifestPath });
    const { results, exitCode } = await validator.run();

    expect(exitCode).toBe(0);

    const astResults = results.filter((r) => r.phase === ValidationPhase.AST_STRUCTURE);
    expect(astResults.some((r) => r.status === 'PASS' && r.message.includes('Session Protocol'))).toBe(true);
  });

  it('AST phase produces FAIL when Session Protocol is missing', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'session-protocol-test-'));

    try {
      const fixturePath = join(FIXTURES_DIR, 'valid-harness');
      cpSync(fixturePath, tempDir, { recursive: true, force: true });

      // Remove Session Protocol section from AGENTS.md
      const agentsPath = join(tempDir, 'AGENTS.md');
      const originalContent = readFileSync(agentsPath, 'utf-8');
      const lines = originalContent.split('\n');
      const sessionProtocolIndex = lines.findIndex((line) => line.trim() === '## Session Protocol');
      expect(sessionProtocolIndex).toBeGreaterThan(-1);

      const architectureRulesIndex = lines.findIndex((line) => line.trim() === '## Architecture Rules');
      expect(architectureRulesIndex).toBeGreaterThan(-1);

      // Remove lines from ## Session Protocol up to but not including ## Architecture Rules
      const modifiedLines = [
        ...lines.slice(0, sessionProtocolIndex),
        ...lines.slice(architectureRulesIndex),
      ];
      writeFileSync(agentsPath, modifiedLines.join('\n'));

      const manifestPath = join(tempDir, '.harness', 'manifest.json');
      const validator = new HarnessValidator({ projectRoot: tempDir, manifestPath });
      const { results, exitCode } = await validator.run();

      expect(exitCode).toBe(1);

      const astResults = results.filter((r) => r.phase === ValidationPhase.AST_STRUCTURE);
      expect(astResults.some((r) => r.status === 'FAIL' && r.message.includes('Session Protocol'))).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('feature_list.json template validates against schema via ajv', () => {
    const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'feature_list.schema.json'), 'utf-8'));
    const data = JSON.parse(readFileSync(join(TEMPLATES_DIR, 'feature_list.json'), 'utf-8'));

    const ajv = createAjv();
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }
    expect(valid).toBe(true);
  });
});

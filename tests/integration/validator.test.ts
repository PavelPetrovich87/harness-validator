import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import Ajv from 'ajv';
import { HarnessValidator } from '../../src/validator.js';
import { ValidationPhase } from '../../src/types.js';
import manifestSchema from '../../schemas/manifest.schema.json' with { type: 'json' };

const FIXTURES_DIR = new URL('../fixtures', import.meta.url).pathname;

function getFixturePath(name: string): string {
  return `${FIXTURES_DIR}/${name}`;
}

const ajv = new Ajv();
const validateManifest = ajv.compile(manifestSchema);

function assertValidManifest(manifest: unknown): void {
  const valid = validateManifest(manifest);
  if (!valid) {
    console.error('Schema validation errors:', validateManifest.errors);
  }
  expect(valid).toBe(true);
}

describe('Integration: HarnessValidator against fixtures', () => {
  it('valid harness: exit 0 + manifest.json with results array', async () => {
    const projectRoot = getFixturePath('valid-harness');
    const manifestPath = `${projectRoot}/.harness/manifest.json`;

    const validator = new HarnessValidator({ projectRoot, manifestPath });
    const { results, exitCode } = await validator.run();

    expect(exitCode).toBe(0);
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.results).toBeInstanceOf(Array);
    expect(manifest.results.length).toBeGreaterThan(0);
    expect(manifest.errors).toBe(0);

    // Verify all phases produced results
    const phases = new Set(results.map((r) => r.phase));
    expect(phases.has(ValidationPhase.AST_STRUCTURE)).toBe(true);
    expect(phases.has(ValidationPhase.INSTRUCTION_MODULES)).toBe(true);
    expect(phases.has(ValidationPhase.ARCHITECTURE)).toBe(true);
    expect(phases.has(ValidationPhase.DATA_CONTRACTS)).toBe(true);
    expect(phases.has(ValidationPhase.INTEGRATION)).toBe(true);

    assertValidManifest(manifest);
  });

  it('missing AGENTS.md: exit 1 + error in results', async () => {
    const projectRoot = getFixturePath('missing-agents');
    const manifestPath = `${projectRoot}/.harness/manifest.json`;

    const validator = new HarnessValidator({ projectRoot, manifestPath });
    const { results, exitCode } = await validator.run();

    expect(exitCode).toBe(1);
    expect(existsSync(manifestPath)).toBe(true);

    const astResults = results.filter((r) => r.phase === ValidationPhase.AST_STRUCTURE);
    expect(astResults.some((r) => r.status === 'FAIL')).toBe(true);
    expect(astResults.some((r) => r.message.includes('AGENTS.md not found'))).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    assertValidManifest(manifest);
  });

  it('65-line AGENTS.md: FAIL on line count check', async () => {
    const projectRoot = getFixturePath('long-agents');
    const manifestPath = `${projectRoot}/.harness/manifest.json`;

    const validator = new HarnessValidator({ projectRoot, manifestPath });
    const { results, exitCode } = await validator.run();

    expect(exitCode).toBe(1);

    const astResults = results.filter((r) => r.phase === ValidationPhase.AST_STRUCTURE);
    expect(astResults.some((r) => r.status === 'FAIL' && r.message.includes('65 lines'))).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    assertValidManifest(manifest);
  });

  it('missing lefthook.yml: FAIL on integration check', async () => {
    const projectRoot = getFixturePath('missing-lefthook');
    const manifestPath = `${projectRoot}/.harness/manifest.json`;

    const validator = new HarnessValidator({ projectRoot, manifestPath });
    const { results, exitCode } = await validator.run();

    expect(exitCode).toBe(1);

    const integrationResults = results.filter((r) => r.phase === ValidationPhase.INTEGRATION);
    expect(integrationResults.some((r) => r.status === 'FAIL' && r.message.includes('lefthook.yml not found'))).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    assertValidManifest(manifest);
  });
});

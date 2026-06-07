import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');
const VALID_FIXTURE = join(PROJECT_ROOT, 'tests/fixtures/valid-harness');

describe('E2E: CLI execution', () => {
  it('completes in under 5 seconds and generates manifest', () => {
    const manifestPath = join(VALID_FIXTURE, '.harness/manifest.json');

    // Clean up previous manifest
    try {
      unlinkSync(manifestPath);
    } catch {
      // ignore if doesn't exist
    }

    const start = Date.now();
    const output = execSync(
      `npx tsx scripts/validate-harness.ts --project "${VALID_FIXTURE}"`,
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 10000,
      }
    );
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.results).toBeInstanceOf(Array);
    expect(manifest.errors).toBe(0);

    expect(output).toContain('[PASS]');
  });
});

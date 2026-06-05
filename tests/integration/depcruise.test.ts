import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, '../../tests/fixtures');

describe('Integration: depcruise against fixtures', () => {
  it('AC1: src/ui importing src/data-access fails', () => {
    const fixture = join(FIXTURES_DIR, 'depcruise-violation');
    let exitedWithError = false;

    try {
      execSync(
        `npx depcruise src --config .dependency-cruiser.cjs`,
        {
          cwd: fixture,
          encoding: 'utf-8',
          timeout: 10000,
        }
      );
    } catch (error: any) {
      exitedWithError = true;
      expect(error.status).not.toBe(0);
      expect(error.stdout || error.stderr || error.message).toContain('no-ui-to-data-access');
    }

    expect(exitedWithError).toBe(true);
  });

  it('AC2: src/services importing src/data-access passes', () => {
    const fixture = join(FIXTURES_DIR, 'depcruise-valid');

    const output = execSync(
      `npx depcruise src --config .dependency-cruiser.cjs`,
      {
        cwd: fixture,
        encoding: 'utf-8',
        timeout: 10000,
      }
    );

    expect(output).toBeDefined();
  });

  it('AC3: src/ui importing src/services/index.ts passes', () => {
    const fixture = join(FIXTURES_DIR, 'depcruise-public-api');

    const output = execSync(
      `npx depcruise src --config .dependency-cruiser.cjs`,
      {
        cwd: fixture,
        encoding: 'utf-8',
        timeout: 10000,
      }
    );

    expect(output).toBeDefined();
  });
});

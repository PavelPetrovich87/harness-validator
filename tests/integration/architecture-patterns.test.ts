import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, '../../tests/fixtures');

describe('Integration: architecture patterns', () => {
  describe('monorepo pattern', () => {
    it('passes when importing public API (index.ts)', () => {
      const fixture = join(FIXTURES_DIR, 'pattern-monorepo-valid');

      const output = execSync(
        `npx depcruise packages --config .dependency-cruiser.cjs`,
        {
          cwd: fixture,
          encoding: 'utf-8',
          timeout: 10000,
        }
      );

      expect(output).toBeDefined();
    });

    it('fails when importing internal implementation of another package', () => {
      const fixture = join(FIXTURES_DIR, 'pattern-monorepo');
      let exitedWithError = false;

      try {
        execSync(
          `npx depcruise packages --config .dependency-cruiser.cjs`,
          {
            cwd: fixture,
            encoding: 'utf-8',
            timeout: 10000,
          }
        );
      } catch (error: any) {
        exitedWithError = true;
        expect(error.status).not.toBe(0);
        expect(error.stdout || error.stderr || error.message).toContain('no-cross-package-implementation');
      }

      expect(exitedWithError).toBe(true);
    });
  });

  describe('hexagonal pattern', () => {
    it('passes for valid application -> domain import', () => {
      const fixture = join(FIXTURES_DIR, 'pattern-hexagonal-valid');

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

    it('fails when domain imports infrastructure', () => {
      const fixture = join(FIXTURES_DIR, 'pattern-hexagonal');
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
        expect(error.stdout || error.stderr || error.message).toContain('no-domain-to-infrastructure');
      }

      expect(exitedWithError).toBe(true);
    });
  });
});

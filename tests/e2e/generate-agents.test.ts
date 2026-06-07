import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, cpSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PROJECT_ROOT = new URL('../..', import.meta.url).pathname;
const TEMPLATES_DIR = join(PROJECT_ROOT, 'templates');
const SCHEMAS_DIR = join(PROJECT_ROOT, 'schemas');

describe('E2E: generate-agents CLI', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'generate-agents-e2e-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('CLI generates AGENTS.md, then validator passes and creates manifest', () => {
    // Create a minimal package.json in temp dir
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: { react: '^18' },
        devDependencies: { typescript: '^5' },
      })
    );

    // Step 1: Run CLI to generate AGENTS.md
    const generateOutput = execSync(
      `npx tsx scripts/generate-agents.ts --project "${tempDir}"`,
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 10000,
      }
    );

    expect(generateOutput).toContain('AGENTS.md generated');
    expect(existsSync(join(tempDir, 'AGENTS.md'))).toBe(true);

    // Step 2: Copy remaining template files so validator can pass all phases
    cpSync(TEMPLATES_DIR, tempDir, { recursive: true, force: true });
    cpSync(
      join(SCHEMAS_DIR, 'feature_list.schema.json'),
      join(tempDir, 'feature_list.schema.json')
    );

    // Replace template placeholders with real commands so YAML parsing succeeds
    const lefthookContent = readFileSync(join(tempDir, 'lefthook.yml'), 'utf-8')
      .replace(/\{\{LINT_CMD\}\}/g, 'biome check')
      .replace(/\{\{TYPECHECK_CMD\}\}/g, 'npx tsc --noEmit')
      .replace(/\{\{TEST_CMD\}\}/g, 'npm test');
    writeFileSync(join(tempDir, 'lefthook.yml'), lefthookContent);

    const ciContent = readFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), 'utf-8')
      .replace(/\{\{LINT_CMD\}\}/g, 'biome check')
      .replace(/\{\{TYPECHECK_CMD\}\}/g, 'npx tsc --noEmit')
      .replace(/\{\{TEST_CMD\}\}/g, 'npm test');
    writeFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), ciContent);

    // Step 3: Run validator
    const manifestPath = join(tempDir, '.harness', 'manifest.json');

    // Clean up previous manifest if it exists
    try {
      rmSync(manifestPath);
    } catch {
      // ignore if doesn't exist
    }

    const validateOutput = execSync(
      `npx tsx scripts/validate-harness.ts --project "${tempDir}"`,
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 10000,
      }
    );

    expect(validateOutput).toContain('[PASS]');
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.results).toBeInstanceOf(Array);
    expect(manifest.errors).toBe(0);
  });
});

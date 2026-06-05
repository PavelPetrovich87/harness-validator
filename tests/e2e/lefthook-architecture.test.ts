import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');
const TEMPLATES_DIR = join(PROJECT_ROOT, 'templates');

describe('E2E: lefthook run architecture', () => {
  const tempDir = join(PROJECT_ROOT, '.tmp-lefthook-test');

  function setupTempDir(fixtureName: string) {
    // Clean up
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(join(tempDir, 'src', 'ui'), { recursive: true });
    mkdirSync(join(tempDir, 'src', 'data-access'), { recursive: true });
    mkdirSync(join(tempDir, 'src', 'services'), { recursive: true });

    // Create lefthook.yml with architecture as a standalone hook
    const lefthookContent = `architecture:
  commands:
    depcruise:
      run: depcruise src --config .dependency-cruiser.cjs
`;
    writeFileSync(join(tempDir, 'lefthook.yml'), lefthookContent);

    // Copy .dependency-cruiser.cjs from template (convert to .cjs for ESM fixture)
    const depcruiseTemplate = readFileSync(join(TEMPLATES_DIR, '.dependency-cruiser.js'), 'utf-8');
    writeFileSync(join(tempDir, '.dependency-cruiser.cjs'), depcruiseTemplate);

    // Copy fixture sources
    const fixtureDir = join(PROJECT_ROOT, 'tests/fixtures', fixtureName);
    const srcFiles = execSync('find src -type f', { cwd: fixtureDir, encoding: 'utf-8' }).trim().split('\n');
    for (const file of srcFiles) {
      if (!file) continue;
      const content = readFileSync(join(fixtureDir, file), 'utf-8');
      const dest = join(tempDir, file);
      const destDir = dirname(dest);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      writeFileSync(dest, content);
    }

    // Create minimal package.json
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'temp-test', version: '1.0.0', type: 'module', private: true }, null, 2)
    );

    // Initialize git repo — lefthook requires a git repository to locate config
    execSync('git init', { cwd: tempDir, encoding: 'utf-8' });

    return tempDir;
  }

  it('AC4: lefthook run architecture passes for valid imports', () => {
    setupTempDir('depcruise-valid');

    const output = execSync('npx lefthook run architecture', {
      cwd: tempDir,
      encoding: 'utf-8',
      timeout: 15000,
    });

    expect(output).toBeDefined();
    expect(output).toContain('architecture');
  });

  it('lefthook run architecture fails for violating imports', () => {
    setupTempDir('depcruise-violation');

    let exitedWithError = false;
    try {
      execSync('npx lefthook run architecture', {
        cwd: tempDir,
        encoding: 'utf-8',
        timeout: 15000,
      });
    } catch (error: any) {
      exitedWithError = true;
      expect(error.status).not.toBe(0);
    }

    expect(exitedWithError).toBe(true);
  });

  // Cleanup after all tests in this describe
  it('cleanup temp dir', () => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
    expect(existsSync(tempDir)).toBe(false);
  });
});

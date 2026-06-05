import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  cpSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  generateQualityPipeline,
  getCommandsForStack,
} from '../../src/generators/quality-pipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');
const TEMPLATES_DIR = join(PROJECT_ROOT, 'templates');

function setupTempProject(fixtureName: string): string {
  const tempDir = join(PROJECT_ROOT, '.tmp-quality-test');

  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true });
  }
  mkdirSync(tempDir, { recursive: true });

  // Copy fixture package.json / project files
  const fixtureDir = join(PROJECT_ROOT, 'tests/fixtures', fixtureName);
  const entries = execSync('find . -maxdepth 2 -type f', { cwd: fixtureDir, encoding: 'utf-8' })
    .trim()
    .split('\n');
  for (const entry of entries) {
    if (!entry) continue;
    const src = join(fixtureDir, entry);
    const dest = join(tempDir, entry);
    const destDir = dirname(dest);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    cpSync(src, dest);
  }

  // Copy templates into tempDir/templates/
  mkdirSync(join(tempDir, 'templates'), { recursive: true });
  cpSync(TEMPLATES_DIR, join(tempDir, 'templates'), { recursive: true, force: true });

  return tempDir;
}

describe('E2E: Quality Pipeline generation and validation', () => {
  const tempDir = join(PROJECT_ROOT, '.tmp-quality-test');

  afterAll(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('AC1: generates lefthook.yml with biome check for TypeScript project', () => {
    const projectDir = setupTempProject('react-project');
    generateQualityPipeline(projectDir);

    const lefthookPath = join(projectDir, 'lefthook.yml');
    expect(existsSync(lefthookPath)).toBe(true);

    const content = readFileSync(lefthookPath, 'utf-8');
    expect(content).toContain('biome check');
    expect(content).toContain('npx tsc --noEmit');
    expect(content).toContain('npm test');
  });

  it('AC2: generates lefthook.yml with ruff check for Python project', () => {
    const projectDir = setupTempProject('python-project');
    generateQualityPipeline(projectDir);

    const lefthookPath = join(projectDir, 'lefthook.yml');
    expect(existsSync(lefthookPath)).toBe(true);

    const content = readFileSync(lefthookPath, 'utf-8');
    expect(content).toContain('ruff check');
    expect(content).toContain('mypy');
    expect(content).toContain('pytest');
  });

  it('AC3: generated CI workflow has 4+ jobs', () => {
    const projectDir = setupTempProject('react-project');
    generateQualityPipeline(projectDir);

    const ciPath = join(projectDir, '.github', 'workflows', 'ci.yml');
    expect(existsSync(ciPath)).toBe(true);

    const content = readFileSync(ciPath, 'utf-8');
    // Count job definitions by looking for job names at indent level 2
    const jobMatches = content.match(/^\s{2}[a-z][a-z0-9_-]*:/gm);
    expect(jobMatches).not.toBeNull();
    expect(jobMatches!.length).toBeGreaterThanOrEqual(4);
  });

  it('generated lefthook.yml passes lefthook validate', () => {
    const projectDir = setupTempProject('react-project');
    generateQualityPipeline(projectDir);

    // lefthook validate needs a git repo to locate config
    execSync('git init', { cwd: projectDir, encoding: 'utf-8' });

    const output = execSync('npx lefthook validate', {
      cwd: projectDir,
      encoding: 'utf-8',
      timeout: 15000,
    });

    expect(output).toBeDefined();
  });

  it('generated ci.yml passes actionlint', () => {
    const projectDir = setupTempProject('react-project');
    generateQualityPipeline(projectDir);

    const ciPath = join(projectDir, '.github', 'workflows', 'ci.yml');

    const output = execSync(`npx github-actionlint "${ciPath}"`, {
      cwd: projectDir,
      encoding: 'utf-8',
      timeout: 15000,
    });

    expect(output).toBeDefined();
  });

  it('cleanup temp dir', () => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
    expect(existsSync(tempDir)).toBe(false);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import {
  mkdtempSync,
  cpSync,
  readFileSync,
  existsSync,
  rmSync,
  writeFileSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { runSetup } from '../../src/setup.js';

const TEMPLATES_DIR = new URL('../../templates', import.meta.url).pathname;
const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;
const FIXTURES_DIR = new URL('../fixtures', import.meta.url).pathname;
const PROJECT_ROOT = new URL('../..', import.meta.url).pathname;

function setupTempProject(fixtureName: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'setup-flow-e2e-'));

  // Copy fixture project files
  const fixturePath = join(FIXTURES_DIR, fixtureName);
  cpSync(fixturePath, tempDir, { recursive: true, force: true });

  // Copy templates needed by generators that resolve against projectRoot
  const templatesDest = join(tempDir, 'templates');
  cpSync(TEMPLATES_DIR, templatesDest, { recursive: true, force: true });

  // Copy schema for data-contracts phase
  cpSync(
    join(SCHEMAS_DIR, 'feature_list.schema.json'),
    join(tempDir, 'feature_list.schema.json')
  );

  return tempDir;
}

function writeAnswersJson(tempDir: string, answers: unknown): string {
  const path = join(tempDir, 'answers.json');
  writeFileSync(path, JSON.stringify(answers, null, 2), 'utf-8');
  return path;
}

describe('E2E: setup flow', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
    tempDirs.length = 0;
  });

  it('Test A: full happy path with git commit', async () => {
    const tempDir = setupTempProject('react-project');
    tempDirs.push(tempDir);

    const answersPath = writeAnswersJson(tempDir, {
      pattern: 'layered',
      useGitSubtree: false,
    });

    const result = await runSetup(tempDir, { answersJsonPath: answersPath });
    expect(result.exitCode).toBe(0);

    // All 8 modules created
    expect(existsSync(join(tempDir, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.dependency-cruiser.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'lefthook.yml'))).toBe(true);
    expect(existsSync(join(tempDir, '.github', 'workflows', 'ci.yml'))).toBe(true);

    const localDir = join(tempDir, '.claude', 'instructions', 'local');
    expect(existsSync(localDir)).toBe(true);
    expect(readdirSync(localDir).filter((f) => f.endsWith('.md')).length).toBeGreaterThanOrEqual(1);

    const sharedDir = join(tempDir, '.claude', 'instructions', 'shared');
    expect(existsSync(sharedDir)).toBe(true);
    expect(readdirSync(sharedDir).filter((f) => f.endsWith('.md')).length).toBeGreaterThanOrEqual(1);

    const knowledgeDir = join(tempDir, 'docs', 'knowledge');
    expect(existsSync(knowledgeDir)).toBe(true);
    expect(readdirSync(knowledgeDir).filter((f) => f.startsWith('.template-')).length).toBeGreaterThanOrEqual(3);

    expect(existsSync(join(tempDir, 'feature_list.json'))).toBe(true);

    // Manifest exists
    const manifestPath = join(tempDir, '.harness', 'manifest.json');
    expect(existsSync(manifestPath)).toBe(true);

    // Git init, add, commit
    execSync('git init', { cwd: tempDir, encoding: 'utf-8' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, encoding: 'utf-8' });
    execSync('git config user.name "Test"', { cwd: tempDir, encoding: 'utf-8' });
    execSync('git add .', { cwd: tempDir, encoding: 'utf-8' });
    execSync('git commit -m "setup"', { cwd: tempDir, encoding: 'utf-8' });

    // Assert manifest is in the commit
    const committedFiles = execSync('git ls-tree -r HEAD --name-only', {
      cwd: tempDir,
      encoding: 'utf-8',
    }).trim();
    expect(committedFiles).toContain('.harness/manifest.json');
  });

  it('Test B: invalid project (no recognizable stack) returns graceful error', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'setup-flow-invalid-'));
    tempDirs.push(tempDir);

    // Empty directory — no package.json, pyproject.toml, or go.mod
    const result = await runSetup(tempDir);

    expect(result.exitCode).not.toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('No recognizable stack found');

    // Should not crash — manifest path is still returned
    expect(result.manifestPath).toContain('.harness/manifest.json');
  });

  it('Test C: validator failure triggers circuit breaker and triage report', async () => {
    const tempDir = setupTempProject('react-project');
    tempDirs.push(tempDir);

    // Intentionally break lefthook.yml template so quality pipeline generates empty file
    writeFileSync(join(tempDir, 'templates', 'lefthook.yml'), '', 'utf-8');

    const answersPath = writeAnswersJson(tempDir, {
      pattern: 'layered',
      useGitSubtree: false,
    });

    const result = await runSetup(tempDir, { answersJsonPath: answersPath });

    // Should fail after circuit breaker opens
    expect(result.exitCode).toBe(1);
    expect(result.errors.some((e) => e.includes('lefthook.yml is empty'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Triage report'))).toBe(true);

    // Triage report should exist in docs/knowledge/
    const knowledgeDir = join(tempDir, 'docs', 'knowledge');
    expect(existsSync(knowledgeDir)).toBe(true);
    const triageFiles = readdirSync(knowledgeDir).filter((f) =>
      f.match(/^\d{3}-triage\.md$/)
    );
    expect(triageFiles.length).toBeGreaterThanOrEqual(1);

    // Verify triage content mentions setup failures
    const triagePath = join(knowledgeDir, triageFiles[0]);
    const triageContent = readFileSync(triagePath, 'utf-8');
    expect(triageContent).toContain('setup');
    expect(triageContent).toContain('Circuit breaker triage');
  });
});

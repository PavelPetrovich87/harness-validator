import { describe, it, expect, afterEach } from 'vitest';
import {
  mkdtempSync,
  cpSync,
  readFileSync,
  existsSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { runSetup } from '../../src/setup.js';

const TEMPLATES_DIR = new URL('../../templates', import.meta.url).pathname;
const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;
const FIXTURES_DIR = new URL('../fixtures', import.meta.url).pathname;

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

function setupTempProject(fixtureName: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'setup-flow-test-'));

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

describe('Integration: setup flow for each stack', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('React fixture: full setup generates all artifacts and passes validation', async () => {
    const tempDir = setupTempProject('react-project');
    tempDirs.push(tempDir);

    const answersPath = writeAnswersJson(tempDir, {
      pattern: 'layered',
      useGitSubtree: false,
    });

    const result = await runSetup(tempDir, { answersJsonPath: answersPath });

    expect(result.exitCode).toBe(0);
    expect(result.errors).toHaveLength(0);

    // AGENTS.md exists and is under 50 lines
    const agentsPath = join(tempDir, 'AGENTS.md');
    expect(existsSync(agentsPath)).toBe(true);
    const agentsContent = readFileSync(agentsPath, 'utf-8');
    expect(agentsContent.split('\n').length).toBeLessThan(50);

    // .dependency-cruiser.js exists
    expect(existsSync(join(tempDir, '.dependency-cruiser.js'))).toBe(true);

    // lefthook.yml exists with correct React commands
    const lefthookPath = join(tempDir, 'lefthook.yml');
    expect(existsSync(lefthookPath)).toBe(true);
    const lefthookContent = readFileSync(lefthookPath, 'utf-8');
    expect(lefthookContent).toContain('biome check');
    expect(lefthookContent).toContain('npx tsc --noEmit');
    expect(lefthookContent).toContain('npm test');

    // CI workflow exists with 4+ jobs
    const ciPath = join(tempDir, '.github', 'workflows', 'ci.yml');
    expect(existsSync(ciPath)).toBe(true);
    const ciContent = readFileSync(ciPath, 'utf-8');
    const jobMatches = ciContent.match(/^\s{2}[a-z][a-z0-9_-]*:/gm);
    expect(jobMatches).not.toBeNull();
    expect(jobMatches!.length).toBeGreaterThanOrEqual(4);

    // docs/knowledge/ has 3+ templates
    const knowledgeDir = join(tempDir, 'docs', 'knowledge');
    expect(existsSync(knowledgeDir)).toBe(true);
    const knowledgeFiles = readdirSync(knowledgeDir).filter((f) =>
      f.startsWith('.template-')
    );
    expect(knowledgeFiles.length).toBeGreaterThanOrEqual(3);

    // feature_list.json exists and validates against schema
    const featureListPath = join(tempDir, 'feature_list.json');
    expect(existsSync(featureListPath)).toBe(true);
    const schema = JSON.parse(
      readFileSync(join(tempDir, 'feature_list.schema.json'), 'utf-8')
    );
    const data = JSON.parse(readFileSync(featureListPath, 'utf-8'));
    const ajv = createAjv();
    const validate = ajv.compile(schema);
    expect(validate(data)).toBe(true);

    // .claude/instructions/local/ has at least 1 file
    const localDir = join(tempDir, '.claude', 'instructions', 'local');
    expect(existsSync(localDir)).toBe(true);
    const localFiles = readdirSync(localDir).filter((f) => f.endsWith('.md'));
    expect(localFiles.length).toBeGreaterThanOrEqual(1);

    // .harness/manifest.json exists
    expect(existsSync(join(tempDir, '.harness', 'manifest.json'))).toBe(true);
  });

  it('Python fixture: full setup generates all artifacts and passes validation', async () => {
    const tempDir = setupTempProject('python-project');
    tempDirs.push(tempDir);

    const answersPath = writeAnswersJson(tempDir, {
      pattern: 'layered',
      useGitSubtree: false,
    });

    const result = await runSetup(tempDir, { answersJsonPath: answersPath });

    expect(result.exitCode).toBe(0);
    expect(result.errors).toHaveLength(0);

    // AGENTS.md under 50 lines
    const agentsPath = join(tempDir, 'AGENTS.md');
    expect(existsSync(agentsPath)).toBe(true);
    const agentsContent = readFileSync(agentsPath, 'utf-8');
    expect(agentsContent.split('\n').length).toBeLessThan(50);

    // .dependency-cruiser.js exists
    expect(existsSync(join(tempDir, '.dependency-cruiser.js'))).toBe(true);

    // lefthook.yml with Python commands
    const lefthookContent = readFileSync(join(tempDir, 'lefthook.yml'), 'utf-8');
    expect(lefthookContent).toContain('ruff check');
    expect(lefthookContent).toContain('mypy');
    expect(lefthookContent).toContain('pytest');

    // CI workflow with 4+ jobs
    const ciPath = join(tempDir, '.github', 'workflows', 'ci.yml');
    expect(existsSync(ciPath)).toBe(true);
    const ciContent = readFileSync(ciPath, 'utf-8');
    const jobMatches = ciContent.match(/^\s{2}[a-z][a-z0-9_-]*:/gm);
    expect(jobMatches).not.toBeNull();
    expect(jobMatches!.length).toBeGreaterThanOrEqual(4);

    // docs/knowledge/
    const knowledgeDir = join(tempDir, 'docs', 'knowledge');
    expect(existsSync(knowledgeDir)).toBe(true);
    const knowledgeFiles = readdirSync(knowledgeDir).filter((f) =>
      f.startsWith('.template-')
    );
    expect(knowledgeFiles.length).toBeGreaterThanOrEqual(3);

    // feature_list.json validates
    const schema = JSON.parse(
      readFileSync(join(tempDir, 'feature_list.schema.json'), 'utf-8')
    );
    const data = JSON.parse(readFileSync(join(tempDir, 'feature_list.json'), 'utf-8'));
    const ajv = createAjv();
    expect(ajv.compile(schema)(data)).toBe(true);

    // .claude/instructions/local/
    const localDir = join(tempDir, '.claude', 'instructions', 'local');
    expect(existsSync(localDir)).toBe(true);
    const localFiles = readdirSync(localDir).filter((f) => f.endsWith('.md'));
    expect(localFiles.length).toBeGreaterThanOrEqual(1);

    // manifest
    expect(existsSync(join(tempDir, '.harness', 'manifest.json'))).toBe(true);
  });

  it('Go fixture: full setup generates all artifacts and passes validation', async () => {
    const tempDir = setupTempProject('go-project');
    tempDirs.push(tempDir);

    const answersPath = writeAnswersJson(tempDir, {
      pattern: 'layered',
      useGitSubtree: false,
    });

    const result = await runSetup(tempDir, { answersJsonPath: answersPath });

    expect(result.exitCode).toBe(0);
    expect(result.errors).toHaveLength(0);

    // AGENTS.md under 50 lines
    const agentsPath = join(tempDir, 'AGENTS.md');
    expect(existsSync(agentsPath)).toBe(true);
    const agentsContent = readFileSync(agentsPath, 'utf-8');
    expect(agentsContent.split('\n').length).toBeLessThan(50);

    // .dependency-cruiser.js exists
    expect(existsSync(join(tempDir, '.dependency-cruiser.js'))).toBe(true);

    // lefthook.yml with Go commands
    const lefthookContent = readFileSync(join(tempDir, 'lefthook.yml'), 'utf-8');
    expect(lefthookContent).toContain('golangci-lint run');
    expect(lefthookContent).toContain('go vet');
    expect(lefthookContent).toContain('go test ./...');

    // CI workflow with 4+ jobs
    const ciPath = join(tempDir, '.github', 'workflows', 'ci.yml');
    expect(existsSync(ciPath)).toBe(true);
    const ciContent = readFileSync(ciPath, 'utf-8');
    const jobMatches = ciContent.match(/^\s{2}[a-z][a-z0-9_-]*:/gm);
    expect(jobMatches).not.toBeNull();
    expect(jobMatches!.length).toBeGreaterThanOrEqual(4);

    // docs/knowledge/
    const knowledgeDir = join(tempDir, 'docs', 'knowledge');
    expect(existsSync(knowledgeDir)).toBe(true);
    const knowledgeFiles = readdirSync(knowledgeDir).filter((f) =>
      f.startsWith('.template-')
    );
    expect(knowledgeFiles.length).toBeGreaterThanOrEqual(3);

    // feature_list.json validates
    const schema = JSON.parse(
      readFileSync(join(tempDir, 'feature_list.schema.json'), 'utf-8')
    );
    const data = JSON.parse(readFileSync(join(tempDir, 'feature_list.json'), 'utf-8'));
    const ajv = createAjv();
    expect(ajv.compile(schema)(data)).toBe(true);

    // .claude/instructions/local/
    const localDir = join(tempDir, '.claude', 'instructions', 'local');
    expect(existsSync(localDir)).toBe(true);
    const localFiles = readdirSync(localDir).filter((f) => f.endsWith('.md'));
    expect(localFiles.length).toBeGreaterThanOrEqual(1);

    // manifest
    expect(existsSync(join(tempDir, '.harness', 'manifest.json'))).toBe(true);
  });
});

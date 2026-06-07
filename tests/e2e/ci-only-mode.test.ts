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
import { runSetup } from '../../src/setup.js';

const TEMPLATES_DIR = new URL('../../templates', import.meta.url).pathname;
const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;
const FIXTURES_DIR = new URL('../fixtures', import.meta.url).pathname;

describe('E2E: CI-only validation mode', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
    tempDirs.length = 0;
  });

  function setupTempProject(fixtureName: string): string {
    const tempDir = mkdtempSync(join(tmpdir(), 'ci-only-mode-e2e-'));

    const fixturePath = join(FIXTURES_DIR, fixtureName);
    cpSync(fixturePath, tempDir, { recursive: true, force: true });

    const templatesDest = join(tempDir, 'templates');
    cpSync(TEMPLATES_DIR, templatesDest, { recursive: true, force: true });

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

  it('copies validator source into .harness/validator/ during setup', async () => {
    const tempDir = setupTempProject('react-project');
    tempDirs.push(tempDir);

    const answersPath = writeAnswersJson(tempDir, {
      pattern: 'layered',
      useGitSubtree: false,
    });

    const result = await runSetup(tempDir, { answersJsonPath: answersPath });
    expect(result.exitCode).toBe(0);

    const validatorDir = join(tempDir, '.harness', 'validator');
    expect(existsSync(validatorDir)).toBe(true);
    expect(existsSync(join(validatorDir, 'scripts', 'validate-harness.ts'))).toBe(true);
    expect(existsSync(join(validatorDir, 'src', 'validator.ts'))).toBe(true);
    expect(existsSync(join(validatorDir, 'src', 'types.ts'))).toBe(true);
    expect(existsSync(join(validatorDir, 'package.json'))).toBe(true);
  });

  it('copied validator package.json has correct dependencies', async () => {
    const tempDir = setupTempProject('react-project');
    tempDirs.push(tempDir);

    const answersPath = writeAnswersJson(tempDir, {
      pattern: 'layered',
      useGitSubtree: false,
    });

    const result = await runSetup(tempDir, { answersJsonPath: answersPath });
    expect(result.exitCode).toBe(0);

    const pkgPath = join(tempDir, '.harness', 'validator', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    expect(pkg.name).toBe('harness-validator');
    expect(pkg.type).toBe('module');
    expect(pkg.dependencies).toHaveProperty('ajv');
    expect(pkg.dependencies).toHaveProperty('remark-parse');
    expect(pkg.dependencies).toHaveProperty('unified');
    expect(pkg.devDependencies).toHaveProperty('tsx');
  });

  it('generated CI workflow contains validate job', async () => {
    const tempDir = setupTempProject('react-project');
    tempDirs.push(tempDir);

    const answersPath = writeAnswersJson(tempDir, {
      pattern: 'layered',
      useGitSubtree: false,
    });

    const result = await runSetup(tempDir, { answersJsonPath: answersPath });
    expect(result.exitCode).toBe(0);

    const ciPath = join(tempDir, '.github', 'workflows', 'ci.yml');
    expect(existsSync(ciPath)).toBe(true);

    const ciContent = readFileSync(ciPath, 'utf-8');
    expect(ciContent).toContain('validate:');
    expect(ciContent).toContain('.harness/validator');
    expect(ciContent).toContain('--github');
  });

  it('copies instruction_frontmatter.schema.json to project schemas/', async () => {
    const tempDir = setupTempProject('react-project');
    tempDirs.push(tempDir);

    const answersPath = writeAnswersJson(tempDir, {
      pattern: 'layered',
      useGitSubtree: false,
    });

    const result = await runSetup(tempDir, { answersJsonPath: answersPath });
    expect(result.exitCode).toBe(0);

    const schemaPath = join(tempDir, 'schemas', 'instruction_frontmatter.schema.json');
    expect(existsSync(schemaPath)).toBe(true);
  });
});

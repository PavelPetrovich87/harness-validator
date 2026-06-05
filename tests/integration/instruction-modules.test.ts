import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HarnessValidator } from '../../src/validator.js';
import { generateInstructionModules } from '../../src/generators/instruction-modules.js';
import { extractFrontmatterFromFile } from '../../src/utils/frontmatter.js';
import { ValidationPhase } from '../../src/types.js';

const FIXTURES_DIR = new URL('../fixtures', import.meta.url).pathname;

describe('Integration: generateInstructionModules', () => {
  let reactProject: string;
  let vueProject: string;

  beforeEach(() => {
    reactProject = mkdtempSync(join(tmpdir(), 'react-project-'));
    vueProject = mkdtempSync(join(tmpdir(), 'vue-project-'));

    cpSync(join(FIXTURES_DIR, 'react-project'), reactProject, { recursive: true, force: true });
    cpSync(join(FIXTURES_DIR, 'vue-project'), vueProject, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(reactProject, { recursive: true, force: true });
    rmSync(vueProject, { recursive: true, force: true });
  });

  it('AC1: react-project generates react-components.md with valid frontmatter', () => {
    const generated = generateInstructionModules(reactProject);
    expect(generated.length).toBeGreaterThan(0);
    expect(generated.some((p) => p.endsWith('react-components.md'))).toBe(true);

    const dest = join(reactProject, '.claude', 'instructions', 'local', 'react-components.md');
    expect(existsSync(dest)).toBe(true);

    const frontmatter = extractFrontmatterFromFile(dest);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.name).toBe('React Components');
    expect(frontmatter!.type).toBe('instruction');
    expect(frontmatter!.trigger).toBe('react-project');
    expect(frontmatter!.tags).toEqual(['ui', 'react']);
  });

  it('react-project does NOT generate vue-components.md', () => {
    const generated = generateInstructionModules(reactProject);
    expect(generated.some((p) => p.endsWith('vue-components.md'))).toBe(false);
  });

  it('AC2: vue-project generates vue-components.md (not react)', () => {
    const generated = generateInstructionModules(vueProject);
    expect(generated.some((p) => p.endsWith('vue-components.md'))).toBe(true);
    expect(generated.some((p) => p.endsWith('react-components.md'))).toBe(false);

    const dest = join(vueProject, '.claude', 'instructions', 'local', 'vue-components.md');
    expect(existsSync(dest)).toBe(true);
  });
});

describe('Integration: HarnessValidator on instruction-modules-valid', () => {
  it('phase PASS on valid instruction-modules fixture', async () => {
    const projectRoot = join(FIXTURES_DIR, 'instruction-modules-valid');
    const manifestPath = join(projectRoot, '.harness', 'manifest.json');

    const validator = new HarnessValidator({ projectRoot, manifestPath });
    const { results } = await validator.run();

    const imResults = results.filter((r) => r.phase === ValidationPhase.INSTRUCTION_MODULES);
    expect(imResults.some((r) => r.status === 'FAIL')).toBe(false);
    expect(imResults.some((r) => r.status === 'PASS' && r.message.includes('local'))).toBe(true);
    expect(imResults.some((r) => r.status === 'PASS' && r.message.includes('shared'))).toBe(true);
  });
});

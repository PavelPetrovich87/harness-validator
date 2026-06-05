import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateInstructionModules } from '../../src/phases/instruction-modules.js';
import { ValidationPhase } from '../../src/types.js';

function createTempProject(): string {
  return mkdtempSync(join(tmpdir(), 'instruction-modules-test-'));
}

describe('validateInstructionModules', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = createTempProject();
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('missing .claude/instructions/ dir → WARN', async () => {
    const results = await validateInstructionModules(projectRoot);
    expect(results.some((r) => r.phase === ValidationPhase.INSTRUCTION_MODULES && r.status === 'WARN')).toBe(true);
    expect(results.some((r) => r.message.includes('.claude/instructions/ directory tree not found'))).toBe(true);
  });

  it('empty local dir → FAIL on local count', async () => {
    mkdirSync(join(projectRoot, '.claude', 'instructions', 'local'), { recursive: true });
    mkdirSync(join(projectRoot, '.claude', 'instructions', 'shared'), { recursive: true });
    const results = await validateInstructionModules(projectRoot);
    expect(results.some((r) => r.status === 'FAIL' && r.message.includes('local') && r.message.includes('0'))).toBe(true);
  });

  it('1 local file, no shared → FAIL local, WARN shared', async () => {
    mkdirSync(join(projectRoot, '.claude', 'instructions', 'local'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.claude', 'instructions', 'local', 'a.md'),
      '---\nname: A\ntype: instruction\ntrigger: test\ntags: [x]\n---\n\nBody.',
      'utf-8'
    );
    const results = await validateInstructionModules(projectRoot);
    expect(results.some((r) => r.status === 'FAIL' && r.message.includes('local') && r.message.includes('1'))).toBe(true);
    expect(results.some((r) => r.status === 'WARN' && r.message.includes('shared'))).toBe(true);
  });

  it('2 valid local + 1 shared → PASS', async () => {
    mkdirSync(join(projectRoot, '.claude', 'instructions', 'local'), { recursive: true });
    mkdirSync(join(projectRoot, '.claude', 'instructions', 'shared'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.claude', 'instructions', 'local', 'a.md'),
      '---\nname: A\ntype: instruction\ntrigger: test\ntags: [x]\n---\n\nBody.',
      'utf-8'
    );
    writeFileSync(
      join(projectRoot, '.claude', 'instructions', 'local', 'b.md'),
      '---\nname: B\ntype: instruction\ntrigger: test\ntags: [y]\n---\n\nBody.',
      'utf-8'
    );
    writeFileSync(
      join(projectRoot, '.claude', 'instructions', 'shared', 'c.md'),
      '---\nname: C\ntype: instruction\ntrigger: test\ntags: [z]\n---\n\nBody.',
      'utf-8'
    );
    const results = await validateInstructionModules(projectRoot);
    expect(results.some((r) => r.status === 'FAIL')).toBe(false);
    expect(results.filter((r) => r.status === 'PASS').length).toBeGreaterThanOrEqual(4);
  });

  it('2 local with invalid frontmatter → FAIL on frontmatter validation', async () => {
    mkdirSync(join(projectRoot, '.claude', 'instructions', 'local'), { recursive: true });
    mkdirSync(join(projectRoot, '.claude', 'instructions', 'shared'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.claude', 'instructions', 'local', 'a.md'),
      '---\nname: A\n---\n\nBody.',
      'utf-8'
    );
    writeFileSync(
      join(projectRoot, '.claude', 'instructions', 'local', 'b.md'),
      '---\nname: B\n---\n\nBody.',
      'utf-8'
    );
    writeFileSync(
      join(projectRoot, '.claude', 'instructions', 'shared', 'c.md'),
      '---\nname: C\ntype: instruction\ntrigger: test\ntags: [z]\n---\n\nBody.',
      'utf-8'
    );
    const results = await validateInstructionModules(projectRoot);
    expect(results.some((r) => r.status === 'FAIL' && r.message.includes('Invalid frontmatter'))).toBe(true);
  });
});

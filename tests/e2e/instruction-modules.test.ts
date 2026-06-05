import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('E2E: Instruction modules via git subtree', () => {
  let registryDir: string;
  let projectDir: string;

  beforeEach(() => {
    registryDir = mkdtempSync(join(tmpdir(), 'registry-'));
    projectDir = mkdtempSync(join(tmpdir(), 'project-'));

    // Set up registry repo with a skill
    const skillDir = join(registryDir, 'skills', 'react');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      '---\nname: React Skill\ntype: instruction\ntrigger: skill\ntags: [skill, react]\n---\n\n## Name\n\nReact Skill\n\n## Setup\n\nInstall dependencies.\n\n## Execution\n\nRun the skill.\n',
      'utf-8'
    );

    execSync('git init', { cwd: registryDir, encoding: 'utf-8' });
    execSync('git config user.email "test@test.com"', { cwd: registryDir, encoding: 'utf-8' });
    execSync('git config user.name "Test"', { cwd: registryDir, encoding: 'utf-8' });
    execSync('git add .', { cwd: registryDir, encoding: 'utf-8' });
    execSync('git commit -m "init"', { cwd: registryDir, encoding: 'utf-8' });

    // Set up project repo and add registry as subtree
    execSync('git init', { cwd: projectDir, encoding: 'utf-8' });
    execSync('git config user.email "test@test.com"', { cwd: projectDir, encoding: 'utf-8' });
    execSync('git config user.name "Test"', { cwd: projectDir, encoding: 'utf-8' });

    // Need an initial commit in project repo before subtree add
    writeFileSync(join(projectDir, 'README.md'), '# Project\n', 'utf-8');
    execSync('git add .', { cwd: projectDir, encoding: 'utf-8' });
    execSync('git commit -m "init"', { cwd: projectDir, encoding: 'utf-8' });

    execSync(
      `git subtree add --prefix=.claude/instructions/shared ${registryDir} main --squash`,
      { cwd: projectDir, encoding: 'utf-8' }
    );
  });

  afterEach(() => {
    rmSync(registryDir, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('AC5: shared/skills/react/SKILL.md exists after subtree add', () => {
    const skillPath = join(projectDir, '.claude', 'instructions', 'shared', 'skills', 'react', 'SKILL.md');
    expect(existsSync(skillPath)).toBe(true);
  });
});

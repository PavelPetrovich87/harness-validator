import { describe, it, expect, vi } from 'vitest';
import { runDiagnostics, formatDiagnostics } from '../../src/diagnostics.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn((path: string) => {
    // Simulate a partially configured project
    if (path.includes('AGENTS.md')) return true;
    if (path.includes('lefthook.yml')) return true;
    if (path.includes('.dependency-cruiser.js')) return false;
    if (path.includes('.claude/instructions/local')) return true;
    if (path.includes('.claude/instructions/shared')) return false;
    if (path.includes('feature_list.json')) return false;
    if (path.includes('.harness/manifest.json')) return false;
    if (path.includes('.github/workflows/ci.yml')) return false;
    return false;
  }),
  readdirSync: vi.fn(() => [
    { isFile: () => true, name: 'coding-style.md', parentPath: '/fake/.claude/instructions/local' },
    { isFile: () => true, name: 'safety.md', parentPath: '/fake/.claude/instructions/local' },
  ]),
}));

describe('runDiagnostics', () => {
  it('detects existing and missing artifacts', () => {
    const report = runDiagnostics('/fake');

    expect(report.existingModules).toContain('AGENTS.md');
    expect(report.existingModules).toContain('lefthook.yml');
    expect(report.existingModules).toContain('Instructions (local)');

    expect(report.missingModules).toContain('.dependency-cruiser.js');
    expect(report.missingModules).toContain('Instructions (shared)');
    expect(report.missingModules).toContain('feature_list.json');

    expect(report.allExist).toBe(false);
  });

  it('counts markdown files in instruction directories', () => {
    const report = runDiagnostics('/fake');
    const localModule = report.modules.find((m) => m.name === 'Instructions (local)');
    expect(localModule).toBeDefined();
    expect(localModule!.criteria.some((c) => c.name === 'file-count' && c.met)).toBe(true);
  });
});

describe('formatDiagnostics', () => {
  it('formats a partially installed report', () => {
    const report = runDiagnostics('/fake');
    const formatted = formatDiagnostics(report);

    expect(formatted).toContain('Harness Diagnostics');
    expect(formatted).toContain('AGENTS.md');
    expect(formatted).toContain('partially installed');
  });
});

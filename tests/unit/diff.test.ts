import { describe, it, expect, vi } from 'vitest';
import { readManifest, diffScores, formatDiff } from '../../src/diff.js';
import { ValidationPhase, type Manifest } from '../../src/types.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn((path: string) => path === '/fake/.harness/manifest.json'),
  readFileSync: vi.fn(() => JSON.stringify({
    validated_at: '2026-06-01T00:00:00Z',
    version: '0.1.0',
    criteria_version: '0.1.0',
    errors: 0,
    warnings: 0,
    results: [],
    scores: [
      { phase: ValidationPhase.AST_STRUCTURE, score: 80, passCount: 4, failCount: 1, warnCount: 0, totalCriteria: 5, recommendations: [] },
      { phase: ValidationPhase.INTEGRATION, score: 50, passCount: 1, failCount: 1, warnCount: 0, totalCriteria: 2, recommendations: [] },
    ],
  })),
}));

describe('readManifest', () => {
  it('returns manifest when file exists', () => {
    const manifest = readManifest('/fake/.harness/manifest.json');
    expect(manifest).not.toBeNull();
    expect(manifest!.version).toBe('0.1.0');
  });

  it('returns null when file does not exist', () => {
    const manifest = readManifest('/missing/manifest.json');
    expect(manifest).toBeNull();
  });
});

describe('diffScores', () => {
  it('shows delta when previous manifest exists', () => {
    const previous = readManifest('/fake/.harness/manifest.json')!;
    const current = [
      { phase: ValidationPhase.AST_STRUCTURE, score: 100, passCount: 5, failCount: 0, warnCount: 0, totalCriteria: 5, recommendations: [] },
      { phase: ValidationPhase.INTEGRATION, score: 50, passCount: 1, failCount: 1, warnCount: 0, totalCriteria: 2, recommendations: [] },
    ];

    const diff = diffScores(current, previous);
    const astDiff = diff.find((d) => d.phase === ValidationPhase.AST_STRUCTURE);
    expect(astDiff!.delta).toBe(20);
    expect(astDiff!.oldScore).toBe(80);
    expect(astDiff!.newScore).toBe(100);
  });

  it('treats missing previous score as 0', () => {
    const previous: Manifest = {
      validated_at: '2026-06-01T00:00:00Z',
      version: '0.1.0',
      criteria_version: '0.1.0',
      errors: 0,
      warnings: 0,
      results: [],
      scores: [],
    };
    const current = [
      { phase: ValidationPhase.ARCHITECTURE, score: 75, passCount: 3, failCount: 1, warnCount: 0, totalCriteria: 4, recommendations: [] },
    ];

    const diff = diffScores(current, previous);
    expect(diff[0].delta).toBe(75);
    expect(diff[0].oldScore).toBe(0);
  });

  it('returns full score as delta when no previous manifest', () => {
    const current = [
      { phase: ValidationPhase.DATA_CONTRACTS, score: 60, passCount: 3, failCount: 2, warnCount: 0, totalCriteria: 5, recommendations: [] },
    ];

    const diff = diffScores(current, null);
    expect(diff[0].delta).toBe(60);
    expect(diff[0].oldScore).toBe(0);
  });
});

describe('formatDiff', () => {
  it('formats positive delta with up arrow', () => {
    const diff = [
      { phase: 'AST_STRUCTURE', oldScore: 80, newScore: 100, delta: 20 },
    ];
    const formatted = formatDiff(diff);
    expect(formatted).toContain('↑ +20%');
    expect(formatted).toContain('AST_STRUCTURE');
  });

  it('formats negative delta with down arrow', () => {
    const diff = [
      { phase: 'INTEGRATION', oldScore: 60, newScore: 40, delta: -20 },
    ];
    const formatted = formatDiff(diff);
    expect(formatted).toContain('↓ -20%');
  });

  it('formats zero delta with neutral arrow', () => {
    const diff = [
      { phase: 'ARCHITECTURE', oldScore: 50, newScore: 50, delta: 0 },
    ];
    const formatted = formatDiff(diff);
    expect(formatted).toContain('→ 0%');
  });
});

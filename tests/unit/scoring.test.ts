import { describe, it, expect } from 'vitest';
import { calculateScores, calculateOverallHealth, formatScoreTable, formatRecommendations } from '../../src/scoring.js';
import { ValidationPhase, type ValidationResult } from '../../src/types.js';

function makeResult(overrides: Partial<ValidationResult>): ValidationResult {
  return {
    phase: ValidationPhase.AST_STRUCTURE,
    status: 'PASS',
    message: 'OK',
    criterionId: 'test-criterion',
    severity: 'critical',
    ...overrides,
  };
}

describe('calculateScores', () => {
  it('returns 100% when all criteria pass', () => {
    const results: ValidationResult[] = [
      makeResult({ phase: ValidationPhase.AST_STRUCTURE, status: 'PASS' }),
      makeResult({ phase: ValidationPhase.AST_STRUCTURE, status: 'PASS' }),
    ];

    const scores = calculateScores(results);
    expect(scores).toHaveLength(1);
    expect(scores[0].score).toBe(100);
    expect(scores[0].passCount).toBe(2);
    expect(scores[0].failCount).toBe(0);
  });

  it('returns 0% when all criteria fail', () => {
    const results: ValidationResult[] = [
      makeResult({ phase: ValidationPhase.ARCHITECTURE, status: 'FAIL', recommendation: 'Fix it' }),
    ];

    const scores = calculateScores(results);
    expect(scores[0].score).toBe(0);
    expect(scores[0].recommendations).toContain('Fix it');
  });

  it('calculates mixed scores correctly', () => {
    const results: ValidationResult[] = [
      makeResult({ phase: ValidationPhase.INTEGRATION, status: 'PASS' }),
      makeResult({ phase: ValidationPhase.INTEGRATION, status: 'PASS' }),
      makeResult({ phase: ValidationPhase.INTEGRATION, status: 'FAIL' }),
    ];

    const scores = calculateScores(results);
    expect(scores[0].score).toBe(67); // 2/3 * 100 = 66.67 -> 67
    expect(scores[0].passCount).toBe(2);
    expect(scores[0].failCount).toBe(1);
    expect(scores[0].totalCriteria).toBe(3);
  });

  it('groups results by phase', () => {
    const results: ValidationResult[] = [
      makeResult({ phase: ValidationPhase.AST_STRUCTURE, status: 'PASS' }),
      makeResult({ phase: ValidationPhase.ARCHITECTURE, status: 'FAIL' }),
    ];

    const scores = calculateScores(results);
    expect(scores).toHaveLength(2);
    const phases = scores.map((s) => s.phase);
    expect(phases).toContain(ValidationPhase.AST_STRUCTURE);
    expect(phases).toContain(ValidationPhase.ARCHITECTURE);
  });

  it('counts WARN as non-passing', () => {
    const results: ValidationResult[] = [
      makeResult({ phase: ValidationPhase.DATA_CONTRACTS, status: 'PASS' }),
      makeResult({ phase: ValidationPhase.DATA_CONTRACTS, status: 'WARN' }),
    ];

    const scores = calculateScores(results);
    expect(scores[0].score).toBe(50);
    expect(scores[0].warnCount).toBe(1);
  });
});

describe('calculateOverallHealth', () => {
  it('returns 0 for empty scores', () => {
    expect(calculateOverallHealth([])).toBe(0);
  });

  it('returns average of phase scores', () => {
    const scores = [
      { phase: ValidationPhase.AST_STRUCTURE, score: 100, passCount: 1, failCount: 0, warnCount: 0, totalCriteria: 1, recommendations: [] },
      { phase: ValidationPhase.ARCHITECTURE, score: 50, passCount: 1, failCount: 1, warnCount: 0, totalCriteria: 2, recommendations: [] },
    ];

    expect(calculateOverallHealth(scores)).toBe(75);
  });
});

describe('formatScoreTable', () => {
  it('includes overall health in output', () => {
    const scores = [
      { phase: ValidationPhase.AST_STRUCTURE, score: 100, passCount: 1, failCount: 0, warnCount: 0, totalCriteria: 1, recommendations: [] },
    ];

    const table = formatScoreTable(scores);
    expect(table).toContain('Overall health score: 100%');
  });
});

describe('formatRecommendations', () => {
  it('shows message when no recommendations', () => {
    const scores = [
      { phase: ValidationPhase.AST_STRUCTURE, score: 100, passCount: 1, failCount: 0, warnCount: 0, totalCriteria: 1, recommendations: [] },
    ];

    const recs = formatRecommendations(scores);
    expect(recs).toContain('No recommendations');
  });

  it('lists recommendations with phase', () => {
    const scores = [
      { phase: ValidationPhase.ARCHITECTURE, score: 0, passCount: 0, failCount: 1, warnCount: 0, totalCriteria: 1, recommendations: ['Add rules'] },
    ];

    const recs = formatRecommendations(scores);
    expect(recs).toContain('[ARCHITECTURE] Add rules');
  });
});

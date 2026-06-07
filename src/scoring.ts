import { ValidationPhase, type ValidationResult, type ModuleScore } from './types.js';

/**
 * Calculate per-phase scores from validation results.
 *
 * Score formula: (passCount / totalCriteria) * 100
 * Overall health score: weighted average across all phases.
 */
export function calculateScores(results: ValidationResult[]): ModuleScore[] {
  const phaseGroups = new Map<ValidationPhase, ValidationResult[]>();

  for (const r of results) {
    const list = phaseGroups.get(r.phase) ?? [];
    list.push(r);
    phaseGroups.set(r.phase, list);
  }

  const scores: ModuleScore[] = [];

  for (const [phase, phaseResults] of phaseGroups) {
    const totalCriteria = phaseResults.length;
    const passCount = phaseResults.filter((r) => r.status === 'PASS').length;
    const failCount = phaseResults.filter((r) => r.status === 'FAIL').length;
    const warnCount = phaseResults.filter((r) => r.status === 'WARN').length;
    const recommendations = phaseResults
      .filter((r) => (r.status === 'FAIL' || r.status === 'WARN') && r.recommendation)
      .map((r) => r.recommendation!);

    const score = totalCriteria > 0 ? Math.round((passCount / totalCriteria) * 100) : 0;

    scores.push({
      phase,
      score,
      passCount,
      failCount,
      warnCount,
      totalCriteria,
      recommendations,
    });
  }

  return scores;
}

/**
 * Calculate overall health score as a weighted average of phase scores.
 * All phases are weighted equally by default.
 */
export function calculateOverallHealth(scores: ModuleScore[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  return Math.round(total / scores.length);
}

/**
 * Format a score table for CLI output.
 */
export function formatScoreTable(scores: ModuleScore[]): string {
  const lines: string[] = [];
  lines.push('┌─────────────────────────┬───────┬──────┬──────┬───────┬──────────────────────────────────────────┐');
  lines.push('│ Phase                   │ Score │ Pass │ Fail │ Warn  │ Recommendations                          │');
  lines.push('├─────────────────────────┼───────┼──────┼──────┼───────┼──────────────────────────────────────────┤');

  for (const s of scores) {
    const scoreStr = `${s.score}%`.padStart(5);
    const passStr = `${s.passCount}`.padStart(4);
    const failStr = `${s.failCount}`.padStart(4);
    const warnStr = `${s.warnCount}`.padStart(5);
    const recStr = s.recommendations.length > 0 ? `${s.recommendations.length} items` : '—';
    lines.push(
      `│ ${s.phase.padEnd(23)} │ ${scoreStr} │ ${passStr} │ ${failStr} │ ${warnStr} │ ${recStr.padEnd(40)} │`
    );
  }

  lines.push('└─────────────────────────┴───────┴──────┴──────┴───────┴──────────────────────────────────────────┘');
  const overall = calculateOverallHealth(scores);
  lines.push(`Overall health score: ${overall}%`);

  return lines.join('\n');
}

/**
 * Format recommendations list for CLI output.
 */
export function formatRecommendations(scores: ModuleScore[]): string {
  const allRecommendations = scores.flatMap((s) =>
    s.recommendations.map((rec) => ({ phase: s.phase, text: rec }))
  );

  if (allRecommendations.length === 0) {
    return 'No recommendations — all criteria passed.';
  }

  const lines: string[] = [];
  lines.push('Recommendations:');
  for (const { phase, text } of allRecommendations) {
    lines.push(`  [${phase}] ${text}`);
  }
  return lines.join('\n');
}

import { existsSync, readFileSync } from 'node:fs';
import type { Manifest, ModuleScore } from './types.js';

export interface DiffEntry {
  phase: string;
  oldScore: number;
  newScore: number;
  delta: number;
}

/**
 * Read a manifest from disk if it exists.
 */
export function readManifest(manifestPath: string): Manifest | null {
  if (!existsSync(manifestPath)) return null;
  try {
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content) as Manifest;
  } catch {
    return null;
  }
}

/**
 * Compare current scores against a previous manifest.
 * Returns per-phase deltas. Phases not present in old manifest are treated as 0.
 */
export function diffScores(currentScores: ModuleScore[], previousManifest: Manifest | null): DiffEntry[] {
  if (!previousManifest) {
    return currentScores.map((s) => ({
      phase: s.phase,
      oldScore: 0,
      newScore: s.score,
      delta: s.score,
    }));
  }

  const oldScores = new Map((previousManifest.scores ?? []).map((s) => [s.phase, s.score]));

  return currentScores.map((s) => {
    const oldScore = oldScores.get(s.phase) ?? 0;
    return {
      phase: s.phase,
      oldScore,
      newScore: s.score,
      delta: s.score - oldScore,
    };
  });
}

/**
 * Format score diff for CLI output.
 */
export function formatDiff(diff: DiffEntry[]): string {
  if (diff.length === 0) return 'No score data to compare.';

  const lines: string[] = [];
  lines.push('Score changes since last run:');

  for (const entry of diff) {
    const arrow = entry.delta > 0 ? '↑' : entry.delta < 0 ? '↓' : '→';
    const color = entry.delta > 0 ? '\x1b[32m' : entry.delta < 0 ? '\x1b[31m' : '\x1b[90m';
    const reset = '\x1b[0m';
    const sign = entry.delta > 0 ? '+' : '';
    lines.push(
      `  ${color}${arrow} ${sign}${entry.delta}%${reset} ${entry.phase} (${entry.oldScore}% → ${entry.newScore}%)`
    );
  }

  return lines.join('\n');
}

/**
 * Public API entrypoint for ai-harness-validator.
 *
 * Import programmatically:
 *   import { HarnessValidator, runSetup, runDiagnostics } from 'ai-harness-validator';
 */

export { HarnessValidator } from './validator.js';
export { runSetup, type SetupOptions, type SetupResult } from './setup.js';
export { runDiagnostics, formatDiagnostics } from './diagnostics.js';
export type { ValidationResult, ValidationStatus, Manifest, ModuleScore } from './types.js';
export { formatScoreTable, formatRecommendations } from './scoring.js';
export { readManifest, diffScores, formatDiff } from './diff.js';

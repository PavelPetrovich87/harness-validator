import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Manifest, ValidationResult } from './types.js';

/**
 * Generate manifest from validation results
 */
export function generateManifest(results: ValidationResult[]): Manifest {
  const errors = results.filter((r) => r.status === 'FAIL').length;
  const warnings = results.filter((r) => r.status === 'WARN').length;

  return {
    validated_at: new Date().toISOString(),
    version: '0.1.0',
    errors,
    warnings,
    results,
  };
}

/**
 * Write manifest to disk. Creates parent directories if needed.
 */
export function writeManifest(manifest: Manifest, filePath: string): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
}

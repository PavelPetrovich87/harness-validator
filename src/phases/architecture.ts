import { existsSync, readFileSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { ValidationPhase, type ValidationResult } from '../types.js';

/**
 * Phase 2: Architecture validation
 * Checks .dependency-cruiser.js configuration
 */
export async function validateArchitecture(projectRoot: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const configPath = isAbsolute(projectRoot)
    ? join(projectRoot, '.dependency-cruiser.js')
    : join(process.cwd(), projectRoot, '.dependency-cruiser.js');

  if (!existsSync(configPath)) {
    results.push({
      phase: ValidationPhase.ARCHITECTURE,
      status: 'FAIL',
      message: '.dependency-cruiser.js not found',
    });
    return results;
  }

  try {
    let config: { forbidden?: unknown } | undefined;

    // Try ESM import first
    try {
      const fileUrl = pathToFileURL(configPath).href;
      const configModule = await import(fileUrl);
      config = configModule.default || configModule;
    } catch (importError) {
      const msg = (importError as Error).message;
      // If it fails because of CJS syntax in ESM context, try createRequire
      if (msg.includes('module is not defined') || msg.includes('exports is not defined')) {
        const require = createRequire(import.meta.url);
        config = require(configPath);
      } else {
        throw importError;
      }
    }

    if (!config || typeof config !== 'object') {
      results.push({
        phase: ValidationPhase.ARCHITECTURE,
        status: 'FAIL',
        message: '.dependency-cruiser.js does not export a valid object',
      });
      return results;
    }

    if (!config.forbidden || !Array.isArray(config.forbidden)) {
      results.push({
        phase: ValidationPhase.ARCHITECTURE,
        status: 'FAIL',
        message: '.dependency-cruiser.js missing "forbidden" array',
        details: 'Config must export a "forbidden" array of rules',
      });
      return results;
    }

    if (config.forbidden.length < 2) {
      results.push({
        phase: ValidationPhase.ARCHITECTURE,
        status: 'FAIL',
        message: `.dependency-cruiser.js has ${config.forbidden.length} forbidden rules (min 2)`,
      });
      return results;
    }

    results.push({
      phase: ValidationPhase.ARCHITECTURE,
      status: 'PASS',
      message: `.dependency-cruiser.js has ${config.forbidden.length} forbidden rules`,
    });
  } catch (error) {
    results.push({
      phase: ValidationPhase.ARCHITECTURE,
      status: 'FAIL',
      message: `Failed to load .dependency-cruiser.js: ${(error as Error).message}`,
    });
  }

  return results;
}

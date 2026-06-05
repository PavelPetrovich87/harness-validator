import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { ValidationPhase, type ValidationResult } from '../types.js';

/**
 * Phase 3: Data Contracts validation
 * Validates feature_list.json and other data files against JSON Schema
 */
export async function validateDataContracts(projectRoot: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const schemaPath = join(projectRoot, 'feature_list.schema.json');
  const dataPath = join(projectRoot, 'feature_list.json');

  if (!existsSync(dataPath)) {
    results.push({
      phase: ValidationPhase.DATA_CONTRACTS,
      status: 'FAIL',
      message: 'feature_list.json not found',
    });
    return results;
  }

  // If schema doesn't exist yet, skip schema validation but warn
  if (!existsSync(schemaPath)) {
    results.push({
      phase: ValidationPhase.DATA_CONTRACTS,
      status: 'WARN',
      message: 'feature_list.schema.json not found — skipping schema validation',
    });
    return results;
  }

  try {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
      results.push({
        phase: ValidationPhase.DATA_CONTRACTS,
        status: 'PASS',
        message: 'feature_list.json validates against schema',
      });
    } else {
      const errors = validate.errors
        ?.map((e) => `${e.instancePath || '/'}: ${e.message}`)
        .join('; ');
      results.push({
        phase: ValidationPhase.DATA_CONTRACTS,
        status: 'FAIL',
        message: 'feature_list.json schema validation failed',
        details: errors || 'Unknown validation error',
      });
    }
  } catch (error) {
    results.push({
      phase: ValidationPhase.DATA_CONTRACTS,
      status: 'FAIL',
      message: `Data contract validation error: ${(error as Error).message}`,
    });
  }

  return results;
}

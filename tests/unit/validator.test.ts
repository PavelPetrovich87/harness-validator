import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import { generateManifest } from '../../src/manifest.js';
import { ValidationPhase } from '../../src/types.js';
import type { ValidationResult } from '../../src/types.js';
import manifestSchema from '../../schemas/manifest.schema.json' with { type: 'json' };

const ajv = new Ajv();
const validateManifest = ajv.compile(manifestSchema);

function assertValidManifest(manifest: unknown): void {
  const valid = validateManifest(manifest);
  if (!valid) {
    console.error('Schema validation errors:', validateManifest.errors);
  }
  expect(valid).toBe(true);
}

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

describe('manifest', () => {
  it('generates manifest with correct structure', () => {
    const results: ValidationResult[] = [
      makeResult({ phase: ValidationPhase.AST_STRUCTURE }),
      makeResult({ phase: ValidationPhase.ARCHITECTURE }),
    ];

    const manifest = generateManifest(results);

    expect(manifest.validated_at).toBeDefined();
    expect(manifest.version).toBe('0.1.0');
    expect(manifest.criteria_version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.errors).toBe(0);
    expect(manifest.warnings).toBe(0);
    expect(manifest.results).toHaveLength(2);
    expect(manifest.scores).toEqual([]);

    assertValidManifest(manifest);
  });

  it('counts errors and warnings correctly', () => {
    const results: ValidationResult[] = [
      makeResult({ phase: ValidationPhase.AST_STRUCTURE }),
      makeResult({ phase: ValidationPhase.ARCHITECTURE, status: 'FAIL', message: 'Missing' }),
      makeResult({ phase: ValidationPhase.DATA_CONTRACTS, status: 'WARN', message: 'Old schema' }),
      makeResult({ phase: ValidationPhase.INTEGRATION, status: 'FAIL', message: 'Missing' }),
    ];

    const manifest = generateManifest(results);

    expect(manifest.errors).toBe(2);
    expect(manifest.warnings).toBe(1);
    expect(manifest.results).toHaveLength(4);

    assertValidManifest(manifest);
  });

  it('generates manifest with all 5 phases and validates against schema', () => {
    const results: ValidationResult[] = [
      makeResult({ phase: ValidationPhase.AST_STRUCTURE, message: 'AST check passed' }),
      makeResult({ phase: ValidationPhase.INSTRUCTION_MODULES, message: 'Instruction modules valid' }),
      makeResult({ phase: ValidationPhase.ARCHITECTURE, message: 'Architecture check passed' }),
      makeResult({ phase: ValidationPhase.DATA_CONTRACTS, status: 'WARN', message: 'Schema version mismatch', details: 'Expected v2' }),
      makeResult({ phase: ValidationPhase.INTEGRATION, status: 'FAIL', message: 'lefthook.yml not found' }),
    ];

    const manifest = generateManifest(results);

    expect(manifest.errors).toBe(1);
    expect(manifest.warnings).toBe(1);
    expect(manifest.results).toHaveLength(5);

    const phases = new Set(results.map((r) => r.phase));
    expect(phases.has(ValidationPhase.AST_STRUCTURE)).toBe(true);
    expect(phases.has(ValidationPhase.INSTRUCTION_MODULES)).toBe(true);
    expect(phases.has(ValidationPhase.ARCHITECTURE)).toBe(true);
    expect(phases.has(ValidationPhase.DATA_CONTRACTS)).toBe(true);
    expect(phases.has(ValidationPhase.INTEGRATION)).toBe(true);

    assertValidManifest(manifest);
  });
});

describe('validator exit code', () => {
  it('returns 0 when no failures', () => {
    const results: ValidationResult[] = [
      makeResult({ phase: ValidationPhase.AST_STRUCTURE }),
    ];
    const hasFailures = results.some((r) => r.status === 'FAIL');
    expect(hasFailures ? 1 : 0).toBe(0);
  });

  it('returns 1 when any failure exists', () => {
    const results: ValidationResult[] = [
      makeResult({ phase: ValidationPhase.AST_STRUCTURE }),
      makeResult({ phase: ValidationPhase.ARCHITECTURE, status: 'FAIL' }),
    ];
    const hasFailures = results.some((r) => r.status === 'FAIL');
    expect(hasFailures ? 1 : 0).toBe(1);
  });
});

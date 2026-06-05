import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { CircuitBreaker } from '../../src/circuit-breaker.js';
import { generateTriageReport, type TriageAttempt } from '../../src/generators/triage.js';
import { extractFrontmatterFromFile } from '../../src/utils/frontmatter.js';

const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

describe('Integration: CircuitBreaker + triage report generation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'circuit-breaker-integration-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('opens after 3 failures and generates a triage report with valid frontmatter', () => {
    const cb = new CircuitBreaker();
    const featureId = 'F99';
    const failureLog: TriageAttempt[] = [
      { attempt: 1, error: 'lint failed', fixApplied: 'added semicolon' },
      { attempt: 2, error: 'build failed', fixApplied: 'fixed import path' },
      { attempt: 3, error: 'tests failed', fixApplied: 'updated snapshot' },
    ];

    cb.recordFailure(featureId);
    cb.recordFailure(featureId);
    cb.recordFailure(featureId);

    expect(cb.isOpen(featureId)).toBe(true);

    // Pre-seed the triage template so generateTriageReport can verify it exists
    const templateDir = join(tempDir, 'templates', 'knowledge');
    mkdirSync(templateDir, { recursive: true });
    writeFileSync(
      join(templateDir, '.template-triage.md'),
      `---\ntype: triage\ntitle: "Circuit breaker triage for FXX"\ndate: 2024-01-01\nattempts: 1\nfeature: "FXX"\ntags: ["circuit-breaker"]\n---\n\n# Triage Report\n\n## Failure\n\n## Attempts\n\n## Analysis\n\n## Recommendation\n`,
      'utf-8'
    );

    const filePath = generateTriageReport(tempDir, featureId, 3, failureLog);
    expect(filePath).toMatch(/001-triage\.md$/);
    expect(readdirSync(join(tempDir, 'docs', 'knowledge'))).toContain('001-triage.md');

    const frontmatter = extractFrontmatterFromFile(filePath);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.type).toBe('triage');
    expect(frontmatter!.feature).toBe(featureId);
    expect(frontmatter!.attempts).toBe(3);
    expect(frontmatter!.tags).toEqual(['circuit-breaker']);

    const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'knowledge_frontmatter.schema.json'), 'utf-8'));
    const ajv = createAjv();
    const validate = ajv.compile(schema);
    const valid = validate(frontmatter);
    if (!valid) {
      console.error('Schema validation errors:', validate.errors);
    }
    expect(valid).toBe(true);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('## Failure');
    expect(content).toContain('## Attempts');
    expect(content).toContain('## Analysis');
    expect(content).toContain('## Recommendation');
    expect(content).toContain('Attempt 1: lint failed');
    expect(content).toContain('Attempt 3: tests failed');
  });

  it('does not generate triage report after 2 failures and 1 success', () => {
    const cb = new CircuitBreaker();
    const featureId = 'F99';

    cb.recordFailure(featureId);
    cb.recordFailure(featureId);
    cb.recordSuccess(featureId);

    expect(cb.isOpen(featureId)).toBe(false);

    // docs/knowledge should not exist because no triage was generated
    expect(() => readdirSync(join(tempDir, 'docs', 'knowledge'))).toThrow();
  });
});

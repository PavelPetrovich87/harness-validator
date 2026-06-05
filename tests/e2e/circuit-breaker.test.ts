import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, rmSync, cpSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HarnessValidator } from '../../src/validator.js';
import { CircuitBreaker } from '../../src/circuit-breaker.js';
import { generateTriageReport, type TriageAttempt } from '../../src/generators/triage.js';
import { extractFrontmatterFromFile } from '../../src/utils/frontmatter.js';

const FIXTURES_DIR = new URL('../fixtures', import.meta.url).pathname;

describe('E2E: Circuit Breaker — unfixable validation failure stops after 3 attempts', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'circuit-breaker-e2e-'));
    const fixturePath = join(FIXTURES_DIR, 'valid-harness');
    cpSync(fixturePath, tempDir, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('halts after 3 failed validator attempts and creates a triage report', async () => {
    const featureId = 'F99';
    const cb = new CircuitBreaker();

    // Introduce an unfixable data-contract failure
    writeFileSync(
      join(tempDir, 'feature_list.json'),
      JSON.stringify({ features: [{ id: 'F99', title: 'Unfixable feature' }] }),
      'utf-8'
    );

    const failureLog: TriageAttempt[] = [];
    const manifestPath = join(tempDir, '.harness', 'manifest.json');

    for (let attempt = 1; attempt <= CircuitBreaker.ATTEMPTS_LIMIT; attempt++) {
      const validator = new HarnessValidator({ projectRoot: tempDir, manifestPath });
      const { exitCode, results } = await validator.run();

      if (exitCode !== 0) {
        failureLog.push({
          attempt,
          error: results.find((r) => r.status === 'FAIL')?.message || 'validation failed',
          fixApplied: 'no fix applied',
        });
        cb.recordFailure(featureId);
      } else {
        cb.recordSuccess(featureId);
      }
    }

    expect(cb.isOpen(featureId)).toBe(true);
    expect(failureLog.length).toBe(3);

    // Pre-seed the triage template so generateTriageReport can verify it exists
    const templateDir = join(tempDir, 'templates', 'knowledge');
    mkdirSync(templateDir, { recursive: true });
    writeFileSync(
      join(templateDir, '.template-triage.md'),
      `---\ntype: triage\ntitle: "Circuit breaker triage for FXX"\ndate: 2024-01-01\nattempts: 1\nfeature: "FXX"\ntags: ["circuit-breaker"]\n---\n\n# Triage Report\n\n## Failure\n\n## Attempts\n\n## Analysis\n\n## Recommendation\n`,
      'utf-8'
    );

    const filePath = generateTriageReport(tempDir, featureId, failureLog.length, failureLog);
    expect(filePath).toMatch(/\d{3}-triage\.md$/);
    expect(existsSync(filePath)).toBe(true);

    const frontmatter = extractFrontmatterFromFile(filePath);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.type).toBe('triage');
    expect(frontmatter!.feature).toBe(featureId);
    expect(frontmatter!.attempts).toBe(3);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain(featureId);
    expect(content).toContain('Attempt 1');
    expect(content).toContain('Attempt 2');
    expect(content).toContain('Attempt 3');
  });
});

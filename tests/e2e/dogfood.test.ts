import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = new URL('../..', import.meta.url).pathname;
const REPORT_PATH = join(PROJECT_ROOT, 'dogfood-report.json');

describe('E2E: dogfood CLI', () => {
  beforeAll(() => {
    // Ensure synthetic mode for fast tests
    process.env.HARNESS_DOGFOOD_SYNTHETIC = '1';
  });

  afterAll(() => {
    if (existsSync(REPORT_PATH)) {
      rmSync(REPORT_PATH);
    }
  });

  describe.each(['react-vite', 'nextjs', 'nuxt', 'python'] as const)(
    'template %s',
    (template) => {
      it(`bootstraps ${template} synthetically, runs setup, and passes all verification phases`, () => {
        const output = execSync(
          `npx tsx scripts/dogfood.ts --template ${template}`,
          {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            timeout: 30_000,
            env: { ...process.env, HARNESS_DOGFOOD_SYNTHETIC: '1' },
          }
        );

        expect(output).toContain(`[${template}]`);
        expect(output).toContain('PASS');
        expect(existsSync(REPORT_PATH)).toBe(true);

        const report = JSON.parse(readFileSync(REPORT_PATH, 'utf-8'));
        const project = report.projects.find((p: { template: string }) => p.template === template);
        expect(project).toBeDefined();
        expect(project.status).toBe('PASS');
        expect(project.phases.length).toBe(4);
        expect(project.phases.every((ph: { status: string }) => ph.status === 'PASS')).toBe(true);
      });
    }
  );

  it('--all runs exactly 4 projects and produces a correct summary', () => {
    // Remove any previous report
    if (existsSync(REPORT_PATH)) {
      rmSync(REPORT_PATH);
    }

    const output = execSync(
      'npx tsx scripts/dogfood.ts --all',
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 60_000,
        env: { ...process.env, HARNESS_DOGFOOD_SYNTHETIC: '1' },
      }
    );

    expect(output).toContain('=== Dogfood Report ===');
    expect(output).toContain('Total: 4');
    expect(existsSync(REPORT_PATH)).toBe(true);

    const report = JSON.parse(readFileSync(REPORT_PATH, 'utf-8'));
    expect(report.projects.length).toBe(4);
    expect(report.summary.total).toBe(4);
    expect(report.summary.passed).toBe(4);
    expect(report.summary.failed).toBe(0);

    const templates = report.projects.map((p: { template: string }) => p.template);
    expect(templates).toContain('react-vite');
    expect(templates).toContain('nextjs');
    expect(templates).toContain('nuxt');
    expect(templates).toContain('python');
  });
});

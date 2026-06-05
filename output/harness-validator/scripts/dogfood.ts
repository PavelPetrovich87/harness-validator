#!/usr/bin/env node
import { rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSetup } from '../src/setup.js';
import { bootstrapTemplate } from '../src/dogfood/bootstrap.js';
import { injectHarness } from '../src/dogfood/inject.js';
import { verifyProject } from '../src/dogfood/verify.js';
import { generateReport } from '../src/dogfood/report.js';
import type { DogfoodTemplate, DogfoodProjectResult } from '../src/dogfood/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HARNESS_ROOT = join(__dirname, '..');
const REPORT_PATH = join(HARNESS_ROOT, 'dogfood-report.json');

const ALL_TEMPLATES: DogfoodTemplate[] = ['react-vite', 'nextjs', 'nuxt', 'python'];

function parseArgs(): { templates: DogfoodTemplate[]; all: boolean } {
  const args = process.argv.slice(2);
  const templates: DogfoodTemplate[] = [];
  let all = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--template' && args[i + 1]) {
      const t = args[i + 1] as DogfoodTemplate;
      if (!ALL_TEMPLATES.includes(t)) {
        console.error(`Unknown template: ${t}. Allowed: ${ALL_TEMPLATES.join(', ')}`);
        process.exit(1);
      }
      templates.push(t);
      i++;
    } else if (args[i] === '--all') {
      all = true;
    }
  }

  if (all) {
    return { templates: ALL_TEMPLATES, all: true };
  }

  if (templates.length === 0) {
    console.error('Usage: npx tsx scripts/dogfood.ts --template <name> | --all');
    console.error(`Templates: ${ALL_TEMPLATES.join(', ')}`);
    process.exit(1);
  }

  return { templates, all: false };
}

async function runDogfood(template: DogfoodTemplate): Promise<DogfoodProjectResult> {
  const start = Date.now();
  const errors: string[] = [];
  let tempDir = '';

  try {
    const bootstrapResult = await bootstrapTemplate(template);
    tempDir = bootstrapResult.projectRoot;

    console.log(`[${template}] Bootstrapped at ${tempDir} (synthetic=${bootstrapResult.synthetic})`);

    // Inject harness templates/schemas so runSetup can resolve them
    injectHarness(tempDir, HARNESS_ROOT);

    // Write answers.json to force layered pattern (ensures .dependency-cruiser.js is generated)
    const answersPath = join(tempDir, 'answers.json');
    writeFileSync(answersPath, JSON.stringify({ pattern: 'layered', useGitSubtree: false }, null, 2));

    // Run setup
    const setupResult = await runSetup(tempDir, {
      answersJsonPath: answersPath,
      harnessRoot: HARNESS_ROOT,
    });

    if (setupResult.exitCode !== 0) {
      errors.push(...setupResult.errors);
    }

    // Verify
    const phases = verifyProject(tempDir, template);
    for (const phase of phases) {
      if (phase.status === 'FAIL') {
        errors.push(...phase.errors);
      }
    }

    const duration = Date.now() - start;
    const status: DogfoodProjectResult['status'] = errors.length === 0 ? 'PASS' : 'FAIL';

    console.log(`[${template}] ${status} in ${duration}ms`);

    return {
      template,
      tempDir,
      durationMs: duration,
      phases,
      errors,
      status,
    };
  } catch (e) {
    const duration = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[${template}] ERROR: ${msg}`);

    return {
      template,
      tempDir,
      durationMs: duration,
      phases: [],
      errors: [msg],
      status: 'FAIL',
    };
  } finally {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

async function main(): Promise<void> {
  const { templates } = parseArgs();
  const results: DogfoodProjectResult[] = [];

  for (const template of templates) {
    const result = await runDogfood(template);
    results.push(result);
  }

  const report = generateReport(results, REPORT_PATH);

  console.log('\n=== Dogfood Report ===');
  console.log(`Total: ${report.summary.total}, Passed: ${report.summary.passed}, Failed: ${report.summary.failed}`);
  console.log(`Report written to: ${REPORT_PATH}`);

  const hasFailures = report.summary.failed > 0;
  process.exit(hasFailures ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

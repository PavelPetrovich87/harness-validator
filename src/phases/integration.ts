import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { ValidationPhase, type ValidationResult } from '../types.js';

const MIN_LEFTHOOK_COMMANDS = 3;
const MIN_CI_JOBS = 4;

/**
 * Phase 4: Integration validation
 * Checks lefthook.yml and CI workflow structure
 */
export async function validateIntegration(projectRoot: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Check lefthook.yml exists
  const lefthookPath = join(projectRoot, 'lefthook.yml');
  if (!existsSync(lefthookPath)) {
    results.push({
      phase: ValidationPhase.INTEGRATION,
      status: 'FAIL',
      message: 'lefthook.yml not found',
      criterionId: 'int-lefthook-exists',
      severity: 'critical',
      recommendation: 'Create lefthook.yml with pre-commit hooks',
    });
  } else {
    try {
      const content = readFileSync(lefthookPath, 'utf-8');
      if (content.trim().length === 0) {
        results.push({
          phase: ValidationPhase.INTEGRATION,
          status: 'FAIL',
          message: 'lefthook.yml is empty',
          criterionId: 'int-lefthook-nonempty',
          severity: 'critical',
          recommendation: 'Add pre-commit commands to lefthook.yml',
        });
      } else {
        results.push({
          phase: ValidationPhase.INTEGRATION,
          status: 'PASS',
          message: 'lefthook.yml exists and is non-empty',
          criterionId: 'int-lefthook-nonempty',
          severity: 'critical',
        });

        // AC4: Check lefthook has 3+ commands
        const lefthookDoc = YAML.parse(content);
        const preCommit = lefthookDoc?.['pre-commit'];
        const commands = preCommit?.commands;
        const commandCount = commands ? Object.keys(commands).length : 0;

        if (commandCount < MIN_LEFTHOOK_COMMANDS) {
          results.push({
            phase: ValidationPhase.INTEGRATION,
            status: 'FAIL',
            message: `lefthook.yml has ${commandCount} pre-commit commands (min ${MIN_LEFTHOOK_COMMANDS})`,
            criterionId: 'int-lefthook-commands',
            severity: 'critical',
            recommendation: `Add at least ${MIN_LEFTHOOK_COMMANDS} commands to lefthook.yml pre-commit hooks`,
          });
        } else {
          results.push({
            phase: ValidationPhase.INTEGRATION,
            status: 'PASS',
            message: `lefthook.yml has ${commandCount} pre-commit commands`,
            criterionId: 'int-lefthook-commands',
            severity: 'critical',
          });
        }

        // AC5: Check parallel execution is enabled
        if (preCommit?.parallel === true) {
          results.push({
            phase: ValidationPhase.INTEGRATION,
            status: 'PASS',
            message: 'lefthook.yml pre-commit runs in parallel',
            criterionId: 'int-lefthook-parallel',
            severity: 'warning',
          });
        } else {
          results.push({
            phase: ValidationPhase.INTEGRATION,
            status: 'WARN',
            message: 'lefthook.yml pre-commit is not configured for parallel execution',
            criterionId: 'int-lefthook-parallel',
            severity: 'warning',
            recommendation: 'Set parallel: true under pre-commit in lefthook.yml for faster hooks',
          });
        }
      }
    } catch {
      results.push({
        phase: ValidationPhase.INTEGRATION,
        status: 'FAIL',
        message: 'Cannot read lefthook.yml',
        criterionId: 'int-lefthook-parseable',
        severity: 'critical',
        recommendation: 'Ensure lefthook.yml is valid YAML',
      });
    }
  }

  // Check CI workflow
  const ciPath = join(projectRoot, '.github', 'workflows', 'ci.yml');
  if (!existsSync(ciPath)) {
    results.push({
      phase: ValidationPhase.INTEGRATION,
      status: 'WARN',
      message: '.github/workflows/ci.yml not found',
      criterionId: 'int-ci-exists',
      severity: 'warning',
      recommendation: 'Create .github/workflows/ci.yml with at least 4 jobs',
    });
  } else {
    results.push({
      phase: ValidationPhase.INTEGRATION,
      status: 'PASS',
      message: '.github/workflows/ci.yml exists',
      criterionId: 'int-ci-exists',
      severity: 'warning',
    });

    // AC4: Check CI has 4+ jobs
    try {
      const content = readFileSync(ciPath, 'utf-8');
      const ciDoc = YAML.parse(content);
      const jobs = ciDoc?.jobs;
      const jobCount = jobs ? Object.keys(jobs).length : 0;

      if (jobCount < MIN_CI_JOBS) {
        results.push({
          phase: ValidationPhase.INTEGRATION,
          status: 'FAIL',
          message: `.github/workflows/ci.yml has ${jobCount} jobs (min ${MIN_CI_JOBS})`,
          criterionId: 'int-ci-jobs',
          severity: 'critical',
          recommendation: `Add at least ${MIN_CI_JOBS} jobs to .github/workflows/ci.yml`,
        });
      } else {
        results.push({
          phase: ValidationPhase.INTEGRATION,
          status: 'PASS',
          message: `.github/workflows/ci.yml has ${jobCount} jobs`,
          criterionId: 'int-ci-jobs',
          severity: 'critical',
        });
      }
    } catch {
      results.push({
        phase: ValidationPhase.INTEGRATION,
        status: 'FAIL',
        message: 'Cannot parse .github/workflows/ci.yml',
        criterionId: 'int-ci-parseable',
        severity: 'critical',
        recommendation: 'Ensure .github/workflows/ci.yml is valid YAML',
      });
    }
  }

  return results;
}

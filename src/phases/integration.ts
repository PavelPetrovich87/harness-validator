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
    });
  } else {
    try {
      const content = readFileSync(lefthookPath, 'utf-8');
      if (content.trim().length === 0) {
        results.push({
          phase: ValidationPhase.INTEGRATION,
          status: 'FAIL',
          message: 'lefthook.yml is empty',
        });
      } else {
        results.push({
          phase: ValidationPhase.INTEGRATION,
          status: 'PASS',
          message: 'lefthook.yml exists and is non-empty',
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
          });
        } else {
          results.push({
            phase: ValidationPhase.INTEGRATION,
            status: 'PASS',
            message: `lefthook.yml has ${commandCount} pre-commit commands`,
          });
        }

        // AC5: Check parallel execution is enabled
        if (preCommit?.parallel === true) {
          results.push({
            phase: ValidationPhase.INTEGRATION,
            status: 'PASS',
            message: 'lefthook.yml pre-commit runs in parallel',
          });
        } else {
          results.push({
            phase: ValidationPhase.INTEGRATION,
            status: 'WARN',
            message: 'lefthook.yml pre-commit is not configured for parallel execution',
          });
        }
      }
    } catch {
      results.push({
        phase: ValidationPhase.INTEGRATION,
        status: 'FAIL',
        message: 'Cannot read lefthook.yml',
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
    });
  } else {
    results.push({
      phase: ValidationPhase.INTEGRATION,
      status: 'PASS',
      message: '.github/workflows/ci.yml exists',
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
        });
      } else {
        results.push({
          phase: ValidationPhase.INTEGRATION,
          status: 'PASS',
          message: `.github/workflows/ci.yml has ${jobCount} jobs`,
        });
      }
    } catch {
      results.push({
        phase: ValidationPhase.INTEGRATION,
        status: 'FAIL',
        message: 'Cannot parse .github/workflows/ci.yml',
      });
    }
  }

  return results;
}

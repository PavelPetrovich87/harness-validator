import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { ValidationPhase, type ValidationResult } from '../types.js';
import { extractFrontmatter } from '../utils/frontmatter.js';

const MIN_LOCAL_FILES = 2;
const MIN_SHARED_FILES = 1;

function getMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => join(e.parentPath, e.name));
}

function loadSchema(projectRoot: string): object {
  const projectSchemaPath = join(projectRoot, 'schemas', 'instruction_frontmatter.schema.json');
  const harnessSchemaPath = join(process.cwd(), 'schemas', 'instruction_frontmatter.schema.json');

  const schemaPath = existsSync(projectSchemaPath) ? projectSchemaPath : harnessSchemaPath;
  return JSON.parse(readFileSync(schemaPath, 'utf-8'));
}

/**
 * Phase: INSTRUCTION_MODULES
 * Validates instruction module directories and frontmatter.
 */
export async function validateInstructionModules(projectRoot: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const instructionsDir = join(projectRoot, '.claude', 'instructions');
  const localDir = join(instructionsDir, 'local');
  const sharedDir = join(instructionsDir, 'shared');

  const localExists = existsSync(localDir);
  const sharedExists = existsSync(sharedDir);

  // If the entire instruction module tree is missing, emit WARN (backward compat)
  if (!localExists && !sharedExists) {
    results.push({
      phase: ValidationPhase.INSTRUCTION_MODULES,
      status: 'WARN',
      message: '.claude/instructions/ directory tree not found',
      criterionId: 'im-tree-exists',
      severity: 'warning',
      recommendation: 'Create .claude/instructions/ with local/ and shared/ subdirectories',
    });
    return results;
  }

  // Validate local directory
  if (!localExists) {
    results.push({
      phase: ValidationPhase.INSTRUCTION_MODULES,
      status: 'WARN',
      message: '.claude/instructions/local/ not found',
      criterionId: 'im-local-dir-exists',
      severity: 'warning',
      recommendation: 'Create .claude/instructions/local/ and add at least 2 .md files',
    });
  } else {
    const localFiles = getMarkdownFiles(localDir);
    if (localFiles.length < MIN_LOCAL_FILES) {
      results.push({
        phase: ValidationPhase.INSTRUCTION_MODULES,
        status: 'FAIL',
        message: `.claude/instructions/local/ has ${localFiles.length} .md file(s) (min ${MIN_LOCAL_FILES})`,
        criterionId: 'im-local-file-count',
        severity: 'critical',
        recommendation: `Add at least ${MIN_LOCAL_FILES} .md files to .claude/instructions/local/`,
      });
    } else {
      results.push({
        phase: ValidationPhase.INSTRUCTION_MODULES,
        status: 'PASS',
        message: `.claude/instructions/local/ has ${localFiles.length} .md file(s)`,
        criterionId: 'im-local-file-count',
        severity: 'critical',
      });
    }

    // Validate frontmatter on each local file
    const ajv = new Ajv({ allErrors: true });
    const schema = loadSchema(projectRoot);
    const validate = ajv.compile(schema);

    for (const filePath of localFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const frontmatter = extractFrontmatter(content);

      if (frontmatter === null) {
        results.push({
          phase: ValidationPhase.INSTRUCTION_MODULES,
          status: 'FAIL',
          message: `Missing or invalid frontmatter: ${filePath}`,
          criterionId: 'im-local-frontmatter-valid',
          severity: 'critical',
          recommendation: `Add valid YAML frontmatter to ${filePath}`,
        });
        continue;
      }

      const valid = validate(frontmatter);
      if (!valid) {
        const errors = validate.errors?.map((e) => `${e.instancePath || '/'}: ${e.message}`).join('; ');
        results.push({
          phase: ValidationPhase.INSTRUCTION_MODULES,
          status: 'FAIL',
          message: `Invalid frontmatter: ${filePath}`,
          details: errors || 'Unknown validation error',
          criterionId: 'im-local-frontmatter-valid',
          severity: 'critical',
          recommendation: `Fix frontmatter schema errors in ${filePath}: ${errors || 'see details'}`,
        });
      } else {
        results.push({
          phase: ValidationPhase.INSTRUCTION_MODULES,
          status: 'PASS',
          message: `Valid frontmatter: ${filePath}`,
          criterionId: 'im-local-frontmatter-valid',
          severity: 'critical',
        });
      }
    }
  }

  // Validate shared directory
  if (!sharedExists) {
    results.push({
      phase: ValidationPhase.INSTRUCTION_MODULES,
      status: 'WARN',
      message: '.claude/instructions/shared/ not found',
      criterionId: 'im-shared-dir-exists',
      severity: 'warning',
      recommendation: 'Create .claude/instructions/shared/ and add at least 1 .md file',
    });
  } else {
    const sharedFiles = getMarkdownFiles(sharedDir);
    if (sharedFiles.length < MIN_SHARED_FILES) {
      results.push({
        phase: ValidationPhase.INSTRUCTION_MODULES,
        status: 'FAIL',
        message: `.claude/instructions/shared/ has ${sharedFiles.length} .md file(s) (min ${MIN_SHARED_FILES})`,
        criterionId: 'im-shared-file-count',
        severity: 'critical',
        recommendation: `Add at least ${MIN_SHARED_FILES} .md file to .claude/instructions/shared/`,
      });
    } else {
      results.push({
        phase: ValidationPhase.INSTRUCTION_MODULES,
        status: 'PASS',
        message: `.claude/instructions/shared/ has ${sharedFiles.length} .md file(s)`,
        criterionId: 'im-shared-file-count',
        severity: 'critical',
      });
    }
  }

  return results;
}

import { existsSync, copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { detectStack, generateAgentsMd, writeAgentsMd } from './generate-agents.js';
import { generateInstructionModules } from './generators/instruction-modules.js';
import { generateKnowledgeBase } from './generators/knowledge-base.js';
import { generateQualityPipeline } from './generators/quality-pipeline.js';
import { copyValidator } from './generators/validator-setup.js';
import { HarnessValidator } from './validator.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { generateTriageReport, type TriageAttempt } from './generators/triage.js';
import { askQuestions, loadAnswersFromJson, type SetupAnswers } from './interactive.js';
import { detectArchitecturePattern } from './detect-architecture.js';

export interface SetupOptions {
  interactive?: boolean;
  answersJsonPath?: string;
  harnessRoot?: string;
}

export interface SetupResult {
  exitCode: number;
  manifestPath: string;
  errors: string[];
}

function getInstructionsTemplatesDir(harnessRoot: string): string {
  return join(harnessRoot, 'templates', 'instructions');
}

/**
 * Ensure a directory exists and has at least `minCount` .md files by copying
 * instruction templates from the harness templates directory.
 */
function ensureMinInstructionFiles(
  targetDir: string,
  existingFiles: string[],
  minCount: number,
  instructionsTemplatesDir: string
): void {
  if (existingFiles.length >= minCount) return;
  if (!existsSync(instructionsTemplatesDir)) return;

  mkdirSync(targetDir, { recursive: true });
  const allTemplates = readdirSync(instructionsTemplatesDir).filter((f) =>
    f.endsWith('.md')
  );

  for (const template of allTemplates) {
    if (existingFiles.includes(template)) continue;
    copyFileSync(
      join(instructionsTemplatesDir, template),
      join(targetDir, template)
    );
    existingFiles.push(template);
    if (existingFiles.length >= minCount) break;
  }
}

/**
 * Run the full interactive setup flow for a project.
 *
 * Flow:
 * 1. Detect stack
 * 2. Resolve answers (interactive, JSON, or defaults)
 * 3. Generate all artifacts
 * 4. Run validator
 * 5. If validation fails, retry up to 3 times via circuit breaker
 * 6. If still failing, generate triage report and exit with error
 */
export async function runSetup(
  projectRoot: string,
  options: SetupOptions = {}
): Promise<SetupResult> {
  const harnessRoot = options.harnessRoot;
  const manifestPath = join(projectRoot, '.harness', 'manifest.json');
  const errors: string[] = [];

  // Phase 1: Detect stack
  const stack = detectStack(projectRoot);
  if (stack.length === 0) {
    return {
      exitCode: 1,
      manifestPath,
      errors: [
        'No recognizable stack found (no package.json, pyproject.toml, requirements.txt, or go.mod)',
      ],
    };
  }

  // Phase 2: Resolve answers
  let answers: SetupAnswers;
  if (options.answersJsonPath) {
    answers = loadAnswersFromJson(options.answersJsonPath);
  } else if (options.interactive) {
    answers = await askQuestions(projectRoot);
  } else {
    // Non-interactive defaults
    const { pattern } = detectArchitecturePattern(projectRoot);
    answers = {
      pattern: (pattern as SetupAnswers['pattern']) || 'skip',
      useGitSubtree: false,
    };
  }

  // Phase 3: Generate all artifacts
  generateAllArtifacts(projectRoot, answers, harnessRoot);

  // Phase 4: Run validator with circuit-breaker fix loop
  const breaker = new CircuitBreaker();
  const failureLog: TriageAttempt[] = [];
  let attempt = 0;
  let lastExitCode = 0;

  while (breaker.canAttempt('setup')) {
    attempt++;
    const validator = new HarnessValidator({ projectRoot, manifestPath });
    const result = await validator.run();
    lastExitCode = result.exitCode;

    if (lastExitCode === 0) {
      breaker.recordSuccess('setup');
      return { exitCode: 0, manifestPath, errors: [] };
    }

    const failureMessages = result.results
      .filter((r) => r.status === 'FAIL')
      .map((r) => r.message);
    errors.push(...failureMessages);

    breaker.recordFailure('setup');
    failureLog.push({
      attempt,
      error: failureMessages.join('; '),
      fixApplied: 'Re-running generators',
    });

    // Auto-fix: regenerate all artifacts
    generateAllArtifacts(projectRoot, answers, harnessRoot);
  }

  // Circuit breaker open after 3 failures
  const triagePath = generateTriageReport(projectRoot, 'setup', attempt, failureLog);
  errors.push(`Setup failed after ${attempt} attempts. Triage report written to ${triagePath}`);

  return {
    exitCode: 1,
    manifestPath,
    errors,
  };
}

/**
 * Generate/copy all harness artifacts into the project.
 */
function generateAllArtifacts(projectRoot: string, answers: SetupAnswers, harnessRoot?: string): void {
  // Templates may be in projectRoot (old behavior) or harnessRoot (dogfood)
  const templateRoot = harnessRoot || projectRoot;
  // Harness source files (validator, schemas) are always in harness repo
  const sourceRoot = harnessRoot || process.cwd();
  const instructionsTemplatesDir = getInstructionsTemplatesDir(templateRoot);

  // 1. AGENTS.md
  writeAgentsMd(projectRoot, generateAgentsMd(projectRoot));

  // 2. Instruction modules (local)
  generateInstructionModules(projectRoot, templateRoot);
  const localDir = join(projectRoot, '.claude', 'instructions', 'local');
  const localFiles = existsSync(localDir)
    ? readdirSync(localDir).filter((f) => f.endsWith('.md'))
    : [];
  ensureMinInstructionFiles(localDir, localFiles, 2, instructionsTemplatesDir);

  // 3. Instruction modules (shared)
  const sharedDir = join(projectRoot, '.claude', 'instructions', 'shared');
  if (!answers.useGitSubtree) {
    if (existsSync(instructionsTemplatesDir)) {
      mkdirSync(sharedDir, { recursive: true });
      for (const file of readdirSync(instructionsTemplatesDir).filter((f) =>
        f.endsWith('.md')
      )) {
        copyFileSync(
          join(instructionsTemplatesDir, file),
          join(sharedDir, file)
        );
      }
    }
  }

  // 4. Quality pipeline
  try {
    generateQualityPipeline(projectRoot, templateRoot);
  } catch {
    // If templates are missing in projectRoot, we'll catch it in validation
  }

  // 5. Knowledge base
  generateKnowledgeBase(projectRoot, templateRoot);

  // 6. feature_list.json
  const featureListSrc = join(templateRoot, 'templates', 'feature_list.json');
  if (existsSync(featureListSrc)) {
    copyFileSync(featureListSrc, join(projectRoot, 'feature_list.json'));
  }

  // 7. feature_list.schema.json (needed for data-contracts validation)
  const schemaSrc = join(sourceRoot, 'schemas', 'feature_list.schema.json');
  if (existsSync(schemaSrc)) {
    copyFileSync(schemaSrc, join(projectRoot, 'feature_list.schema.json'));
  }

  // 7b. instruction_frontmatter.schema.json (needed for instruction-modules validation)
  const instructionSchemaSrc = join(sourceRoot, 'schemas', 'instruction_frontmatter.schema.json');
  if (existsSync(instructionSchemaSrc)) {
    mkdirSync(join(projectRoot, 'schemas'), { recursive: true });
    copyFileSync(instructionSchemaSrc, join(projectRoot, 'schemas', 'instruction_frontmatter.schema.json'));
  }

  // 8. Copy validator for CI-only mode
  copyValidator(projectRoot, sourceRoot);

  // 9. .dependency-cruiser.js
  if (answers.pattern && answers.pattern !== 'skip') {
    const patternFileName =
      answers.pattern === 'layered' ? 'layered-app.js' : `${answers.pattern}.js`;
    const patternFile = join(
      templateRoot,
      'templates',
      'architecture-patterns',
      patternFileName
    );
    if (existsSync(patternFile)) {
      copyFileSync(patternFile, join(projectRoot, '.dependency-cruiser.js'));
    }
  }
}

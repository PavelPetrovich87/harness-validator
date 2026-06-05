import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { readFileSync } from 'node:fs';
import { detectStack } from './generate-agents.js';
import { detectArchitecturePattern } from './detect-architecture.js';

export interface SetupAnswers {
  stackOverride?: string[];
  pattern: 'layered' | 'monorepo' | 'hexagonal' | 'skip';
  lintCmd?: string;
  testCmd?: string;
  useGitSubtree: boolean;
}

/**
 * Ask 4 clarifying questions via readline.
 */
export async function askQuestions(projectRoot: string): Promise<SetupAnswers> {
  const rl = createInterface({ input: stdin, output: stdout });

  const stack = detectStack(projectRoot);
  const { pattern: detectedPattern, description } = detectArchitecturePattern(projectRoot);

  try {
    // Q1: Confirm detected stack
    const stackStr = stack.join(', ') || 'None detected';
    const stackAnswer = await rl.question(
      `Detected stack: ${stackStr}. Override? (comma-separated or empty to keep): `
    );
    const stackOverride = stackAnswer.trim()
      ? stackAnswer.split(',').map((s) => s.trim())
      : undefined;

    // Q2: Confirm architecture pattern
    const patternOptions = ['layered', 'monorepo', 'hexagonal', 'skip'];
    const defaultPattern = detectedPattern || 'skip';
    const patternAnswer = await rl.question(
      `Architecture pattern: ${defaultPattern}${detectedPattern ? '' : ' (none detected — ' + description + ')'}. ` +
        `Options: ${patternOptions.join(', ')}. Choose [${defaultPattern}]: `
    );
    const pattern = (patternAnswer.trim() || defaultPattern) as SetupAnswers['pattern'];

    // Q3: Confirm test runner / lint tool
    const defaultLint = stack.includes('Python')
      ? 'ruff check'
      : stack.includes('Go')
        ? 'golangci-lint run'
        : 'biome check';
    const defaultTest = stack.includes('Python')
      ? 'pytest'
      : stack.includes('Go')
        ? 'go test ./...'
        : 'npm test';
    const lintAnswer = await rl.question(`Lint command [${defaultLint}]: `);
    const testAnswer = await rl.question(`Test command [${defaultTest}]: `);

    // Q4: Git subtree
    const subtreeAnswer = await rl.question(
      'Enable shared instructions via git subtree? (yes/no) [no]: '
    );
    const useGitSubtree = subtreeAnswer.trim().toLowerCase().startsWith('y');

    return {
      stackOverride,
      pattern,
      lintCmd: lintAnswer.trim() || defaultLint,
      testCmd: testAnswer.trim() || defaultTest,
      useGitSubtree,
    };
  } finally {
    rl.close();
  }
}

/**
 * Load non-interactive answers from a JSON file.
 */
export function loadAnswersFromJson(path: string): SetupAnswers {
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as SetupAnswers;
}

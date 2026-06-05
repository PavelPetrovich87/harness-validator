import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { detectStack } from '../generate-agents.js';

export interface StackCommands {
  lint: string;
  typecheck: string;
  test: string;
}

/**
 * Map detected stack to quality pipeline commands.
 * AC1: TypeScript → biome check for lint
 * AC2: Python → ruff check for lint
 */
export function getCommandsForStack(stack: string[]): StackCommands {
  const hasJsTs = stack.includes('TypeScript') || stack.includes('Node.js');
  const hasPython = stack.includes('Python');
  const hasGo = stack.includes('Go');

  if (hasPython) {
    return {
      lint: 'ruff check',
      typecheck: 'mypy',
      test: 'pytest',
    };
  }

  if (hasGo) {
    return {
      lint: 'golangci-lint run',
      typecheck: 'go vet',
      test: 'go test ./...',
    };
  }

  // Default: JS/TS stack
  return {
    lint: 'biome check',
    typecheck: 'npx tsc --noEmit',
    test: 'npm test',
  };
}

/**
 * Replace template variables in content string.
 * Replaces {{LINT_CMD}}, {{TYPECHECK_CMD}}, {{TEST_CMD}}.
 */
export function replaceTemplateVariables(content: string, commands: StackCommands): string {
  return content
    .replace(/\{\{LINT_CMD\}\}/g, commands.lint)
    .replace(/\{\{TYPECHECK_CMD\}\}/g, commands.typecheck)
    .replace(/\{\{TEST_CMD\}\}/g, commands.test);
}

/**
 * Generate lefthook.yml from template with stack-aware commands.
 */
export function generateLefthookYml(projectRoot: string, harnessRoot?: string): void {
  const templatePath = join(harnessRoot || projectRoot, 'templates', 'lefthook.yml');
  if (!existsSync(templatePath)) {
    throw new Error(`lefthook.yml template not found at ${templatePath}`);
  }

  const template = readFileSync(templatePath, 'utf-8');
  const stack = detectStack(projectRoot);
  const commands = getCommandsForStack(stack);
  const content = replaceTemplateVariables(template, commands);

  writeFileSync(join(projectRoot, 'lefthook.yml'), content, 'utf-8');
}

/**
 * Generate .github/workflows/ci.yml from template with stack-aware commands.
 */
export function generateCiYml(projectRoot: string, harnessRoot?: string): void {
  const templatePath = join(harnessRoot || projectRoot, 'templates', '.github', 'workflows', 'ci.yml');
  if (!existsSync(templatePath)) {
    throw new Error(`ci.yml template not found at ${templatePath}`);
  }

  const template = readFileSync(templatePath, 'utf-8');
  const stack = detectStack(projectRoot);
  const commands = getCommandsForStack(stack);
  const content = replaceTemplateVariables(template, commands);

  const outputPath = join(projectRoot, '.github', 'workflows', 'ci.yml');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, 'utf-8');
}

/**
 * Generate full quality pipeline: lefthook.yml + CI workflow.
 */
export function generateQualityPipeline(projectRoot: string, harnessRoot?: string): void {
  generateLefthookYml(projectRoot, harnessRoot);
  generateCiYml(projectRoot, harnessRoot);
}

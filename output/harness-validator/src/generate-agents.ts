import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SAFETY_ITEMS = [
  'Do NOT run `rm -rf` on project directories',
  'Do NOT use `git push --force`',
  'Do NOT run `curl | sh` without verification',
  'Do NOT edit `.env` files directly',
  'Do NOT modify CSP headers without review',
  'Do NOT install packages with postinstall scripts unchecked',
];

const SESSION_PROTOCOL_ITEMS = [
  'Reset context between features',
  'Run validator before commit',
];

const FEEDBACK_LOOP_ITEMS = [
  'When pipeline catches an error, record a lesson in docs/knowledge/',
  'Lessons follow .template-lesson.md format with type, tags, date, severity',
  'Update instructions based on lessons learned',
  'Review output before applying',
  'Report deviations to AGENTS.md',
];

const CIRCUIT_BREAKER_ITEMS = [
  'ATTEMPTS_LIMIT=3',
  'After 3 failed pipeline fixes — STOP and create triage_report.md',
  'Circuit breaker resets when a fix succeeds',
  'Circuit breaker state is per-feature (F02 failure does not count for F03)',
];

/**
 * Detect project stack by scanning package.json, pyproject.toml, requirements.txt, or go.mod
 */
export function detectStack(projectRoot: string): string[] {
  const stack: string[] = [];

  // JS/TS detection
  const packageJsonPath = join(projectRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      const allDeps = new Set([...deps, ...devDeps]);

      if (allDeps.has('typescript')) stack.push('TypeScript');
      if (allDeps.has('react') || allDeps.has('next')) stack.push('React');
      if (allDeps.has('next')) stack.push('Next.js');
      if (allDeps.has('nuxt')) stack.push('Nuxt');
      if (allDeps.has('vite')) stack.push('Vite');
      stack.push('Node.js');
    } catch {
      // ignore parse errors
    }
  }

  // Python detection
  const pyprojectPath = join(projectRoot, 'pyproject.toml');
  const requirementsPath = join(projectRoot, 'requirements.txt');
  if (existsSync(pyprojectPath) || existsSync(requirementsPath)) {
    stack.push('Python');

    // Check for frameworks in pyproject.toml
    if (existsSync(pyprojectPath)) {
      try {
        const content = readFileSync(pyprojectPath, 'utf-8').toLowerCase();
        if (content.includes('django')) stack.push('Django');
        else if (content.includes('flask')) stack.push('Flask');
        else if (content.includes('fastapi')) stack.push('FastAPI');
      } catch {
        // ignore read errors
      }
    }
  }

  // Go detection
  const goModPath = join(projectRoot, 'go.mod');
  if (existsSync(goModPath)) {
    stack.push('Go');
  }

  return stack;
}

/**
 * Map detected stack to command entries
 */
export function generateCommands(stack: string[]): string[] {
  const commands: string[] = [];

  const hasJsTs = stack.includes('TypeScript') || stack.includes('Node.js');
  const hasPython = stack.includes('Python');
  const hasGo = stack.includes('Go');

  if (hasJsTs) {
    commands.push('`npm run build`');
    commands.push('`npm test`');
  }

  if (hasPython) {
    commands.push('`pytest`');
    commands.push('`ruff check`');
  }

  if (hasGo) {
    commands.push('`go test ./...`');
    commands.push('`go vet`');
  }

  return commands;
}

/**
 * Assemble full AGENTS.md markdown content
 */
export function generateAgentsMd(projectRoot: string): string {
  const stack = detectStack(projectRoot);
  const commands = generateCommands(stack);

  const lines: string[] = [];

  // Stack section
  lines.push('## Stack');
  lines.push('');
  for (const item of stack) {
    lines.push(`- ${item}`);
  }

  // Commands section
  lines.push('');
  lines.push('## Commands');
  lines.push('');
  for (const cmd of commands) {
    lines.push(`- ${cmd}`);
  }

  // Safety section
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  for (const item of SAFETY_ITEMS) {
    lines.push(`- ${item}`);
  }

  // Session Protocol section
  lines.push('');
  lines.push('## Session Protocol');
  lines.push('');
  for (const item of SESSION_PROTOCOL_ITEMS) {
    lines.push(`- ${item}`);
  }

  // Architecture Rules section
  lines.push('');
  lines.push('## Architecture Rules');
  lines.push('');
  lines.push('See `.dependency-cruiser.js` for layer rules.');

  // Feedback Loop section
  lines.push('');
  lines.push('## Feedback Loop');
  lines.push('');
  for (const item of FEEDBACK_LOOP_ITEMS) {
    lines.push(`- ${item}`);
  }

  // Circuit Breaker section
  lines.push('');
  lines.push('## Circuit Breaker');
  lines.push('');
  for (const item of CIRCUIT_BREAKER_ITEMS) {
    lines.push(`- ${item}`);
  }

  return lines.join('\n');
}

/**
 * Write AGENTS.md to the project root
 */
export function writeAgentsMd(projectRoot: string, content: string): void {
  const agentsPath = join(projectRoot, 'AGENTS.md');
  writeFileSync(agentsPath, content, 'utf-8');
}

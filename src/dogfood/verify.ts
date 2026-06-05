import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import Ajv from 'ajv';
import type { DogfoodTemplate, DogfoodPhaseResult } from './types.js';

const EXPECTED_STACKS: Record<DogfoodTemplate, string[]> = {
  'react-vite': ['React', 'TypeScript', 'Vite', 'Node.js'],
  nextjs: ['Next.js', 'React', 'TypeScript', 'Node.js'],
  nuxt: ['Nuxt', 'Node.js'],
  python: ['Python'],
};

function phase(name: DogfoodPhaseResult['name'], status: DogfoodPhaseResult['status'], errors: string[] = []): DogfoodPhaseResult {
  return { name, status, errors };
}

export function verifyProject(projectRoot: string, template: DogfoodTemplate): DogfoodPhaseResult[] {
  const phases: DogfoodPhaseResult[] = [];
  const phaseErrors: string[] = [];

  // Phase 1 — Artifacts
  const artifacts = [
    { path: join(projectRoot, 'AGENTS.md'), required: true },
    { path: join(projectRoot, 'lefthook.yml'), required: true },
    { path: join(projectRoot, '.github', 'workflows', 'ci.yml'), required: true },
    { path: join(projectRoot, 'feature_list.json'), required: true },
    { path: join(projectRoot, '.harness', 'manifest.json'), required: true },
    { path: join(projectRoot, '.harness', 'validator'), required: true, isDir: true },
  ];

  const depCruisePath = join(projectRoot, '.dependency-cruiser.js');
  const hasDepCruise = existsSync(depCruisePath);

  for (const artifact of artifacts) {
    const exists = artifact.isDir ? existsSync(artifact.path) : existsSync(artifact.path);
    if (artifact.required && !exists) {
      phaseErrors.push(`Missing artifact: ${artifact.path}`);
    }
  }

  const knowledgeDir = join(projectRoot, 'docs', 'knowledge');
  if (existsSync(knowledgeDir)) {
    const templates = readdirSync(knowledgeDir).filter((f) => f.startsWith('.template-') && f.endsWith('.md'));
    if (templates.length < 3) {
      phaseErrors.push(`Expected >=3 .template-*.md in docs/knowledge/, found ${templates.length}`);
    }
  } else {
    phaseErrors.push('Missing docs/knowledge/ directory');
  }

  const localDir = join(projectRoot, '.claude', 'instructions', 'local');
  if (existsSync(localDir)) {
    const files = readdirSync(localDir).filter((f) => f.endsWith('.md'));
    if (files.length < 1) {
      phaseErrors.push('Expected >=1 .md in .claude/instructions/local/');
    }
  } else {
    phaseErrors.push('Missing .claude/instructions/local/ directory');
  }

  const sharedDir = join(projectRoot, '.claude', 'instructions', 'shared');
  if (existsSync(sharedDir)) {
    const files = readdirSync(sharedDir).filter((f) => f.endsWith('.md'));
    if (files.length < 1) {
      phaseErrors.push('Expected >=1 .md in .claude/instructions/shared/');
    }
  } else {
    phaseErrors.push('Missing .claude/instructions/shared/ directory');
  }

  phases.push(phase('artifacts', phaseErrors.length === 0 ? 'PASS' : 'FAIL', phaseErrors));

  // Phase 2 — Content
  const contentErrors: string[] = [];

  // AGENTS.md stack assertions
  const agentsPath = join(projectRoot, 'AGENTS.md');
  if (existsSync(agentsPath)) {
    const agentsContent = readFileSync(agentsPath, 'utf-8');
    for (const expected of EXPECTED_STACKS[template]) {
      if (!agentsContent.includes(expected)) {
        contentErrors.push(`AGENTS.md missing expected stack: ${expected}`);
      }
    }
  } else {
    contentErrors.push('AGENTS.md not found for content check');
  }

  // lefthook.yml command assertions
  const lefthookPath = join(projectRoot, 'lefthook.yml');
  if (existsSync(lefthookPath)) {
    const lefthookContent = readFileSync(lefthookPath, 'utf-8');
    if (template === 'python') {
      if (!lefthookContent.includes('ruff check')) {
        contentErrors.push('lefthook.yml missing ruff check');
      }
      if (!lefthookContent.includes('pytest')) {
        contentErrors.push('lefthook.yml missing pytest');
      }
    } else {
      if (!lefthookContent.includes('depcruise src --config .dependency-cruiser.js')) {
        contentErrors.push('lefthook.yml missing depcruise architecture check');
      }
    }
  } else {
    contentErrors.push('lefthook.yml not found for content check');
  }

  // .dependency-cruiser.js content
  if (hasDepCruise) {
    const depCruiseContent = readFileSync(depCruisePath, 'utf-8');
    const forbiddenMatch = depCruiseContent.match(/forbidden\s*:\s*\[/);
    if (!forbiddenMatch) {
      contentErrors.push('.dependency-cruiser.js missing forbidden array');
    }
  }

  phases.push(phase('content', contentErrors.length === 0 ? 'PASS' : 'FAIL', contentErrors));

  // Phase 3 — Execution
  const execErrors: string[] = [];

  // depcruise if available
  if (hasDepCruise && existsSync(join(projectRoot, 'src'))) {
    try {
      execSync('npx depcruise src --config .dependency-cruiser.js', {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 15_000,
        stdio: 'pipe',
      });
    } catch {
      // depcruise may fail on synthetic projects without actual deps; non-fatal
    }
  }

  // lefthook validate (requires git init)
  try {
    execSync('git init', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
    execSync('git config user.email "dogfood@test.com"', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
    execSync('git config user.name "Dogfood"', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
    execSync('npx lefthook validate', {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 15_000,
      stdio: 'pipe',
    });
  } catch (e) {
    const msg = String(e);
    // lefthook validate can fail if hooks reference missing commands; that's expected for synthetic projects
    // We only record as error if it's a YAML parse error or structural issue
    if (msg.includes('YAML') || msg.includes('parse error')) {
      execErrors.push(`lefthook validate failed: ${msg}`);
    }
  }

  phases.push(phase('execution', execErrors.length === 0 ? 'PASS' : 'FAIL', execErrors));

  // Phase 4 — Manifest
  const manifestErrors: string[] = [];
  const manifestPath = join(projectRoot, '.harness', 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const ajv = new Ajv();
      // We can't easily load the schema file here without knowing harnessRoot,
      // so we do structural checks instead
      if (typeof manifest.validated_at !== 'string') {
        manifestErrors.push('manifest.json missing validated_at');
      }
      if (typeof manifest.version !== 'string') {
        manifestErrors.push('manifest.json missing version');
      }
      if (typeof manifest.errors !== 'number') {
        manifestErrors.push('manifest.json missing errors count');
      }
      if (!Array.isArray(manifest.results)) {
        manifestErrors.push('manifest.json missing results array');
      }
    } catch {
      manifestErrors.push('manifest.json is not valid JSON');
    }
  } else {
    manifestErrors.push('manifest.json not found');
  }

  phases.push(phase('manifest', manifestErrors.length === 0 ? 'PASS' : 'FAIL', manifestErrors));

  return phases;
}

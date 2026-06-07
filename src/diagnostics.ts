import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface DiagnosticCriterion {
  name: string;
  met: boolean;
  message: string;
}

export interface DiagnosticModule {
  name: string;
  exists: boolean;
  criteria: DiagnosticCriterion[];
}

export interface DiagnosticsReport {
  modules: DiagnosticModule[];
  allExist: boolean;
  missingModules: string[];
  existingModules: string[];
}

const ARTIFACT_PATHS = [
  { name: 'AGENTS.md', path: 'AGENTS.md' },
  { name: 'lefthook.yml', path: 'lefthook.yml' },
  { name: '.dependency-cruiser.js', path: '.dependency-cruiser.js' },
  { name: 'Instructions (local)', path: join('.claude', 'instructions', 'local') },
  { name: 'Instructions (shared)', path: join('.claude', 'instructions', 'shared') },
  { name: 'feature_list.json', path: 'feature_list.json' },
  { name: 'Manifest', path: join('.harness', 'manifest.json') },
  { name: 'CI workflow', path: join('.github', 'workflows', 'ci.yml') },
];

/**
 * Run diagnostics on an existing project to determine which Harness artifacts are present.
 */
export function runDiagnostics(projectRoot: string): DiagnosticsReport {
  const modules: DiagnosticModule[] = [];

  for (const artifact of ARTIFACT_PATHS) {
    const artifactPath = join(projectRoot, artifact.path);
    const exists = existsSync(artifactPath);

    const criteria: DiagnosticCriterion[] = [
      {
        name: 'exists',
        met: exists,
        message: exists ? 'Found' : 'Not found',
      },
    ];

    // Additional checks for directories: count files
    if (exists && artifact.name.includes('Instructions')) {
      try {
        const entries = readdirSync(artifactPath, { recursive: true, withFileTypes: true });
        const mdCount = entries.filter((e) => e.isFile() && e.name.endsWith('.md')).length;
        criteria.push({
          name: 'file-count',
          met: mdCount > 0,
          message: `${mdCount} .md file(s)`,
        });
      } catch {
        criteria.push({
          name: 'file-count',
          met: false,
          message: 'Cannot read directory',
        });
      }
    }

    modules.push({
      name: artifact.name,
      exists,
      criteria,
    });
  }

  const existingModules = modules.filter((m) => m.exists).map((m) => m.name);
  const missingModules = modules.filter((m) => !m.exists).map((m) => m.name);

  return {
    modules,
    allExist: missingModules.length === 0,
    missingModules,
    existingModules,
  };
}

/**
 * Format diagnostics report for CLI output.
 */
export function formatDiagnostics(report: DiagnosticsReport): string {
  const lines: string[] = [];

  lines.push('Harness Diagnostics');
  lines.push('===================');
  lines.push('');

  for (const mod of report.modules) {
    const status = mod.exists ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    lines.push(`${status} ${mod.name.padEnd(22)} ${mod.criteria[0].message}`);
    for (const c of mod.criteria.slice(1)) {
      lines.push(`    └─ ${c.name}: ${c.message}`);
    }
  }

  lines.push('');
  lines.push(`Detected: ${report.existingModules.length}/${report.modules.length} artifacts`);

  if (report.allExist) {
    lines.push('\x1b[32mHarness is fully installed.\x1b[0m Run `npm run validate` to review compliance.');
  } else if (report.existingModules.length > 0) {
    lines.push('\x1b[33mHarness is partially installed.\x1b[0m Missing: ' + report.missingModules.join(', '));
    lines.push('Recommendation: run setup to generate missing artifacts, or validate to review existing ones.');
  } else {
    lines.push('\x1b[31mNo Harness artifacts detected.\x1b[0m Run setup to initialize the project.');
  }

  return lines.join('\n');
}

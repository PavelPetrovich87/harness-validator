import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PATTERNS_DIR = join(__dirname, '../../templates/architecture-patterns');

const PATTERNS = ['layered-app.js', 'monorepo.js', 'hexagonal.js'];

describe('Unit: architecture patterns', () => {
  it('all 3 pattern files exist and contain forbidden array with >= 2 rules', () => {
    for (const pattern of PATTERNS) {
      const configPath = join(PATTERNS_DIR, pattern);
      const content = readFileSync(configPath, 'utf-8');

      expect(content).toContain('forbidden:');

      const ruleMatches = content.match(/name:\s*'/g);
      expect(ruleMatches?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('layered-app.js matches template .dependency-cruiser.js rules', () => {
    const templatePath = join(__dirname, '../../templates/.dependency-cruiser.js');
    const templateContent = readFileSync(templatePath, 'utf-8');

    const patternPath = join(PATTERNS_DIR, 'layered-app.js');
    const patternContent = readFileSync(patternPath, 'utf-8');

    expect(patternContent).toContain('no-ui-to-data-access');
    expect(patternContent).toContain('no-services-to-ui');
    expect(templateContent).toContain('no-ui-to-data-access');
    expect(templateContent).toContain('no-services-to-ui');
  });

  it('README.md contains detection heuristics and fallback guidance', () => {
    const readmePath = join(PATTERNS_DIR, 'README.md');
    const content = readFileSync(readmePath, 'utf-8');

    expect(content).toContain('layered-app');
    expect(content).toContain('monorepo');
    expect(content).toContain('hexagonal');
    expect(content).toContain('Detection');
    expect(content).toContain('Fallback');
    expect(content).toContain('Ask');
  });
});

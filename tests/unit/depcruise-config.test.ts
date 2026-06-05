import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Unit: .dependency-cruiser.js config', () => {
  it('template config contains forbidden array with >= 2 rules', () => {
    const configPath = join(__dirname, '../../templates/.dependency-cruiser.js');
    const content = readFileSync(configPath, 'utf-8');

    expect(content).toContain('forbidden:');
    expect(content).toContain('no-ui-to-data-access');
    expect(content).toContain('no-services-to-ui');

    // Count rule objects in the file (each rule has name + comment + severity + from + to)
    const ruleMatches = content.match(/name:\s*'/g);
    expect(ruleMatches?.length).toBeGreaterThanOrEqual(2);
  });

  it('violation fixture config has same forbidden rules', () => {
    const configPath = join(__dirname, '../../tests/fixtures/depcruise-violation/.dependency-cruiser.cjs');
    const content = readFileSync(configPath, 'utf-8');

    expect(content).toContain('forbidden:');
    expect(content).toContain('no-ui-to-data-access');
    expect(content).toContain('no-services-to-ui');
  });

  it('layered-app pattern matches template config', () => {
    const templatePath = join(__dirname, '../../templates/.dependency-cruiser.js');
    const templateContent = readFileSync(templatePath, 'utf-8');

    const patternPath = join(__dirname, '../../templates/architecture-patterns/layered-app.js');
    const patternContent = readFileSync(patternPath, 'utf-8');

    expect(patternContent).toContain('no-ui-to-data-access');
    expect(patternContent).toContain('no-services-to-ui');
    expect(templateContent).toContain('no-ui-to-data-access');
    expect(templateContent).toContain('no-services-to-ui');
  });
});

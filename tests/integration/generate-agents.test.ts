import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, cpSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectStack, generateCommands, generateAgentsMd, writeAgentsMd } from '../../src/generate-agents.js';
import { HarnessValidator } from '../../src/validator.js';
import { parseMarkdownString, findListItemsUnderHeading, findHeadings, getHeadingText } from '../../src/utils/ast-utils.js';

const TEMPLATES_DIR = new URL('../../templates', import.meta.url).pathname;
const SCHEMAS_DIR = new URL('../../schemas', import.meta.url).pathname;
const FIXTURES_DIR = new URL('../fixtures', import.meta.url).pathname;

function setupTempProject(fixtureName: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'generate-agents-test-'));

  // Copy fixture project file
  const fixturePath = join(FIXTURES_DIR, fixtureName);
  cpSync(fixturePath, tempDir, { recursive: true, force: true });

  // Copy templates (includes lefthook.yml, feature_list.json, .dependency-cruiser.js, .github/)
  cpSync(TEMPLATES_DIR, tempDir, { recursive: true, force: true });

  // Copy schema for data-contracts phase
  cpSync(
    join(SCHEMAS_DIR, 'feature_list.schema.json'),
    join(tempDir, 'feature_list.schema.json')
  );

  return tempDir;
}

describe('Integration: generate-agents for each stack', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('React fixture: detects React + TypeScript + Node.js', () => {
    const tempDir = setupTempProject('react-project');
    tempDirs.push(tempDir);

    const stack = detectStack(tempDir);
    expect(stack).toContain('React');
    expect(stack).toContain('TypeScript');
    expect(stack).toContain('Node.js');
  });

  it('React fixture: generates AGENTS.md under 50 lines with all sections', () => {
    const tempDir = setupTempProject('react-project');
    tempDirs.push(tempDir);

    const content = generateAgentsMd(tempDir);
    writeAgentsMd(tempDir, content);

    const agentsPath = join(tempDir, 'AGENTS.md');
    expect(existsSync(agentsPath)).toBe(true);

    const lineCount = content.split('\n').length;
    expect(lineCount).toBeLessThan(50);

    // Architecture Rules references .dependency-cruiser.js
    expect(content).toContain('## Architecture Rules');
    expect(content).toContain('.dependency-cruiser.js');

    // Safety section has >= 5 items (AST count)
    const ast = parseMarkdownString(content);
    const safetyItems = findListItemsUnderHeading(ast, 'Safety');
    expect(safetyItems.length).toBeGreaterThanOrEqual(5);

    // Stack mentions correct tools
    const h2Headings = findHeadings(ast, 2);
    const headingTexts = h2Headings.map(getHeadingText);
    expect(headingTexts).toContain('Stack');
    expect(headingTexts).toContain('Commands');
    expect(headingTexts).toContain('Safety');
    expect(headingTexts).toContain('Session Protocol');
    expect(headingTexts).toContain('Architecture Rules');
    expect(headingTexts).toContain('Feedback Loop');
    expect(headingTexts).toContain('Circuit Breaker');

    // Commands include JS/TS commands
    const commands = generateCommands(detectStack(tempDir));
    expect(commands).toContain('`npm run build`');
    expect(commands).toContain('`npm test`');
  });

  it('React fixture: passes full HarnessValidator', async () => {
    const tempDir = setupTempProject('react-project');
    tempDirs.push(tempDir);

    const content = generateAgentsMd(tempDir);
    writeAgentsMd(tempDir, content);

    const manifestPath = join(tempDir, '.harness', 'manifest.json');
    const validator = new HarnessValidator({ projectRoot: tempDir, manifestPath });
    const { exitCode } = await validator.run();

    expect(exitCode).toBe(0);
  });

  it('Python fixture: detects Python + Django', () => {
    const tempDir = setupTempProject('python-project');
    tempDirs.push(tempDir);

    const stack = detectStack(tempDir);
    expect(stack).toContain('Python');
    expect(stack).toContain('Django');
  });

  it('Python fixture: generates AGENTS.md under 50 lines and passes validator', async () => {
    const tempDir = setupTempProject('python-project');
    tempDirs.push(tempDir);

    const content = generateAgentsMd(tempDir);
    writeAgentsMd(tempDir, content);

    expect(content.split('\n').length).toBeLessThan(50);

    const ast = parseMarkdownString(content);
    const safetyItems = findListItemsUnderHeading(ast, 'Safety');
    expect(safetyItems.length).toBeGreaterThanOrEqual(5);

    const commands = generateCommands(detectStack(tempDir));
    expect(commands).toContain('`pytest`');
    expect(commands).toContain('`ruff check`');

    const manifestPath = join(tempDir, '.harness', 'manifest.json');
    const validator = new HarnessValidator({ projectRoot: tempDir, manifestPath });
    const { exitCode } = await validator.run();

    expect(exitCode).toBe(0);
  });

  it('Go fixture: detects Go', () => {
    const tempDir = setupTempProject('go-project');
    tempDirs.push(tempDir);

    const stack = detectStack(tempDir);
    expect(stack).toContain('Go');
  });

  it('Go fixture: generates AGENTS.md under 50 lines and passes validator', async () => {
    const tempDir = setupTempProject('go-project');
    tempDirs.push(tempDir);

    const content = generateAgentsMd(tempDir);
    writeAgentsMd(tempDir, content);

    expect(content.split('\n').length).toBeLessThan(50);

    const ast = parseMarkdownString(content);
    const safetyItems = findListItemsUnderHeading(ast, 'Safety');
    expect(safetyItems.length).toBeGreaterThanOrEqual(5);

    const commands = generateCommands(detectStack(tempDir));
    expect(commands).toContain('`go test ./...`');
    expect(commands).toContain('`go vet`');

    const manifestPath = join(tempDir, '.harness', 'manifest.json');
    const validator = new HarnessValidator({ projectRoot: tempDir, manifestPath });
    const { exitCode } = await validator.run();

    expect(exitCode).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { getCommandsForStack, replaceTemplateVariables } from '../../src/generators/quality-pipeline.js';

describe('Unit: Quality Pipeline Generator', () => {
  describe('getCommandsForStack', () => {
    it('AC1: TypeScript project uses biome check for lint', () => {
      const commands = getCommandsForStack(['TypeScript', 'Node.js']);
      expect(commands.lint).toBe('biome check');
      expect(commands.typecheck).toBe('npx tsc --noEmit');
      expect(commands.test).toBe('npm test');
    });

    it('AC2: Python project uses ruff check for lint', () => {
      const commands = getCommandsForStack(['Python', 'Django']);
      expect(commands.lint).toBe('ruff check');
      expect(commands.typecheck).toBe('mypy');
      expect(commands.test).toBe('pytest');
    });

    it('Go project uses golangci-lint for lint', () => {
      const commands = getCommandsForStack(['Go']);
      expect(commands.lint).toBe('golangci-lint run');
      expect(commands.typecheck).toBe('go vet');
      expect(commands.test).toBe('go test ./...');
    });

    it('defaults to JS/TS commands for unknown stack', () => {
      const commands = getCommandsForStack([]);
      expect(commands.lint).toBe('biome check');
      expect(commands.typecheck).toBe('npx tsc --noEmit');
      expect(commands.test).toBe('npm test');
    });
  });

  describe('replaceTemplateVariables', () => {
    it('replaces all three template variables', () => {
      const template = `
lint:
  run: {{LINT_CMD}}
typecheck:
  run: {{TYPECHECK_CMD}}
test:
  run: {{TEST_CMD}}
`;
      const commands = { lint: 'biome check', typecheck: 'tsc', test: 'vitest' };
      const result = replaceTemplateVariables(template, commands);

      expect(result).toContain('run: biome check');
      expect(result).toContain('run: tsc');
      expect(result).toContain('run: vitest');
      expect(result).not.toContain('{{');
    });

    it('replaces multiple occurrences of the same variable', () => {
      const template = `
lint:
  run: {{LINT_CMD}}
lint-ci:
  run: {{LINT_CMD}}
`;
      const commands = { lint: 'biome check', typecheck: 'tsc', test: 'vitest' };
      const result = replaceTemplateVariables(template, commands);

      const matches = result.match(/biome check/g);
      expect(matches).toHaveLength(2);
    });
  });
});

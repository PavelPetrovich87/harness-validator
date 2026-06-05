import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseMarkdownString,
  findHeadings,
  getHeadingText,
  matchesHeading,
  findListItemsUnderHeading,
} from '../../src/utils/ast-utils.js';

const TEMPLATES_DIR = new URL('../../templates', import.meta.url).pathname;

function readTemplate(relativePath: string): string {
  return readFileSync(join(TEMPLATES_DIR, relativePath), 'utf-8');
}

function templateExists(relativePath: string): boolean {
  return existsSync(join(TEMPLATES_DIR, relativePath));
}

describe('Templates', () => {
  describe('AC1: AGENTS.md', () => {
    it('exists and is non-empty', () => {
      expect(templateExists('AGENTS.md')).toBe(true);
      const content = readTemplate('AGENTS.md');
      expect(content.trim().length).toBeGreaterThan(0);
    });

    it('has required H2 sections', () => {
      const content = readTemplate('AGENTS.md');
      const ast = parseMarkdownString(content);
      const h2s = findHeadings(ast, 2);
      const texts = h2s.map(getHeadingText);

      const required = ['Stack', 'Commands', 'Safety', 'Architecture Rules', 'Session Protocol', 'Feedback Loop'];
      for (const section of required) {
        expect(texts.some((t) => matchesHeading(t, section))).toBe(true);
      }
    });

    it('has 5+ safety items', () => {
      const content = readTemplate('AGENTS.md');
      const ast = parseMarkdownString(content);
      const items = findListItemsUnderHeading(ast, 'Safety');
      expect(items.length).toBeGreaterThanOrEqual(5);
    });

    it('is under 60 lines', () => {
      const content = readTemplate('AGENTS.md');
      const lines = content.trimEnd().split(/\r?\n/).length;
      expect(lines).toBeLessThanOrEqual(60);
    });
  });

  describe('AC2: lefthook.yml', () => {
    it('exists and is non-empty', () => {
      expect(templateExists('lefthook.yml')).toBe(true);
      const content = readTemplate('lefthook.yml');
      expect(content.trim().length).toBeGreaterThan(0);
    });

    it('contains exactly 3 {{VARIABLE}} placeholders', () => {
      const content = readTemplate('lefthook.yml');
      const matches = content.match(/\{\{[A-Z_]+\}\}/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(3);
    });

    it('has parallel: true for pre-commit', () => {
      const content = readTemplate('lefthook.yml');
      expect(content).toContain('parallel: true');
    });

    it('has architecture command with depcruise', () => {
      const content = readTemplate('lefthook.yml');
      expect(content).toContain('depcruise');
    });
  });

  describe('AC3: .github/workflows/ci.yml', () => {
    it('exists and is non-empty', () => {
      expect(templateExists('.github/workflows/ci.yml')).toBe(true);
      const content = readTemplate('.github/workflows/ci.yml');
      expect(content.trim().length).toBeGreaterThan(0);
    });

    it('contains 4+ jobs', () => {
      const content = readTemplate('.github/workflows/ci.yml');
      const jobMatches = content.match(/^\s+lint:$/m) &&
        content.match(/^\s+typecheck:$/m) &&
        content.match(/^\s+test:$/m) &&
        content.match(/^\s+architecture:$/m);
      expect(jobMatches).toBeTruthy();
    });

    it('contains placeholder variables for commands', () => {
      const content = readTemplate('.github/workflows/ci.yml');
      expect(content).toContain('{{LINT_CMD}}');
      expect(content).toContain('{{TYPECHECK_CMD}}');
      expect(content).toContain('{{TEST_CMD}}');
    });
  });

  describe('AC4: .dependency-cruiser.js', () => {
    it('exists and is non-empty', () => {
      expect(templateExists('.dependency-cruiser.js')).toBe(true);
      const content = readTemplate('.dependency-cruiser.js');
      expect(content.trim().length).toBeGreaterThan(0);
    });

    it('contains forbidden array with 2+ rules', () => {
      const content = readTemplate('.dependency-cruiser.js');
      const forbiddenMatch = content.match(/forbidden:\s*\[/);
      expect(forbiddenMatch).toBeTruthy();

      // Count rule objects inside forbidden array
      const ruleMatches = content.match(/name:/g);
      expect(ruleMatches).not.toBeNull();
      expect(ruleMatches!.length).toBeGreaterThanOrEqual(2);
    });

    it('has UI to data-access forbidden rule', () => {
      const content = readTemplate('.dependency-cruiser.js');
      expect(content).toContain('no-ui-to-data-access');
    });

    it('is CJS-compatible (module.exports)', () => {
      const content = readTemplate('.dependency-cruiser.js');
      expect(content).toContain('module.exports');
    });
  });

  describe('AC5: knowledge templates', () => {
    it('.template-decision.md exists with required frontmatter', () => {
      expect(templateExists('knowledge/.template-decision.md')).toBe(true);
      const content = readTemplate('knowledge/.template-decision.md');
      expect(content).toContain('---');
      expect(content).toContain('type: decision');
      expect(content).toContain('status:');
      expect(content).toContain('title:');
      expect(content).toContain('date:');
    });

    it('.template-lesson.md exists with required frontmatter', () => {
      expect(templateExists('knowledge/.template-lesson.md')).toBe(true);
      const content = readTemplate('knowledge/.template-lesson.md');
      expect(content).toContain('---');
      expect(content).toContain('type: lesson');
      expect(content).toContain('severity:');
      expect(content).toContain('title:');
      expect(content).toContain('date:');
    });

    it('.template-pattern.md exists with required frontmatter', () => {
      expect(templateExists('knowledge/.template-pattern.md')).toBe(true);
      const content = readTemplate('knowledge/.template-pattern.md');
      expect(content).toContain('---');
      expect(content).toContain('type: pattern');
      expect(content).toContain('title:');
      expect(content).toContain('date:');
    });

    it('.template-triage.md exists with required frontmatter and 4 sections', () => {
      expect(templateExists('knowledge/.template-triage.md')).toBe(true);
      const content = readTemplate('knowledge/.template-triage.md');
      expect(content).toContain('---');
      expect(content).toContain('type: triage');
      expect(content).toContain('attempts:');
      expect(content).toContain('feature:');
      expect(content).toContain('title:');
      expect(content).toContain('date:');

      const ast = parseMarkdownString(content);
      const h2s = findHeadings(ast, 2);
      const texts = h2s.map(getHeadingText);

      expect(texts.some((t) => matchesHeading(t, 'Failure'))).toBe(true);
      expect(texts.some((t) => matchesHeading(t, 'Attempts'))).toBe(true);
      expect(texts.some((t) => matchesHeading(t, 'Analysis'))).toBe(true);
      expect(texts.some((t) => matchesHeading(t, 'Recommendation'))).toBe(true);
    });
  });

  describe('AC6: feature_list.json', () => {
    it('exists and is valid JSON', () => {
      expect(templateExists('feature_list.json')).toBe(true);
      const content = readTemplate('feature_list.json');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('has features array with valid entries', () => {
      const content = readTemplate('feature_list.json');
      const data = JSON.parse(content);
      expect(data).toHaveProperty('features');
      expect(Array.isArray(data.features)).toBe(true);
      expect(data.features.length).toBeGreaterThan(0);

      for (const feature of data.features) {
        expect(feature).toHaveProperty('id');
        expect(feature.id).toMatch(/^F[0-9]{2}$/);
        expect(feature).toHaveProperty('title');
        expect(feature).toHaveProperty('status');
        expect(['planned', 'in_progress', 'done', 'blocked']).toContain(feature.status);
      }
    });
  });

  describe('AC7: instruction templates', () => {
    it('contains 3 template files in templates/instructions/', () => {
      expect(templateExists('instructions/react-components.md')).toBe(true);
      expect(templateExists('instructions/vue-components.md')).toBe(true);
      expect(templateExists('instructions/api-endpoints.md')).toBe(true);
    });

    it('react-components.md has frontmatter with required fields', () => {
      const content = readTemplate('instructions/react-components.md');
      expect(content).toContain('---');
      expect(content).toContain('name:');
      expect(content).toContain('type:');
      expect(content).toContain('trigger:');
      expect(content).toContain('tags:');
    });

    it('vue-components.md has frontmatter with required fields', () => {
      const content = readTemplate('instructions/vue-components.md');
      expect(content).toContain('---');
      expect(content).toContain('name:');
      expect(content).toContain('type:');
      expect(content).toContain('trigger:');
      expect(content).toContain('tags:');
    });

    it('api-endpoints.md has frontmatter with required fields', () => {
      const content = readTemplate('instructions/api-endpoints.md');
      expect(content).toContain('---');
      expect(content).toContain('name:');
      expect(content).toContain('type:');
      expect(content).toContain('trigger:');
      expect(content).toContain('tags:');
    });
  });
});

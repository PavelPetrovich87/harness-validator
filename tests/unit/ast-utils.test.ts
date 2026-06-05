import { describe, it, expect } from 'vitest';
import {
  parseMarkdownString,
  findHeadings,
  getHeadingText,
  matchesHeading,
  findListItemsUnderHeading,
} from '../../src/utils/ast-utils.js';

describe('ast-utils', () => {
  describe('parseMarkdown + findHeadings', () => {
    it('extracts H2 headings from fixture markdown', () => {
      const markdown = `
## Stack

- TypeScript

## Commands

- build
- test

## Safety

- rule 1
- rule 2
`;
      const ast = parseMarkdownString(markdown);
      const h2s = findHeadings(ast, 2);
      expect(h2s).toHaveLength(3);

      const texts = h2s.map(getHeadingText);
      expect(texts).toContain('Stack');
      expect(texts).toContain('Commands');
      expect(texts).toContain('Safety');
    });

    it('extracts localized headings via flexible matching', () => {
      const markdown = `
## Стек

- TypeScript

## Safety

- rule 1
`;
      const ast = parseMarkdownString(markdown);
      const h2s = findHeadings(ast, 2);
      const texts = h2s.map(getHeadingText);

      expect(texts.some((t) => matchesHeading(t, 'Stack'))).toBe(true);
      expect(texts.some((t) => matchesHeading(t, 'Safety'))).toBe(true);
    });
  });

  describe('findListItemsUnderHeading', () => {
    it('counts list items under Safety heading (should be 5+)', () => {
      const markdown = `
## Stack

- TypeScript

## Safety

- Do NOT run rm -rf
- Do NOT use git push --force
- Do NOT run curl | sh
- Do NOT edit .env
- Do NOT modify CSP
- Do NOT install unchecked postinstall scripts

## Commands

- build
`;
      const ast = parseMarkdownString(markdown);
      const items = findListItemsUnderHeading(ast, 'Safety');
      expect(items.length).toBeGreaterThanOrEqual(5);
    });

    it('returns empty array for missing heading', () => {
      const markdown = `
## Stack

- TypeScript
`;
      const ast = parseMarkdownString(markdown);
      const items = findListItemsUnderHeading(ast, 'Safety');
      expect(items).toHaveLength(0);
    });
  });
});

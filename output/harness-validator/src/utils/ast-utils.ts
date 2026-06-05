import { readFileSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Root, Heading, ListItem, List } from 'mdast';
import { HEADING_ALIASES } from '../types.js';

/**
 * Parse a markdown file into an AST
 */
export function parseMarkdown(filePath: string): Root {
  const content = readFileSync(filePath, 'utf-8');
  return unified().use(remarkParse).parse(content);
}

/**
 * Parse markdown content string into an AST
 */
export function parseMarkdownString(content: string): Root {
  return unified().use(remarkParse).parse(content);
}

/**
 * Find all headings at a specific depth
 */
export function findHeadings(ast: Root, depth: number): Heading[] {
  const headings: Heading[] = [];
  visit(ast, 'heading', (node) => {
    if (node.depth === depth) {
      headings.push(node);
    }
  });
  return headings;
}

/**
 * Extract text value from a heading node
 */
export function getHeadingText(heading: Heading): string {
  let text = '';
  visit(heading, 'text', (node) => {
    text += node.value;
  });
  return text.trim();
}

/**
 * Check if a heading text matches a canonical name (including localized aliases)
 */
export function matchesHeading(text: string, canonicalName: string): boolean {
  const normalized = text.toLowerCase().trim();
  const canonicalLower = canonicalName.toLowerCase();

  if (normalized === canonicalLower) return true;

  const aliases = HEADING_ALIASES[canonicalName] || [];
  return aliases.some((alias) => alias.toLowerCase() === normalized);
}

/**
 * Find list items under a specific H2 heading.
 * Collects all list items that appear after the heading until the next H2 or end of document.
 */
export function findListItemsUnderHeading(ast: Root, headingPattern: string): ListItem[] {
  const items: ListItem[] = [];
  let inTargetSection = false;

  visit(ast, (node) => {
    if (node.type === 'heading' && node.depth === 2) {
      const text = getHeadingText(node as Heading);
      inTargetSection = matchesHeading(text, headingPattern);
      return;
    }

    if (inTargetSection && node.type === 'listItem') {
      items.push(node as ListItem);
    }
  });

  return items;
}

/**
 * Count lines in a file (matches `wc -l` behavior)
 */
export function countLines(filePath: string): number {
  const content = readFileSync(filePath, 'utf-8');
  return content.trimEnd().split(/\r?\n/).length;
}

import { readFileSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import type { Root, YAML } from 'mdast';
import YAMLParser from 'yaml';

/**
 * Extract YAML frontmatter from markdown content.
 * Returns the parsed frontmatter as a Record, or null if no frontmatter found.
 */
export function extractFrontmatter(content: string): Record<string, unknown> | null {
  const ast = unified().use(remarkParse).use(remarkFrontmatter).parse(content) as Root;

  let frontmatterNode: YAML | undefined;
  visit(ast, 'yaml', (node) => {
    frontmatterNode = node;
  });

  if (!frontmatterNode || !frontmatterNode.value) {
    return null;
  }

  try {
    return YAMLParser.parse(frontmatterNode.value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Extract YAML frontmatter from a markdown file.
 * Returns the parsed frontmatter as a Record, or null if no frontmatter found.
 */
export function extractFrontmatterFromFile(filePath: string): Record<string, unknown> | null {
  const content = readFileSync(filePath, 'utf-8');
  return extractFrontmatter(content);
}

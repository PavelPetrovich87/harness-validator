import { existsSync, copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Generate knowledge base by copying all .template-*.md files
 * from templates/knowledge/ to docs/knowledge/.
 * Returns list of generated file paths.
 */
export function generateKnowledgeBase(projectRoot: string, harnessRoot?: string): string[] {
  const targetDir = join(projectRoot, 'docs', 'knowledge');
  const knowledgeTemplatesDir = join(harnessRoot || process.cwd(), 'templates', 'knowledge');

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const generated: string[] = [];

  if (!existsSync(knowledgeTemplatesDir)) {
    return generated;
  }

  const templateFiles = readdirSync(knowledgeTemplatesDir).filter((f) =>
    f.startsWith('.template-') && f.endsWith('.md')
  );

  for (const file of templateFiles) {
    const src = join(knowledgeTemplatesDir, file);
    const dest = join(targetDir, file);
    copyFileSync(src, dest);
    generated.push(dest);
  }

  return generated;
}

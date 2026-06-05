import { existsSync, cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Copy Harness source + templates into the temp project so `runSetup()`
 * can resolve templates and schemas from the harness repo.
 */
export function injectHarness(projectRoot: string, harnessRoot: string): void {
  // Templates
  const templatesSrc = join(harnessRoot, 'templates');
  if (existsSync(templatesSrc)) {
    cpSync(templatesSrc, join(projectRoot, 'templates'), { recursive: true });
  }

  // Schemas
  const schemasSrc = join(harnessRoot, 'schemas');
  if (existsSync(schemasSrc)) {
    mkdirSync(join(projectRoot, 'schemas'), { recursive: true });
    cpSync(schemasSrc, join(projectRoot, 'schemas'), { recursive: true });
  }
}

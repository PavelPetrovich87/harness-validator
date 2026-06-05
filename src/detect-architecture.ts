import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Detect architecture pattern by scanning project directories.
 *
 * Heuristics (in order of precedence):
 * 1. Monorepo: packages/ or apps/ with 2+ subdirs containing package.json
 * 2. Hexagonal: src/domain/ + src/application/
 * 3. Layered: src/ui/ + src/services/
 *
 * Returns null with a description of detected structure if no match.
 */
export function detectArchitecturePattern(projectRoot: string): {
  pattern: string | null;
  description: string;
} {
  // 1. Monorepo
  for (const dir of ['packages', 'apps']) {
    const dirPath = join(projectRoot, dir);
    if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
      const subdirs = readdirSync(dirPath).filter((sub) => {
        const subPath = join(dirPath, sub);
        try {
          return statSync(subPath).isDirectory() && existsSync(join(subPath, 'package.json'));
        } catch {
          return false;
        }
      });
      if (subdirs.length >= 2) {
        return {
          pattern: 'monorepo',
          description: `Detected monorepo with ${subdirs.length} packages in ${dir}/`,
        };
      }
    }
  }

  // 2. Hexagonal
  const hasDomain =
    existsSync(join(projectRoot, 'src', 'domain')) &&
    statSync(join(projectRoot, 'src', 'domain')).isDirectory();
  const hasApplication =
    existsSync(join(projectRoot, 'src', 'application')) &&
    statSync(join(projectRoot, 'src', 'application')).isDirectory();
  if (hasDomain && hasApplication) {
    return {
      pattern: 'hexagonal',
      description: 'Detected hexagonal architecture (src/domain/ + src/application/)',
    };
  }

  // 3. Layered
  const hasUi =
    existsSync(join(projectRoot, 'src', 'ui')) &&
    statSync(join(projectRoot, 'src', 'ui')).isDirectory();
  const hasServices =
    existsSync(join(projectRoot, 'src', 'services')) &&
    statSync(join(projectRoot, 'src', 'services')).isDirectory();
  if (hasUi && hasServices) {
    return {
      pattern: 'layered',
      description: 'Detected layered architecture (src/ui/ + src/services/)',
    };
  }

  // No match — describe detected structure
  const topLevelDirs: string[] = [];
  if (existsSync(projectRoot)) {
    for (const entry of readdirSync(projectRoot)) {
      const entryPath = join(projectRoot, entry);
      try {
        if (statSync(entryPath).isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          topLevelDirs.push(entry);
        }
      } catch {
        // ignore
      }
    }
  }

  return {
    pattern: null,
    description: `No matching architecture pattern found. Detected top-level directories: ${topLevelDirs.join(', ') || '(none)'}`,
  };
}

import { existsSync, readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(projectRoot: string): PackageJson | null {
  const path = join(projectRoot, 'package.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as PackageJson;
  } catch {
    return null;
  }
}

function hasDependency(pkg: PackageJson, name: string): boolean {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Object.prototype.hasOwnProperty.call(allDeps, name);
}

/**
 * Generate instruction modules based on detected project dependencies.
 * Returns list of generated file paths.
 */
export function generateInstructionModules(projectRoot: string, harnessRoot?: string): string[] {
  const templatesDir = join(harnessRoot || process.cwd(), 'templates', 'instructions');
  const pkg = readPackageJson(projectRoot);
  if (!pkg) return [];

  const generated: string[] = [];
  const targetDir = join(projectRoot, '.claude', 'instructions', 'local');

  const detectors: { deps: string[]; template: string }[] = [
    { deps: ['react', 'react-dom'], template: 'react-components.md' },
    { deps: ['vue'], template: 'vue-components.md' },
    { deps: ['express', 'fastify', 'nest', '@nestjs/core'], template: 'api-endpoints.md' },
  ];

  for (const { deps, template } of detectors) {
    if (deps.some((dep) => hasDependency(pkg, dep))) {
      const src = join(templatesDir, template);
      if (!existsSync(src)) continue;

      const dest = join(targetDir, template);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      generated.push(dest);
    }
  }

  return generated;
}

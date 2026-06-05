import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync, spawn } from 'node:child_process';
import type { DogfoodTemplate } from './types.js';

export interface BootstrapResult {
  projectRoot: string;
  template: DogfoodTemplate;
  synthetic: boolean;
}

const SCAFFOLD_TIMEOUT_MS = 60_000;

function isSyntheticForced(): boolean {
  return process.env.HARNESS_DOGFOOD_SYNTHETIC === '1';
}

function shouldUseSyntheticFallback(error: unknown): boolean {
  if (isSyntheticForced()) return true;
  const msg = String(error).toLowerCase();
  return (
    msg.includes('econnrefused') ||
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound')
  );
}

function writeReactViteSynthetic(projectRoot: string): void {
  mkdirSync(join(projectRoot, 'src'), { recursive: true });
  writeFileSync(
    join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'dogfood-react-vite',
        version: '0.0.1',
        type: 'module',
        dependencies: { react: '^18.3.0', 'react-dom': '^18.3.0' },
        devDependencies: { typescript: '^5.5.0', vite: '^5.3.0' },
      },
      null,
      2
    )
  );
  writeFileSync(
    join(projectRoot, 'src', 'main.tsx'),
    `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
  );
  writeFileSync(
    join(projectRoot, 'vite.config.ts'),
    `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`
  );
}

function writeNextjsSynthetic(projectRoot: string): void {
  mkdirSync(join(projectRoot, 'src', 'app'), { recursive: true });
  writeFileSync(
    join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'dogfood-nextjs',
        version: '0.0.1',
        dependencies: {
          next: '^14.2.0',
          react: '^18.3.0',
          'react-dom': '^18.3.0',
          typescript: '^5.5.0',
        },
      },
      null,
      2
    )
  );
  writeFileSync(
    join(projectRoot, 'src', 'app', 'page.tsx'),
    `export default function Home() {
  return <div>Hello Next.js</div>;
}
`
  );
  writeFileSync(
    join(projectRoot, 'next.config.js'),
    `/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
`
  );
}

function writeNuxtSynthetic(projectRoot: string): void {
  mkdirSync(join(projectRoot, 'src'), { recursive: true });
  writeFileSync(
    join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'dogfood-nuxt',
        version: '0.0.1',
        dependencies: { nuxt: '^3.12.0', vue: '^3.4.0' },
      },
      null,
      2
    )
  );
  writeFileSync(
    join(projectRoot, 'src', 'app.vue'),
    `<template>
  <div>Hello Nuxt</div>
</template>
`
  );
  writeFileSync(
    join(projectRoot, 'nuxt.config.ts'),
    `export default defineNuxtConfig({
  devtools: { enabled: true },
});
`
  );
}

function writePythonSynthetic(projectRoot: string): void {
  mkdirSync(join(projectRoot, 'src'), { recursive: true });
  writeFileSync(
    join(projectRoot, 'pyproject.toml'),
    `[project]
name = "dogfood-python"
version = "0.0.1"
dependencies = []

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]
`
  );
  writeFileSync(
    join(projectRoot, 'requirements.txt'),
    `pytest
ruff
mypy
`
  );
  writeFileSync(
    join(projectRoot, 'src', 'main.py'),
    `def main():
    print("Hello Python")

if __name__ == "__main__":
    main()
`
  );
}

function runScaffoldCommand(
  cmd: string,
  args: string[],
  cwd: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data;
    });
    child.stderr?.on('data', (data) => {
      stderr += data;
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Scaffold timeout after ${SCAFFOLD_TIMEOUT_MS}ms`));
    }, SCAFFOLD_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Scaffold exited ${code}. stderr: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function bootstrapReal(template: DogfoodTemplate, projectRoot: string): Promise<void> {
  switch (template) {
    case 'react-vite': {
      await runScaffoldCommand('npm', ['create', 'vite@latest', projectRoot, '--', '--template', 'react-ts'], process.cwd());
      break;
    }
    case 'nextjs': {
      // create-next-app doesn't allow specifying output dir directly; it prompts for it
      // We run in a temp parent dir and let it create the project folder
      const parentDir = mkdtempSync(join(tmpdir(), 'dogfood-nextjs-'));
      await runScaffoldCommand('npx', [
        'create-next-app@latest',
        'app',
        '--typescript',
        '--eslint',
        '--tailwind',
        '--src-dir',
        '--app',
        '--import-alias', '@/*',
        '--use-npm',
        '--no-turbopack',
      ], parentDir);
      // Move created app to projectRoot
      const createdDir = join(parentDir, 'app');
      if (!existsSync(createdDir)) {
        throw new Error(`create-next-app did not create expected directory: ${createdDir}`);
      }
      // Move contents
      const { cpSync, rmSync } = await import('node:fs');
      cpSync(createdDir, projectRoot, { recursive: true });
      rmSync(parentDir, { recursive: true, force: true });
      break;
    }
    case 'nuxt': {
      const parentDir = mkdtempSync(join(tmpdir(), 'dogfood-nuxt-'));
      await runScaffoldCommand('npx', ['nuxi@latest', 'init', 'app', '--package-manager', 'npm', '--no-git-init'], parentDir);
      const createdDir = join(parentDir, 'app');
      if (!existsSync(createdDir)) {
        throw new Error(`nuxi init did not create expected directory: ${createdDir}`);
      }
      const { cpSync, rmSync } = await import('node:fs');
      cpSync(createdDir, projectRoot, { recursive: true });
      rmSync(parentDir, { recursive: true, force: true });
      break;
    }
    case 'python': {
      // No standard CLI — always synthetic for Python
      writePythonSynthetic(projectRoot);
      break;
    }
  }
}

export async function bootstrapTemplate(template: DogfoodTemplate): Promise<BootstrapResult> {
  const tempDir = mkdtempSync(join(tmpdir(), `dogfood-${template}-`));

  try {
    if (template === 'python') {
      writePythonSynthetic(tempDir);
      return { projectRoot: tempDir, template, synthetic: true };
    }

    if (isSyntheticForced()) {
      switch (template) {
        case 'react-vite':
          writeReactViteSynthetic(tempDir);
          break;
        case 'nextjs':
          writeNextjsSynthetic(tempDir);
          break;
        case 'nuxt':
          writeNuxtSynthetic(tempDir);
          break;
      }
      return { projectRoot: tempDir, template, synthetic: true };
    }

    await bootstrapReal(template, tempDir);
    return { projectRoot: tempDir, template, synthetic: false };
  } catch (error) {
    if (shouldUseSyntheticFallback(error)) {
      // Clean up failed attempt and use synthetic
      rmSync(tempDir, { recursive: true, force: true });
      const syntheticDir = mkdtempSync(join(tmpdir(), `dogfood-${template}-synthetic-`));
      switch (template) {
        case 'react-vite':
          writeReactViteSynthetic(syntheticDir);
          break;
        case 'nextjs':
          writeNextjsSynthetic(syntheticDir);
          break;
        case 'nuxt':
          writeNuxtSynthetic(syntheticDir);
          break;
        case 'python':
          writePythonSynthetic(syntheticDir);
          break;
      }
      return { projectRoot: syntheticDir, template, synthetic: true };
    }
    // If not a network/timeout error, rethrow
    throw error;
  }
}

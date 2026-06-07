#!/usr/bin/env node
import { cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');

const assets = ['templates', 'schemas', 'references'];

for (const asset of assets) {
  const src = join(projectRoot, asset);
  const dest = join(distDir, asset);
  if (existsSync(src)) {
    cpSync(src, dest, { recursive: true });
    console.log(`Copied ${asset}/ → dist/${asset}/`);
  } else {
    console.warn(`Warning: ${asset}/ not found, skipping`);
  }
}

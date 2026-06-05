import { existsSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * List of source files required for the validator to run.
 * These are copied from the harness project into the target project's
 * .harness/validator/ directory.
 */
const VALIDATOR_SOURCE_FILES = [
  'validate-harness.ts',
  'src/validator.ts',
  'src/types.ts',
  'src/manifest.ts',
  'src/phases/ast-structure.ts',
  'src/phases/instruction-modules.ts',
  'src/phases/architecture.ts',
  'src/phases/data-contracts.ts',
  'src/phases/integration.ts',
  'src/utils/ast-utils.ts',
  'src/utils/frontmatter.ts',
];

/**
 * package.json for the copied validator.
 * Contains only the runtime dependencies needed by the validator source.
 */
const VALIDATOR_PACKAGE_JSON = {
  name: 'harness-validator',
  version: '0.1.0',
  type: 'module',
  dependencies: {
    ajv: '^8.17.1',
    'remark-frontmatter': '^5.0.0',
    'remark-parse': '^11.0.0',
    unified: '^11.0.5',
    'unist-util-visit': '^5.0.0',
    yaml: '^2.9.0',
  },
  devDependencies: {
    '@types/node': '^20.14.9',
    tsx: '^4.16.2',
    typescript: '^5.5.3',
  },
};

/**
 * Copy the harness validator source files into the target project so that
 * the project can run validation in its own CI pipeline (CI-only mode).
 *
 * Files are placed under `.harness/validator/` with an isolated
 * package.json so the target project is not polluted with harness deps.
 */
export function copyValidator(projectRoot: string, harnessRoot?: string): void {
  const sourceRoot = harnessRoot || process.cwd();
  const validatorDir = join(projectRoot, '.harness', 'validator');

  mkdirSync(validatorDir, { recursive: true });

  for (const file of VALIDATOR_SOURCE_FILES) {
    const srcPath = join(sourceRoot, file);
    const destPath = join(validatorDir, file);

    if (!existsSync(srcPath)) {
      continue;
    }

    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(srcPath, destPath);
  }

  // Write an isolated package.json for the validator
  const pkgPath = join(validatorDir, 'package.json');
  writeFileSync(
    pkgPath,
    JSON.stringify(VALIDATOR_PACKAGE_JSON, null, 2),
    'utf-8'
  );
}

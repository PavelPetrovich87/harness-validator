import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSetup } from './src/setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = __dirname;

function printUsage(): void {
  console.log('Usage: npx tsx setup-harness.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  --project <path>       Project root directory (default: current directory)');
  console.log('  --answers-json <path>  Path to JSON file with pre-filled answers (non-interactive)');
  console.log('  --non-interactive      Use defaults, skip questions');
  console.log('  --help                 Show this help');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  let projectRoot = process.cwd();
  const projectIndex = args.indexOf('--project');
  if (projectIndex !== -1 && args[projectIndex + 1]) {
    projectRoot = resolve(args[projectIndex + 1]);
  }

  const answersJsonIndex = args.indexOf('--answers-json');
  const answersJsonPath =
    answersJsonIndex !== -1 && args[answersJsonIndex + 1]
      ? resolve(args[answersJsonIndex + 1])
      : undefined;

  const nonInteractive = args.includes('--non-interactive');

  try {
    const result = await runSetup(projectRoot, {
      interactive: !nonInteractive && !answersJsonPath,
      answersJsonPath,
      harnessRoot: HARNESS_ROOT,
    });

    if (result.exitCode === 0) {
      console.log('Setup complete.');
      console.log(`Manifest: ${result.manifestPath}`);
    } else {
      console.error('Setup failed with errors:');
      for (const err of result.errors) {
        console.error(`  - ${err}`);
      }
    }

    process.exit(result.exitCode);
  } catch (error) {
    console.error('Fatal error during setup:', (error as Error).message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

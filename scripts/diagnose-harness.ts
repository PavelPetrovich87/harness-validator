import { join } from 'node:path';
import { runDiagnostics, formatDiagnostics } from '../src/diagnostics.js';

function printUsage(): void {
  console.log('Usage: npx tsx scripts/diagnose-harness.ts [--project <path>]');
  console.log('');
  console.log('Options:');
  console.log('  --project <path>   Project root directory (default: current directory)');
  console.log('  --help             Show this help');
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
    projectRoot = args[projectIndex + 1];
  }

  const report = runDiagnostics(projectRoot);
  console.log(formatDiagnostics(report));

  // Exit code: 0 if fully installed, 1 if partially or not installed
  process.exit(report.allExist ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

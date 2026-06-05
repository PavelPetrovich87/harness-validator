import { join } from 'node:path';
import { HarnessValidator } from './src/validator.js';

function printUsage(): void {
  console.log('Usage: npx tsx validate-harness.ts [--project <path>] [--github]');
  console.log('');
  console.log('Options:');
  console.log('  --project <path>   Project root directory (default: current directory)');
  console.log('  --github           Emit GitHub Actions workflow commands');
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

  const isGitHub = args.includes('--github');

  const validator = new HarnessValidator({
    projectRoot,
    manifestPath: join(projectRoot, '.harness/manifest.json'),
  });
  const { results, exitCode } = await validator.run();

  // Print results
  for (const result of results) {
    if (isGitHub) {
      const command =
        result.status === 'FAIL'
          ? 'error'
          : result.status === 'WARN'
            ? 'warning'
            : 'notice';
      console.log(`::${command} title=${result.phase}::${result.message}`);
    } else {
      const color =
        result.status === 'PASS'
          ? '\x1b[32m'
          : result.status === 'FAIL'
            ? '\x1b[31m'
            : '\x1b[33m';
      const reset = '\x1b[0m';
      console.log(`${color}[${result.status}]${reset} ${result.phase}: ${result.message}`);
    }
    if (result.details) {
      console.log(`  ${result.details}`);
    }
  }

  console.log('');
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;
  const passCount = results.filter((r) => r.status === 'PASS').length;

  console.log(`Results: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
  console.log(`Manifest written to: .harness/manifest.json`);

  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

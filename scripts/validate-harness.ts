import { join } from 'node:path';
import { HarnessValidator } from '../src/validator.js';
import { formatScoreTable, formatRecommendations } from '../src/scoring.js';
import { readManifest, diffScores, formatDiff } from '../src/diff.js';

function printUsage(): void {
  console.log('Usage: npx tsx scripts/validate-harness.ts [--project <path>] [--github] [--recommendations] [--compare]');
  console.log('');
  console.log('Options:');
  console.log('  --project <path>      Project root directory (default: current directory)');
  console.log('  --github              Emit GitHub Actions workflow commands');
  console.log('  --recommendations     Show recommendations for failed/warned criteria');
  console.log('  --compare             Compare scores with previous manifest');
  console.log('  --help                Show this help');
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
  const showRecommendations = args.includes('--recommendations');
  const showCompare = args.includes('--compare');

  const manifestPath = join(projectRoot, '.harness/manifest.json');
  const previousManifest = showCompare ? readManifest(manifestPath) : null;

  const validator = new HarnessValidator({
    projectRoot,
    manifestPath,
  });
  const { results, exitCode, scores } = await validator.run();

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

  // Print score table
  console.log(formatScoreTable(scores));

  if (showRecommendations) {
    console.log('');
    console.log(formatRecommendations(scores));
  }

  if (showCompare) {
    console.log('');
    const diff = diffScores(scores, previousManifest);
    console.log(formatDiff(diff));
  }

  console.log('');
  console.log(`Manifest written to: ${manifestPath}`);

  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

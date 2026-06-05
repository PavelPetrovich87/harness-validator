import { join } from 'node:path';
import { generateAgentsMd, writeAgentsMd } from './src/generate-agents.js';

function printUsage(): void {
  console.log('Usage: npx tsx generate-agents.ts [--project <path>]');
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

  try {
    const content = generateAgentsMd(projectRoot);
    writeAgentsMd(projectRoot, content);
    console.log(`AGENTS.md generated at: ${join(projectRoot, 'AGENTS.md')}`);
    process.exit(0);
  } catch (error) {
    console.error('Error generating AGENTS.md:', (error as Error).message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

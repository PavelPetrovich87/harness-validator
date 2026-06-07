import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const phasesDir = join(__dirname, '..', 'src', 'phases');

function extractCriteriaFromPhase(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const criteria: string[] = [];

  for (const line of lines) {
    // Look for criterionId assignments in the source
    const match = line.match(/criterionId:\s*['"]([^'"]+)['"]/);
    if (match) {
      criteria.push(match[1]);
    }
  }

  return [...new Set(criteria)];
}

function buildPrompt(): string {
  const files = readdirSync(phasesDir).filter((f) => f.endsWith('.ts'));

  const lines: string[] = [];
  lines.push('Текущие критерии валидации AI Harness:');
  lines.push('');

  for (const file of files.sort()) {
    const phaseName = file.replace('.ts', '').toUpperCase().replace(/-/g, '_');
    const criteria = extractCriteriaFromPhase(join(phasesDir, file));

    lines.push(`## ${phaseName}`);
    for (const c of criteria) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  lines.push('Проанализируй последние индустриальные тренды в:');
  lines.push('- Безопасности AI-агентов');
  lines.push('- Observability AI-агентов');
  lines.push('- Тестировании AI-генерированного кода');
  lines.push('- Архитектурных паттернах для AI-инструментов');
  lines.push('');
  lines.push('Предложи: новые критерии, обновления, удаление устаревших, новые фазы.');
  lines.push('');
  lines.push('Формат ответа: JSON, валидный против schemas/research_results.schema.json');

  return lines.join('\n');
}

function printUsage(): void {
  console.log('Usage: npx tsx scripts/generate-research-prompt.ts [--output <path>]');
  console.log('');
  console.log('Options:');
  console.log('  --output <path>   Output file path (default: research_prompt.txt)');
  console.log('  --help            Show this help');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  let outputPath = 'research_prompt.txt';
  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    outputPath = args[outputIndex + 1];
  }

  const prompt = buildPrompt();

  // Write to file
  const { writeFileSync } = await import('node:fs');
  writeFileSync(outputPath, prompt, 'utf-8');

  console.log(`Research prompt written to: ${outputPath}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Copy the prompt into your Deep Research tool');
  console.log('2. Save the resulting JSON');
  console.log('3. Run: npx tsx scripts/apply-research.ts --input <results.json>');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

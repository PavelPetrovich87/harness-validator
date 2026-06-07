import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import type { ResearchResults } from '../src/research-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function printUsage(): void {
  console.log('Usage: npx tsx scripts/apply-research.ts --input <results.json>');
  console.log('');
  console.log('Options:');
  console.log('  --input <path>   Path to research results JSON');
  console.log('  --yes            Apply changes without prompting');
  console.log('  --help           Show this help');
}

function loadSchema(): object {
  const schemaPath = join(__dirname, '..', 'schemas', 'research_results.schema.json');
  return JSON.parse(readFileSync(schemaPath, 'utf-8'));
}

function validateInput(data: unknown): data is ResearchResults {
  const schema = loadSchema();
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    console.error('Validation errors:', validate.errors);
  }
  return valid;
}

function generateDiff(results: ResearchResults): string {
  const lines: string[] = [];
  lines.push('Proposed changes from research:');
  lines.push('');

  if (results.addPhases.length > 0) {
    lines.push(`Add ${results.addPhases.length} phase(s):`);
    for (const p of results.addPhases) {
      lines.push(`  + ${p.name}: ${p.description}`);
      for (const c of p.criteria) {
        lines.push(`    - criterion: ${c}`);
      }
    }
    lines.push('');
  }

  if (results.addCriteria.length > 0) {
    lines.push(`Add ${results.addCriteria.length} criterion(s):`);
    for (const c of results.addCriteria) {
      lines.push(`  + [${c.phase}] ${c.criterionId}: ${c.rule} (${c.severity})`);
    }
    lines.push('');
  }

  if (results.updateCriteria.length > 0) {
    lines.push(`Update ${results.updateCriteria.length} criterion(s):`);
    for (const u of results.updateCriteria) {
      lines.push(`  ~ ${u.criterionId}: ${u.newRule}`);
      if (u.newSeverity) lines.push(`    severity → ${u.newSeverity}`);
      if (u.newRecommendation) lines.push(`    recommendation → ${u.newRecommendation}`);
    }
    lines.push('');
  }

  if (results.removeCriteria.length > 0) {
    lines.push(`Remove ${results.removeCriteria.length} criterion(s):`);
    for (const r of results.removeCriteria) {
      lines.push(`  - ${r.criterionId}: ${r.reason}`);
    }
    lines.push('');
  }

  lines.push(`Criteria version: → ${results.version}`);

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const inputIndex = args.indexOf('--input');
  if (inputIndex === -1 || !args[inputIndex + 1]) {
    console.error('Error: --input is required');
    printUsage();
    process.exit(1);
  }

  const inputPath = args[inputIndex + 1];
  if (!existsSync(inputPath)) {
    console.error(`Error: file not found: ${inputPath}`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(inputPath, 'utf-8'));

  if (!validateInput(data)) {
    console.error('Error: research results failed schema validation');
    process.exit(1);
  }

  const results = data as ResearchResults;

  console.log(generateDiff(results));
  console.log('');

  const autoApply = args.includes('--yes');
  if (!autoApply) {
    console.log('This is a preview. Review the diff above.');
    console.log('To apply changes, re-run with --yes.');
    console.log('Note: applying changes requires manual editing of src/phases/*.ts, src/types.ts, and SKILL.md files.');
    process.exit(0);
  }

  // Auto-apply is limited: we update criteria_version and log what needs manual work
  console.log('Applying version bump...');
  const versionFilePath = join(__dirname, '..', 'src', 'criteria-version.ts');
  if (existsSync(versionFilePath)) {
    const { writeFileSync } = await import('node:fs');
    const currentContent = readFileSync(versionFilePath, 'utf-8');
    const newContent = currentContent.replace(
      /CRITERIA_VERSION = '[^']+'/,
      `CRITERIA_VERSION = '${results.version}'`
    );
    writeFileSync(versionFilePath, newContent, 'utf-8');
    console.log(`Updated src/criteria-version.ts to ${results.version}`);
  }

  console.log('');
  console.log('Manual steps required:');
  if (results.addPhases.length > 0) {
    console.log('- Add new phases to src/types.ts ValidationPhase enum');
    console.log('- Create new src/phases/<phase>.ts files');
  }
  if (results.addCriteria.length > 0) {
    console.log('- Add new criteria to existing src/phases/*.ts files');
  }
  if (results.updateCriteria.length > 0) {
    console.log('- Update criteria in existing src/phases/*.ts files');
  }
  if (results.removeCriteria.length > 0) {
    console.log('- Remove criteria from existing src/phases/*.ts files');
  }
  console.log('- Update .kilo/skills/*/SKILL.md documentation');
  console.log('- Update schemas/manifest.schema.json if new phases were added');
  console.log('- Run tests to verify: npm test');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

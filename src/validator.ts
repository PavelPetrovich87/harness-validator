import type { ValidationResult, Manifest, ModuleScore } from './types.js';
import { generateManifest, writeManifest } from './manifest.js';
import { validateAstStructure } from './phases/ast-structure.js';
import { validateInstructionModules } from './phases/instruction-modules.js';
import { validateArchitecture } from './phases/architecture.js';
import { validateDataContracts } from './phases/data-contracts.js';
import { validateIntegration } from './phases/integration.js';
import { calculateScores } from './scoring.js';

export interface ValidatorOptions {
  projectRoot: string;
  manifestPath?: string;
}

export class HarnessValidator {
  private readonly projectRoot: string;
  private readonly manifestPath: string;

  constructor(options: ValidatorOptions) {
    this.projectRoot = options.projectRoot;
    this.manifestPath = options.manifestPath || '.harness/manifest.json';
  }

  /**
   * Run all 5 validation phases
   */
  async run(): Promise<{ results: ValidationResult[]; manifest: Manifest; scores: ModuleScore[]; exitCode: number }> {
    const results: ValidationResult[] = [];

    // Phase 1: AST Structure
    results.push(...(await validateAstStructure(this.projectRoot)));

    // Phase 2: Instruction Modules
    results.push(...(await validateInstructionModules(this.projectRoot)));

    // Phase 3: Architecture
    results.push(...(await validateArchitecture(this.projectRoot)));

    // Phase 4: Data Contracts
    results.push(...(await validateDataContracts(this.projectRoot)));

    // Phase 5: Integration
    results.push(...(await validateIntegration(this.projectRoot)));

    const scores = calculateScores(results);
    const manifest = generateManifest(results, scores);
    writeManifest(manifest, this.manifestPath);

    const hasFailures = results.some((r) => r.status === 'FAIL');
    const exitCode = hasFailures ? 1 : 0;

    return { results, manifest, scores, exitCode };
  }
}

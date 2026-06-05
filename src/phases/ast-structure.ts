import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPhase, type ValidationResult } from '../types.js';
import {
  parseMarkdown,
  findHeadings,
  getHeadingText,
  matchesHeading,
  findListItemsUnderHeading,
  countLines,
} from '../utils/ast-utils.js';

const REQUIRED_SECTIONS = ['Stack', 'Safety', 'Session Protocol', 'Feedback Loop', 'Circuit Breaker'];
const MAX_LINES = 60;
const MIN_SAFETY_ITEMS = 5;
const MIN_FEEDBACK_LOOP_ITEMS = 3;
const MIN_CIRCUIT_BREAKER_ITEMS = 1;

/**
 * Phase 1: AST Structure validation
 * Validates AGENTS.md structure using remark-parse AST (not grep)
 */
export async function validateAstStructure(projectRoot: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const agentsPath = join(projectRoot, 'AGENTS.md');

  if (!existsSync(agentsPath)) {
    results.push({
      phase: ValidationPhase.AST_STRUCTURE,
      status: 'FAIL',
      message: 'AGENTS.md not found',
    });
    return results;
  }

  try {
    const ast = parseMarkdown(agentsPath);
    const h2Headings = findHeadings(ast, 2);
    const headingTexts = h2Headings.map(getHeadingText);

    // AC1: Check required sections exist as AST heading nodes
    for (const section of REQUIRED_SECTIONS) {
      const found = headingTexts.some((text) => matchesHeading(text, section));
      if (found) {
        results.push({
          phase: ValidationPhase.AST_STRUCTURE,
          status: 'PASS',
          message: `H2 heading "${section}" detected via AST`,
        });
      } else {
        results.push({
          phase: ValidationPhase.AST_STRUCTURE,
          status: 'FAIL',
          message: `H2 heading "${section}" not found in AGENTS.md`,
        });
      }
    }

    // AC2: Localization is already handled by matchesHeading (flexible AST value matching)
    // This is implicitly validated by the above check

    // AC3: Line count check
    const lineCount = countLines(agentsPath);
    if (lineCount > MAX_LINES) {
      results.push({
        phase: ValidationPhase.AST_STRUCTURE,
        status: 'FAIL',
        message: `${lineCount} lines (max ${MAX_LINES})`,
      });
    } else {
      results.push({
        phase: ValidationPhase.AST_STRUCTURE,
        status: 'PASS',
        message: `Line count: ${lineCount} (max ${MAX_LINES})`,
      });
    }

    // Safety items count (AST, not grep)
    const safetyItems = findListItemsUnderHeading(ast, 'Safety');
    if (safetyItems.length < MIN_SAFETY_ITEMS) {
      results.push({
        phase: ValidationPhase.AST_STRUCTURE,
        status: 'FAIL',
        message: `Safety section has ${safetyItems.length} items (min ${MIN_SAFETY_ITEMS})`,
      });
    } else {
      results.push({
        phase: ValidationPhase.AST_STRUCTURE,
        status: 'PASS',
        message: `Safety section has ${safetyItems.length} items`,
      });
    }

    // Feedback Loop items count (AST, not grep)
    const feedbackLoopItems = findListItemsUnderHeading(ast, 'Feedback Loop');
    if (feedbackLoopItems.length < MIN_FEEDBACK_LOOP_ITEMS) {
      results.push({
        phase: ValidationPhase.AST_STRUCTURE,
        status: 'FAIL',
        message: `Feedback Loop section has ${feedbackLoopItems.length} items (min ${MIN_FEEDBACK_LOOP_ITEMS})`,
      });
    } else {
      results.push({
        phase: ValidationPhase.AST_STRUCTURE,
        status: 'PASS',
        message: `Feedback Loop section has ${feedbackLoopItems.length} items`,
      });
    }

    // Circuit Breaker items count (AST, not grep)
    const circuitBreakerItems = findListItemsUnderHeading(ast, 'Circuit Breaker');
    if (circuitBreakerItems.length < MIN_CIRCUIT_BREAKER_ITEMS) {
      results.push({
        phase: ValidationPhase.AST_STRUCTURE,
        status: 'FAIL',
        message: `Circuit Breaker section has ${circuitBreakerItems.length} items (min ${MIN_CIRCUIT_BREAKER_ITEMS})`,
      });
    } else {
      results.push({
        phase: ValidationPhase.AST_STRUCTURE,
        status: 'PASS',
        message: `Circuit Breaker section has ${circuitBreakerItems.length} items`,
      });
    }
  } catch (error) {
    results.push({
      phase: ValidationPhase.AST_STRUCTURE,
      status: 'FAIL',
      message: `Failed to parse AGENTS.md: ${(error as Error).message}`,
    });
  }

  return results;
}

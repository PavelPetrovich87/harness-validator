/**
 * Core types for the AI Harness validator
 */

export enum ValidationPhase {
  AST_STRUCTURE = 'AST_STRUCTURE',
  INSTRUCTION_MODULES = 'INSTRUCTION_MODULES',
  ARCHITECTURE = 'ARCHITECTURE',
  DATA_CONTRACTS = 'DATA_CONTRACTS',
  INTEGRATION = 'INTEGRATION',
}

export type ValidationStatus = 'PASS' | 'FAIL' | 'WARN';

export interface ValidationResult {
  phase: ValidationPhase;
  status: ValidationStatus;
  message: string;
  details?: string;
}

export interface Manifest {
  validated_at: string;
  version: string;
  errors: number;
  warnings: number;
  results: ValidationResult[];
}

export interface HeadingAliasMap {
  [en: string]: string[];
}

/**
 * Predefined heading aliases for localization support.
 * Maps canonical English heading names to known localized variants.
 */
export const HEADING_ALIASES: HeadingAliasMap = {
  Stack: ['Стек'],
  Commands: ['Команды'],
  Safety: ['Безопасность'],
  'Architecture Rules': ['Архитектурные правила'],
  'Session Protocol': ['Протокол сессии'],
  'Feedback Loop': ['Цикл обратной связи'],
  'Circuit Breaker': ['Предохранитель'],
};
